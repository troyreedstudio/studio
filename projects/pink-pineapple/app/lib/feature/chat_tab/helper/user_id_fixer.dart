import 'dart:convert';
import 'package:get/get.dart';
import 'package:pineapple/core/local/local_data.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/core/services/websocket_service.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';

/// 🔧 এই helper class টা userId fix করবে
///
/// যদি userId null থাকে, তাহলে UserInfoController থেকে নিবে বা profile API call করবে
class UserIdFixer {
  static final NetworkConfigV1 _networkConfig = NetworkConfigV1();
  static final LocalService _localService = LocalService();

  /// Check করে যদি userId না থাকে তাহলে UserInfoController বা profile থেকে নিয়ে save করে
  static Future<String?> ensureUserId() async {
    print('🔍 Checking if userId exists...');

    // Check if userId already exists
    String? userId = await _localService.getValue<String>(PreferenceKey.userId);

    if (userId != null && userId.isNotEmpty) {
      print('✅ User ID already exists: $userId');
      return userId;
    }

    print('⚠️ User ID not found, trying to get from UserInfoController...');

    // Try to get from UserInfoController first
    try {
      final userInfoController = Get.find<UserInfoController>();
      userId = userInfoController.userInfo.value?.userProfile?.id;

      if (userId != null && userId.isNotEmpty) {
        await _localService.setValue<String>(PreferenceKey.userId, userId);
        print('✅ User ID fetched from UserInfoController and saved: $userId');
        return userId;
      }
    } catch (e) {
      print('⚠️ UserInfoController not found or no data: $e');
    }

    print('⚠️ Fetching from profile API...');

    // Fallback: Fetch from profile API
    try {
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.userProfile,
        jsonEncode({}),
        is_auth: true,
      );

      print('📥 Profile API Response: $response');

      if (response != null && response['success'] == true) {
        final userData = response['data'];

        // Try different possible keys for userId
        String? fetchedUserId;

        if (userData != null && userData['userProfile'] != null) {
          fetchedUserId =
              userData['userProfile']['id'] ?? userData['userProfile']['_id'];
        }

        // Fallback to other possible locations
        if (fetchedUserId == null && userData != null) {
          fetchedUserId =
              userData['_id'] ?? userData['id'] ?? userData['userId'];
        }

        if (fetchedUserId != null && fetchedUserId.isNotEmpty) {
          // Save the userId
          await _localService.setValue<String>(
            PreferenceKey.userId,
            fetchedUserId,
          );

          print('✅ User ID fetched and saved: $fetchedUserId');
          return fetchedUserId;
        } else {
          print('❌ User ID not found in profile response');
          print('❌ Available keys: ${userData?.keys}');
        }
      } else {
        print('❌ Profile API failed: ${response?['message']}');
      }
    } catch (e) {
      print('❌ Error fetching profile: $e');
    }

    return null;
  }

  /// userId fix করে এবং WebSocket connect করে
  static Future<bool> fixUserIdAndConnectWebSocket() async {
    print('🔧 Starting userId fix and WebSocket connection...');

    // Step 1: Ensure userId exists
    final userId = await ensureUserId();

    if (userId == null) {
      print('❌ Could not get user ID');
      return false;
    }

    // Step 2: Connect WebSocket if not connected
    try {
      final ws = Get.find<WebSocketService>();

      if (ws.isConnected.value) {
        print('✅ WebSocket already connected');
        return true;
      }

      final token = await _localService.getValue<String>(PreferenceKey.token);

      if (token == null) {
        print('❌ No token found');
        return false;
      }

      print('🔌 Connecting to WebSocket...');

      await ws.connect(
        url: Uri.parse('wss://api.pinkpineapple.app'),
        token: token,
      );

      // Wait a bit for connection
      await Future.delayed(Duration(milliseconds: 500));

      if (ws.isConnected.value) {
        print('✅ WebSocket connected successfully');
        ws.messageList(); // Request message list
        return true;
      } else {
        print('❌ WebSocket connection failed');
        return false;
      }
    } catch (e) {
      print('❌ Error connecting WebSocket: $e');
      return false;
    }
  }
}
