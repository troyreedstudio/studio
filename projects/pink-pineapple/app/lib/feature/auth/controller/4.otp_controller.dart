import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/local/local_data.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../../../core/const/user_info/user_info_controller.dart';
import '../../home_bottom_nav/ui/home_bottom_nav.dart';
import '../ui/1.login_ui.dart';
import '../ui/5.set_forget_password.dart';

class OtpController extends GetxController {
  final RxBool isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();
  final logger = Logger();
  @override
  void onInit() {
    super.onInit();
  }

  Future<bool> otpPassword(String email, int otp) async {
    if (email.isEmpty) {
      AppSnackbar.showWarning('Email is required');
      return false;
    }
    if (otp.toString().length != 4) {
      AppSnackbar.showWarning('Please enter a valid 4-digit OTP');
      return false;
    }

    try {
      isLoading.value = true;
      final Map<String, dynamic> requestBody = {"email": email, 'otp': otp};
      log(requestBody.toString());
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.verifyOTP,
        json.encode(requestBody),
        is_auth: false,
      );
      if (response != null && response['success'] == true) {
        // Get.to(() => AdminWelcomeScreen(), arguments: {'email': email});
        AppSnackbar.show(
          message: "OTP verified successfully!",
          isSuccess: true,
        );
        Get.to(SetForgetPasswordPage(), arguments: {'email': email});
        logger.d("OTP Screen: Email: $email");
        return true;
      } else {
        String errorMessage = response['message'] ?? 'OTP verification failed';
        AppSnackbar.show(message: errorMessage, isSuccess: false);
        return false;
      }
    } catch (e) {
      // AppSnackbar.show(message: "Verification failed: $e", isSuccess: false);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> otpVerifyToLogin(String email, int otp) async {
    if (email.isEmpty) {
      AppSnackbar.showWarning('Email is required');
      return false;
    }
    if (otp.toString().length != 4) {
      AppSnackbar.showWarning('Please enter a valid 4-digit OTP');
      return false;
    }

    try {
      isLoading.value = true;
      final Map<String, dynamic> requestBody = {"email": email, 'otp': otp};
      log(requestBody.toString());
      // Sign-up flow hits verify-register-otp (NOT verify-otp). The
      // register endpoint flips user.status to ACTIVE, fires the
      // welcome email, and returns isCompleteProfile in addition to
      // accessToken. The plain verify-otp endpoint is for forgot-password.
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.verifyRegisterOTP,
        json.encode(requestBody),
        is_auth: false,
      );
      if (response == null) {
        // Network layer already surfaced its own error toast.
        return false;
      }
      if (response['success'] == true) {
        // Persist the accessToken so the subsequent profile-upload
        // multipart request can attach an Authorization header. Without
        // this, /users/profile returns 401 and the user sees
        // "Upload Failed" / "You are not authorized".
        final data = response['data'];
        final token = data is Map ? data['accessToken'] : null;
        if (token is String && token.isNotEmpty) {
          final localService = LocalService();
          await localService.setValue<String>(PreferenceKey.token, token);
          log('Sign-up OTP verified, token saved (len=${token.length})');
        } else {
          log('Sign-up OTP verified but no accessToken in response: $data');
        }
        AppSnackbar.show(
          message: "Welcome to Pink Pineapple!",
          isSuccess: true,
        );
        // v1.3.0+15: sign-up is single-page now — all profile fields
        // captured at register, so OTP success goes straight to the
        // home tab (no step-3 profile setup screen anymore).
        // v1.3.0+16: explicitly delete + re-create UserInfoController
        // so its onInit fetchUserInfo() fires with the fresh token.
        // Without this, the controller (if instantiated earlier in
        // the session) keeps its old null userInfo and the profile
        // tab is stuck on "Loading profile..." forever.
        if (Get.isRegistered<UserInfoController>()) {
          Get.delete<UserInfoController>();
        }
        Get.put(UserInfoController());
        Get.offAll(() => HomeBottomNav());
        return true;
      } else {
        String errorMessage = response['message'] ?? 'OTP verification failed';
        AppSnackbar.show(message: errorMessage, isSuccess: false);
        return false;
      }
    } catch (e) {
      log('otpVerifyToLogin threw: $e');
      AppSnackbar.show(
        message: "Couldn't verify OTP. Check your connection and try again.",
        isSuccess: false,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }
}
