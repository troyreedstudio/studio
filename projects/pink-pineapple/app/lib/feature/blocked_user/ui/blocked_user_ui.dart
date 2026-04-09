import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/global_widgets/custom_text.dart';
import '../controller/blocked_user_controller.dart';
import '../model/blocked_user_model.dart';

class BlockedUsersPage extends StatelessWidget {
  const BlockedUsersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(BlockedUserController());

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0D0D1A), Color(0xFF000000)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(controller),
              _buildSearchBar(controller),
              Expanded(
                child: Obx(() {
                  if (controller.isLoading.value) {
                    return Center(
                      child: loading(colors: AppColors.primaryColor),
                    );
                  }

                  if (!controller.hasBlockedUsers) {
                    return _buildEmptyState();
                  }

                  if (controller.filteredBlockedUsers.isEmpty &&
                      controller.isSearching) {
                    return _buildNoSearchResults();
                  }

                  return RefreshIndicator(
                    onRefresh: () async => controller.refreshBlockedUsers(),
                    color: AppColors.primaryColor,
                    child: ListView.builder(
                      padding: EdgeInsets.symmetric(
                        horizontal: 16.w,
                        vertical: 8.h,
                      ),
                      itemCount: controller.filteredBlockedUsers.length,
                      itemBuilder: (context, index) {
                        return _buildUserCard(
                          controller.filteredBlockedUsers[index],
                          controller,
                        );
                      },
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BlockedUserController controller) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
      child: Row(
        children: [
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundCard,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: IconButton(
              onPressed: () => Get.back(), // ✅ FIXED
              icon: Icon(
                Icons.arrow_back_ios,
                color: AppColors.primaryColor,
                size: 24.sp,
              ),
            ),
          ),
          SizedBox(width: 8.w),
          Expanded(
            child: headingText(
              text: 'Blocked Users',
              color: AppColors.textPrimary,
            ),
          ),
          Obx(
            () => controller.hasBlockedUsers
                ? Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: 12.w,
                      vertical: 6.h,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primaryColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16.r),
                    ),
                    child: smallText(
                      text: '${controller.blockedUsersCount}',
                      color: AppColors.primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BlockedUserController controller) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
      padding: EdgeInsets.symmetric(horizontal: 16.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(25.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(
            Icons.search,
            color: AppColors.secondaryColor.withOpacity(0.6),
            size: 20.sp,
          ),
          SizedBox(width: 12.w),
          Expanded(
            child: TextField(
              onChanged: controller.searchUsers,
              decoration: InputDecoration(
                hintText: 'Search blocked users...',
                hintStyle: TextStyle(
                  color: AppColors.secondaryColor.withOpacity(0.5),
                  fontSize: 16.sp,
                ),
                border: InputBorder.none,
              ),
              style: TextStyle(
                color: AppColors.secondaryColor,
                fontSize: 16.sp,
              ),
            ),
          ),
          Obx(
            () => controller.isSearching
                ? GestureDetector(
                    onTap: controller.clearSearch,
                    child: Icon(
                      Icons.clear,
                      color: AppColors.secondaryColor.withOpacity(0.6),
                      size: 20.sp,
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.block_outlined,
            size: 80.sp,
            color: AppColors.primaryColor.withOpacity(0.5),
          ),
          SizedBox(height: 20.h),
          headingText(
            text: 'No Blocked Users',
            color: AppColors.secondaryColor,
          ),
          SizedBox(height: 8.h),
          normalText(
            text:
                'You haven\'t blocked anyone yet.\nBlocked users will appear here.',
            color: AppColors.secondaryColor.withOpacity(0.7),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildNoSearchResults() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 60.sp,
            color: AppColors.primaryColor.withOpacity(0.5),
          ),
          SizedBox(height: 20.h),
          headingText(
            text: 'No Results Found',
            color: AppColors.secondaryColor,
          ),
          SizedBox(height: 8.h),
          normalText(
            text: 'Try searching with a different name or email',
            color: AppColors.secondaryColor.withOpacity(0.7),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard(
    BlockedUserModel user,
    BlockedUserController controller,
  ) {
    return Column(
      children: [
        Row(
          children: [
            _buildUserAvatar(user),
            SizedBox(width: 12.w),
            Expanded(child: _buildUserInfo(user)),
            _buildToggleButton(user, controller),
          ],
        ),
        const Divider(color: AppColors.textMuted),
      ],
    );
  }

  Widget _buildUserAvatar(BlockedUserModel user) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: AppColors.primaryColor.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: ResponsiveNetworkImage(
        imageUrl: user.profileImage ?? '',
        shape: ImageShape.circle,
        widthPercent: 0.12,
        heightPercent: 0.06,
        fit: BoxFit.cover,
      ),
    );
  }

  Widget _buildUserInfo(BlockedUserModel user) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        smallText(
          text: user.fullName ?? 'Unknown',
          fontWeight: FontWeight.w600,
          color: AppColors.secondaryColor,
          maxLines: 1,
        ),
        if ((user.email ?? '').isNotEmpty) ...[
          SizedBox(height: 2.h),
          smallerText(
            text: user.email!,
            color: AppColors.secondaryColor.withOpacity(0.7),
            maxLines: 1,
          ),
        ],
        if ((user.fullAddress ?? '').isNotEmpty) ...[
          SizedBox(height: 2.h),
          Row(
            children: [
              Icon(
                Icons.location_on,
                size: 14.sp,
                color: AppColors.primaryColor,
              ),
              SizedBox(width: 4.w),
              Expanded(
                child: smallerText(
                  text: user.fullAddress!,
                  color: AppColors.primaryColor,
                  maxLines: 1,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildToggleButton(
    BlockedUserModel user,
    BlockedUserController controller,
  ) {
    return ElevatedButton(
      onPressed: () => _confirmToggle(user, controller),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.buttonColor,
        padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
        ),
        elevation: 2,
      ),
      child: smallText(
        text: 'Unblock',
        color: Colors.white,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  void _confirmToggle(BlockedUserModel user, BlockedUserController controller) {
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.r),
        ),
        backgroundColor: AppColors.backgroundDark,
        title: headingText(
          text: 'Unblock User',
          color: AppColors.secondaryColor,
        ),
        content: normalText(
          text:
              'Are you sure you want to unblock ${user.fullName ?? 'this user'}?',
          color: AppColors.secondaryColor.withOpacity(0.8),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(), // ✅ FIXED
            child: smallText(
              text: 'Cancel',
              color: AppColors.secondaryColor.withOpacity(0.7),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Get.back(); // ✅ close dialog
              if ((user.id ?? '').isNotEmpty) {
                controller.toggleBlock(user.id!);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.buttonColor,
              padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8.r),
              ),
            ),
            child: smallText(
              text: 'Unblock',
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
