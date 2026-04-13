import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/pp_button.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart'
    show ResponsiveNetworkImage;
import '../controller/event_details_controller.dart';
import '../model/event_details_model_saon.dart';

class EventDetailsPage extends StatelessWidget {
  const EventDetailsPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(EventDetailsController());

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Obx(() {
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

        return Stack(
          children: [
            SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: EdgeInsets.zero,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHero(controller, eventDetails),
                  SizedBox(height: 24.h),
                  _buildTitleBlock(eventDetails),
                  SizedBox(height: 14.h),
                  _buildStatusRow(eventDetails),
                  SizedBox(height: 22.h),
                  _buildAbout(eventDetails),
                  SizedBox(height: 28.h),
                  _buildActionButtons(controller),
                  SizedBox(height: 28.h),
                  _buildDetailsCard(eventDetails),
                  SizedBox(height: 40.h),
                ],
              ),
            ),
            // Overlaid back + favorite, sit on top of the hero
            Positioned(
              top: MediaQuery.of(context).padding.top + 8.h,
              left: 16.w,
              right: 16.w,
              child: _buildOverlayControls(controller),
            ),
          ],
        );
      }),
    );
  }

  // ── Hero ───────────────────────────────────────────────────────────────────

  Widget _buildHero(
    EventDetailsController controller,
    EventDetailsModel event,
  ) {
    final images = event.eventImages ?? [];
    final heroHeight = 420.h;

    if (images.isEmpty) {
      return Container(
        height: heroHeight,
        width: double.infinity,
        color: AppColors.backgroundCard,
        child: Center(
          child: Icon(
            Icons.image_not_supported_outlined,
            size: 48.sp,
            color: AppColors.textMuted,
          ),
        ),
      );
    }

    return SizedBox(
      height: heroHeight,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: controller.pageController,
            onPageChanged: controller.onPageChanged,
            itemCount: images.length,
            itemBuilder: (context, index) {
              return ResponsiveNetworkImage(
                imageUrl: images[index],
                fit: BoxFit.cover,
                borderRadius: 0,
              );
            },
          ),
          // Bottom-to-top fade so the hero blends into the page background
          IgnorePointer(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.transparent,
                    Color(0xCC000000),
                    Color(0xFF000000),
                  ],
                  stops: [0.0, 0.45, 0.85, 1.0],
                ),
              ),
            ),
          ),
          // Page indicators
          Positioned(
            bottom: 28.h,
            left: 0,
            right: 0,
            child: Obx(
              () => Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  images.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: controller.currentImageIndex.value == index
                        ? 22.w
                        : 6.w,
                    height: 4.h,
                    margin: EdgeInsets.symmetric(horizontal: 3.w),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      gradient: controller.currentImageIndex.value == index
                          ? AppColors.gradientPrimary
                          : null,
                      color: controller.currentImageIndex.value == index
                          ? null
                          : Colors.white.withOpacity(0.35),
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

  // ── Overlay controls (back + favorite) ─────────────────────────────────────

  Widget _buildOverlayControls(EventDetailsController controller) {
    return Row(
      children: [
        GestureDetector(
          onTap: controller.onBackPressed,
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.45),
              borderRadius: BorderRadius.circular(40),
              border: Border.all(
                color: Colors.white.withOpacity(0.18),
                width: 0.5,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.arrow_back_ios_new,
                  size: 13.sp,
                  color: Colors.white,
                ),
                SizedBox(width: 6.w),
                Text(
                  'Back',
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
        const Spacer(),
        Container(
          width: 38.w,
          height: 38.w,
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.45),
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white.withOpacity(0.18),
              width: 0.5,
            ),
          ),
          child: Icon(
            Icons.favorite_border,
            size: 17.sp,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  // ── Title block (display serif + category·area) ───────────────────────────

  Widget _buildTitleBlock(EventDetailsModel event) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            event.eventName ?? 'Event',
            style: GoogleFonts.outfit(
              fontSize: 36.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
              height: 1.05,
              letterSpacing: 0.2,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: 10.h),
          PpCategoryAreaLabel(
            category: 'Event',
            area: _extractArea(event.user?.fullAddress) ?? 'Bali',
            fontSize: 11,
          ),
        ],
      ),
    );
  }

  /// Pull a usable "area" out of a comma-separated address string.
  /// Falls back to the whole string if there are no commas.
  String? _extractArea(String? fullAddress) {
    if (fullAddress == null || fullAddress.trim().isEmpty) return null;
    final parts = fullAddress
        .split(',')
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return null;
    // Prefer the second-to-last (typical city/region position), else last.
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts.last;
  }

  // ── Status row (open dot + time + going count) ────────────────────────────

  Widget _buildStatusRow(EventDetailsModel event) {
    final homeController = Get.find<HomeController>();
    final isOpen = (event.eventStatus ?? '').toLowerCase() != 'closed';
    final statusColor = isOpen ? AppColors.successColor : AppColors.errorColor;
    final statusText = isOpen ? 'Open' : 'Closed';
    final timeText =
        '${event.startTime ?? ''} – ${event.endTime ?? ''}'.trim();
    final dateText = homeController.formatDate(event.startDate.toString());
    final going = event.count?.booking ?? 0;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Row(
        children: [
          Container(
            width: 8.w,
            height: 8.w,
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: statusColor.withOpacity(0.5),
                  blurRadius: 6,
                ),
              ],
            ),
          ),
          SizedBox(width: 8.w),
          Flexible(
            child: Text(
              '$statusText  ·  $dateText${timeText.isNotEmpty ? '  ·  $timeText' : ''}',
              style: GoogleFonts.poppins(
                fontSize: 12.sp,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w400,
                letterSpacing: 0.2,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          SizedBox(width: 12.w),
          Icon(
            Icons.local_fire_department,
            size: 13.sp,
            color: AppColors.accentRoseGold,
          ),
          SizedBox(width: 3.w),
          Text(
            '$going going',
            style: GoogleFonts.poppins(
              fontSize: 11.sp,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  // ── About body ─────────────────────────────────────────────────────────────

  Widget _buildAbout(EventDetailsModel event) {
    final desc = event.descriptions ?? '';
    if (desc.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Text(
        desc,
        style: GoogleFonts.poppins(
          fontSize: 13.sp,
          color: AppColors.textSecondary,
          height: 1.65,
          letterSpacing: 0.1,
        ),
      ),
    );
  }

  // ── Action buttons (primary gradient pill + secondary outline pill) ──────

  Widget _buildActionButtons(EventDetailsController controller) {
    return Obx(() {
      double minTablePrice = 0;
      final eventDetails = controller.eventDetails.value;

      if (eventDetails?.eventTable != null &&
          eventDetails!.eventTable!.isNotEmpty) {
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
        padding: EdgeInsets.symmetric(horizontal: 24.w),
        child: Column(
          children: [
            PpPrimaryButton(
              label: 'Book Tickets',
              icon: Icons.confirmation_number_outlined,
              onTap: controller.onBookTickets,
            ),
            SizedBox(height: 14.h),
            PpSecondaryButton(
              label: minTablePrice > 0
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

  // ── Details card (last reg, arrive before, additional guests) ────────────

  Widget _buildDetailsCard(EventDetailsModel event) {
    final homeController = Get.find<HomeController>();
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 24.w),
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
            '${homeController.formatDate(event.lastRegDate.toString())}  ·  ${event.endTime ?? ''}',
          ),
          Divider(color: AppColors.borderSubtle, height: 24.h),
          _buildDetailRow(
            'Arrive Before',
            '${homeController.formatDate(event.arriveDate.toString())}  ·  ${event.arriveTime ?? ''}',
          ),
          Divider(color: AppColors.borderSubtle, height: 24.h),
          _buildDetailRow(
            'Additional Guests',
            'Max ${event.additionalGuests ?? 0} people',
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
            label.toUpperCase(),
            style: GoogleFonts.poppins(
              fontSize: 10.sp,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.8,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 12.sp,
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
