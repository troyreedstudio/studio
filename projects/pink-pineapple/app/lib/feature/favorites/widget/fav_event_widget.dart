import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/svg.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/icons_path.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/style/global_text_style.dart';

class FavoriteEventWidget extends StatelessWidget {
  final String? imgUrl;
  final String? eventName;
  final String? eventPlace;
  final String? eventSubPlace;
  final String? eventDate;
  final VoidCallback? onTap;
  final Color? color;

  const FavoriteEventWidget({
    super.key,
    this.imgUrl,
    this.eventName,
    this.eventPlace,
    this.eventSubPlace,
    this.eventDate,
    this.onTap,
    this.color
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {},
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 5.h),
        margin: EdgeInsets.symmetric(vertical: 3.h, horizontal: 10.w),
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderSubtle),
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(25.r),
        ),

        child: Stack(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 🖼️ Image and text column
                SizedBox(
                  height: 80.h,
                  width: 80.h,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20.r),
                    child: ResponsiveNetworkImage(
                      imageUrl: imgUrl ?? ImagePath.sample_imagePath,
                    ),
                  ),
                ),
                SizedBox(width: 5.w),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(eventName ??  "loading...", style: globalTextStyle(fontSize: 15.sp)),
                    Row(
                      spacing: 5.w,
                      children: [
                        Image.asset(ImagePath.party_light, scale: 1.5),
                        Text(
                          eventPlace ??  'Savara Bali',
                          style: globalTextStyle(
                            fontSize: 15.sp,
                            color: AppColors.primaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      spacing: 5.w,
                      children: [
                        SvgPicture.asset(IconsPath.location, height: 15.h),
                        Text(
                          eventSubPlace ??  'Garden Park, Bali',
                          style: globalTextStyle(
                            fontSize: 15.sp,
                            color: AppColors.primaryColor,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      eventDate ??  "Mon, Dec 24 • 18.00 - 23.00 PM",
                      style: globalTextStyle(
                        fontSize: 12.sp,
                        color: AppColors.primaryColor,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            Positioned(
              top: 5.h,
              right: 5.w,
              child: InkWell(
                onTap: () {},
                child: CircleAvatar(
                  backgroundColor: AppColors.primaryColor.withAlpha(60),
                  child: FaIcon(
                    FontAwesomeIcons.heartCircleCheck,
                    color: color ?? AppColors.primaryColor,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}