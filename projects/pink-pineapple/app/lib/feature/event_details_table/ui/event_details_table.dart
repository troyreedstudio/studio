import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart'
    show ResponsiveNetworkImage;
import '../../../core/global_widgets/custom_text.dart';
import '../../event_details/model/event_details_model.dart';
import '../controller/table_details_controller.dart';

class TableDetailsPage extends StatelessWidget {
  const TableDetailsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(TableDetailsController());

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Obx(() {
          if (controller.isLoading.value) {
            return const Center(
              child: CircularProgressIndicator(
                color: AppColors.primaryColor,
              ),
            );
          }

          final table = controller.table.value;
          if (table == null) {
            return Center(
              child: Text(
                'Table not found',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            );
          }

          return Column(
            children: [
              _buildHeader(controller),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildEventHeader(),
                      SizedBox(height: 10.h),
                      normalText(
                        text: 'Details',
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                      SizedBox(height: 10.h),
                      _buildDetailsSection(controller, table),
                      SizedBox(height: 20.h),
                      _buildGuestSelection(controller, table),
                      SizedBox(height: 20.h),
                      _buildFoodAndBeverageOption(controller),
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
    );
  }

  Widget _buildHeader(TableDetailsController controller) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 10.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: controller.onBackPressed,
            child: Container(
              padding: EdgeInsets.all(12.w),
              decoration: BoxDecoration(
                color: AppColors.backgroundSurface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Icon(
                Icons.arrow_back_ios,
                size: 20.sp,
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

  Widget _buildEventHeader() {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      child: Column(
        children: [
          // Event Image
          Container(
            height: 150.h,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16.r),
              child: ResponsiveNetworkImage(
                imageUrl:
                    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=400&fit=crop',
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
                        text: 'National Music Festival',
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
                            text: '129\nGoing',
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
                      Icons.location_city,
                      color: AppColors.primaryColor,
                      size: 16.sp,
                    ),
                    SizedBox(width: 4.w),
                    smallerText(
                      text: 'Savora Hall',
                      color: AppColors.textSecondary,
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(
                      Icons.location_on_outlined,
                      color: AppColors.primaryColor,
                      size: 16.sp,
                    ),
                    SizedBox(width: 4.w),
                    smallerText(
                      text: 'Garden Park, Bali',
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
                      text: 'Mon, Dec 24 • 18:00 - 23:00 PM',
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

  Widget _buildDetailsSection(
    TableDetailsController controller,
    TableOption table,
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
          SizedBox(height: 15.h),
          _buildDetailRow('Table :', table.title),
          SizedBox(height: 10.h),
          _buildDetailRow('Guests :', 'Max ${table.maxGuests}'),
          SizedBox(height: 10.h),
          _buildDetailRow(
            'Minimum Spend :',
            '\$${table.minimumSpend.toStringAsFixed(2)}',
          ),
          SizedBox(height: 15.h),
          smallerText(
            text: table.description,
            color: AppColors.textSecondary,
            maxLines: 4,
            textAlign: TextAlign.justify,
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
          child: smallerText(
            text: label,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        Expanded(
          flex: 3,
          child: smallerText(
            text: value,
            color: AppColors.textPrimary,
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }

  Widget _buildGuestSelection(
    TableDetailsController controller,
    TableOption table,
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
          _buildGuestCounter(
            controller,
            'Number Of Females',
            controller.selectedFemales.value,
            controller.incrementFemales,
            controller.decrementFemales,
          ),
          SizedBox(height: 20.h),
          _buildGuestCounter(
            controller,
            'Number Of Males',
            controller.selectedMales.value,
            controller.incrementMales,
            controller.decrementMales,
          ),
        ],
      ),
    );
  }

  Widget _buildGuestCounter(
    TableDetailsController controller,
    String title,
    int count,
    VoidCallback onIncrement,
    VoidCallback onDecrement,
  ) {
    return Row(
      children: [
        Expanded(
          child: smallerText(
            text: title,
            color: AppColors.primaryColor,
            fontWeight: FontWeight.w500,
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
                child: Container(
                  padding: EdgeInsets.all(8.w),
                  child: Icon(Icons.remove, color: AppColors.primaryColor, size: 20.sp),
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                child: smallText(
                  text: '$count',
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              GestureDetector(
                onTap: onIncrement,
                child: Container(
                  padding: EdgeInsets.all(8.w),
                  child: Icon(Icons.add, color: AppColors.primaryColor, size: 20.sp),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFoodAndBeverageOption(TableDetailsController controller) {
    return Obx(
      () => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          children: [
            smallText(
              text: 'Include food and beverage',
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
            SizedBox(width: 10),
            GestureDetector(
              onTap: () => controller.toggleFoodAndBeverage(
                !controller.includeFoodAndBeverage.value,
              ),
              child: Container(
                width: 24.w,
                height: 24.w,
                decoration: BoxDecoration(
                  color: controller.includeFoodAndBeverage.value
                      ? AppColors.primaryColor
                      : Colors.transparent,
                  border: Border.all(
                    color: controller.includeFoodAndBeverage.value
                        ? AppColors.primaryColor
                        : AppColors.borderSubtle,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(4.r),
                ),
                child: controller.includeFoodAndBeverage.value
                    ? Icon(Icons.check, color: AppColors.textPrimary, size: 16.sp)
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomSection(TableDetailsController controller) {
    return Obx(
      () => Padding(
        padding: const EdgeInsets.all(20.0),
        child: GestureDetector(
          onTap: controller.canProceed ? controller.onContinue : null,
          child: Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(vertical: 16.h),
            decoration: BoxDecoration(
              gradient: controller.canProceed
                  ? AppColors.gradientPrimary
                  : null,
              color: controller.canProceed
                  ? null
                  : AppColors.backgroundElevated,
              borderRadius: BorderRadius.circular(12.r),
            ),
            child: Center(
              child: normalText(
                text: 'Continue',
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
