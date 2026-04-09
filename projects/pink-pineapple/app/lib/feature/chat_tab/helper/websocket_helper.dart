import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/services/websocket_service.dart';
import 'package:pineapple/core/local/local_data.dart';

/// Example: How to initialize WebSocket connection
///
/// Call this after successful login or in your splash/main screen
///
/// Usage:
/// ```dart
/// await ChatWebSocketHelper.initializeWebSocket();
/// ```

class ChatWebSocketHelper {
  static Future<void> initializeWebSocket() async {
    try {
      final localService = LocalService();

      // Get authentication token
      final token = await localService.getValue<String>(PreferenceKey.token);

      if (token == null || token.isEmpty) {
        debugPrint('❌ No token found. Cannot connect to WebSocket.');
        return;
      }

      // Get WebSocket service instance
      final ws = Get.find<WebSocketService>();

      // Check if already connected
      if (ws.isConnected.value) {
        debugPrint('✅ WebSocket already connected');
        return;
      }

      // Connect to WebSocket server
      debugPrint('🔌 Connecting to WebSocket...');

      await ws.connect(
        url: Uri.parse('wss://api.pinkpineapple.app'),
        token: token,
      );

      debugPrint('✅ WebSocket connected successfully');

      // Listen for authentication response
      ws.events.listen((event) {
        final eventType = event['event'];

        if (eventType == 'authenticated') {
          debugPrint('✅ WebSocket authenticated successfully');

          // Request initial message list
          ws.messageList();
        }

        if (eventType == 'socketError') {
          debugPrint('❌ WebSocket error: ${event['data']}');
        }
      });
    } catch (e) {
      debugPrint('❌ Error initializing WebSocket: $e');
    }
  }

  static void disconnectWebSocket() {
    try {
      final ws = Get.find<WebSocketService>();
      ws.disconnect();
      debugPrint('🔌 WebSocket disconnected');
    } catch (e) {
      debugPrint('❌ Error disconnecting WebSocket: $e');
    }
  }

  /// Call this in your main.dart before runApp
  static Future<void> registerWebSocketService() async {
    await Get.putAsync(() async => WebSocketService());
    debugPrint('✅ WebSocket service registered');
  }
}

/// Example usage in your app:
/// 
/// 1. In main.dart:
/// ```dart
/// void main() async {
///   WidgetsFlutterBinding.ensureInitialized();
///   
///   // Register WebSocket service
///   await ChatWebSocketHelper.registerWebSocketService();
///   
///   runApp(MyApp());
/// }
/// ```
/// 
/// 2. After successful login:
/// ```dart
/// class LoginController extends GetxController {
///   Future<void> login() async {
///     // ... your login logic
///     
///     if (loginSuccess) {
///       // Save token
///       await localService.setValue(PreferenceKey.token, token);
///       await localService.setValue(PreferenceKey.userId, userId);
///       
///       // Initialize WebSocket
///       await ChatWebSocketHelper.initializeWebSocket();
///       
///       // Navigate to home
///       Get.offAllNamed('/home');
///     }
///   }
/// }
/// ```
/// 
/// 3. On logout:
/// ```dart
/// class LogoutController extends GetxController {
///   Future<void> logout() async {
///     // Disconnect WebSocket
///     ChatWebSocketHelper.disconnectWebSocket();
///     
///     // Clear local data
///     await localService.clearAll();
///     
///     // Navigate to login
///     Get.offAllNamed('/login');
///   }
/// }
/// ```
