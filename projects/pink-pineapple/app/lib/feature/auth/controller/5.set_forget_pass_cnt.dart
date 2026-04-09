import 'dart:async';
import 'dart:convert';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../ui/1.login_ui.dart';

class SetForgetPasswordCnt extends GetxController {
  final RxBool isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();
  var email = "".obs;
  final logger = Logger();

  var obscureText1 = true.obs;
  void toggleVisibility1() {
    obscureText1.value = !obscureText1.value;
  }

  var obscureText2 = true.obs;

  void toggleVisibility2() {
    obscureText2.value = !obscureText2.value;
  }

  @override
  void onInit() {
    var args = Get.arguments['email'];
    email.value = args;
    super.onInit();
  }

  Future<bool> setPassword(String passsword) async {
    logger.d("Reset Password Screen: Email: ${email.value}");
    if (email.value.isEmpty) {
      AppSnackbar.showWarning('Email is required');
      return false;
    }

    if (passsword.isEmpty) {
      AppSnackbar.showWarning('Password is required');
      return false;
    }

    try {
      isLoading.value = true;
      final Map<String, dynamic> requestBody = {
        "email": email.value,
        "password": passsword,
      };

      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.resetPassword,
        json.encode(requestBody),
        is_auth: false,
      );

      if (response != null && response['success'] == true) {
        Get.off(() => LoginPage());
        AppSnackbar.show(
          message: "Password Updated Successfully!",
          isSuccess: true,
        );
        return true;
      } else {
        String errorMessage = response['message'] ?? 'OTP verification failed';
        AppSnackbar.show(message: errorMessage, isSuccess: false);
        return false;
      }
    } catch (e) {
      AppSnackbar.show(message: "Verification failed: $e", isSuccess: false);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
}
