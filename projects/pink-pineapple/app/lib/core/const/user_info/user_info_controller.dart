import 'dart:convert';

import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/const/user_info/user_info_model.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/core/local/local_data.dart';

import '../../global_widgets/app_snackbar.dart';
import '../../network_caller/endpoints.dart';

class UserInfoController extends GetxController {
  /// user variables
  final Rxn<UserInfoModel> userInfo = Rxn<UserInfoModel>();
  final RxBool isLoading = false.obs;

  final netConfig = NetworkConfigV1();

  @override
  void onInit() {
    super.onInit();
    fetchUserInfo();
  }

  /// api
  Future<void> fetchUserInfo() async {
    final logger = Logger();
    try {
      isLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.userProfile,
        jsonEncode({}),
        is_auth: true,
      );

      // 🔴 CRITICAL: Check if response is null FIRST
      if (response == null) {
        logger.e("API response is null. Possible network/auth issue.");
        AppSnackbar.show(message: "Failed to load user info", isSuccess: false);
        return;
      }

      // Now safe to access response['...']
      if (response['success'] == true) {
        userInfo.value = UserInfoModel.fromJson(response['data']);
        logger.t("Raw API response: ${response['data']}");

        // 🔥 Save userId for chat functionality
        final userId = userInfo.value?.userProfile?.id;
        if (userId != null && userId.isNotEmpty) {
          await LocalService().setValue<String>(PreferenceKey.userId, userId);
          logger.d("✅ User ID saved for chat: $userId");
        } else {
          logger.w("⚠️ User ID not found in profile");
        }
      } else {
        final message = response['message'] ?? "Unknown error";
        logger.e("API error: $message");
        AppSnackbar.show(message: message, isSuccess: false);
      }
    } catch (e) {
      logger.e('User info retrieve error: ${e.toString()}');
      AppSnackbar.show(message: "Something went wrong", isSuccess: false);
    } finally {
      logger.d('Fetching User info Api Called');
      isLoading.value = false;
    }
  }
}
