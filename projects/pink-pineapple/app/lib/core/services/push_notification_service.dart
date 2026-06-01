import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/local/local_data.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';

/// FCM lifecycle (v1.3.2+27).
///
/// init() runs once at app start. It:
///   1. Requests notification permission (iOS prompts, Android 13+ also
///      prompts via POST_NOTIFICATIONS at runtime).
///   2. Hooks token-refresh + foreground + tap listeners.
///   3. Tries an immediate token registration if the user is already
///      signed in (returning user with a cached JWT).
///
/// registerCurrentToken() is also called from the login + OTP success
/// flows so the very first sign-in lands a token without waiting for
/// the next refresh cycle.
class PushNotificationService {
  static final _messaging = FirebaseMessaging.instance;
  static final _netConfig = NetworkConfigV1();
  static final _localService = LocalService();

  static bool _initialised = false;
  static StreamSubscription<String>? _tokenRefreshSub;
  static StreamSubscription<RemoteMessage>? _foregroundSub;

  /// One-shot setup. Safe to call multiple times — subsequent calls
  /// are a no-op.
  static Future<void> init() async {
    if (_initialised) return;
    _initialised = true;

    try {
      // Ask for permission. iOS needs this before any token works; on
      // Android 13+ this surfaces the runtime POST_NOTIFICATIONS prompt.
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      debugPrint('[push] permission: ${settings.authorizationStatus}');

      // iOS needs the APNs token before FCM can issue one. The plugin
      // does the handshake automatically once Push capability +
      // background-mode are set in the Xcode entitlements / Info.plist.
      if (Platform.isIOS) {
        final apnsToken = await _messaging.getAPNSToken();
        debugPrint('[push] apns token present: ${apnsToken != null}');
      }

      // Token refresh handler. iOS/Android can rotate the token any
      // time (reinstall, OS upgrade, etc.). Persist the new value to
      // the backend so broadcasts keep landing.
      _tokenRefreshSub?.cancel();
      _tokenRefreshSub = _messaging.onTokenRefresh.listen((newToken) {
        debugPrint('[push] token refresh');
        _postToBackend(newToken);
      });

      // Foreground message handler. iOS doesn't show a banner while
      // the app is open by default — surface a snackbar so the user
      // sees the message arrive without it being intrusive.
      _foregroundSub?.cancel();
      _foregroundSub = FirebaseMessaging.onMessage.listen((message) {
        final notification = message.notification;
        if (notification == null) return;
        Get.showSnackbar(
          GetSnackBar(
            title: notification.title,
            message: notification.body,
            duration: const Duration(seconds: 4),
            backgroundColor: Colors.black87,
            margin: const EdgeInsets.all(12),
            borderRadius: 16,
            snackPosition: SnackPosition.TOP,
            isDismissible: true,
          ),
        );
      });

      // Background-tap handler — fired when the user taps a notification
      // delivered while the app was suspended. For now we just log; deep
      // linking into a specific venue/event is a v1.4 follow-up once
      // the team decides the URL scheme.
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        debugPrint('[push] notification opened: ${message.notification?.title}');
      });

      // Cold-start: the user might have tapped a notification while
      // the app was fully killed. Read the launch message and log.
      final initial = await _messaging.getInitialMessage();
      if (initial != null) {
        debugPrint('[push] cold-start notification: ${initial.notification?.title}');
      }

      // Try registering the current token immediately. Handles the
      // returning-user-with-JWT case. Silently no-ops if not signed in.
      await registerCurrentToken();
    } catch (e) {
      debugPrint('[push] init failed: $e');
    }
  }

  /// Fetch the current FCM token and POST it to /users/fcm-token. Called
  /// from init() and from the login/OTP success flows once the JWT
  /// exists. Silently no-ops if the user isn't authenticated yet —
  /// init() will retry on next app start.
  static Future<void> registerCurrentToken() async {
    try {
      final jwt = await _localService.getValue<String>(PreferenceKey.token);
      if (jwt == null || jwt.isEmpty) return;

      final token = await _messaging.getToken();
      if (token == null || token.isEmpty) return;
      await _postToBackend(token);
    } catch (e) {
      debugPrint('[push] register token failed: $e');
    }
  }

  static Future<void> _postToBackend(String fcmToken) async {
    try {
      await _netConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.fcmToken,
        jsonEncode({'fcmToken': fcmToken}),
        is_auth: true,
      );
      debugPrint('[push] token registered with backend');
    } catch (e) {
      debugPrint('[push] backend register failed: $e');
    }
  }
}
