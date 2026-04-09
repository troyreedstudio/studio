import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/feature/event_details/controller/event_details_controller.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/custom_text.dart';
import '../controller/event_booking_controller.dart';

class EventBookingCheckoutPage extends StatelessWidget {
  const EventBookingCheckoutPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(EventBookingCheckoutController());
    final eventDetailsController = Get.find<EventDetailsController>();
    final homeController = Get.find<HomeController>();
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(controller),

            Expanded(
              child: Obx(() {
                if (controller.isLoading.value) {
                  return const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primaryColor,
                    ),
                  );
                }

                final booking = controller.bookingDetails;
                if (booking == null) {
                  return Center(
                    child: Text(
                      'Booking details not found',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  );
                }

                return Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          children: [
                            _buildEventInfo(
                              eventDetailsController,
                              homeController,
                            ),
                            SizedBox(height: 20.h),
                            _buildSelectedTickets(controller),
                            // Show selected tickets
                            SizedBox(height: 20.h),
                            _buildBookingInfo(controller),
                            // Updated to use controller
                            SizedBox(height: 20.h),
                            _buildPricingBreakdown(
                              controller,
                              eventDetailsController,
                            ),
                            SizedBox(height: 20.h),
                            _buildEarlyBirdSection(controller),
                            // Updated to use controller
                            SizedBox(height: 20.h),
                            _buildBottomSection(controller),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedTickets(EventBookingCheckoutController controller) {
    if (controller.selectedCharges.isEmpty) {
      return SizedBox.shrink();
    }

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          normalText(
            text: 'Selected Tickets',
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
          SizedBox(height: 12.h),
          ...controller.selectedCharges.map((entry) {
            final charge = entry.key;
            final quantity = entry.value;
            final price = double.tryParse(charge.feeAmount ?? '0') ?? 0;
            final totalPrice = price * quantity;

            return Padding(
              padding: EdgeInsets.only(bottom: 12.h),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        smallerText(
                          text: charge.feeName ?? 'Unknown Ticket',
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                        SizedBox(height: 4.h),
                        smallerText(
                          text: '$quantity x \$${price.toStringAsFixed(2)}',
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                  ),
                  normalText(
                    text: '\$${totalPrice.toStringAsFixed(2)}',
                    color: AppColors.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ],
              ),
            );
          }),
          Divider(color: AppColors.borderSubtle, height: 20.h),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              normalText(
                text: 'Subtotal',
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
              normalText(
                text: '\$${controller.baseAmount.value.toStringAsFixed(2)}',
                color: AppColors.primaryColor,
                fontWeight: FontWeight.w600,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(EventBookingCheckoutController controller) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 10.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: controller.onBackPressed,
            child: Container(
              padding: EdgeInsets.all(5.w),
              decoration: BoxDecoration(
                color: AppColors.backgroundSurface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Icon(
                Icons.arrow_back_ios,
                size: 18.sp,
                color: AppColors.primaryColor,
              ),
            ),
          ),
          SizedBox(width: 15.w),
          smallText(
            text: 'Back',
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w500,
          ),
        ],
      ),
    );
  }

  Widget _buildEventInfo(
    EventDetailsController booking,
    HomeController homeController,
  ) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          smallerText(
            text:
                "${homeController.formatDate(booking.eventDetails.value?.startDate.toString())} • ${booking.eventDetails.value?.startTime} - ${booking.eventDetails.value?.endTime}",
            color: AppColors.textSecondary,
          ),
          SizedBox(height: 8.h),
          normalText(
            text: booking.eventDetails.value?.eventName ?? "no name",
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            maxLines: 2,
          ),
          SizedBox(height: 4.h),
          smallerText(
            text:
                booking.eventDetails.value?.user?.fullAddress ??
                "no event address",
            color: AppColors.primaryColor,
          ),
        ],
      ),
    );
  }

  Widget _buildBookingInfo(EventBookingCheckoutController controller) {
    final booking = controller.bookingDetails;
    if (booking == null) return SizedBox.shrink();

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 1),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              normalText(
                text: booking.bookingType,
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientPrimary,
                  borderRadius: BorderRadius.circular(20.r),
                ),
                child: Obx(() {
                  return normalText(
                    text: '${controller.totalTickets.value} Guests',
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                  );
                }),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPricingBreakdown(
    EventBookingCheckoutController controller,
    EventDetailsController eventDetailsController,
  ) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 1),
      ),
      child: Column(
        children: [
          Obx(() {
            return _buildPriceRow(
              'Ticket Fees : ',
              controller.tableName.isNotEmpty
                  ? '\$${controller.newBaseAmount.value.toStringAsFixed(2)}'
                  : '\$${controller.baseAmount.value.toStringAsFixed(2)}',
            );
          }),
          SizedBox(height: 3.h),
          ...(controller.tableName.isNotEmpty
              ? controller.eventDetails.value?.eventTable?.first.tableCharges
                        ?.map((ticket) {
                          return Padding(
                            padding: EdgeInsets.only(bottom: 3.h),
                            child: _buildPriceRow(
                              '${ticket.feeName ?? ''} : ',
                              '\$${ticket.feeAmount ?? '0'}',
                            ),
                          );
                        }) ??
                    []
              : eventDetailsController
                        .eventDetails
                        .value
                        ?.eventTickets
                        ?.first
                        .ticketCharges
                        ?.map((ticket) {
                          return Padding(
                            padding: EdgeInsets.only(bottom: 3.h),
                            child: _buildPriceRow(
                              '${ticket.feeName ?? ''} : ',
                              '\$${ticket.feeAmount ?? '0'}',
                            ),
                          );
                        }) ??
                    []),
          Divider(color: AppColors.borderSubtle),
          _buildPriceRow(
            'Total : ',
            controller.isTableBooking
                ? '\$${controller.tableFinalTotal.value.toStringAsFixed(2)}'
                : '\$${controller.finalTotal.value.toStringAsFixed(2)}',
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(
    String label,
    String amount, {
    bool isDiscount = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        smallerText(text: label, color: AppColors.textSecondary),
        smallerText(
          text: amount,
          color: isDiscount ? AppColors.successColor : AppColors.textPrimary,
        ),
      ],
    );
  }

  Widget _buildEarlyBirdSection(EventBookingCheckoutController controller) {
    final booking = controller.bookingDetails;
    if (booking == null || !booking.isEarlyBird) return SizedBox.shrink();

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          normalText(
            text: 'Early Bird (Strictly 21+)',
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
          SizedBox(height: 8.h),
          smallerText(
            text:
                'You\'re eligible for early bird pricing! This offer is strictly for guests 21 years and older.',
            color: AppColors.textSecondary,
            maxLines: 3,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomSection(EventBookingCheckoutController controller) {
    return Obx(
      () => GestureDetector(
        onTap: controller.isLoading.value ? null : controller.onCheckout,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(vertical: 16.h),
            decoration: BoxDecoration(
              gradient: controller.isLoading.value
                  ? null
                  : AppColors.gradientPrimary,
              color: controller.isLoading.value
                  ? AppColors.backgroundElevated
                  : null,
              borderRadius: BorderRadius.circular(12.r),
            ),
            child: Center(
              child: controller.isLoading.value
                  ? loadingSmall()
                  : normalText(
                      text: 'Checkout',
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
