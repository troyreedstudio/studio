import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/global_widgets/custom_text.dart';
import '../controller/follower_controller.dart';
import '../model/follower_model.dart';

class FollowingsFollowersPage extends StatelessWidget {
  const FollowingsFollowersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = Get.put(FollowingsFollowersController());

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
              _header(c),
              _searchBar(c),
              SizedBox(height: 8.h),
              _tabs(c),
              SizedBox(height: 12.h),
              Expanded(child: _tabViews(c)),
            ],
          ),
        ),
      ),
    );
  }

  // Header
  Widget _header(FollowingsFollowersController c) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: c.onBackPressed,
            child: Container(
              padding: EdgeInsets.all(8.w),
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Icon(Icons.arrow_back_ios, size: 18.sp, color: AppColors.accentRoseGold),
            ),
          ),
          SizedBox(width: 8.w),
          Expanded(
            child: headingText(
              text: 'Followings & Followers',
              color: AppColors.secondaryColor,
            ),
          ),
          Obx(() {
            final total = c.followingsCount + c.followersCount;
            return total > 0
                ? Container(
              padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
              decoration: BoxDecoration(
                color: AppColors.primaryColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16.r),
              ),
              child: smallText(
                text: '$total',
                color: AppColors.primaryColor,
                fontWeight: FontWeight.w600,
              ),
            )
                : const SizedBox.shrink();
          }),
        ],
      ),
    );
  }

  // Search
  Widget _searchBar(FollowingsFollowersController c) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
      padding: EdgeInsets.symmetric(horizontal: 16.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(25.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.search, size: 18.sp, color: AppColors.textSecondary),
          SizedBox(width: 10.w),
          Expanded(
            child: TextField(
              controller: c.searchCtrl,
              onChanged: c.search,
              decoration: InputDecoration(
                hintText: 'Search by name or location',
                border: InputBorder.none,
                hintStyle: TextStyle(fontSize: 14.sp, color: Colors.black45),
              ),
              style: TextStyle(fontSize: 14.sp, color: AppColors.textPrimary),
            ),
          ),
          Obx(() => c.isSearching.value
              ? GestureDetector(
            onTap: c.clearSearch,
            child: Icon(Icons.clear, size: 18.sp, color: AppColors.textSecondary),
          )
              : const SizedBox.shrink()),
        ],
      ),
    );
  }

  // Tabs
  Widget _tabs(FollowingsFollowersController c) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16.w),
      decoration: BoxDecoration(
        color: AppColors.textPrimary,
        borderRadius: BorderRadius.circular(25.r),
      ),
      child: TabBar(
        controller: c.tabController,
        indicator: BoxDecoration(
          color: AppColors.buttonColor,
          borderRadius: BorderRadius.circular(25.r),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: EdgeInsets.all(4.w),
        labelColor: Colors.white,
        unselectedLabelColor: Colors.white70,
        dividerColor: Colors.transparent,
        tabs: [
          Tab(
            child: Obx(() => Padding(
              padding: EdgeInsets.symmetric(vertical: 8.h),
              child: smallText(
                text: 'Followings (${c.followingsCount})',
                color:
                c.currentTabIndex.value == 0 ? Colors.white : Colors.white70,
                fontWeight:
                c.currentTabIndex.value == 0 ? FontWeight.w600 : FontWeight.w400,
              ),
            )),
          ),
          Tab(
            child: Obx(() => Padding(
              padding: EdgeInsets.symmetric(vertical: 8.h),
              child: smallText(
                text: 'Followers (${c.followersCount})',
                color:
                c.currentTabIndex.value == 1 ? Colors.white : Colors.white70,
                fontWeight:
                c.currentTabIndex.value == 1 ? FontWeight.w600 : FontWeight.w400,
              ),
            )),
          ),
        ],
      ),
    );
  }

  // Tab views
  Widget _tabViews(FollowingsFollowersController c) {
    return Obx(() {
      if (c.isLoading.value) {
        return const Center(
          child: CircularProgressIndicator(color: AppColors.primaryColor),
        );
      }

      return TabBarView(
        controller: c.tabController,
        children: [
          _usersList(isFollowingsTab: true,  c: c),
          _usersList(isFollowingsTab: false, c: c),
        ],
      );
    });
  }

  Widget _usersList({required bool isFollowingsTab, required FollowingsFollowersController c}) {
    final items = isFollowingsTab ? c.filteredFollowings : c.filteredFollowers;

    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: EdgeInsets.only(top: 80.h),
          child: Column(
            children: [
              Icon(Icons.people_outline, size: 56.sp, color: AppColors.textMuted),
              SizedBox(height: 10.h),
              normalText(
                text: isFollowingsTab ? 'No followings yet' : 'No followers yet',
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primaryColor,
      onRefresh: c.refreshData,
      child: ListView.builder(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
        itemCount: items.length,
        itemBuilder: (_, i) => _userTile(items[i]),
      ),
    );
  }

  // Single row
  Widget _userTile(Follow u) {
    return Container(
      margin: EdgeInsets.only(bottom: 10.h),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(14.r),
        border: Border.all(color: AppColors.backgroundCard, width: 1.w),
      ),
      child: Padding(
        padding: EdgeInsets.all(12.w),
        child: Row(
          children: [
            // Avatar
            ResponsiveNetworkImage(
              imageUrl: u.profileImage ?? '',
              shape: ImageShape.circle,
              widthPercent: 0.1,
              heightPercent: 0.05,
              fit: BoxFit.cover,
              errorWidget: Container(
                width: 48.w,
                height: 48.h,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.grey,
                ),
                child: const Icon(Icons.person, color: Colors.white70),
              ),
            ),
            SizedBox(width: 12.w),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  smallText(
                    text: u.fullName ?? 'User',
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    maxLines: 1,
                  ),
                  if ((u.fullAddress ?? '').isNotEmpty) ...[
                    SizedBox(height: 2.h),
                    smallerText(
                      text: u.fullAddress!,
                      color: AppColors.primaryColor,
                      maxLines: 1,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
