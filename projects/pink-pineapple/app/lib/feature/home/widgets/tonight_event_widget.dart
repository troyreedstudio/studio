import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/feature/event_details/UI/event_details_page.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../model/event_model.dart';

class TonightEventWidget extends StatelessWidget {
  final AllEventModel event;

  const TonightEventWidget({super.key, required this.event});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Get.to(() => EventDetailsPage(), arguments: event.id);
      },
      child: Container(
        margin: EdgeInsets.symmetric(vertical: 6.h),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Image
            ClipRRect(
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16.r),
                bottomLeft: Radius.circular(16.r),
              ),
              child: SizedBox(
                height: 90.h,
                width: 90.h,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ResponsiveNetworkImage(
                      imageUrl: event.eventImages?[0] ?? ImagePath.sample_imagePath,
                      fit: BoxFit.cover,
                      borderRadius: 0,
                    ),
                    Container(
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SizedBox(width: 14.w),

            // Info
            Expanded(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 12.h),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.eventName ?? 'Event',
                      style: GoogleFonts.cormorantGaramond(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: 5.h),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          size: 11.sp,
                          color: AppColors.accentRoseGold,
                        ),
                        SizedBox(width: 3.w),
                        Expanded(
                          child: Text(
                            event.user?.fullAddress ?? 'Bali',
                            style: GoogleFonts.poppins(
                              fontSize: 11.sp,
                              color: AppColors.textMuted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 3.h),
                    Text(
                      '${Get.find<HomeController>().formatDate(event.startDate.toString())} · ${event.startTime ?? ""} – ${event.endTime ?? ""}',
                      style: GoogleFonts.poppins(
                        fontSize: 10.sp,
                        color: AppColors.textMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),

            // Fav button
            Padding(
              padding: EdgeInsets.only(right: 14.w),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accentRoseGold.withOpacity(0.12),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.accentRoseGold.withOpacity(0.3),
                    width: 0.5,
                  ),
                ),
                child: FaIcon(
                  FontAwesomeIcons.heart,
                  color: AppColors.accentRoseGold,
                  size: 14.sp,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
