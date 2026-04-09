import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../../core/const/app_colors.dart';
import '../../../../../core/const/user_info/user_info_controller.dart';
import '../../../../../core/global_widgets/app_network_image.dart';
import '../../../../../core/global_widgets/bg_screen_widget.dart';
import '../../../../../core/style/global_text_style.dart';
import '../controller/profile_edit_controller.dart';

class ProfileEditScreen extends StatelessWidget {
  ProfileEditScreen({super.key});

  final c = Get.put(ProfileEditController());
  final user = Get.find<UserInfoController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // header
              Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 40.w,
                      height: 40.h,
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSurface,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Icon(
                        Icons.arrow_back_ios,
                        size: 20.sp,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  SizedBox(width: 16.w),
                  Text(
                    "Profile Settings",
                    style: GoogleFonts.cormorantGaramond(
                      fontSize: 20.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              SizedBox(height: 16.h),

              // avatar + name + email
              Center(
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: () => _showImagePickerBottomSheet(context),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            height: 100.w,
                            width: 100.w,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(100.r),
                              color: AppColors.backgroundSurface,
                              border: Border.all(color: AppColors.primaryColor, width: 2.5),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primaryColor.withOpacity(0.3),
                                  blurRadius: 12,
                                  spreadRadius: 1,
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(100.r),
                              child: Obx(() {
                                // NEW: uses profileFile (multipart controller)
                                if (c.profileFile.value != null) {
                                  return Image.file(
                                    c.profileFile.value!,
                                    fit: BoxFit.cover,
                                  );
                                }

                                final url = (c.profileImageUrl.value.isNotEmpty)
                                    ? c.profileImageUrl.value
                                    : (user
                                              .userInfo
                                              .value
                                              ?.userProfile
                                              ?.profileImage ??
                                          '');

                                return ResponsiveNetworkImage(
                                  imageUrl: url,
                                  fit: BoxFit.cover,
                                );
                              }),
                            ),
                          ),
                          Positioned(
                            bottom: -6.h,
                            right: 0,
                            child: InkWell(
                              onTap: () => _showImagePickerBottomSheet(context),
                              child: Container(
                                height: 28.w,
                                width: 28.w,
                                decoration: BoxDecoration(
                                  color: AppColors.primaryColor,
                                  borderRadius: BorderRadius.circular(100.r),
                                ),
                                child: Icon(
                                  Icons.edit,
                                  color: AppColors.backgroundDark,
                                  size: 16,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 10.h),
                    Text(
                      user.userInfo.value?.userProfile?.fullName ?? 'Anonymous',
                      style: GoogleFonts.cormorantGaramond(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      user.userInfo.value?.userProfile?.email ?? '',
                      style: globalTextStyle(
                        fontSize: 12.sp,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 20.h),

              // form fields
              _label('Full Name*'),
              _field(controller: c.fullName, hint: 'Enter Full Name'),

              _label('User Name*'),
              _field(controller: c.userName, hint: 'username', prefixText: '@'),

              _label('Date Of Birth*'),
              Obx(() {
                // Note: creating a controller here is ok for display-only,
                // but if you want best practice, store a dobController in GetX controller.
                final dobCtrl = TextEditingController(text: c.dobText);
                return _field(
                  controller: dobCtrl,
                  hint: 'DDMMYY',
                  readOnly: true,
                  suffix: _iconBtn(Icons.calendar_today_outlined, () async {
                    final now = DateTime.now();
                    final picked = await showDatePicker(
                      context: context,
                      initialDate:
                          c.selectedDOB.value ?? DateTime(now.year - 10),
                      firstDate: DateTime(1900), // oldest allowed birth year
                      lastDate: now, // cannot select future date
                    );

                    if (picked != null) {
                      c.selectedDOB.value = picked;
                    }
                  }),
                );
              }),

              _label('Address*'),
              _field(controller: c.fullAddress, hint: 'location'),

              _label('Bio*'),
              _field(controller: c.bio, hint: 'describe', maxLines: 3),

              _label('Profile Privacy*'),
              Obx(
                () => Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: 12.w,
                    vertical: 6.h,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSurface,
                    borderRadius: BorderRadius.circular(12.r),
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: c.privacy.value,
                      borderRadius: BorderRadius.circular(12.r),
                      dropdownColor: AppColors.backgroundElevated,
                      items: c.privacyOptions
                          .map(
                            (e) => DropdownMenuItem(
                              value: e,
                              child: Text(
                                e,
                                style: globalTextStyle(fontSize: 14.sp, color: AppColors.textPrimary),
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (v) {
                        if (v != null) c.privacy.value = v;
                      },
                      isDense: true,
                      iconEnabledColor: AppColors.primaryColor,
                    ),
                  ),
                ),
              ),

              _label('Phone*'),
              Row(
                children: [
                  // country picker (code + flag)
                  Obx(() {
                    final items = c.uniqueCountryByCode;
                    return Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: 8.w,
                        vertical: 10.h,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSurface,
                        borderRadius: BorderRadius.circular(12.r),
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: c.selectedCountryCode.value,
                          isDense: true,
                          dropdownColor: AppColors.backgroundElevated,
                          iconEnabledColor: AppColors.primaryColor,
                          items: items.map((item) {
                            return DropdownMenuItem<String>(
                              value: item['code'],
                              child: Row(
                                children: [
                                  Text(
                                    item['icon'] ?? '🌍',
                                    style: TextStyle(fontSize: 18.sp),
                                  ),
                                  SizedBox(width: 6.w),
                                  Text(
                                    item['code'] ?? '',
                                    style: globalTextStyle(fontSize: 14.sp, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (v) {
                            if (v != null) {
                              c.selectedCountryCode.value = v;
                              c.selectedCountryFlag.value = c.getFlagByCode(v);
                            }
                          },
                        ),
                      ),
                    );
                  }),
                  SizedBox(width: 8.w),
                  Expanded(
                    child: _field(
                      controller: c.phoneNumber,
                      hint: 'XX XXX XXXX',
                      keyboardType: TextInputType.phone,
                    ),
                  ),
                ],
              ),


              SizedBox(height: 28.h),

              // Save button (multipart save)
              Obx(() {
                final busy = c.isLoading.value;
                return GestureDetector(
                  onTap: busy ? null : () => c.saveAndClose(context),
                  child: Container(
                    width: double.infinity,
                    height: 50.h,
                    decoration: BoxDecoration(
                      gradient: busy ? null : AppColors.gradientPrimary,
                      color: busy ? AppColors.backgroundSurface : null,
                      borderRadius: BorderRadius.circular(12.r),
                      boxShadow: busy ? [] : [
                        BoxShadow(
                          color: AppColors.primaryColor.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: busy
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.primaryColor,
                              ),
                            )
                          : Text(
                              'Save Changes',
                              style: globalTextStyle(
                                fontSize: 16.sp,
                                color: AppColors.backgroundDark,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                );
              }),
              SizedBox(height: 20.h),
            ],
          ),
        ),
      ),
    );
  }

  // ---------- helpers ----------
  Widget _label(String text) => Padding(
    padding: EdgeInsets.only(left: 4.w, bottom: 6.h, top: 12.h),
    child: Text(
      text,
      style: globalTextStyle(fontSize: 14.sp, color: AppColors.textSecondary),
    ),
  );

  InputDecoration _decoration({
    String? hint,
    Widget? suffix,
    String? prefixText,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: globalTextStyle(
        fontSize: 14.sp,
        color: AppColors.textMuted,
      ),
      filled: true,
      fillColor: AppColors.backgroundSurface,
      prefixStyle: globalTextStyle(fontSize: 14.sp, color: AppColors.textSecondary),
      contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 12.h),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12.r),
        borderSide: BorderSide(color: AppColors.borderSubtle),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12.r),
        borderSide: BorderSide(color: AppColors.borderSubtle),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12.r),
        borderSide: BorderSide(color: AppColors.primaryColor),
      ),
      suffixIcon: suffix,
      prefixText: prefixText,
    );
  }

  Widget _field({
    required TextEditingController controller,
    String? hint,
    int maxLines = 1,
    bool readOnly = false,
    Widget? suffix,
    String? prefixText,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      readOnly: readOnly,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: _decoration(
        hint: hint,
        suffix: suffix,
        prefixText: prefixText,
      ),
      style: globalTextStyle(fontSize: 14.sp, color: AppColors.textPrimary),
      cursorColor: AppColors.primaryColor,
    );
  }

  Widget _iconBtn(IconData icon, VoidCallback onTap) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(10.r),
    child: Container(
      width: 40.w,
      height: 40.w,
      decoration: BoxDecoration(
        color: AppColors.backgroundElevated,
        borderRadius: BorderRadius.circular(10.r),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Icon(icon, size: 18.sp, color: AppColors.primaryColor),
    ),
  );

  void _showImagePickerBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.backgroundDark,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.all(16.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40.w,
              height: 4.h,
              decoration: BoxDecoration(
                color: AppColors.borderAccent,
                borderRadius: BorderRadius.circular(2.r),
              ),
            ),
            SizedBox(height: 16.h),
            Text(
              'Select Profile Picture',
              style: globalTextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            SizedBox(height: 16.h),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _imageOption(
                  icon: Icons.camera_alt,
                  label: 'Camera',
                  onTap: () {
                    Navigator.pop(context);
                    c.pickProfileFromCamera();
                  },
                ),
                _imageOption(
                  icon: Icons.photo_library,
                  label: 'Gallery',
                  onTap: () {
                    Navigator.pop(context);
                    c.pickProfileFromGallery();
                  },
                ),
              ],
            ),
            SizedBox(height: 12.h),
            _imageOption(
              icon: Icons.delete,
              label: 'Remove',
              color: AppColors.errorColor,
              onTap: () {
                Navigator.pop(context);
                c.removeProfile();
              },
            ),
            SizedBox(height: 12.h),
            Text(
              'Photo will be uploaded when you tap "Save Changes".',
              style: globalTextStyle(
                fontSize: 12.sp,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imageOption({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 12.h, horizontal: 16.w),
        decoration: BoxDecoration(
          color: (color ?? AppColors.primaryColor).withOpacity(.08),
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(
            color: (color ?? AppColors.primaryColor).withOpacity(.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color ?? AppColors.primaryColor),
            SizedBox(width: 8.w),
            Text(label, style: globalTextStyle(fontSize: 14.sp, color: AppColors.textPrimary)),
          ],
        ),
      ),
    );
  }
}
