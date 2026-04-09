// lib/features/auth/change_password/controller/change_password_controller.dart

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';

class ChangePasswordController extends GetxController {
  final RxBool isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();

  final formKey = GlobalKey<FormState>();
  final currentPasswordController = TextEditingController();
  final newPasswordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  void clearFields() {
    currentPasswordController.clear();
    newPasswordController.clear();
    confirmPasswordController.clear();
  }

  Future<bool> changePassword() async {
    if (formKey.currentState == null || !formKey.currentState!.validate()) {
      return false;
    }

    final currentPass = currentPasswordController.text.trim();
    final newPass = newPasswordController.text.trim();
    final confirmPass = confirmPasswordController.text.trim();

    if (newPass != confirmPass) {
      AppSnackbar.showWarning("New password and confirm password do not match");
      return false;
    }

    if (newPass.length < 8) {
      AppSnackbar.showWarning("Password must be at least 8 characters");
      return false;
    }

    try {
      isLoading.value = true;

      final requestBody = {
        "oldPassword": currentPass,
        "newPassword": newPass,
      };

      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.PUT,
        Urls.changePassword, // Make sure this endpoint exists in your Urls class
        jsonEncode(requestBody),
        is_auth: true, // Important: send auth token
      );

      if (response != null && response['success'] == true) {
        AppSnackbar.show(message: "Password changed successfully", isSuccess: true);
        clearFields();
        return true;
      } else {
        AppSnackbar.show(message: response?['message'] ?? "Failed to change password", isSuccess: false);
        return false;
      }
    } catch (e) {
      AppSnackbar.show(message: "An error occurred: $e", isSuccess: false);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
}