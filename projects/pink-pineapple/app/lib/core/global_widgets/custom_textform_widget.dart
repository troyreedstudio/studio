
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/state_manager.dart';

import '../const/app_colors.dart';

class CustomTextFormWidget extends StatelessWidget {
  const CustomTextFormWidget({
    super.key,
    required this.sectionTitle,
    required this.textEditingController,
    this.hintText = "",
    this.isPassword = false,
    this.isPasswordVisible = false,
    this.onTogglePasswordVisibility,
    this.keyboardType = TextInputType.text,
    this.maxLines = 1
    // this.prefixWidget,
    // this.suffixWidget
  });

  final String sectionTitle;
  final TextEditingController textEditingController;
  final String hintText;
  final bool isPassword;
  final bool isPasswordVisible;
  final VoidCallback? onTogglePasswordVisibility;
  final TextInputType keyboardType;
  final int? maxLines;
  // final Widget? prefixWidget;
  // final Widget? suffixWidget;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // title
        Row(
          children: [
            Text(
              sectionTitle,
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '*',
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.primaryColor,
                fontFeatures: [FontFeature.superscripts()],
                // fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),

        // text
        SizedBox(height: 5.h),
        TextField(
          maxLines: maxLines,
          style: TextStyle(color: AppColors.textPrimary),
          obscureText: isPasswordVisible,
          controller: textEditingController,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            // prefixIcon: prefixWidget ?? SizedBox(),
            // suffix: suffixWidget ?? SizedBox(),

            contentPadding: EdgeInsets.symmetric(
              vertical: 15.h,
              horizontal: 18.w,
            ),
            filled: true,
            fillColor: AppColors.backgroundSurface,
            // Only show suffix if it's a password field
            suffixIcon: isPassword
                ? IconButton(
                    icon: Icon(
                      isPasswordVisible
                          ? Icons.visibility_off_outlined
                          : Icons.remove_red_eye_outlined,
                    ),
                    onPressed: onTogglePasswordVisibility,
                    color: AppColors.textMuted,
                  )
                : null,
            hintText: hintText,
            hintStyle: TextStyle(
              color: AppColors.textMuted,
              fontSize: 13.sp,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(15.h),
              borderSide: BorderSide(
                color: AppColors.borderSubtle,
                width: 1,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(15.h),
              borderSide: BorderSide(
                color: AppColors.primaryColor,
                width: 1,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(15.h),
              borderSide: BorderSide(
                color: AppColors.borderSubtle,
                width: 1,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
