import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/local/local_data.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/notifications/ui/notifications_screen.dart';

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

    // v1.3.3+34: the direct tap wire from AppDelegate. iOS notification
    // taps arrive here via our own MethodChannel because the plugin's
    // onMessageOpenedApp never fires under the implicit-engine template.
    // Registered before anything async so a cold-start delivery (sent
    // ~2.5s after engine init by the native side) always finds us.
    const MethodChannel('pp/push_taps').setMethodCallHandler((call) async {
      if (call.method == 'tapped') {
        debugPrint('[push] tap wire fired — opening inbox');
        // Guard against double-delivery (native retries): don't stack
        // a second inbox on top of an open one.
        if (!Get.currentRoute.contains('NotificationsScreen')) {
          Get.to(() => const NotificationsScreen());
        }
      }
    });

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
            // v1.3.3+32: tapping the in-app banner opens the inbox
            onTap: (_) => Get.to(() => const NotificationsScreen()),
          ),
        );
      });

      // Background-tap handler — fired when the user taps a notification
      // delivered while the app was suspended. For now we just log; deep
      // linking into a specific venue/event is a v1.4 follow-up once
      // the team decides the URL scheme.
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        debugPrint('[push] notification opened: ${message.notification?.title}');
        // v1.3.3+32: land the user in the inbox so they can read the
        // full message (and everything they missed).
        Get.to(() => const NotificationsScreen());
      });

      // Try registering the current token immediately. Handles the
      // returning-user-with-JWT case. Silently no-ops if not signed in.
      // v1.3.3+31: MUST run before getInitialMessage() — see below.
      await registerCurrentToken();

      // Cold-start: the user might have tapped a notification while
      // the app was fully killed. v1.3.3+31: getInitialMessage() can
      // hang forever on iOS with the implicit-engine AppDelegate
      // (device syslog showed init() prints stop exactly here in both
      // build-29 and build-30 captures, blocking token registration).
      // Never await it in the init chain.
      unawaited(_messaging.getInitialMessage().then((initial) {
        if (initial != null) {
          debugPrint('[push] cold-start notification: ${initial.notification?.title}');
          // v1.3.3+32: app was launched from a notification tap — open
          // the inbox once the widget tree has had time to mount.
          Future.delayed(const Duration(seconds: 2), () {
            Get.to(() => const NotificationsScreen());
          });
        }
      }));
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
      debugPrint('[push] registerCurrentToken starting');
      final jwt = await _localService.getValue<String>(PreferenceKey.token);
      if (jwt == null || jwt.isEmpty) {
        debugPrint('[push] no JWT yet — skipping registration');
        return;
      }

      // v1.3.3+29: on iOS the APNs token can arrive several seconds
      // after launch. Calling getToken() before it exists throws
      // apns-token-not-set, and a single failed call means no token is
      // ever generated — so onTokenRefresh never fires either and the
      // device never registers. Wait for APNs (up to 30s), then fetch
      // the FCM token with retries. Callers are all fire-and-forget,
      // so the wait never blocks UI.
      if (Platform.isIOS) {
        String? apns;
        for (var i = 0; i < 30 && apns == null; i++) {
          apns = await _messaging.getAPNSToken();
          if (apns == null) {
            await Future.delayed(const Duration(seconds: 1));
          }
        }
        debugPrint('[push] apns token after wait: ${apns != null}');
        if (apns == null) return;
      }

      String? token;
      for (var i = 0; i < 3 && (token == null || token.isEmpty); i++) {
        try {
          token = await _messaging.getToken();
        } catch (e) {
          debugPrint('[push] getToken attempt ${i + 1} failed: $e');
          await Future.delayed(const Duration(seconds: 2));
        }
      }
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
