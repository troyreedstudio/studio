import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart'
    show ResponsiveNetworkImage;
import '../../../core/global_widgets/custom_text.dart';
import '../../event_details/controller/event_details_controller.dart';
import '../../event_details/model/event_details_model.dart';
import '../../event_details/model/event_details_model_saon.dart';
import '../../home/controller/home_controller.dart';
import '../controller/book_tickets_controller.dart';

class BookTicketsPage extends StatelessWidget {
  const BookTicketsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(BookTicketsController());
    final eventDetailsController = Get.find<EventDetailsController>();
    final eventTicket = EventTicket();

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(eventDetailsController),
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value) {
                  return const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primaryColor,
                    ),
                  );
                }

                final eventDetails = eventDetailsController.eventDetails.value;
                if (eventDetails == null) {
                  return Center(
                    child: Text(
                      'Event not found',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  );
                }

                // Sync the event to your controller
                if (controller.event.value == null) {
                  controller.event.value = eventDetails;
                }

                return SingleChildScrollView(
                  child: Column(
                    children: [
                      SizedBox(height: 20.h),
                      _buildEventHeader(eventDetails),
                      SizedBox(height: 20.h),

                      // Show table info if it's table booking
                      if (controller.isTableBooking) ...[
                        _buildTableInfo(controller),
                        SizedBox(height: 20.h),
                      ],

                      headingText(
                        text: controller.isTableBooking
                            ? 'Select Guests'
                            : 'Book Tickets',
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                      SizedBox(height: 10.h),

                      // Show appropriate section based on booking type
                      controller.isTableBooking
                          ? _buildTableChargesSection(controller, eventTicket)
                          : _buildTicketsSection(
                              controller,
                              eventDetails,
                              eventTicket,
                            ),

                      SizedBox(height: 20.h),

                      // Show validation message for table booking
                      if (controller.isTableBooking)
                        _buildValidationMessage(controller),

                      SizedBox(height: 10.h),
                      _buildBottomSection(controller),
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
          const Spacer(),
          Container(
            padding: EdgeInsets.all(12.w),
            decoration: BoxDecoration(
              color: AppColors.backgroundSurface,
              borderRadius: BorderRadius.circular(12.r),
            ),
            child: Icon(
              Icons.favorite_border,
              size: 20.sp,
              color: AppColors.primaryColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventHeader(EventDetailsModel event) {
    final homeController = Get.find<HomeController>();
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      child: Column(
        children: [
          SizedBox(
            height: 150.h,
            width: double.infinity,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16.r),
              child: ResponsiveNetworkImage(
                imageUrl: event.eventImages!.first,
                fit: BoxFit.cover,
                borderRadius: 16.r,
              ),
            ),
          ),
          SizedBox(height: 15.h),
          Container(
            padding: EdgeInsets.all(20.w),
            decoration: BoxDecoration(
              color: AppColors.backgroundCard,
              borderRadius: BorderRadius.circular(16.r),
              border: Border.all(color: AppColors.borderSubtle, width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: normalText(
                        text: event.eventName ?? "no event name",
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        maxLines: 2,
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: 12.w,
                        vertical: 6.h,
                      ),
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientPrimary,
                        borderRadius: BorderRadius.circular(8.r),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.local_fire_department,
                            color: AppColors.textPrimary,
                            size: 16.sp,
                          ),
                          SizedBox(width: 4.w),
                          normalText(
                            text: '${event.count?.booking ?? 0}\nGoing',
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            maxLines: 2,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8.h),
                Row(
                  children: [
                    Icon(
                      Icons.location_on_outlined,
                      color: AppColors.primaryColor,
                      size: 16.sp,
                    ),
                    SizedBox(width: 4.w),
                    smallerText(
                      text: event.user?.fullAddress ?? "no event address",
                      color: AppColors.textSecondary,
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(
                      Icons.date_range,
                      color: AppColors.primaryColor,
                      size: 16.sp,
                    ),
                    SizedBox(width: 4.w),
                    smallerText(
                      text:
                          "${homeController.formatDate(event.startDate.toString())} • ${event.startTime} - ${event.endTime}",
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // New widget for table info
  Widget _buildTableInfo(BookTicketsController controller) {
    final table = controller.selectedTable.value!;

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
          Row(
            children: [
              Expanded(
                child: normalText(
                  text: table.tableName ?? "No name",
                  color: AppColors.primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientPrimary,
                  borderRadius: BorderRadius.circular(8.r),
                ),
                child: smallerText(
                  text: 'Max ${table.maxAdditionGuest} Guests',
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          SizedBox(height: 8.h),
          smallerText(
            text: 'Minimum Spend: \$${table.minimumSpentAmount}',
            color: AppColors.primaryColor,
            fontWeight: FontWeight.w600,
          ),
          SizedBox(height: 8.h),
          smallerText(
            text: table.tableDetails ?? "No description",
            color: AppColors.textSecondary,
            maxLines: 5,
            textAlign: TextAlign.justify,
          ),
          if (table.isIncludedFoodBeverage == true) ...[
            SizedBox(height: 8.h),
            Row(
              children: [
                Icon(Icons.check_circle, color: AppColors.successColor, size: 16.sp),
                SizedBox(width: 4.w),
                smallerText(
                  text: 'Includes Food & Beverage',
                  color: AppColors.successColor,
                  fontWeight: FontWeight.w500,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // New widget for table charges
  Widget _buildTableChargesSection(
    BookTicketsController controller,
    EventTicket eventTicket,
  ) {
    final charges = controller.selectedTable.value?.tableCharges ?? [];

    if (charges.isEmpty) {
      return Container(
        margin: EdgeInsets.symmetric(horizontal: 20.w),
        padding: EdgeInsets.all(20.w),
        child: Text(
          "No pricing options available",
          style: TextStyle(color: AppColors.textMuted),
        ),
      );
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
          // Male ticket
          Obx(
            () => _buildTableTicket(
              controller,
              'Number Of Males',
              controller.incrementMale,
              controller.decrementMale,
              controller.maleTicketCount.value.toString(),
            ),
          ),

          // Female ticket
          Obx(
            () => _buildTableTicket(
              controller,
              'Number Of Females',
              controller.incrementFemale,
              controller.decrementFemale,
              controller.femaleTicketCount.value.toString(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketsSection(
    BookTicketsController controller,
    EventDetailsModel event,
    EventTicket eventTicket,
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tickets',
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              fontFamily: 'Cormorant Garamond',
            ),
          ),
          SizedBox(height: 20.h),

          // Male ticket
          Obx(
            () => _buildTicketOption(
              controller,
              eventTicket,
              'Male General Admission',
              '${controller.malePriceText}${controller.isTableBooking ? " per person" : " (including fees)"}',
              controller.incrementMale,
              controller.decrementMale,
              controller.maleTicketCount.value.toString(),
            ),
          ),

          // Female ticket
          Obx(
            () => _buildTicketOption(
              controller,
              eventTicket,
              'Female General Admission',
              '${controller.femalePriceText}${controller.isTableBooking ? " per person" : " (including fees)"}',
              controller.incrementFemale,
              controller.decrementFemale,
              controller.femaleTicketCount.value.toString(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketOption(
    BookTicketsController controller,
    EventTicket eventTicket,
    String ticketType,
    String ticketPrice,
    VoidCallback onIncrement,
    VoidCallback onDecrement,
    String ticketCount,
  ) {
    return Container(
      margin: EdgeInsets.only(bottom: 15.h),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                smallerText(
                  text: ticketType,
                  color: AppColors.primaryColor,
                  fontWeight: FontWeight.w500,
                ),
                SizedBox(height: 4.h),
                smallerText(text: ticketPrice, color: AppColors.textSecondary),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSurface,
              borderRadius: BorderRadius.circular(8.r),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: onDecrement,
                  child: Padding(
                    padding: EdgeInsets.all(8.w),
                    child: Icon(Icons.remove, color: AppColors.primaryColor, size: 15.sp),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: 16.w,
                    vertical: 8.h,
                  ),
                  child: smallerText(
                    text: ticketCount,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                GestureDetector(
                  onTap: onIncrement,
                  child: Padding(
                    padding: EdgeInsets.all(8.w),
                    child: Icon(Icons.add, color: AppColors.primaryColor, size: 15.sp),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableTicket(
    BookTicketsController controller,
    String ticketType,
    VoidCallback onIncrement,
    VoidCallback onDecrement,
    String ticketCount,
  ) {
    return Container(
      margin: EdgeInsets.only(bottom: 15.h),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                smallerText(
                  text: ticketType,
                  color: AppColors.primaryColor,
                  fontWeight: FontWeight.w500,
                ),
                SizedBox(height: 4.h),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSurface,
              borderRadius: BorderRadius.circular(8.r),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: onDecrement,
                  child: Padding(
                    padding: EdgeInsets.all(8.w),
                    child: Icon(Icons.remove, color: AppColors.primaryColor, size: 15.sp),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: 16.w,
                    vertical: 8.h,
                  ),
                  child: smallerText(
                    text: ticketCount,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                GestureDetector(
                  onTap: onIncrement,
                  child: Padding(
                    padding: EdgeInsets.all(8.w),
                    child: Icon(Icons.add, color: AppColors.primaryColor, size: 15.sp),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // New validation message widget
  Widget _buildValidationMessage(BookTicketsController controller) {
    return Obx(() {
      final message = controller.validationMessage;
      if (message == null) return SizedBox.shrink();

      final isError = !controller.canProceed;

      return Container(
        margin: EdgeInsets.symmetric(horizontal: 20.w),
        padding: EdgeInsets.all(12.w),
        decoration: BoxDecoration(
          color: isError
              ? Colors.red.withOpacity(0.15)
              : Colors.green.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8.r),
          border: Border.all(
            color: isError ? AppColors.errorColor : AppColors.successColor,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isError ? Icons.warning : Icons.check_circle,
              color: isError ? AppColors.errorColor : AppColors.successColor,
              size: 20.sp,
            ),
            SizedBox(width: 8.w),
            Expanded(
              child: smallerText(
                text: message,
                color: isError ? AppColors.errorColor : AppColors.successColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildBottomSection(BookTicketsController controller) {
    return GestureDetector(
      onTap: controller.onCheckout,
      child: Obx(
        () => Padding(
          padding: EdgeInsets.all(20.w),
          child: Container(
            padding: EdgeInsets.all(20.w),
            decoration: BoxDecoration(
              gradient: controller.canGoToCheckout
                  ? AppColors.gradientPrimary
                  : null,
              color: controller.canGoToCheckout
                  ? null
                  : AppColors.backgroundElevated,
              borderRadius: BorderRadius.circular(16.r),
              border: Border.all(
                color: controller.canGoToCheckout
                    ? AppColors.primaryColor
                    : AppColors.borderSubtle,
                width: 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    normalText(
                      text: 'Checkout',
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                    if (controller.isTableBooking)
                      smallerText(
                        text: '${controller.totalTickets} guests selected',
                        color: AppColors.textSecondary,
                      ),
                  ],
                ),
                normalText(
                  text: controller.isTableBooking
                      ? "\$${controller.selectedTable.value?.minimumSpentAmount}"
                      : controller.totalAmountText,
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
