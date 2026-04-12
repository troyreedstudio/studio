import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/feature/home/widgets/tonight_event_widget.dart';
import 'package:pineapple/feature/tonight/controller/tonight_controller.dart';

class TonightScreen extends StatelessWidget {
  TonightScreen({super.key});

  final TonightController controller = Get.put(TonightController());

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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TONIGHT',
                      style: GoogleFonts.cormorantGaramond(
                        fontSize: 22.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        letterSpacing: 3,
                      ),
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      'What\'s happening in Bali right now',
                      style: GoogleFonts.poppins(
                        fontSize: 12.sp,
                        color: AppColors.textMuted,
                        letterSpacing: 0.1,
                      ),
                    ),
                  ],
                ),
              ),

              // Divider
              Container(
                height: 0.5,
                color: AppColors.borderSubtle,
              ),

              // Event list
              Expanded(
                child: Obx(() {
                  if (controller.isLoading.value &&
                      controller.tonightEvents.isEmpty) {
                    return _buildLoadingState();
                  }

                  if (controller.tonightEvents.isEmpty) {
                    return _buildEmptyState();
                  }

                  return RefreshIndicator(
                    color: AppColors.primaryColor,
                    backgroundColor: AppColors.backgroundSurface,
                    onRefresh: controller.refreshEvents,
                    child: ListView.builder(
                      padding: EdgeInsets.symmetric(
                        horizontal: 20.w,
                        vertical: 12.h,
                      ),
                      itemCount: controller.tonightEvents.length,
                      itemBuilder: (context, index) {
                        return TonightEventWidget(
                          event: controller.tonightEvents[index],
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

  Widget _buildLoadingState() {
    return ListView.builder(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
      itemCount: 4,
      itemBuilder: (_, __) => _EventSkeleton(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 40.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80.w,
              height: 80.w,
              decoration: BoxDecoration(
                color: AppColors.accentRoseGold.withOpacity(0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.accentRoseGold.withOpacity(0.2),
                  width: 0.5,
                ),
              ),
              child: Icon(
                Icons.nightlife,
                size: 36.sp,
                color: AppColors.accentRoseGold,
              ),
            ),
            SizedBox(height: 20.h),
            Text(
              'No events tonight',
              style: GoogleFonts.cormorantGaramond(
                fontSize: 20.sp,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            SizedBox(height: 8.h),
            Text(
              'Check back later for tonight\'s lineup',
              style: GoogleFonts.poppins(
                fontSize: 13.sp,
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _EventSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(vertical: 6.h),
      height: 90.h,
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            width: 90.h,
            decoration: BoxDecoration(
              color: AppColors.backgroundSurface,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16.r),
                bottomLeft: Radius.circular(16.r),
              ),
            ),
          ),
          SizedBox(width: 14.w),
          Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 16.h),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 140.w,
                    height: 14.h,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSurface,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  SizedBox(height: 10.h),
                  Container(
                    width: 100.w,
                    height: 10.h,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSurface,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Container(
                    width: 80.w,
                    height: 10.h,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSurface,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
