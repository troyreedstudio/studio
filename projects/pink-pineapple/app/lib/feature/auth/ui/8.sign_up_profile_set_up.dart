import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../core/const/app_colors.dart';
import '../../../core/const/country_list.dart';
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
              children: [
                Expanded(
                  child: SingleChildScrollView(
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
                              border:
                                  Border.all(color: AppColors.borderSubtle),
                            ),
                            child: const Icon(
                                Icons.arrow_back_ios_new_rounded,
                                color: Colors.white,
                                size: 16),
                          ),
                        ),
                        SizedBox(height: 24.h),

                        // Logo
                        Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 20.w),
                            child: Image.asset(
                              ImagePath.splashLogo,
                              width: double.infinity,
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                        SizedBox(height: 28.h),

                        // Heading
                        Obx(
                          () => Text(
                            controller.isTokenAvailable.value
                                ? 'Edit Profile'
                                : 'Set Up Your Profile',
                            style: GoogleFonts.outfit(
                              fontSize: 28.sp,
                              fontWeight: FontWeight.w800,
                              fontStyle: FontStyle.italic,
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
                                    child: ClipOval(
                                        child: _buildProfileImage()),
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

                        // Display Name
                        _buildFieldLabel('Display Name'),
                        SizedBox(height: 6.h),
                        Obx(
                          () => _buildTextField(
                            controller: nameController,
                            enabled: !controller.isLoading.value,
                            hintText: 'How should we call you?',
                            prefixIcon: Icons.person_outline_rounded,
                          ),
                        ),
                        SizedBox(height: 20.h),

                        // Country Dropdown
                        _buildFieldLabel('Where are you from?'),
                        SizedBox(height: 6.h),
                        Obx(
                          () => _buildCountryDropdown(context),
                        ),
                        SizedBox(height: 20.h),

                        // City
                        _buildFieldLabel('City'),
                        SizedBox(height: 6.h),
                        Obx(
                          () => _buildTextField(
                            controller: controller.cityController,
                            enabled: !controller.isLoading.value,
                            hintText: 'e.g. London, Singapore, Canggu',
                            prefixIcon: Icons.location_city_outlined,
                          ),
                        ),
                        SizedBox(height: 20.h),

                        // Date of Birth
                        _buildFieldLabel('Date of Birth'),
                        SizedBox(height: 6.h),
                        Obx(
                          () => _buildDobField(context),
                        ),
                        SizedBox(height: 20.h),

                        // Instagram
                        _buildFieldLabel('Instagram (optional)'),
                        SizedBox(height: 6.h),
                        _buildTextField(
                          controller: controller.instagramController,
                          hintText: 'your_handle',
                          prefixIcon: Icons.camera_alt_outlined,
                          prefixText: '@ ',
                        ),
                        SizedBox(height: 32.h),
                      ],
                    ),
                  ),
                ),

                // Continue button (pinned at bottom)
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
                                color: AppColors.accentRoseGold
                                    .withOpacity(0.3),
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

  // ─────────────────────────────────────────────────────────
  // FIELD BUILDERS
  // ─────────────────────────────────────────────────────────

  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: GoogleFonts.poppins(
        fontSize: 12.sp,
        color: AppColors.textSecondary,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    bool enabled = true,
    required String hintText,
    required IconData prefixIcon,
    String? prefixText,
  }) {
    return TextField(
      controller: controller,
      enabled: enabled,
      style: GoogleFonts.poppins(
        color: AppColors.textPrimary,
        fontSize: 14.sp,
      ),
      decoration: _inputDecoration(
        hintText: hintText,
        prefixIcon: prefixIcon,
      ).copyWith(
        prefixText: prefixText,
        prefixStyle: prefixText != null
            ? GoogleFonts.poppins(
                color: AppColors.textSecondary,
                fontSize: 14.sp,
                fontWeight: FontWeight.w500,
              )
            : null,
      ),
    );
  }

  Widget _buildCountryDropdown(BuildContext context) {
    // Extract country names from the list
    final countryNames =
        countryList.map((c) => c['name']!).toList();

    return DropdownButtonFormField<String>(
      value: controller.selectedCountry.value,
      isExpanded: true,
      dropdownColor: AppColors.surfaceElevated,
      icon: const Icon(Icons.keyboard_arrow_down_rounded,
          color: AppColors.textMuted, size: 20),
      style: GoogleFonts.poppins(
        color: AppColors.textPrimary,
        fontSize: 14.sp,
      ),
      decoration: _inputDecoration(
        hintText: 'Select your country',
        prefixIcon: Icons.public_outlined,
      ),
      menuMaxHeight: 300.h,
      items: countryNames.map((name) {
        // Find matching country for flag icon
        final country =
            countryList.firstWhere((c) => c['name'] == name);
        return DropdownMenuItem<String>(
          value: name,
          child: Text(
            '${country['icon']} $name',
            style: GoogleFonts.poppins(
              color: AppColors.textPrimary,
              fontSize: 14.sp,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        );
      }).toList(),
      onChanged: controller.isLoading.value
          ? null
          : (value) {
              controller.selectedCountry.value = value;
            },
    );
  }

  Widget _buildDobField(BuildContext context) {
    return GestureDetector(
      onTap: controller.isLoading.value
          ? null
          : () => _showDatePicker(context),
      child: AbsorbPointer(
        child: TextField(
          enabled: !controller.isLoading.value,
          controller: TextEditingController(
            text: controller.formattedDob,
          ),
          style: GoogleFonts.poppins(
            color: AppColors.textPrimary,
            fontSize: 14.sp,
          ),
          decoration: _inputDecoration(
            hintText: 'Select your date of birth',
            prefixIcon: Icons.cake_outlined,
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hintText,
    required IconData prefixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.poppins(
        color: AppColors.textMuted,
        fontSize: 14.sp,
      ),
      filled: true,
      fillColor: AppColors.backgroundSurface,
      prefixIcon: Icon(prefixIcon,
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
      contentPadding:
          EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
    );
  }

  // ─────────────────────────────────────────────────────────
  // DATE PICKER
  // ─────────────────────────────────────────────────────────

  Future<void> _showDatePicker(BuildContext context) async {
    final now = DateTime.now();
    final eighteenYearsAgo =
        DateTime(now.year - 18, now.month, now.day);

    final picked = await showDatePicker(
      context: context,
      initialDate: controller.selectedDob.value ??
          DateTime(2000, 1, 1),
      firstDate: DateTime(1940),
      lastDate: eighteenYearsAgo,
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: ColorScheme.dark(
              primary: AppColors.gradientMid,
              surface: AppColors.surface,
              onSurface: AppColors.textPrimary,
            ),
            dialogBackgroundColor: AppColors.surface,
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      controller.selectedDob.value = picked;
    }
  }

  // ─────────────────────────────────────────────────────────
  // PROFILE IMAGE
  // ─────────────────────────────────────────────────────────

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
        errorBuilder: (context, error, stackTrace) =>
            _buildPlaceholder(),
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

  // ─────────────────────────────────────────────────────────
  // CONTINUE HANDLER
  // ─────────────────────────────────────────────────────────

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
