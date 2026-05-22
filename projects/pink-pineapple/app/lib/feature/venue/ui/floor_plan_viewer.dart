import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';

/// Full-screen image viewer for a venue's table / floor plan. Pinch-to-zoom
/// is handled by [InteractiveViewer]. Black background to make the floor
/// plan pop and feel premium.
///
/// Forces the device into landscape while this screen is open — venue
/// floor plans are wide landscape images and become legible at this
/// orientation. Portrait is restored on dispose.
class FloorPlanViewer extends StatefulWidget {
  const FloorPlanViewer({
    super.key,
    required this.imageUrl,
    required this.venueName,
  });

  final String imageUrl;
  final String venueName;

  @override
  State<FloorPlanViewer> createState() => _FloorPlanViewerState();
}

class _FloorPlanViewerState extends State<FloorPlanViewer> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  @override
  void dispose() {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.imageUrl;
    final venueName = widget.venueName;
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
      body: Stack(
        children: [
          // InteractiveViewer needs an explicitly-sized child or it sizes
          // to the image's intrinsic dimensions and lands squashed in the
          // middle of an otherwise-empty screen. Forcing the child to
          // fill the viewport lets BoxFit.contain scale the floor plan
          // to fill width (and zoom up sharply from there on pinch).
          Positioned.fill(
            child: InteractiveViewer(
              minScale: 1.0,
              maxScale: 6.0,
              boundaryMargin: const EdgeInsets.all(120),
              child: CachedNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.contain,
                width: double.infinity,
                height: double.infinity,
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
          // Hint pinned to the bottom so users know the gesture set —
          // floor plans are wide landscape images and look best rotated.
          Positioned(
            left: 0,
            right: 0,
            bottom: 24.h,
            child: Center(
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.15),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.screen_rotation_outlined,
                      color: Colors.white.withValues(alpha: 0.85),
                      size: 14.sp,
                    ),
                    SizedBox(width: 6.w),
                    Text(
                      'Pinch to zoom',
                      style: GoogleFonts.poppins(
                        fontSize: 11.sp,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
