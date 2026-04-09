import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/svg.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:pineapple/feature/free_user/widgets/login_prompt_dialog.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/icons_path.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/style/global_text_style.dart';
import '../../home/model/event_model.dart';

class FreeUserPopularClubWidget extends StatelessWidget {
  const FreeUserPopularClubWidget({super.key, required this.event});
  final AllEventModel event;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => showLoginPromptDialog(context),
      child: Stack(
        children: [
          Container(
            padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
            margin: EdgeInsets.symmetric(horizontal: 5.w),
            width: 200.h,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.borderSubtle),
              color: AppColors.backgroundCard,
              borderRadius: BorderRadius.circular(25.r),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(
                  child: SizedBox(
                    height: 140.h,
                    width: 200.h,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20.r),
                      child: ResponsiveNetworkImage(
                        imageUrl: event.eventImages?[0] ?? "",
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 5.h),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        spacing: 4,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "${event.eventName} 🔥",
                            style: globalTextStyle(fontSize: 16.sp),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            spacing: 5.w,
                            children: [
                              SvgPicture.asset(
                                IconsPath.location,
                                height: 15.h,
                              ),
                              Expanded(
                                child: Text(
                                  event.user?.fullAddress ?? '',
                                  style: globalTextStyle(
                                    fontSize: 15.sp,
                                    color: AppColors.primaryColor,
                                    fontWeight: FontWeight.w400,
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
                    InkWell(
                      onTap: () => showLoginPromptDialog(context),
                      child: CircleAvatar(
                        backgroundColor: AppColors.primaryColor.withAlpha(60),
                        child: FaIcon(
                          FontAwesomeIcons.heart,
                          color: AppColors.backgroundCard,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            right: 30.w,
            top: 15.h,
            child: InkWell(
              onTap: () => showLoginPromptDialog(context),
              child: CircleAvatar(
                backgroundColor: AppColors.primaryColor.withAlpha(60),
                child: FaIcon(
                  FontAwesomeIcons.solidMessage,
                  color: AppColors.whiteColor,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
