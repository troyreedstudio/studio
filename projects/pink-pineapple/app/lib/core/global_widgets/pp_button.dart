import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../const/app_colors.dart';

/// Pink Pineapple primary CTA — solid rose-gold gradient fill, white text, pill.
/// Use for the headline action on a screen ("Book a Table", "Buy Tickets").
class PpPrimaryButton extends StatelessWidget {
  const PpPrimaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.icon,
    this.expand = true,
    this.height = 52,
  });

  final String label;
  final VoidCallback? onTap;
  final IconData? icon;
  final bool expand;
  final double height;

  @override
  Widget build(BuildContext context) {
    final child = Container(
      height: height.h,
      padding: EdgeInsets.symmetric(horizontal: 28.w),
      decoration: BoxDecoration(
        gradient: AppColors.gradientPrimary,
        borderRadius: BorderRadius.circular(height.h / 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.accentRoseGold.withOpacity(0.35),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, color: Colors.white, size: 16.sp),
            SizedBox(width: 8.w),
          ],
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 14.sp,
              fontWeight: FontWeight.w600,
              color: Colors.white,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );

    return GestureDetector(
      onTap: onTap,
      child: expand ? SizedBox(width: double.infinity, child: child) : child,
    );
  }
}

/// Pink Pineapple secondary CTA — outline pill with rose-gold gradient border
/// and gradient text. Use for supporting actions ("VIP Reservation", "See All").
class PpSecondaryButton extends StatelessWidget {
  const PpSecondaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.icon,
    this.expand = true,
    this.height = 52,
  });

  final String label;
  final VoidCallback? onTap;
  final IconData? icon;
  final bool expand;
  final double height;

  @override
  Widget build(BuildContext context) {
    final child = Container(
      height: height.h,
      padding: EdgeInsets.symmetric(horizontal: 28.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundDark,
        borderRadius: BorderRadius.circular(height.h / 2),
        border: Border.all(
          color: AppColors.accentRoseGold.withOpacity(0.85),
          width: 1.2,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            ShaderMask(
              shaderCallback: (b) => AppColors.gradientPrimary.createShader(b),
              child: Icon(icon, color: Colors.white, size: 16.sp),
            ),
            SizedBox(width: 8.w),
          ],
          ShaderMask(
            shaderCallback: (b) => AppColors.gradientPrimary.createShader(b),
            child: Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                letterSpacing: 0.4,
              ),
            ),
          ),
        ],
      ),
    );

    return GestureDetector(
      onTap: onTap,
      child: expand ? SizedBox(width: double.infinity, child: child) : child,
    );
  }
}

/// Small inline ticket pill — used inside event cards. Compact gradient chip.
class PpTicketPill extends StatelessWidget {
  const PpTicketPill({
    super.key,
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
        decoration: BoxDecoration(
          gradient: AppColors.gradientPrimary,
          borderRadius: BorderRadius.circular(20.r),
        ),
        child: Text(
          label.toUpperCase(),
          style: GoogleFonts.poppins(
            fontSize: 10.sp,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }
}

/// `BEACH CLUB · ULUWATU` style subhead — uppercase, wide-tracked, rose-gold.
/// Per design system: always uppercase, wide letter-spacing, separated by ·.
class PpCategoryAreaLabel extends StatelessWidget {
  const PpCategoryAreaLabel({
    super.key,
    required this.category,
    required this.area,
    this.fontSize = 11,
  });

  final String category;
  final String area;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (b) => AppColors.gradientPrimary.createShader(b),
      child: Text(
        '${category.toUpperCase()}  ·  ${area.toUpperCase()}',
        style: GoogleFonts.poppins(
          fontSize: fontSize.sp,
          fontWeight: FontWeight.w300,
          color: Colors.white,
          letterSpacing: 2.0,
        ),
      ),
    );
  }
}
