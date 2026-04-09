import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart'
    show ResponsiveNetworkImage;
import '../controller/event_details_controller.dart';
import '../model/event_details_model.dart';

class EventDetailsPage extends StatelessWidget {
  const EventDetailsPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(EventDetailsController());

    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            _buildHeader(controller),
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value) {
                  return Center(child: loading());
                }
                final event = controller.event.value;
                final eventDetails = controller.eventDetails.value;
                if (event == null || eventDetails == null) {
                  return Center(
                    child: Text(
                      'Event not found',
                      style: GoogleFonts.poppins(
                        color: AppColors.textMuted,
                        fontSize: 14.sp,
                      ),
                    ),
                  );
                }

                return SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildImageSlider(controller, eventDetails),
                      SizedBox(height: 20.h),
                      _buildEventInfo(eventDetails),
                      SizedBox(height: 16.h),
                      _buildEventAbout(eventDetails),
                      SizedBox(height: 16.h),
                      _buildEventDetails(eventDetails),
                      SizedBox(height: 20.h),
                      _buildActionButtons(controller),
                      SizedBox(height: 32.h),
                    ],
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(EventDetailsController controller) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: controller.onBackPressed,
            child: Container(
              padding: EdgeInsets.all(8.w),
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: Icon(
                Icons.arrow_back_ios,
                size: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          SizedBox(width: 12.w),
          Text(
            'Back',
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w400,
            ),
          ),
          const Spacer(),
          Container(
            padding: EdgeInsets.all(10.w),
            decoration: BoxDecoration(
              color: AppColors.backgroundCard,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: AppColors.borderSubtle, width: 0.5),
            ),
            child: Icon(
              Icons.favorite_border,
              size: 18.sp,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageSlider(
    EventDetailsController controller,
    EventDetailsModel event,
  ) {
    final images = event.eventImages ?? [];
    if (images.isEmpty) {
      return Container(
        height: 200.h,
        margin: EdgeInsets.symmetric(horizontal: 20.w),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(16.r),
        ),
        child: Center(
          child: Icon(Icons.image_not_supported_outlined,
              size: 48.sp, color: AppColors.textMuted),
        ),
      );
    }

    return Container(
      height: 220.h,
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16.r),
            child: PageView.builder(
              controller: controller.pageController,
              onPageChanged: controller.onPageChanged,
              itemCount: images.length,
              itemBuilder: (context, index) {
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    ResponsiveNetworkImage(
                      imageUrl: images[index],
                      fit: BoxFit.cover,
                      borderRadius: 16.r,
                    ),
                    // Bottom fade
                    Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.transparent, Color(0xCC000000)],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          // Page indicators
          Positioned(
            bottom: 14.h,
            left: 0,
            right: 0,
            child: Obx(
              () => Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  images.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: controller.currentImageIndex.value == index ? 20.w : 6.w,
                    height: 4.h,
                    margin: EdgeInsets.symmetric(horizontal: 2.w),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      color: controller.currentImageIndex.value == index
                          ? AppColors.accentRoseGold
                          : AppColors.textMuted.withOpacity(0.5),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventInfo(EventDetailsModel event) {
    final homeController = Get.find<HomeController>();
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  event.eventName ?? 'Event',
                  style: GoogleFonts.cormorantGaramond(
                    fontSize: 22.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: 0.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(width: 12.w),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientPrimary,
                  borderRadius: BorderRadius.circular(10.r),
                ),
                child: Column(
                  children: [
                    Icon(Icons.local_fire_department, color: AppColors.backgroundDark, size: 14.sp),
                    SizedBox(height: 2.h),
                    Text(
                      '${event.count?.booking ?? 0}',
                      style: GoogleFonts.poppins(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.backgroundDark,
                      ),
                    ),
                    Text(
                      'Going',
                      style: GoogleFonts.poppins(
                        fontSize: 9.sp,
                        color: AppColors.backgroundDark,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 12.h),
          _infoRow(
            icon: Icons.location_on_rounded,
            text: event.user?.fullAddress ?? 'Location not set',
          ),
          SizedBox(height: 6.h),
          _infoRow(
            icon: Icons.access_time_rounded,
            text: '${homeController.formatDate(event.startDate.toString())} · ${event.startTime} – ${event.endTime}',
          ),
        ],
      ),
    );
  }

  Widget _infoRow({required IconData icon, required String text}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 13.sp, color: AppColors.accentRoseGold),
        SizedBox(width: 6.w),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.poppins(
              fontSize: 11.sp,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEventAbout(EventDetailsModel event) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'About',
            style: GoogleFonts.cormorantGaramond(
              fontSize: 16.sp,
              fontWeight: FontWeight.w700,
              color: AppColors.accentRoseGold,
              letterSpacing: 0.5,
            ),
          ),
          SizedBox(height: 10.h),
          Text(
            event.descriptions ?? 'No description available.',
            style: GoogleFonts.poppins(
              fontSize: 12.sp,
              color: AppColors.textSecondary,
              height: 1.6,
            ),
            textAlign: TextAlign.left,
            maxLines: 5,
            overflow: TextOverflow.fade,
          ),
        ],
      ),
    );
  }

  Widget _buildEventDetails(EventDetailsModel event) {
    final homeController = Get.find<HomeController>();
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Column(
        children: [
          _buildDetailRow(
            'Last Registration',
            '${homeController.formatDate(event.lastRegDate.toString())} · ${event.endTime}',
          ),
          Divider(color: AppColors.borderSubtle, height: 20.h),
          _buildDetailRow(
            'Arrive Before',
            '${homeController.formatDate(event.arriveDate.toString())} · ${event.arriveTime}',
          ),
          Divider(color: AppColors.borderSubtle, height: 20.h),
          _buildDetailRow(
            'Additional Guests',
            'Max ${event.additionalGuests} people',
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 11.sp,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 11.sp,
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(EventDetailsController controller) {
    return Obx(() {
      double minTablePrice = 0;
      final eventDetails = controller.eventDetails.value;

      if (eventDetails?.eventTable != null && eventDetails!.eventTable!.isNotEmpty) {
        for (var table in eventDetails.eventTable!) {
          if (table.tableCharges != null && table.tableCharges!.isNotEmpty) {
            for (var charge in table.tableCharges!) {
              final price = double.tryParse(charge.feeAmount ?? '0') ?? 0;
              if (price > 0 && (minTablePrice == 0 || price < minTablePrice)) {
                minTablePrice = price;
              }
            }
          }
        }
      }

      return Padding(
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        child: Column(
          children: [
            _buildActionButton(
              title: 'Book Tickets',
              icon: Icons.confirmation_number_outlined,
              onTap: controller.onBookTickets,
            ),
            SizedBox(height: 12.h),
            _buildActionButton(
              title: minTablePrice > 0
                  ? 'Reserve a Table  ·  from \$${minTablePrice.toStringAsFixed(0)}'
                  : 'Reserve a Table',
              icon: Icons.table_bar_outlined,
              onTap: controller.onBookTables,
            ),
          ],
        ),
      );
    });
  }

  Widget _buildActionButton({
    required String title,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.symmetric(vertical: 16.h, horizontal: 20.w),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.accentRoseGold.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: AppColors.accentRoseGold, size: 16.sp),
            ),
            SizedBox(width: 14.w),
            Expanded(
              child: Text(
                title,
                style: GoogleFonts.poppins(
                  fontSize: 13.sp,
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: AppColors.gradientPrimary,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.arrow_forward_ios,
                color: AppColors.backgroundDark,
                size: 12.sp,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
