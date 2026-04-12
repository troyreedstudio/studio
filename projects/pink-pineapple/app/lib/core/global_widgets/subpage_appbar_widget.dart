
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../const/app_colors.dart';



class SubPageAppbarWidget extends StatelessWidget {
  final String appbarTitle;
  final VoidCallback? prefixOnpressed;
  final VoidCallback? sufixOnpressed;
  final bool? showSuffixWidget;
  const SubPageAppbarWidget({
    super.key, required this.appbarTitle,  this.prefixOnpressed,  this.sufixOnpressed, this.showSuffixWidget=true,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // IconButton(icon: Icon(Icons.arrow_back_ios_outlined), onPressed: (){},),
        InkWell(
          onTap: prefixOnpressed,
          child: Container(
              padding: EdgeInsets.all(5.r),
              decoration: BoxDecoration(
                  color: AppColors.backgroundSurface,
                  shape: BoxShape.circle
              ),
              child: Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.primaryColor)),
        ),
        // SizedBox(width: 10.w),
        Text(
          appbarTitle,
          style: GoogleFonts.playfairDisplay(
            fontWeight: FontWeight.w500,
            fontSize: 20.sp,
            color: AppColors.textPrimary,
          ),
        ),
        showSuffixWidget! ? GestureDetector(
          onTap: sufixOnpressed,
          child: Container(
              padding: EdgeInsets.all(5.r),
              decoration: BoxDecoration(
                  color: AppColors.backgroundSurface,
                  shape: BoxShape.circle
              ),
              child: Icon(Icons.flag_outlined, color: AppColors.primaryColor,)),
        ) : SizedBox(),
      ],
    );
  }
}
