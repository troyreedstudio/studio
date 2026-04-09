import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/image_path.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/feature/auth/ui/1.login_ui.dart';
import 'package:pineapple/feature/free_user/controller/free_user_home_controller.dart';
import 'package:pineapple/feature/free_user/widgets/free_user_trending_event_widget.dart';
import 'package:pineapple/feature/free_user/widgets/free_user_popular_club_widget.dart';
import 'package:pineapple/feature/free_user/widgets/free_user_newsfeed_widget.dart';
import 'package:pineapple/feature/free_user/widgets/login_prompt_dialog.dart';

import '../../../core/global_widgets/app_loading.dart';

class FreeUserHomePage extends StatelessWidget {
  FreeUserHomePage({super.key});

  final controller = Get.put(FreeUserHomeController());

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            _profileHeader(context),
            SizedBox(height: 6.h),
            _tabBar(controller),
            _tabContent(controller),
          ],
        ),
      ),
    );
  }

  Widget _profileHeader(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Wordmark
          ShaderMask(
            shaderCallback: (bounds) =>
                AppColors.gradientPrimary.createShader(bounds),
            child: Text(
              'PINK PINEAPPLE',
              style: GoogleFonts.cormorantGaramond(
                fontSize: 18.sp,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 1.5,
              ),
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: () => showLoginPromptDialog(context),
            child: Container(
              width: 36.w,
              height: 36.w,
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: Icon(
                Icons.message_outlined,
                size: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          SizedBox(width: 8.w),
          GestureDetector(
            onTap: () => showLoginPromptDialog(context),
            child: Container(
              width: 36.w,
              height: 36.w,
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: Icon(
                Icons.search,
                size: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabBar(FreeUserHomeController controller) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.borderSubtle, width: 0.5),
        ),
      ),
      child: TabBar(
        dividerColor: Colors.transparent,
        controller: controller.tabController,
        labelColor: AppColors.accentRoseGold,
        indicatorSize: TabBarIndicatorSize.tab,
        unselectedLabelColor: AppColors.textMuted,
        indicatorColor: AppColors.accentRoseGold,
        indicatorWeight: 2.h,
        labelStyle: GoogleFonts.poppins(
          fontSize: 13.sp,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: GoogleFonts.poppins(
          fontSize: 13.sp,
          fontWeight: FontWeight.w400,
        ),
        tabs: controller.tabTitles.map((name) {
          return Tab(text: name);
        }).toList(),
      ),
    );
  }

  Widget _tabContent(FreeUserHomeController controller) {
    return Expanded(
      child: TabBarView(
        controller: controller.tabController,
        children: [FreeUserNewsfeedWidget(), _events(controller)],
      ),
    );
  }

  Widget _events(FreeUserHomeController controller) {
    final events = controller.publicEventList;

    return RefreshIndicator(
      color: AppColors.accentRoseGold,
      backgroundColor: AppColors.backgroundCard,
      onRefresh: () => controller.refreshData(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 16.h),

            // Section: Trending Events
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              child: _sectionHeader('Featured Tonight', 'Handpicked for you'),
            ),
            SizedBox(height: 10.h),
            SizedBox(
              height: 220.h,
              child: Obx(() {
                return controller.isEventsLoading.value
                    ? loading()
                    : events.isEmpty
                    ? _emptySection('No events tonight')
                    : ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: EdgeInsets.symmetric(horizontal: 20.w),
                        itemCount: events.length,
                        itemBuilder: (context, index) {
                          return FreeUserTrendingEventWidget(
                            event: events[index],
                          );
                        },
                      );
              }),
            ),

            SizedBox(height: 24.h),

            // Section: Popular Clubs
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              child: _sectionHeader('Trending Venues', 'Most popular right now'),
            ),
            SizedBox(height: 10.h),
            SizedBox(
              height: 210.h,
              child: Obx(() {
                return controller.isEventsLoading.value
                    ? loading()
                    : events.isEmpty
                    ? _emptySection('No venues available')
                    : ListView.builder(
                        reverse: true,
                        scrollDirection: Axis.horizontal,
                        padding: EdgeInsets.symmetric(horizontal: 20.w),
                        itemCount: events.length > 3 ? 3 : events.length,
                        itemBuilder: (context, index) {
                          return FreeUserPopularClubWidget(
                            event: events[index],
                          );
                        },
                      );
              }),
            ),

            SizedBox(height: 24.h),

            // Unlock CTA
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
              child: Container(
                width: double.infinity,
                padding: EdgeInsets.all(24.w),
                decoration: BoxDecoration(
                  color: AppColors.backgroundCard,
                  borderRadius: BorderRadius.circular(20.r),
                  border: Border.all(color: AppColors.borderSubtle, width: 0.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.accentRoseGold.withOpacity(0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientPrimary,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.star_rounded,
                        size: 28.sp,
                        color: AppColors.backgroundDark,
                      ),
                    ),
                    SizedBox(height: 14.h),
                    Text(
                      'Unlock Full Access',
                      style: GoogleFonts.cormorantGaramond(
                        fontSize: 22.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      'Sign in to book events, reserve tables,\nand connect with the community.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        fontSize: 12.sp,
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    SizedBox(height: 20.h),
                    Container(
                      width: double.infinity,
                      height: 48.h,
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientPrimary,
                        borderRadius: BorderRadius.circular(12.r),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.accentRoseGold.withOpacity(0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: () => Get.off(() => LoginPage()),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12.r),
                          ),
                        ),
                        child: Text(
                          'Login / Sign Up',
                          style: GoogleFonts.poppins(
                            fontSize: 14.sp,
                            color: AppColors.backgroundDark,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SizedBox(height: 32.h),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.cormorantGaramond(
            fontSize: 18.sp,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        Text(
          subtitle,
          style: GoogleFonts.poppins(
            fontSize: 11.sp,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _emptySection(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_busy_outlined, size: 40.sp, color: AppColors.textMuted),
          SizedBox(height: 8.h),
          Text(
            message,
            style: GoogleFonts.poppins(
              color: AppColors.textMuted,
              fontSize: 12.sp,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
