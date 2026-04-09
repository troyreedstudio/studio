import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/controller/image_picker_controller.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../controller/8.sign_up_profile_setup_cnt.dart';

class SignUpProfileSetUp extends StatelessWidget {
  SignUpProfileSetUp({super.key});
  final TextEditingController nameController = TextEditingController();
  final SignUpProfileSetup controller = Get.put(SignUpProfileSetup());
  final ImagePickerController imagePicker = Get.put(ImagePickerController());

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      controller.setNameController(nameController);
    });

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
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: 16.h),
                // Back button
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    height: 40,
                    width: 40,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: const Icon(Icons.arrow_back_ios_new_rounded,
                        color: Colors.white, size: 16),
                  ),
                ),
                SizedBox(height: 24.h),

                // Logo
                Center(
                  child: Image.asset(
                    ImagePath.splashLogo,
                    height: 48.h,
                    fit: BoxFit.contain,
                  ),
                ),
                SizedBox(height: 28.h),

                // Heading
                Obx(
                  () => Text(
                    controller.isTokenAvailable.value
                        ? 'Edit Profile'
                        : 'Set Up Your Profile',
                    style: GoogleFonts.cormorantGaramond(
                      fontSize: 28.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                SizedBox(height: 6.h),
                Text(
                  'Tell us a bit about yourself',
                  style: GoogleFonts.poppins(
                    fontSize: 13.sp,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w300,
                  ),
                ),
                SizedBox(height: 32.h),

                // Profile Photo
                Center(
                  child: Obx(
                    () => GestureDetector(
                      onTap: () => imagePicker.pickImage(),
                      child: Stack(
                        children: [
                          Container(
                            height: 110.w,
                            width: 110.w,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.accentRoseGold,
                                width: 2,
                              ),
                              color: AppColors.backgroundSurface,
                            ),
                            child: ClipOval(child: _buildProfileImage()),
                          ),
                          // Edit overlay
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              height: 34,
                              width: 34,
                              decoration: BoxDecoration(
                                gradient: AppColors.gradientPrimary,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors.backgroundDark,
                                  width: 2,
                                ),
                              ),
                              child: const Icon(
                                Icons.camera_alt_outlined,
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 32.h),

                // Name label
                Text(
                  'Display Name',
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
                    controller: nameController,
                    enabled: !controller.isLoading.value,
                    style: GoogleFonts.poppins(
                      color: AppColors.textPrimary,
                      fontSize: 14.sp,
                    ),
                    decoration: InputDecoration(
                      hintText: 'How should we call you?',
                      hintStyle: GoogleFonts.poppins(
                        color: AppColors.textMuted,
                        fontSize: 14.sp,
                      ),
                      filled: true,
                      fillColor: AppColors.backgroundSurface,
                      prefixIcon: const Icon(Icons.person_outline_rounded,
                          color: AppColors.textMuted, size: 18),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderSubtle),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: AppColors.accentRoseGold, width: 1.5),
                      ),
                      disabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderSubtle),
                      ),
                      contentPadding: EdgeInsets.symmetric(
                          horizontal: 16.w, vertical: 14.h),
                    ),
                  ),
                ),
                const Spacer(),

                // Continue button
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
                            onPressed: () => _handleContinuePressed(),
                            child: Text(
                              'Continue',
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
    );
  }

  Widget _buildProfileImage() {
    if (imagePicker.selectedImage.value != null) {
      return Image.file(
        imagePicker.selectedImage.value!,
        height: 110,
        width: 110,
        fit: BoxFit.cover,
      );
    } else if (controller.profileImageUrl.value.isNotEmpty) {
      return Image.network(
        controller.profileImageUrl.value,
        height: 110,
        width: 110,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Center(
            child: CircularProgressIndicator(
              color: AppColors.accentRoseGold,
              strokeWidth: 2,
            ),
          );
        },
      );
    } else {
      return _buildPlaceholder();
    }
  }

  Widget _buildPlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.camera_alt_outlined,
          size: 32,
          color: AppColors.accentRoseGold.withOpacity(0.6),
        ),
        const SizedBox(height: 4),
        Text(
          'Add Photo',
          style: GoogleFonts.poppins(
            fontSize: 11,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  void _handleContinuePressed() {
    if (nameController.text.trim().isEmpty) {
      AppSnackbar.showWarning("Please enter your name");
      return;
    }

    String? imagePathName = imagePicker.selectedImage.value?.path;

    if (!controller.isTokenAvailable.value && imagePathName == null) {
      AppSnackbar.showWarning("Please add a profile photo");
      return;
    }

    log("message ${nameController.text} == $imagePathName");

    controller.setUpProfile(
      nameController.text.trim(),
      imagePathName ?? "",
    );
  }
}
