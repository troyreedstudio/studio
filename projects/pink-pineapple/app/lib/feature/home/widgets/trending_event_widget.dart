import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/feature/event_details/UI/event_details_page.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../controller/home_controller.dart';
import '../model/event_model.dart';

class TrendingEventWidget extends StatelessWidget {
  TrendingEventWidget({super.key, required this.event});

  final AllEventModel event;
  final homeController = Get.find<HomeController>();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Get.to(() => EventDetailsPage(), arguments: event.id);
      },
      child: Container(
        width: 200.h,
        margin: EdgeInsets.symmetric(horizontal: 5.w),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Image
                ClipRRect(
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(20.r),
                    topRight: Radius.circular(20.r),
                  ),
                  child: SizedBox(
                    height: 140.h,
                    width: double.infinity,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ResponsiveNetworkImage(
                          imageUrl: event.eventImages?.first ?? "",
                          fit: BoxFit.cover,
                          borderRadius: 0,
                        ),
                        // Gradient overlay
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 60.h,
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [Colors.transparent, Color(0xCC000000)],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Info
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.eventName ?? 'Event',
                        style: GoogleFonts.cormorantGaramond(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: 4.h),
                      Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            size: 10.sp,
                            color: AppColors.accentRoseGold,
                          ),
                          SizedBox(width: 3.w),
                          Expanded(
                            child: Text(
                              event.user?.fullAddress ?? '',
                              style: GoogleFonts.poppins(
                                fontSize: 10.sp,
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
                        '${homeController.formatDate(event.startDate.toString())} · ${event.startTime ?? ""}',
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
              ],
            ),

            // Favorite button
            Positioned(
              right: 8.w,
              top: 8.h,
              child: InkWell(
                onTap: () {
                  final eventId = event.id;
                  if (eventId != null) {
                    homeController.postFavorite(
                      eventId,
                      Get.find<UserInfoController>()
                          .userInfo
                          .value!
                          .userProfile!
                          .id!,
                    );
                  }
                },
                child: Obx(() {
                  final updatedEvent = homeController.allEventList
                      .firstWhereOrNull((e) => e.id == event.id);
                  final isFav = updatedEvent?.isFavorite ?? false;

                  return Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundDark.withOpacity(0.6),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isFav
                            ? AppColors.accentRoseGold.withOpacity(0.5)
                            : AppColors.borderSubtle,
                        width: 0.5,
                      ),
                    ),
                    child: FaIcon(
                      isFav
                          ? FontAwesomeIcons.solidHeart
                          : FontAwesomeIcons.heart,
                      color: isFav ? AppColors.accentRoseGold : AppColors.textSecondary,
                      size: 13.sp,
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
