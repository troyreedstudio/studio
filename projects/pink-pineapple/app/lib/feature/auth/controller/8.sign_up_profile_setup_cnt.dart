import 'dart:convert';
import 'dart:developer';
import 'package:get/get.dart';
import 'package:flutter/material.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/local/local_data.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../../../core/controller/image_picker_controller.dart';
import '../ui/1.login_ui.dart';

class SignUpProfileSetup extends GetxController {
  final RxBool isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();
  final RxBool isTokenAvailable = false.obs;

  // Add these observables to store profile data
  final RxString profileName = ''.obs;
  final RxString profileImageUrl = ''.obs;

  // Get the image picker controller to populate data
  late final ImagePickerController imagePicker;

  // ✅ FIX: make nullable (late + null-check is invalid)
  TextEditingController? nameController;

  @override
  void onInit() {
    imagePicker = Get.put(ImagePickerController());
    isTokenAvailableCheck();
    super.onInit();
  }

  void setNameController(TextEditingController controller) {
    nameController = controller;
  }

  Future<void> isTokenAvailableCheck() async {
    final localService = LocalService();
    final token = await localService.getValue<String>(PreferenceKey.token);
    log(token.toString());

    if (token != null && token.isNotEmpty) {
      isTokenAvailable.value = true;
      await getProfile();
    }
  }

  Future<bool> getProfile() async {
    try {
      isLoading.value = true;
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.profile,
        null,
        is_auth: true,
      );

      log("response - $response");

      if (response != null && response['success'] == true) {
        final profileData = response['data'];

        if (profileData != null) {
          // Set the name
          final fullName = profileData['fullName'];
          if (fullName != null) {
            profileName.value = fullName.toString();
            nameController?.text = fullName.toString();
          }

          // Set the profile image URL
          final img = profileData['profileImage'];
          if (img != null && img.toString().isNotEmpty) {
            profileImageUrl.value = img.toString();
          }
        }

        return true;
      } else {
        log("Failed to load profile or profile doesn't exist");
        return false;
      }
    } catch (e) {
      log("Error getting profile: $e");
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> setUpProfile(String name, String imagePath) async {
    try {
      isLoading.value = true;

      if (isTokenAvailable.value) {
        // UPDATE MODE
        if (imagePath.isNotEmpty) {
          final Map<String, dynamic> requestBody = {"fullName": name};
          final response = await _networkConfig.ApiRequestHandler(
            RequestMethod.MULTIPART,
            Urls.profile,
            json.encode(requestBody),
            is_auth: true,
            imagePath: imagePath,
            dataPathName: 'data',
            filePathName: 'image',
          );

          if (response != null && response['success'] == true) {
            Get.back(); // ✅ FIXED (no context)
            AppSnackbar.show(
              message: "Profile Updated Successfully.",
              isSuccess: true,
            );
            return true;
          }
          return false;
        } else {
          // Update without image using PUT_V2
          final Map<String, dynamic> requestBody = {"fullName": name};

          final response = await _networkConfig.ApiRequestHandler(
            RequestMethod.PUT_V2,
            Urls.profile,
            json.encode(requestBody),
            is_auth: true,
          );

          if (response != null && response['success'] == true) {
            Get.back(); // ✅ FIXED (no context)
            AppSnackbar.show(
              message: "Profile Updated Successfully.",
              isSuccess: true,
            );
            return true;
          }
          return false;
        }
      } else {
        // CREATE MODE
        final Map<String, dynamic> requestBody = {"fullName": name};

        final response = await _networkConfig.ApiRequestHandler(
          RequestMethod.MULTIPART,
          Urls.profile,
          json.encode(requestBody),
          is_auth: false,
          imagePath: imagePath,
          dataPathName: 'data',
          filePathName: 'image',
        );

        if (response != null && response['success'] == true) {
          Get.off(() => LoginPage());
          AppSnackbar.show(
            message: "Profile Set up Successfully.",
            isSuccess: true,
          );
          return true;
        }
        return false;
      }
    } catch (e) {
      log("Error setting up profile: $e");
      AppSnackbar.show(
        message:
            "Failed to ${isTokenAvailable.value ? 'update' : 'create'} profile",
        isSuccess: false,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }
}
