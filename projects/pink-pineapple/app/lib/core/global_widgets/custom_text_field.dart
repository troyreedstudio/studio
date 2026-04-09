import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../const/app_colors.dart';

class CustomTextField extends StatelessWidget {
  const CustomTextField({
    super.key,
    this.hitText,
    required this.textEditingController,
    this.fontSize,
    this.fontWeight,
    this.lineHeight,
  });
  final String? hitText;
  final double? fontSize;
  final FontWeight? fontWeight;
  final double? lineHeight;
  final TextEditingController textEditingController;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 35.h,
      width: 273.w,
      child: TextField(
        controller: textEditingController,
        style: GoogleFonts.poppins(
            fontSize: fontSize ?? 16.sp,
            fontWeight: fontWeight ?? FontWeight.w400,
            height: lineHeight ?? 24.h / 16.h,
            color: AppColors.textPrimary),
        decoration: InputDecoration(
          contentPadding: EdgeInsets.symmetric(vertical: 5.h, horizontal: 10.w),
          hintText: hitText,
          hintStyle: GoogleFonts.poppins(
              fontSize: fontSize ?? 16.sp,
              fontWeight: fontWeight ?? FontWeight.w400,
              height: lineHeight ?? 24.h / 16.h,
              color: AppColors.textMuted),
          filled: true,
          fillColor: AppColors.backgroundSurface,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10.r),
            borderSide: BorderSide(color: AppColors.borderSubtle, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10.r),
            borderSide: BorderSide(color: AppColors.borderSubtle, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10.r),
            borderSide: BorderSide(color: AppColors.primaryColor, width: 1),
          ),
        ),
      ),
    );
  }
}







class CustomSearchTextField extends StatelessWidget {
  const CustomSearchTextField({
    super.key,
    this.hintText,
    required this.controller,
    this.fontSize,
    this.fontWeight,
    this.lineHeight,
    this.prefix,
    this.suffix,
  });

  final String? hintText;
  final double? fontSize;
  final FontWeight? fontWeight;
  final double? lineHeight;
  final TextEditingController controller;


  final Widget? prefix;
  final Widget? suffix;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40.h,
      width: double.infinity,
      child: TextField(
        controller: controller,
        style: GoogleFonts.poppins(
          fontSize: fontSize ?? 16.sp,
          fontWeight: fontWeight ?? FontWeight.w400,
          height: lineHeight ?? 24.h / 16.h,
          color: AppColors.textPrimary,
        ),
        decoration: InputDecoration(
          contentPadding: EdgeInsets.symmetric(vertical: 8.h, horizontal: 10.w),
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: fontSize ?? 16.sp,
            fontWeight: fontWeight ?? FontWeight.w400,
            height: lineHeight ?? 24.h / 16.h,
            color: AppColors.textMuted,
          ),
          filled: true,
          fillColor: AppColors.backgroundSurface,
          prefixIcon: prefix != null
              ? GestureDetector(
                  onTap: () {},
                  child: prefix,
                )
              : null,
          prefixIconColor: AppColors.textMuted,
          suffixIcon: suffix != null
              ? GestureDetector(
                  onTap: () {},
                  child: suffix,
                )
              : null,
          suffixIconColor: AppColors.textMuted,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10.r),
            borderSide: BorderSide(color: AppColors.borderSubtle, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10.r),
            borderSide: BorderSide(color: AppColors.borderSubtle, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10.r),
            borderSide: BorderSide(color: AppColors.primaryColor, width: 1),
          ),
        ),
      ),
    );
  }
}
