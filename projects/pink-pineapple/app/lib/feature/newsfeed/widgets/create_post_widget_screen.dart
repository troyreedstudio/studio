// lib/feature/home/ui/create_post_screen.dart

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/app_snackbar.dart';
import 'package:pineapple/core/style/global_text_style.dart';
import 'package:pineapple/feature/newsfeed/controller/news_feed_controller.dart';

class CreatePostScreen extends StatelessWidget {
  CreatePostScreen({super.key});

  final controller = Get.find<NewsFeedController>();
  final userInfoController = Get.find<UserInfoController>();

  @override
  Widget build(BuildContext context) {
    print('CreatePostScreen controller hash: ${controller.hashCode}');
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 20.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 40.w,
                      height: 40.h,
                      decoration: BoxDecoration(
                        color: AppColors.backgroundElevated,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Icon(
                        Icons.arrow_back_ios,
                        size: 20.sp,
                        color: AppColors.primaryColor,
                      ),
                    ),
                  ),
                  SizedBox(width: 16.w),
                  Text(
                    "Create New Post",
                    style: globalTextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              SizedBox(height: 30.h),

              // User Profile + Input
              Row(
                children: [
                  Obx(() {
                    return CircleAvatar(
                      radius: 20.r,
                      backgroundColor: AppColors.backgroundSurface,
                      backgroundImage: NetworkImage(
                        userInfoController
                                .userInfo
                                .value
                                ?.userProfile
                                ?.profileImage ??
                            "",
                      ),
                    );
                  }),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: TextField(
                      onChanged: (value) => controller.postText.value = value,
                      decoration: InputDecoration(
                        hintText: "What's on our mind?",
                        hintStyle: globalTextStyle(
                          fontSize: 16.sp,
                          color: AppColors.textMuted,
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                      style: globalTextStyle(
                        fontSize: 16.sp,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: null,
                    ),
                  ),
                ],
              ),
              SizedBox(height: 20.h),

              // Divider
              Divider(color: AppColors.borderSubtle),

              // Options
              _buildOptionRow(
                icon: FontAwesomeIcons.image,
                label: "Photos",
                onTap: () => _addImage(),
              ),
              _buildOptionRow(
                icon: FontAwesomeIcons.camera,
                label: "Camera",
                onTap: () => _takePhoto(),
              ),
              _buildOptionRow(
                icon: FontAwesomeIcons.locationDot,
                label: "Location",
                onTap: () => _addLocation(),
              ),

              SizedBox(height: 30.h),

              // Image Preview Grid (Dynamic Layout)
              Obx(() {
                if (controller.selectedImages.isEmpty) return SizedBox.shrink();

                return Container(
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSurface,
                    borderRadius: BorderRadius.circular(12.r),
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  padding: EdgeInsets.all(4.w),
                  child: _buildImageGrid(controller.selectedImages),
                );
              }),

              SizedBox(height: 40.h),

              // Create Button
              SizedBox(
                width: double.infinity,
                height: 50.h,
                child: Obx(() {
                  return controller.isUploadLoading.value
                      ? loading()
                      : Container(
                          decoration: BoxDecoration(
                            gradient: AppColors.gradientPrimary,
                            borderRadius: BorderRadius.circular(12.r),
                          ),
                          child: ElevatedButton(
                            onPressed: () => controller.submitPost(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12.r),
                              ),
                            ),
                            child: Text(
                              "Create New",
                              style: globalTextStyle(
                                fontSize: 16.sp,
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        );
                }),
              ),
              SizedBox(height: 30.h),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionRow({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: FaIcon(icon, color: AppColors.primaryColor, size: 18.sp),
      title: Text(
        label,
        style: globalTextStyle(
          fontSize: 16.sp,
          color: AppColors.textPrimary,
        ),
      ),
      onTap: onTap,
    );
  }

  Widget _buildImageGrid(List<File> images) {
    switch (images.length) {
      case 1:
        return GestureDetector(
          onTap: () => controller.removeImage(0),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12.r),
            child: Image.file(
              images[0],
              width: double.infinity,
              height: 200.h,
              fit: BoxFit.cover,
            ),
          ),
        );

      case 2:
        return Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => controller.removeImage(0),
                child: ClipRRect(
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(12.r),
                    bottomLeft: Radius.circular(12.r),
                  ),
                  child: Image.file(
                    images[0],
                    height: 150.h,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
            SizedBox(width: 5.w),
            Expanded(
              child: GestureDetector(
                onTap: () => controller.removeImage(1),
                child: ClipRRect(
                  borderRadius: BorderRadius.only(
                    topRight: Radius.circular(12.r),
                    bottomRight: Radius.circular(12.r),
                  ),
                  child: Image.file(
                    images[1],
                    height: 150.h,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
          ],
        );

      case 3:
        return Column(
          children: [
            GestureDetector(
              onTap: () => controller.removeImage(0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12.r),
                child: Image.file(
                  images[0],
                  width: double.infinity,
                  height: 120.h,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            SizedBox(height: 8.h),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => controller.removeImage(1),
                    child: ClipRRect(
                      borderRadius: BorderRadius.only(
                        bottomLeft: Radius.circular(12.r),
                      ),
                      child: Image.file(
                        images[1],
                        height: 120.h,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  child: GestureDetector(
                    onTap: () => controller.removeImage(2),
                    child: ClipRRect(
                      borderRadius: BorderRadius.only(
                        bottomRight: Radius.circular(12.r),
                      ),
                      child: Image.file(
                        images[2],
                        height: 120.h,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        );

      default:
        return SizedBox.shrink();
    }
  }

  Future<void> _addImage() async {
    await controller
        .pickImageFromGallery(); // it already adds via addImage(...)
  }

  Future<void> _takePhoto() async {
    await controller.pickImageFromCamera(); // it already adds via addImage(...)
  }

  void _addLocation() {
    AppSnackbar.show(message: 'Location feature coming soon', isSuccess: false);
  }
}
