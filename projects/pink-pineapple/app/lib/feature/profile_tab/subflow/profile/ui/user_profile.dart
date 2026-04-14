import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/core/global_widgets/app_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/global_widgets/custom_text.dart';

import '../../profile_edit/ui/profile_edit_ui.dart';

class UserProfilePage extends StatefulWidget {
  const UserProfilePage({super.key});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
  final userInfo = Get.find<UserInfoController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ===== Cover =====
          SliverAppBar(
            expandedHeight: 100.h,
            pinned: true,
            backgroundColor: AppColors.backgroundDark,
            elevation: 0,
            automaticallyImplyLeading: false,
            leadingWidth: 60.w,
            leading: Padding(
              padding: EdgeInsets.all(8.w),
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSurface.withOpacity(0.8),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Icon(
                    Icons.arrow_back_ios_new,
                    color: AppColors.textPrimary,
                    size: 18.sp,
                  ),
                ),
              ),
            ),
            title: Text(
              userInfo.userInfo.value?.userProfile?.fullName ?? "no name",
              style: GoogleFonts.cormorantGaramond(
                color: AppColors.textPrimary,
                fontSize: 16.sp,
                fontWeight: FontWeight.w600,
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  ResponsiveNetworkImage(
                    imageUrl:
                        userInfo.userInfo.value?.userProfile?.profileImage ??
                        "",
                    fit: BoxFit.cover,
                    borderRadius: 0,
                  ),

                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.backgroundDark.withOpacity(0.5),
                          Colors.transparent,
                          AppColors.backgroundDark.withOpacity(0.7),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ===== Body =====
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.backgroundDark,
              ),
              child: Obx(() {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    // avatar overlap
                    Transform.translate(
                      offset: Offset(-130.w, 5.h),
                      child: Container(
                        height: 60.h,
                        width: 60.h,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10.r),
                          border: Border.all(color: AppColors.primaryColor, width: 2.5.w),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryColor.withOpacity(0.3),
                              blurRadius: 12,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8.r),
                          child: ResponsiveNetworkImage(
                            imageUrl:
                                userInfo
                                    .userInfo
                                    .value
                                    ?.userProfile
                                    ?.profileImage ??
                                "",
                          ),
                        ),
                      ),
                    ),
                    SizedBox(height: 10.h),
                    // name & handle row + edit button
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16.w),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          // Left side: name & handle
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    normalText(
                                      text:
                                          userInfo
                                              .userInfo
                                              .value
                                              ?.userProfile
                                              ?.fullName ??
                                          "no name",
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    SizedBox(height: 4.h),
                                    smallerText(
                                      text:
                                          "@${userInfo.userInfo.value?.userProfile?.username ?? "no username"}",
                                      color: AppColors.textSecondary,
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(width: 120.w),
                              // reserve some space for the button
                            ],
                          ),

                          // Edit button anchored to top-right
                          Positioned(
                            right: 0,
                            top: -20.h,
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () async {
                                  // Navigate to edit screen and refresh when returning
                                  await Get.to(() => ProfileEditScreen());
                                  // Refresh user info after returning from edit
                                  await userInfo.fetchUserInfo();
                                  // Force rebuild
                                  if (mounted) setState(() {});
                                },
                                borderRadius: BorderRadius.circular(12.r),
                                child: Container(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: 12.w,
                                    vertical: 8.h,
                                  ),
                                  decoration: BoxDecoration(
                                    gradient: AppColors.gradientPrimary,
                                    borderRadius: BorderRadius.circular(12.r),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.primaryColor.withOpacity(0.3),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.edit,
                                        size: 15.sp,
                                        color: AppColors.backgroundDark,
                                      ),
                                      SizedBox(width: 6.w),
                                      smallText(
                                        text: 'Edit',
                                        color: AppColors.backgroundDark,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    SizedBox(height: 10.h),

                    // location
                    Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        SizedBox(width: 16.w),
                        Icon(
                          Icons.location_on,
                          size: 16.sp,
                          color: AppColors.primaryColor,
                        ),
                        SizedBox(width: 6.w),
                        smallerText(
                          text:
                              userInfo
                                  .userInfo
                                  .value
                                  ?.userProfile
                                  ?.fullAddress ??
                              '',
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                    SizedBox(height: 10.h),

                    // bio
                    if ((userInfo.userInfo.value?.userProfile?.bio ?? '').isNotEmpty)
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16.w),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: smallText(
                            text: userInfo.userInfo.value?.userProfile?.bio ?? '',
                            color: AppColors.textSecondary,
                            maxLines: 10,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),

                    // email
                    if ((userInfo.userInfo.value?.userProfile?.email ?? '').isNotEmpty) ...[
                      SizedBox(height: 12.h),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          SizedBox(width: 16.w),
                          Icon(
                            Icons.email_outlined,
                            size: 16.sp,
                            color: AppColors.primaryColor,
                          ),
                          SizedBox(width: 6.w),
                          smallerText(
                            text: userInfo.userInfo.value?.userProfile?.email ?? '',
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ],

                    // phone
                    if ((userInfo.userInfo.value?.userProfile?.phoneNumber ?? '').isNotEmpty) ...[
                      SizedBox(height: 8.h),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          SizedBox(width: 16.w),
                          Icon(
                            Icons.phone_outlined,
                            size: 16.sp,
                            color: AppColors.primaryColor,
                          ),
                          SizedBox(width: 6.w),
                          smallerText(
                            text: userInfo.userInfo.value?.userProfile?.phoneNumber ?? '',
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ],

                    SizedBox(height: 24.h),
                  ],
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
