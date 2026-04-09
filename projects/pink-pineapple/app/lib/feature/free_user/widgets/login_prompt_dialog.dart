import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/style/global_text_style.dart';
import 'package:pineapple/feature/auth/ui/1.login_ui.dart';

/// Show a dialog prompting the user to login
void showLoginPromptDialog(BuildContext context) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
      backgroundColor: AppColors.backgroundCard,
      title: Column(
        children: [
          Icon(Icons.lock_outline, size: 50.sp, color: AppColors.primaryColor),
          SizedBox(height: 10.h),
          Text(
            'Login Required',
            style: globalTextStyle(
              fontSize: 20.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryColor,
            ),
          ),
        ],
      ),
      content: Text(
        'Please login to interact with posts and events. Create an account to like, comment, and share!',
        textAlign: TextAlign.center,
        style: globalTextStyle(fontSize: 14.sp, color: AppColors.textPrimary),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancel',
            style: globalTextStyle(fontSize: 14.sp, color: Colors.grey),
          ),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            // Navigate to login page
            Get.off(() => LoginPage());
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10.r),
            ),
            padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
          ),
          child: Text(
            'Login',
            style: globalTextStyle(
              fontSize: 14.sp,
              color: AppColors.whiteColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    ),
  );
}
