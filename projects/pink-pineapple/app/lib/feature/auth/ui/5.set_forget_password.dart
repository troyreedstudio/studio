import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../controller/5.set_forget_pass_cnt.dart';

class SetForgetPasswordPage extends StatelessWidget {
  SetForgetPasswordPage({super.key});
  final TextEditingController newPasswordControllerField =
      TextEditingController();
  final TextEditingController newConfirmPasswordField = TextEditingController();

  final SetForgetPasswordCnt controller = Get.put(SetForgetPasswordCnt());

  InputDecoration _brandInputDecoration({
    required String hint,
    Widget? suffixWidget,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.poppins(
        color: AppColors.textMuted,
        fontSize: 14.sp,
      ),
      filled: true,
      fillColor: AppColors.backgroundSurface,
      prefixIcon: const Icon(Icons.lock_outline, color: AppColors.accentRoseGold, size: 18),
      suffixIcon: suffixWidget,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderSubtle),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.accentRoseGold, width: 1.5),
      ),
      contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF000000), Color(0xFF1A1A1A)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: 24.w),
            child: SizedBox(
              height: MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top -
                  MediaQuery.of(context).padding.bottom,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 20.h),
                  // Back arrow
                  GestureDetector(
                    onTap: () => Get.back(),
                    child: Container(
                      padding: EdgeInsets.all(8.w),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundCard,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Icon(
                        Icons.arrow_back_ios_new_rounded,
                        size: 16.sp,
                        color: AppColors.accentRoseGold,
                      ),
                    ),
                  ),
                  SizedBox(height: 24.h),
                  // Logo
                  Center(
                    child: Image.asset(
                      ImagePath.smallLogo,
                      height: 48.h,
                      fit: BoxFit.contain,
                    ),
                  ),
                  SizedBox(height: 28.h),
                  // Heading
                  Text(
                    'Reset Password',
                    style: GoogleFonts.cormorantGaramond(
                      fontSize: 32.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Text(
                    'Create your new password below.',
                    style: GoogleFonts.poppins(
                      fontSize: 13.sp,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w300,
                    ),
                  ),
                  SizedBox(height: 32.h),

                  // New Password label
                  Text(
                    'New Password',
                    style: GoogleFonts.poppins(
                      fontSize: 12.sp,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Obx(
                    () => TextField(
                      controller: newPasswordControllerField,
                      obscureText: controller.obscureText1.value,
                      style: GoogleFonts.poppins(
                        color: AppColors.textPrimary,
                        fontSize: 14.sp,
                      ),
                      decoration: _brandInputDecoration(
                        hint: 'Enter new password',
                        suffixWidget: IconButton(
                          icon: Icon(
                            controller.obscureText1.value
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: AppColors.textMuted,
                            size: 18,
                          ),
                          onPressed: controller.toggleVisibility1,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: 16.h),

                  // Confirm Password label
                  Text(
                    'Confirm Password',
                    style: GoogleFonts.poppins(
                      fontSize: 12.sp,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Obx(
                    () => TextField(
                      controller: newConfirmPasswordField,
                      obscureText: controller.obscureText2.value,
                      style: GoogleFonts.poppins(
                        color: AppColors.textPrimary,
                        fontSize: 14.sp,
                      ),
                      decoration: _brandInputDecoration(
                        hint: 'Confirm new password',
                        suffixWidget: IconButton(
                          icon: Icon(
                            controller.obscureText2.value
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: AppColors.textMuted,
                            size: 18,
                          ),
                          onPressed: controller.toggleVisibility2,
                        ),
                      ),
                    ),
                  ),

                  const Spacer(),

                  // CTA Button
                  Obx(
                    () => controller.isLoading.value
                        ? Center(child: loading())
                        : Container(
                            width: double.infinity,
                            height: 52.h,
                            decoration: BoxDecoration(
                              gradient: AppColors.gradientPrimary,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.accentRoseGold.withOpacity(0.3),
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: () {
                                controller.setPassword(
                                    newConfirmPasswordField.text);
                              },
                              child: Text(
                                'Change Password',
                                style: GoogleFonts.poppins(
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.backgroundDark,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ),
                  ),
                  SizedBox(height: 32.h),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
