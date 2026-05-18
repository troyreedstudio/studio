import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';

/// Full-screen image viewer for a venue's table / floor plan. Pinch-to-zoom
/// is handled by [InteractiveViewer]. Black background to make the floor
/// plan pop and feel premium.
class FloorPlanViewer extends StatelessWidget {
  const FloorPlanViewer({
    super.key,
    required this.imageUrl,
    required this.venueName,
  });

  final String imageUrl;
  final String venueName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Floor plan',
              style: GoogleFonts.poppins(
                fontSize: 10.sp,
                color: AppColors.textSecondary,
                letterSpacing: 0.4,
              ),
            ),
            SizedBox(height: 2.h),
            Text(
              venueName,
              style: GoogleFonts.outfit(
                fontSize: 16.sp,
                fontWeight: FontWeight.w700,
                fontStyle: FontStyle.italic,
                color: Colors.white,
              ),
            ),
          ],
        ),
        titleSpacing: 0,
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.8,
          maxScale: 5.0,
          child: CachedNetworkImage(
            imageUrl: imageUrl,
            fit: BoxFit.contain,
            placeholder: (_, __) => Center(
              child: CircularProgressIndicator(
                color: AppColors.accentRoseGold,
                strokeWidth: 2,
              ),
            ),
            errorWidget: (_, __, ___) => Padding(
              padding: EdgeInsets.all(24.w),
              child: Text(
                'Floor plan could not be loaded.',
                style: GoogleFonts.poppins(
                  color: AppColors.textSecondary,
                  fontSize: 13.sp,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
