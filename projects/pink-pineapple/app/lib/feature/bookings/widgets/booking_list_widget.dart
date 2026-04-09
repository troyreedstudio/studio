import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/svg.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/feature/bookings/model/bookings_model.dart';
import 'package:pineapple/feature/event_details/UI/event_details_page.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/icons_path.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../controller/bookings_controller.dart';

class BookingListWidget extends StatelessWidget {
  BookingListWidget({super.key, required this.event});

  final BookingsListModel event;
  final bookingListController = Get.find<BookingsListController>();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Get.to(() => EventDetailsPage(), arguments: event.id);
      },
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
        margin: EdgeInsets.symmetric(horizontal: 5.w),
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(25.r),
        ),
        child: Column(
          children: [
            Center(
              child: SizedBox(
                height: 140.h,
                width: double.infinity,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20.r),
                  child: ResponsiveNetworkImage(
                    imageUrl: event.table?.tableImages?.first ?? "",
                  ),
                ),
              ),
            ),
            SizedBox(height: 5.h),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  spacing: 4,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.event?.eventName ?? "loading...",
                      style: GoogleFonts.cormorantGaramond(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      spacing: 5.w,
                      children: [
                        Image.asset(ImagePath.party_light, scale: 1.5),
                        Text(
                          'Savara Bali',
                          style: GoogleFonts.poppins(
                            fontSize: 15.sp,
                            color: AppColors.primaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      spacing: 5.w,
                      children: [
                        SvgPicture.asset(IconsPath.location, height: 15.h),
                        Text(
                          'Garden Park, Bali',
                          style: GoogleFonts.poppins(
                            fontSize: 15.sp,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      // "${homeController.formatDate(event.startDate.toString())} • ${event.startTime} - ${event.endTime}",
                      "",
                      style: GoogleFonts.poppins(
                        fontSize: 12.sp,
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
