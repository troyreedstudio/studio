import 'dart:convert';
import 'package:get/get.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';

class EditPasswordController extends GetxController {
  final RxBool isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();

  var obscureText1 = true.obs;

  void toggleVisibility1() {
    obscureText1.value = !obscureText1.value;
  }

  var obscureText2 = true.obs;

  void toggleVisibility2() {
    obscureText2.value = !obscureText2.value;
  }

  Future<bool> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    if (oldPassword.isEmpty || newPassword.isEmpty) {
      AppSnackbar.showWarning('Please fill all fields');
      return false;
    }

    if (newPassword.length < 6) {
      AppSnackbar.showWarning('New password must be at least 6 characters');
      return false;
    }

    try {
      isLoading.value = true;
      final Map<String, dynamic> requestBody = {
        "oldPassword": oldPassword,
        "newPassword": newPassword,
      };

      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.PUT,
        Urls.changePassword, // You need to add this endpoint in your Urls class
        json.encode(requestBody),
        is_auth: true, // Assuming this requires authentication
      );

      if (response != null && response['success'] == true) {
        AppSnackbar.show(
          message: "Password changed successfully!",
          isSuccess: true,
        );
        return true;
      } else {
        String errorMessage = response['message'] ?? 'Password change failed';
        AppSnackbar.show(message: errorMessage, isSuccess: false);
        return false;
      }
    } catch (e) {
      AppSnackbar.show(
        message: "Failed to change password: $e",
        isSuccess: false,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }
}
