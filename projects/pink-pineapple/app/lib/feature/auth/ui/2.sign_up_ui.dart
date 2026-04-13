import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/country_code_picker.dart';
import '../controller/2.sign_up_cnt.dart';
import '1.login_ui.dart';

class SignUpPage extends StatelessWidget {
  SignUpPage({super.key});

  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController nameController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final SignInController controller = Get.put(SignInController());

  InputDecoration _brandInputDecoration({
    required String hint,
    IconData? prefixIcon,
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
      prefixIcon: prefixIcon != null
          ? Icon(prefixIcon, color: AppColors.textMuted, size: 18)
          : null,
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: 32.h),
                // Logo
                Center(
                  child: Image.asset(
                    ImagePath.splashLogo,
                    height: 56.h,
                    fit: BoxFit.contain,
                  ),
                ),
                SizedBox(height: 24.h),
                // Heading
                Text(
                  'Create Account',
                  style: GoogleFonts.cormorantGaramond(
                    fontSize: 32.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    letterSpacing: 0.5,
                  ),
                ),
                SizedBox(height: 6.h),
                Text(
                  'Join Pink Pineapple and discover Bali\'s finest venues',
                  style: GoogleFonts.poppins(
                    fontSize: 13.sp,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w300,
                  ),
                ),
                SizedBox(height: 28.h),

                // Full Name
                Text(
                  'Full Name',
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
                SizedBox(height: 6.h),
                TextField(
                  controller: nameController,
                  style: GoogleFonts.poppins(
                    color: AppColors.textPrimary,
                    fontSize: 14.sp,
                  ),
                  decoration: _brandInputDecoration(
                    hint: 'Your full name',
                    prefixIcon: Icons.person_outline_rounded,
                  ),
                ),
                SizedBox(height: 16.h),

                // Email
                Text(
                  'Email',
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
                SizedBox(height: 6.h),
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: GoogleFonts.poppins(
                    color: AppColors.textPrimary,
                    fontSize: 14.sp,
                  ),
                  decoration: _brandInputDecoration(
                    hint: 'your@email.com',
                    prefixIcon: Icons.mail_outline_rounded,
                  ),
                ),
                SizedBox(height: 16.h),

                // Phone (Optional)
                Text(
                  'Phone Number (Optional)',
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
                SizedBox(height: 6.h),
                Row(
                  children: [
                    Obx(() {
                      return GestureDetector(
                        onTap: () async {
                          final selected = await showCountryCodePicker(
                            context: context,
                            currentCode: controller.selectedCountryCode.value,
                          );
                          if (selected != null) {
                            controller.selectedCountryCode.value =
                                selected['code'] ?? '+1';
                            controller.selectedCountryFlag.value =
                                selected['icon'] ?? '🌍';
                          }
                        },
                        child: Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: 12.w,
                            vertical: 14.h,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundSurface,
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(color: AppColors.borderSubtle),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                controller.selectedCountryFlag.value,
                                style: TextStyle(fontSize: 16.sp),
                              ),
                              SizedBox(width: 6.w),
                              Text(
                                controller.selectedCountryCode.value,
                                style: GoogleFonts.poppins(
                                  color: AppColors.textPrimary,
                                  fontSize: 13.sp,
                                ),
                              ),
                              SizedBox(width: 4.w),
                              Icon(
                                Icons.keyboard_arrow_down_rounded,
                                color: AppColors.textMuted,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: TextField(
                        controller: phoneController,
                        keyboardType: TextInputType.phone,
                        style: GoogleFonts.poppins(
                          color: AppColors.textPrimary,
                          fontSize: 14.sp,
                        ),
                        decoration: _brandInputDecoration(hint: 'XX XXX XXXX'),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 16.h),

                // Password
                Text(
                  'Password',
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
                    controller: passwordController,
                    obscureText: controller.obscureText.value,
                    style: GoogleFonts.poppins(
                      color: AppColors.textPrimary,
                      fontSize: 14.sp,
                    ),
                    decoration: _brandInputDecoration(
                      hint: 'Create a password',
                      prefixIcon: Icons.lock_outline_rounded,
                      suffixWidget: IconButton(
                        icon: Icon(
                          controller.obscureText.value
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppColors.textMuted,
                          size: 18,
                        ),
                        onPressed: controller.toggleVisibility,
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 24.h),

                // Terms
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    text: 'By continuing you confirm you are 18+ and agree to our ',
                    style: GoogleFonts.poppins(
                      color: AppColors.textMuted,
                      fontSize: 11.sp,
                    ),
                    children: [
                      TextSpan(
                        text: 'Terms & Conditions',
                        style: GoogleFonts.poppins(
                          color: AppColors.accentRoseGold,
                          fontWeight: FontWeight.w600,
                          fontSize: 11.sp,
                        ),
                        recognizer: TapGestureRecognizer()..onTap = () {},
                      ),
                      TextSpan(
                        text: ' and ',
                        style: GoogleFonts.poppins(
                          color: AppColors.textMuted,
                          fontSize: 11.sp,
                        ),
                      ),
                      TextSpan(
                        text: 'Privacy Policy',
                        style: GoogleFonts.poppins(
                          color: AppColors.accentRoseGold,
                          fontWeight: FontWeight.w600,
                          fontSize: 11.sp,
                        ),
                        recognizer: TapGestureRecognizer()..onTap = () {},
                      ),
                      TextSpan(
                        text: '.',
                        style: GoogleFonts.poppins(
                          color: AppColors.textMuted,
                          fontSize: 11.sp,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 20.h),

                // Sign Up button
                Obx(
                  () => controller.isRegisterLoading.value
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
                              controller.registerUser(
                                nameController.text,
                                emailController.text,
                                phoneController.text,
                                addressController.text,
                                passwordController.text,
                              );
                            },
                            child: Text(
                              'Create Account',
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
                SizedBox(height: 20.h),

                // Login link
                Center(
                  child: RichText(
                    text: TextSpan(
                      text: 'Already have an account?  ',
                      style: GoogleFonts.poppins(
                        color: AppColors.textSecondary,
                        fontSize: 13.sp,
                      ),
                      children: [
                        TextSpan(
                          text: 'Sign In',
                          style: GoogleFonts.poppins(
                            color: AppColors.accentRoseGold,
                            fontWeight: FontWeight.w600,
                            fontSize: 13.sp,
                          ),
                          recognizer: TapGestureRecognizer()
                            ..onTap = () => Get.off(() => LoginPage()),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 32.h),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
