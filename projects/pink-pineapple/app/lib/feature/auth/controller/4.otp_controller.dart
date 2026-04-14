import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../ui/1.login_ui.dart';
import '../ui/5.set_forget_password.dart';
import '../ui/8.sign_up_profile_set_up.dart' show SignUpProfileSetUp;

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
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.verifyOTP,
        json.encode(requestBody),
        is_auth: false,
      );
      if (response != null && response['success'] == true) {
        AppSnackbar.show(
          message: "Account created! Set up your profile.",
          isSuccess: true,
        );
        Get.off(() => SignUpProfileSetUp(), arguments: {'email': email});
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
}
