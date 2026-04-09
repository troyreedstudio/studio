import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:pineapple/feature/home/controller/home_controller.dart';
import 'package:pineapple/feature/home/model/all_users.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_network_image.dart';

class CommunityProfileWidget extends StatelessWidget {
  const CommunityProfileWidget({super.key, required this.usersModel});

  final AllUsersModel usersModel;

  @override
  Widget build(BuildContext context) {
    final home = Get.find<HomeController>();
    final userId = usersModel.id ?? '';

    return GestureDetector(
      onTap: () {},
      child: Container(
        width: 220.w,
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
            // Cover image
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
                      imageUrl: (usersModel.profileImage?.isNotEmpty ?? false)
                          ? usersModel.profileImage!
                          : ImagePath.sample_imagePath,
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
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          usersModel.fullName ?? 'Member',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.cormorantGaramond(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        SizedBox(height: 2.h),
                        Text(
                          usersModel.email ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 10.sp,
                            color: AppColors.textMuted,
                          ),
                        ),
                        if (usersModel.fullAddress?.isNotEmpty ?? false) ...[
                          SizedBox(height: 3.h),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on,
                                size: 10.sp,
                                color: AppColors.accentRoseGold,
                              ),
                              SizedBox(width: 2.w),
                              Expanded(
                                child: Text(
                                  usersModel.fullAddress ?? '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.poppins(
                                    fontSize: 10.sp,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),

                  SizedBox(width: 8.w),

                  // Follow button
                  Obx(() {
                    final busy = home.followInFlight.contains(userId);
                    final requested = home.isFollowRequested(userId);

                    return InkWell(
                      borderRadius: BorderRadius.circular(100),
                      onTap: (busy || requested || userId.isEmpty)
                          ? null
                          : () => home.sendFollowRequest(userId),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: requested ? null : AppColors.gradientPrimary,
                          color: requested ? AppColors.successColor.withOpacity(0.15) : null,
                          shape: BoxShape.circle,
                          border: requested
                              ? Border.all(
                                  color: AppColors.successColor.withOpacity(0.4),
                                  width: 0.5,
                                )
                              : null,
                        ),
                        child: busy
                            ? SizedBox(
                                width: 14.w,
                                height: 14.w,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    AppColors.backgroundDark,
                                  ),
                                ),
                              )
                            : FaIcon(
                                requested
                                    ? FontAwesomeIcons.circleCheck
                                    : FontAwesomeIcons.userPlus,
                                color: requested
                                    ? AppColors.successColor
                                    : AppColors.backgroundDark,
                                size: 14.sp,
                              ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
