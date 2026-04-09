import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/local/local_data.dart';

import '../../../core/const/user_info/user_info_controller.dart';
import '../../free_user/ui/free_user_home_page.dart';
import '../../home_bottom_nav/ui/home_bottom_nav.dart';

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
      // User has token - show authenticated home
      Get.to(() => HomeBottomNav());
      Get.put(UserInfoController(), permanent: true);
    } else {
      // No token - show free user home (browse without login)
      Get.to(() => FreeUserHomePage());
    }
  }
}
