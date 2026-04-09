import 'dart:convert';
import 'dart:developer';
import 'package:get/get.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/const/country_list.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../ui/7.sign_up_otp_verify.dart';

class SignInController extends GetxController {
  final isPasswordVisible = false.obs;
  final isConPasswordVisible = false.obs;
  final isLoading = false.obs;
  final NetworkConfigV1 _networkConfig = NetworkConfigV1();
  var obscureText = true.obs;

  void toggleVisibility() {
    obscureText.value = !obscureText.value;
  }

  var isRegisterLoading = false.obs;
  var isRegisterLoadingError = "".obs;

  // Country code properties
  var selectedCountryCode = '+1'.obs;
  var selectedCountryFlag = '🇺🇸'.obs;

  // Use the complete country list from country_list.dart with deduplication by code
  List<Map<String, String>> get uniqueCountryByCode {
    final seen = <String>{};
    final out = <Map<String, String>>[];
    for (final c in countryList) {
      final code = c['code'] ?? '';
      if (code.isEmpty || seen.contains(code)) continue;
      seen.add(code);
      out.add(c);
    }
    if (out.isNotEmpty &&
        !out.any((e) => e['code'] == selectedCountryCode.value)) {
      selectedCountryCode.value = out.first['code']!;
      selectedCountryFlag.value = getFlagByCode(selectedCountryCode.value);
    }
    return out;
  }

  String getFlagByCode(String code) {
    final country = uniqueCountryByCode.firstWhere(
      (c) => c['code'] == code,
      orElse: () => {'icon': '🌍'},
    );
    return country['icon'] ?? '🌍';
  }

  Future<bool> registerUser(
    String name,
    String email,
    String phone,
    String address,
    String password,
  ) async {
    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      AppSnackbar.show(message: 'Please fill all fields', isSuccess: false);
      return false;
    }

    try {
      isRegisterLoading.value = true;
      // Combine country code with phone number
      final fullPhoneNumber = '${selectedCountryCode.value}$phone';
      final Map<String, dynamic> requestBody = {
        "fullName": name,
        "phoneNumber": fullPhoneNumber,
        "fullAddress": address.isEmpty ? "no address" : address,
        "email": email,
        "role": "USER",
        "password": password,
      };
      log(requestBody.toString());
      final response = await _networkConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.signUp,
        json.encode(requestBody),
        is_auth: false,
      );
      log("registerUser $response ${response['data']}");
      if (response['success'] == false) {
        AppSnackbar.show(message: response['message'], isSuccess: false);
      }
      if (response != null && response['success'] == true) {
        AppSnackbar.show(message: "Registration Successful", isSuccess: true);
        Get.to(SignUpOTPVerification(), arguments: {'email': email});

        return true;
      } else {
        AppSnackbar.show(message: "Failed To Registration", isSuccess: false);
        return false;
      }
    } catch (e) {
      isRegisterLoadingError.value = e.toString();
      // AppSnackbar.show(message: "Failed To Registration", isSuccess: false);
      return false;
    } finally {
      isRegisterLoading.value = false;
    }
  }
}
