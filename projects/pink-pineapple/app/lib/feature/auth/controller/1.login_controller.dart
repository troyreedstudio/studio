import 'dart:convert';
import 'dart:developer';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import '../../../core/const/user_info/user_info_controller.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/local/local_data.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../../../core/services/websocket_service.dart';
import '../../home_bottom_nav/ui/home_bottom_nav.dart';

class LoginController extends GetxController {
  var obscureText = true.obs;
  final RxBool isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();
  final logger = Logger();

  void toggleVisibility() {
    obscureText.value = !obscureText.value;
  }

  Future<bool> login(String email, String password) async {
    if (email.isEmpty || password.isEmpty) {
      AppSnackbar.showWarning('Please fill all fields');
      return false;
    }
    if (password.length < 8) {
      AppSnackbar.showWarning('Password Can\'t Be Less Than 8 Character');
      return false;
    }
    try {
      isLoading.value = true;
      final Map<String, dynamic> requestBody = {
        "email": email,
        "password": password,
        "fcmToken": "",
      };
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.login,
        json.encode(requestBody),
        is_auth: false,
      );

      if (response != null && response['success'] == true) {
        var localService = LocalService();
        // await localService.clearUserData();

        print('🔍 Login Response: ${json.encode(response)}');

        // Save token
        await localService.setValue<String>(
          PreferenceKey.token,
          response["data"]["token"],
        );

        // Save userId - trying multiple possible keys
        String? userId;

        // Try different possible locations for userId in response
        if (response["data"]["user"] != null) {
          print('✅ User object found in response');

          if (response["data"]["user"]["_id"] != null) {
            userId = response["data"]["user"]["_id"];
            print('✅ Found _id: $userId');
          } else if (response["data"]["user"]["id"] != null) {
            userId = response["data"]["user"]["id"];
            print('✅ Found id: $userId');
          } else {
            print('❌ No _id or id field in user object');
            print('User object keys: ${response["data"]["user"].keys}');
          }
        } else if (response["data"]["_id"] != null) {
          userId = response["data"]["_id"];
          print('✅ Found _id directly in data: $userId');
        } else if (response["data"]["id"] != null) {
          userId = response["data"]["id"];
          print('✅ Found id directly in data: $userId');
        } else {
          print('❌ No user object found in response');
          print('Data keys: ${response["data"].keys}');
        }

        if (userId != null) {
          await localService.setValue<String>(PreferenceKey.userId, userId);
          print('✅ User ID saved: $userId');

          // Verify it was saved
          final savedUserId = await localService.getValue<String>(
            PreferenceKey.userId,
          );
          print('✅ Verified saved user ID: $savedUserId');
        } else {
          print('❌ Could not find user ID in response to save');
        }

        final uToken = await localService.getValue<String>(PreferenceKey.token);
        // await getProfile();
        logger.d("User Token: $uToken");

        // Initialize WebSocket connection
        _initializeWebSocket(response["data"]["token"]);

        // Navigate first, then show snackbar shortly after so the snackbar
        // isn't removed by the route transition overlay change.
        Get.put(UserInfoController());
        Get.to(() => HomeBottomNav());

        // Small delay ensures the new route's overlay is ready.
        Future.delayed(const Duration(milliseconds: 200), () {
          AppSnackbar.show(
            message: "Successfully Login",
            isSuccess: true,
            topOffset: 4.0,
          );
        });

        return true;
      } else {
        AppSnackbar.show(message: response['message'], isSuccess: false);
        return false;
      }
    } catch (e) {
      // AppSnackbar.show(message: "Failed To Login $e", isSuccess: false);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Initialize WebSocket connection after successful login
  Future<void> _initializeWebSocket(String token) async {
    try {
      final ws = Get.find<WebSocketService>();

      // Check if already connected
      if (ws.isConnected.value) {
        logger.d('WebSocket already connected');
        return;
      }

      // Connect to WebSocket server
      logger.d('🔌 Connecting to WebSocket...');

      await ws.connect(
        url: Uri.parse('wss://api.pinkpineapple.app'),
        token: token,
      );

      logger.d('✅ WebSocket connected successfully');

      // Listen for authentication response
      ws.events.listen((event) {
        final eventType = event['event'];

        if (eventType == 'authenticated') {
          logger.d('✅ WebSocket authenticated successfully');

          // Request initial message list
          ws.messageList();
        }

        if (eventType == 'socketError') {
          logger.w('❌ WebSocket error: ${event['data']}');
        }
      });
    } catch (e) {
      logger.e('❌ Error initializing WebSocket: $e');
    }
  }

  Future<bool> getProfile() async {
    try {
      isLoading.value = true;
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.profile,
        jsonEncode({}),
        is_auth: true,
      );
      log("getProfile - $response");

      if (response != null && response['success'] == true) {
        var localService = LocalService();
        var profileData =
            response['data']; // Adjust based on your API response structure

        if (profileData != null) {
          if (profileData['fullName'] != null) {
            localService.setValue(PreferenceKey.name, profileData['fullName']);
          }

          if (profileData['profileImage'] != null &&
              profileData['profileImage'].isNotEmpty) {
            localService.setValue(
              PreferenceKey.imagePath,
              profileData['profileImage'],
            );
          }
        }

        return true;
      } else {
        print("Failed to load profile or profile doesn't exist");
        return false;
      }
    } catch (e) {
      print("Error getting profile: $e");
      return false;
    } finally {
      isLoading.value = false;
    }
  }
}
