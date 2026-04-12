import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/local/local_data.dart';

import '../../../core/const/user_info/user_info_controller.dart';
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

    // Browse-first: always go to the main app shell.
    // Logged-in users also get their profile loaded.
    Get.off(() => HomeBottomNav());
    if (uToken != null && uToken.isNotEmpty) {
      Get.put(UserInfoController(), permanent: true);
    }
  }
}
