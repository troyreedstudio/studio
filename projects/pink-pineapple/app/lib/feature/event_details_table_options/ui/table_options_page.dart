import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/feature/event_details/model/event_details_model_saon.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart'
    show ResponsiveNetworkImage;
import '../../../core/global_widgets/custom_text.dart';
import '../../event_details/controller/event_details_controller.dart';
import '../../event_details/model/event_details_model.dart';
import '../../event_details_ticket/ui/event_book_ticket_page.dart';
import '../../home/controller/home_controller.dart';
import '../controller/table_options_controller.dart';

class TableOptionsPage extends StatelessWidget {
  TableOptionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(TableOptionsController());
    final eventDetailsController = Get.find<EventDetailsController>();
    final eventId = Get.arguments['eventID'];

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

                final event = eventDetailsController.eventDetails.value;
                if (event == null) {
                  return Center(
                    child: Text(
                      'Event not found',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  );
                }

                return SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildEventHeader(event),
                      SizedBox(height: 20.h),
                      normalText(
                        text: 'Table Options',
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                      _buildTableOptionsSection(
                        controller,
                        event,
                        eventDetailsController,
                      ),
                      SizedBox(height: 30.h),
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

  Widget _buildHeader(TableOptionsController controller) {
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
          // Event Image
          SizedBox(
            height: 150.h,
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
          // Event Info
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
                        text: event.eventName ?? "no name",
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
                      text: event.user?.fullAddress ?? 'address not found',
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

  Widget _buildTableOptionsSection(
    TableOptionsController controller,
    EventDetailsModel event,
    EventDetailsController eventController,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 20.h),
          ...event.eventTable!.map(
            (table) => _buildTableOption(controller, table, eventController),
          ),
        ],
      ),
    );
  }

  Widget _buildTableOption(
    TableOptionsController controller,
    EventTable table,
    EventDetailsController eventController,
  ) {
    return GestureDetector(
      onTap: () {
        // Navigate to BookTicketsPage with table data
        log('Table booking mode: ${eventController.event.value?.id}');
        Get.to(() => BookTicketsPage(), arguments: table);
      },
      child: Container(
        margin: EdgeInsets.only(bottom: 15.h),
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(color: AppColors.borderSubtle, width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: normalText(
                    text: table.tableName ?? "no name",
                    color: AppColors.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: EdgeInsets.all(8.w),
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientPrimary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.arrow_forward_ios,
                    color: AppColors.textPrimary,
                    size: 16.sp,
                  ),
                ),
              ],
            ),
            SizedBox(height: 8.h),
            smallerText(
              text:
                  '${table.maxAdditionGuest} Guests (\$${table.minimumSpentAmount} minimum)',
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
            SizedBox(height: 8.h),
            smallerText(
              text: table.tableDetails ?? "no descriptions",
              color: AppColors.textSecondary,
              maxLines: 3,
              textAlign: TextAlign.justify,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
