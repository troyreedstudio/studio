import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import '../const/app_colors.dart';

Widget headingText({
  required String text,
  FontWeight fontWeight = FontWeight.bold,
  Color color = AppColors.textPrimary,
  TextAlign textAlign = TextAlign.start,
  int maxLines = 1,
  TextOverflow overflow = TextOverflow.ellipsis,
}) {
  return Builder(
    builder: (context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(1.0)),
      child: Text(
        text,
        textAlign: textAlign,
        maxLines: maxLines,
        overflow: overflow,
        style: GoogleFonts.cormorantGaramond(
          color: color,
          fontSize: 26.sp,
          fontWeight: fontWeight,
          letterSpacing: 0.3,
        ),
      ),
    ),
  );
}

Widget normalText({
  required String text,
  FontWeight fontWeight = FontWeight.normal,
  Color color = AppColors.textPrimary,
  TextAlign textAlign = TextAlign.start,
  int maxLines = 5,
  TextOverflow overflow = TextOverflow.ellipsis,
}) {
  return Builder(
    builder: (context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(1.0)),
      child: Text(
        text,
        textAlign: textAlign,
        maxLines: maxLines,
        overflow: overflow,
        style: GoogleFonts.poppins(
          color: color,
          fontSize: 16.sp,
          fontWeight: fontWeight,
        ),
      ),
    ),
  );
}

Widget smallText({
  required String text,
  FontWeight fontWeight = FontWeight.w400,
  Color color = AppColors.textSecondary,
  TextAlign textAlign = TextAlign.start,
  int maxLines = 1,
  TextOverflow overflow = TextOverflow.ellipsis,
}) {
  return Builder(
    builder: (context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(1.0)),
      child: Text(
        text,
        textAlign: textAlign,
        maxLines: maxLines,
        overflow: overflow,
        style: GoogleFonts.poppins(
          color: color,
          fontSize: 14.sp,
          fontWeight: fontWeight,
        ),
      ),
    ),
  );
}

Widget smallerText({
  required String text,
  FontWeight fontWeight = FontWeight.w400,
  Color color = AppColors.textMuted,
  TextAlign textAlign = TextAlign.start,
  int maxLines = 1,
  TextOverflow overflow = TextOverflow.ellipsis,
}) {
  return Builder(
    builder: (context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(1.0)),
      child: Text(
        text,
        textAlign: textAlign,
        maxLines: maxLines,
        overflow: overflow,
        style: GoogleFonts.poppins(
          color: color,
          fontSize: 12.sp,
          fontWeight: fontWeight,
        ),
      ),
    ),
  );
}

/*
sample usage:

headingText(text: "Heading"),
normalText(text: "Body text here"),
smallText(text: "Footnote or label"),
*/
