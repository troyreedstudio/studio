import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../controller/6.edit_password_cnt.dart';

class EditPasswordPage extends StatelessWidget {
  EditPasswordPage({super.key});

  final TextEditingController oldPasswordTextEditor = TextEditingController();
  final TextEditingController newPasswordControllerField =
      TextEditingController();
  final EditPasswordController editPasswordController = Get.put(
    EditPasswordController(),
  );
  final TextEditingController newConfirmPasswordField = TextEditingController();

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
                  SizedBox(height: 40.h),
                  // Logo
                  Center(
                    child: Image.asset(
                      ImagePath.splashLogo,
                      height: 64.h,
                      fit: BoxFit.contain,
                    ),
                  ),
                  SizedBox(height: 32.h),
                  // Heading
                  Text(
                    'Change Password',
                    style: GoogleFonts.cormorantGaramond(
                      fontSize: 32.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Text(
                    'Provide your current password and a new one.',
                    style: GoogleFonts.poppins(
                      fontSize: 13.sp,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(height: 32.h),

                  // Current Password
                  Text(
                    'CURRENT PASSWORD',
                    style: GoogleFonts.poppins(
                      fontSize: 10.sp,
                      color: AppColors.textMuted,
                      letterSpacing: 1.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 8.h),
                  Obx(
                    () => TextField(
                      controller: oldPasswordTextEditor,
                      obscureText: editPasswordController.obscureText1.value,
                      style: GoogleFonts.poppins(
                        color: AppColors.textPrimary,
                        fontSize: 14.sp,
                      ),
                      decoration: _brandInputDecoration(
                        hint: 'Enter current password',
                        suffixWidget: IconButton(
                          icon: Icon(
                            editPasswordController.obscureText1.value
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: AppColors.textMuted,
                            size: 18,
                          ),
                          onPressed: editPasswordController.toggleVisibility1,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: 20.h),

                  // New Password
                  Text(
                    'NEW PASSWORD',
                    style: GoogleFonts.poppins(
                      fontSize: 10.sp,
                      color: AppColors.textMuted,
                      letterSpacing: 1.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 8.h),
                  Obx(
                    () => TextField(
                      controller: newConfirmPasswordField,
                      obscureText: editPasswordController.obscureText2.value,
                      style: GoogleFonts.poppins(
                        color: AppColors.textPrimary,
                        fontSize: 14.sp,
                      ),
                      decoration: _brandInputDecoration(
                        hint: 'Enter new password',
                        suffixWidget: IconButton(
                          icon: Icon(
                            editPasswordController.obscureText2.value
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: AppColors.textMuted,
                            size: 18,
                          ),
                          onPressed: editPasswordController.toggleVisibility2,
                        ),
                      ),
                    ),
                  ),

                  const Spacer(),

                  // CTA
                  Obx(
                    () => editPasswordController.isLoading.value
                        ? loading()
                        : Container(
                            width: double.infinity,
                            height: 52.h,
                            decoration: BoxDecoration(
                              gradient: AppColors.gradientPrimary,
                              borderRadius: BorderRadius.circular(12),
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
                                editPasswordController.changePassword(
                                  newPassword: newConfirmPasswordField.text,
                                  oldPassword: oldPasswordTextEditor.text,
                                );
                              },
                              child: Text(
                                'Update Password',
                                style: GoogleFonts.poppins(
                                  fontSize: 14.sp,
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
