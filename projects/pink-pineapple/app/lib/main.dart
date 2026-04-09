import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/services/websocket_service.dart';
import 'package:pineapple/feature/auth/ui/0.splash_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:upgrader/upgrader.dart';

import 'core/binding/binding.dart';
import 'core/const/app_colors.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  configEasyLoading();
  await SharedPreferences.getInstance();
  Get.put<WebSocketService>(WebSocketService(), permanent: true);
  await SystemChrome.setEnabledSystemUIMode(
    SystemUiMode
        .immersiveSticky, // This hides both status bar and navigation bar
    overlays: [], // No overlays
  );
  runApp(const MyApp());
}

void configEasyLoading() {
  EasyLoading.instance
    ..loadingStyle = EasyLoadingStyle.custom
    ..backgroundColor = AppColors.backgroundCard
    ..textColor = AppColors.textPrimary
    ..indicatorColor = AppColors.primaryColor
    ..maskColor = AppColors.backgroundDark.withOpacity(0.6)
    ..userInteractions = false
    ..dismissOnTap = false;
}

class MyApp extends StatelessWidget {
  @override
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(360, 640),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) => GetMaterialApp(
        debugShowCheckedModeBanner: false,
        builder: (context, child) {
          // ✅ this ensures overlay stack is correct
          return EasyLoading.init()(context, child);
        },
        initialBinding: InitialBinding(),
        home: UpgradeAlert(
          upgrader: Upgrader(),
          child: SplashScreen(),
        ),
      ),
    );
  }
}
