import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/local/local_data.dart';

import '../../../core/const/user_info/user_info_controller.dart';
import '../../home_bottom_nav/ui/home_bottom_nav.dart';
import '../ui/1.login_ui.dart';

class SplashScreenController extends GetxController {
  var userImage = "".obs;
  var firstname = ''.obs;
  var lastName = ''.obs;
  final logger = Logger();
  final local = LocalService();

  @override
  void onInit() {
    super.onInit();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    moveToLoginScreen();
  }

  moveToLoginScreen() async {
    final uToken = await local.getValue<String>(PreferenceKey.token);
    await Future.delayed(const Duration(seconds: 2));

    if (uToken != null && uToken.isNotEmpty) {
      // Already logged in — go straight to home
      Get.put(UserInfoController(), permanent: true);
      Get.off(() => HomeBottomNav());
    } else {
      // Not logged in — show login screen
      Get.off(() => LoginPage());
    }
  }
}
