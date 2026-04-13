import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../controller/0.splash_screen_controller.dart';

class SplashScreen extends StatelessWidget {
  SplashScreen({super.key});
  final SplashScreenController controller = Get.put(SplashScreenController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF000000),
              Color(0xFF12121A),
              Color(0xFF000000),
            ],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Spacer(flex: 2),
            // Logo
            Image.asset(
              ImagePath.splashLogo,
              height: MediaQuery.of(context).size.height * 0.18,
              width: double.infinity,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 20),
            // Brand name
            Text(
              'PINK PINEAPPLE',
              style: GoogleFonts.outfit(
                fontSize: 28.sp,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
                color: AppColors.accentRoseGold,
                letterSpacing: 6,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'BALI',
              style: GoogleFonts.poppins(
                fontSize: 11.sp,
                fontWeight: FontWeight.w300,
                color: AppColors.textSecondary,
                letterSpacing: 8,
              ),
            ),
            const Spacer(flex: 2),
            // Loading indicator
            loading(),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}
