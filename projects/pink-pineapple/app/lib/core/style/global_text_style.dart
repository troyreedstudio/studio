import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';

/// ─────────────────────────────────────────────────────────────────────────────
/// Pink Pineapple — Typography tokens (LOCKED brand guidelines)
///
/// Venue names:      Outfit, ExtraBold Italic, 32-40px
/// Body text:        Inter, Regular, 14-16px
/// Labels/cats:      Inter, Light/300, 12-14px, UPPERCASE, wide tracking
/// Section headers:  Inter, Semi-bold Italic, 20-24px
/// Tags/badges:      Inter, Medium/500, 11-12px, wide tracking
/// ─────────────────────────────────────────────────────────────────────────────

/// Venue name / hero heading — Outfit (geometric sans-serif)
TextStyle venueNameStyle({
  double fontSize = 36.0,
  FontWeight fontWeight = FontWeight.w800,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 0.2,
  double lineHeight = 1.1,
}) {
  return GoogleFonts.outfit(
    fontSize: fontSize,
    fontWeight: fontWeight,
    fontStyle: FontStyle.italic,
    color: color,
    letterSpacing: letterSpacing,
    height: lineHeight,
  );
}

/// Primary brand heading — Outfit for headings (geometric sans-serif)
/// Legacy alias kept so existing call-sites compile without changes.
TextStyle brandHeadingStyle({
  double fontSize = 24.0,
  FontWeight fontWeight = FontWeight.w800,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 0.5,
  double lineHeight = 1.3,
}) {
  return GoogleFonts.outfit(
    fontSize: fontSize,
    fontWeight: fontWeight,
    fontStyle: FontStyle.italic,
    color: color,
    letterSpacing: letterSpacing,
    height: lineHeight,
  );
}

/// Section header — Inter, Semi-bold Italic, 20-24px
TextStyle sectionHeaderStyle({
  double fontSize = 20.0,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 0.2,
}) {
  return GoogleFonts.inter(
    fontSize: fontSize,
    fontWeight: FontWeight.w600,
    fontStyle: FontStyle.italic,
    color: color,
    letterSpacing: letterSpacing,
    height: 1.3,
  );
}

/// Body text — Inter, Regular, 14-16px
TextStyle bodyStyle({
  double fontSize = 15.0,
  FontWeight fontWeight = FontWeight.normal,
  double lineHeight = 1.5,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 0.0,
}) {
  return GoogleFonts.inter(
    fontSize: fontSize,
    fontWeight: fontWeight,
    height: lineHeight,
    color: color,
    letterSpacing: letterSpacing,
  );
}

/// Label / category — Inter, Light/300, UPPERCASE, wide tracking (0.2em+)
TextStyle labelStyle({
  double fontSize = 12.0,
  Color color = const Color(0xFFB0B0B0),
  double letterSpacing = 2.4,
}) {
  return GoogleFonts.inter(
    fontSize: fontSize,
    fontWeight: FontWeight.w300,
    color: color,
    letterSpacing: letterSpacing,
  );
}

/// Tag / badge text — Inter, Medium/500, 11-12px, wide tracking
TextStyle badgeStyle({
  double fontSize = 11.0,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 1.0,
}) {
  return GoogleFonts.inter(
    fontSize: fontSize,
    fontWeight: FontWeight.w500,
    color: color,
    letterSpacing: letterSpacing,
  );
}

/// Secondary body text — Poppins for UI / fallback body.
/// Kept as the default "globalTextStyle" so existing widgets compile.
TextStyle globalTextStyle({
  double fontSize = 15.0,
  FontWeight fontWeight = FontWeight.normal,
  double lineHeight = 1.5,
  TextAlign textAlign = TextAlign.start,
  Color color = const Color(0xFFFFFFFF),
  double letterSpacing = 0.0,
}) {
  return GoogleFonts.inter(
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
  return GoogleFonts.inter(
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
  return GoogleFonts.inter(
    fontSize: fontSize,
    fontWeight: FontWeight.w700,
    color: AppColors.accentRoseGold,
    letterSpacing: 0.2,
  );
}
