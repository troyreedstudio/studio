import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/core/global_widgets/logout_dialog.dart';
import 'package:pineapple/core/local/local_data.dart';
import 'package:pineapple/core/const/app_colors.dart';

import '../../../core/const/user_info/user_info_model.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../controller/profile_tab_controller.dart';
import '../subflow/profile/ui/user_profile.dart';

class ProfileTabPage extends StatelessWidget {
  const ProfileTabPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(ProfileTabController());
    final userInfoController = Get.find<UserInfoController>();

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
            padding: EdgeInsets.all(16.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(height: 8.h),

                // Page heading
                Text(
                  'PROFILE',
                  style: GoogleFonts.cormorantGaramond(
                    fontSize: 22.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    letterSpacing: 3,
                  ),
                ),

                SizedBox(height: 20.h),

                // Profile Header
                _buildProfileHeader(userInfoController),

                SizedBox(height: 16.h),

                _buildMenuSection(controller),

                SizedBox(height: 16.h),

                _buildPreferencesSection(controller),

                SizedBox(height: 16.h),

                // Log Out
                _buildActionTile(
                  iconColor: AppColors.errorColor,
                  iconData: Icons.logout_rounded,
                  title: 'Log Out',
                  onTap: () {
                    Get.dialog(
                      LogOutDialog(
                        onContinue: () async {
                          controller.onLogoutTap();
                          Navigator.pop(context);
                          LocalService().clearUserData();
                        },
                      ),
                      barrierDismissible: true,
                      barrierColor: Colors.black54,
                    );
                  },
                ),

                SizedBox(height: 24.h),

                Text(
                  'Version 1.1.0',
                  style: GoogleFonts.poppins(
                    fontSize: 11.sp,
                    color: AppColors.textMuted,
                  ),
                ),

                SizedBox(height: 16.h),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader(UserInfoController controller) {
    return Obx(
      () => controller.userInfo.value == null
          ? _loadingProfileHeader()
          : _buildProfileContent(controller.userInfo.value!),
    );
  }

  Widget _loadingProfileHeader() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            width: 52.w,
            height: 52.w,
            decoration: BoxDecoration(
              color: AppColors.backgroundSurface,
              shape: BoxShape.circle,
            ),
          ),
          SizedBox(width: 16.w),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 120.w,
                height: 14.h,
                decoration: BoxDecoration(
                  color: AppColors.backgroundSurface,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              SizedBox(height: 8.h),
              Container(
                width: 80.w,
                height: 11.h,
                decoration: BoxDecoration(
                  color: AppColors.backgroundSurface,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProfileContent(UserInfoModel user) {
    return GestureDetector(
      onTap: () => Get.to(() => UserProfilePage()),
      child: Container(
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            // Avatar with rose-gold ring
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                gradient: AppColors.gradientPrimary,
                shape: BoxShape.circle,
              ),
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: AppColors.backgroundCard,
                  shape: BoxShape.circle,
                ),
                child: ResponsiveNetworkImage(
                  imageUrl: user.userProfile?.profileImage ?? "",
                  shape: ImageShape.circle,
                  widthPercent: 0.16,
                  heightPercent: 0.08,
                  fit: BoxFit.cover,
                ),
              ),
            ),

            SizedBox(width: 16.w),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    user.userProfile?.fullName ?? 'Anonymous',
                    style: GoogleFonts.cormorantGaramond(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 3.h),
                  Text(
                    user.userProfile?.email ?? '',
                    style: GoogleFonts.poppins(
                      fontSize: 11.sp,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),

            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 16.sp,
              color: AppColors.accentRoseGold,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection(ProfileTabController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.only(left: 4.w, bottom: 10.h),
          child: Text(
            'ACCOUNT',
            style: GoogleFonts.poppins(
              fontSize: 10.sp,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.5,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: AppColors.backgroundCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          ),
          child: Column(
            children: controller.menuItems
                .asMap()
                .entries
                .map((entry) => _buildMenuTile(
                      entry.value,
                      isLast: entry.key == controller.menuItems.length - 1,
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildPreferencesSection(ProfileTabController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.only(left: 4.w, bottom: 10.h),
          child: Text(
            'SUPPORT',
            style: GoogleFonts.poppins(
              fontSize: 10.sp,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.5,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: AppColors.backgroundCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          ),
          child: Column(
            children: controller.preferencesItems
                .asMap()
                .entries
                .map((entry) => _buildMenuTile(
                      entry.value,
                      isLast: entry.key == controller.preferencesItems.length - 1,
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildMenuTile(ProfileMenuItem item, {bool isLast = false}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(16.r),
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.accentRoseGold.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Image.asset(
                      item.iconPath,
                      width: 18.w,
                      height: 18.h,
                      color: AppColors.accentRoseGold,
                      errorBuilder: (context, error, stackTrace) =>
                          Icon(Icons.settings, size: 18.w, color: AppColors.accentRoseGold),
                    ),
                  ),

                  SizedBox(width: 14.w),

                  Expanded(
                    child: Text(
                      item.title,
                      style: GoogleFonts.poppins(
                        fontSize: 13.sp,
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),

                  Icon(
                    Icons.arrow_forward_ios,
                    size: 13.w,
                    color: AppColors.textMuted,
                  ),
                ],
              ),
            ),
            if (!isLast)
              Divider(
                height: 1,
                color: AppColors.borderSubtle,
                indent: 56.w,
                endIndent: 16.w,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required IconData iconData,
    required Color iconColor,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16.r),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(iconData, size: 18.w, color: iconColor),
                ),

                SizedBox(width: 14.w),

                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.poppins(
                      fontSize: 13.sp,
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),

                Icon(
                  Icons.arrow_forward_ios,
                  size: 13.w,
                  color: AppColors.textMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
