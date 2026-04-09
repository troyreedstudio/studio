import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/user_info/user_info_controller.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../event_details/UI/event_details_page.dart';
import '../model/event_model.dart';

class PopularClubsWidget extends StatelessWidget {
  const PopularClubsWidget({super.key, required this.event});
  final AllEventModel event;

  @override
  Widget build(BuildContext context) {
    final homeController = Get.find<HomeController>();

    return GestureDetector(
      onTap: () {
        Get.to(() => EventDetailsPage(), arguments: event.id);
      },
      child: Container(
        width: 180.h,
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
        child: Column(
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
                height: 130.h,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ResponsiveNetworkImage(
                      imageUrl: event.eventImages?[0] ?? "",
                      fit: BoxFit.cover,
                      borderRadius: 0,
                    ),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 50.h,
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
              padding: EdgeInsets.fromLTRB(10.w, 8.h, 10.w, 10.h),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          event.eventName ?? 'Venue',
                          style: GoogleFonts.cormorantGaramond(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),

                      // Fav
                      InkWell(
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
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: isFav
                                  ? AppColors.accentRoseGold.withOpacity(0.15)
                                  : AppColors.backgroundSurface,
                              shape: BoxShape.circle,
                            ),
                            child: FaIcon(
                              isFav
                                  ? FontAwesomeIcons.solidHeart
                                  : FontAwesomeIcons.heart,
                              color: isFav
                                  ? AppColors.accentRoseGold
                                  : AppColors.textMuted,
                              size: 12.sp,
                            ),
                          );
                        }),
                      ),
                    ],
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
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
