import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';

/// Primary brand text style — Cormorant Garamond for headings (luxury editorial)
TextStyle brandHeadingStyle({
  double fontSize = 24.0,
  FontWeight fontWeight = FontWeight.w700,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 0.5,
  double lineHeight = 1.3,
}) {
  return GoogleFonts.cormorantGaramond(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
    letterSpacing: letterSpacing,
    height: lineHeight,
  );
}

/// Secondary brand text style — Poppins for body/UI text
TextStyle globalTextStyle({
  double fontSize = 15.0,
  FontWeight fontWeight = FontWeight.normal,
  double lineHeight = 1.5,
  TextAlign textAlign = TextAlign.start,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 0.0,
}) {
  return GoogleFonts.poppins(
    fontSize: fontSize,
    fontWeight: fontWeight,
    height: lineHeight,
    color: color,
    letterSpacing: letterSpacing,
  );
}

/// Caption / muted label style
TextStyle captionStyle({
  double fontSize = 11.0,
  Color color = const Color(0xFF6B6B6B),
}) {
  return GoogleFonts.poppins(
    fontSize: fontSize,
    fontWeight: FontWeight.w400,
    color: color,
    letterSpacing: 0.3,
  );
}

/// Price / badge text — bold, rose-gold
TextStyle priceStyle({
  double fontSize = 16.0,
}) {
  return GoogleFonts.poppins(
    fontSize: fontSize,
    fontWeight: FontWeight.w700,
    color: AppColors.accentRoseGold,
    letterSpacing: 0.2,
  );
}
