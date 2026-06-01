import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/services/push_notification_service.dart';
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

  // v1.3.2+27: initialise Firebase + start the push notification
  // service. Both are wrapped in try/catch so a Firebase/network
  // hiccup at boot can't block the app from launching — push is
  // additive, not critical-path.
  try {
    await Firebase.initializeApp();
    // Fire-and-forget: PushNotificationService.init() captures the
    // FCM token, hooks message handlers, and tries to register the
    // token with the backend. Logs to console on failure.
    unawaited(PushNotificationService.init());
  } catch (e) {
    debugPrint('[main] Firebase init failed: $e');
  }

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
