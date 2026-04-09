import 'dart:convert';

import 'package:get/get.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/local/local_data.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../ui/4.otp_verify_page.dart';

class ForgetPasswordController extends GetxController {
  final RxBool isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();

  Future<bool> forgetPasswordEmail(String email) async {
    if (email.isEmpty) {
      AppSnackbar.showWarning('Please fill all fields');
      return false;
    }
    try {
      isLoading.value = true;
      final Map<String, dynamic> requestBody = {"email": email};

      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.forgetPassword,
        json.encode(requestBody),
        is_auth: false,
      );

      if (response != null && response['success'] == true) {
        Get.to(() => VerificationCodeScreen(), arguments: {'email': email});
        AppSnackbar.show(
          message: "An OTP Was Sent Successfully.",
          isSuccess: true,
        );
        return true;
      } else {
        AppSnackbar.show(message: response['message'], isSuccess: false);
        return false;
      }
    } catch (e) {
      //   AppSnackbar.show(message: "Failed To Login $e", isSuccess: false);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
}
