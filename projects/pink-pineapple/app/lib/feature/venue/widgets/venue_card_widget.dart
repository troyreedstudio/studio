import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/pp_button.dart';
import 'package:pineapple/feature/venue/controller/venue_controller.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';
import 'package:pineapple/feature/venue/ui/venue_detail_screen.dart';

class VenueCardWidget extends StatelessWidget {
  const VenueCardWidget({super.key, required this.venue});

  final VenueModel venue;

  /// Format category enum value for display: BEACH_CLUB -> BEACH CLUB
  String _formatCategory(String category) {
    return category.replaceAll('_', ' ').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final venueController = Get.find<VenueController>();

    return GestureDetector(
      onTap: () {
        Get.to(() => VenueDetailScreen(venueId: venue.id));
      },
      child: Container(
        width: 200.w,
        margin: EdgeInsets.only(right: 12.w),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero image
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
              child: SizedBox(
                height: 130.h,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CachedNetworkImage(
                      imageUrl: venue.heroImage.isNotEmpty
                          ? venue.heroImage
                          : (venue.photos.isNotEmpty ? venue.photos.first : ''),
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: AppColors.surfaceElevated,
                        child: Center(
                          child: Icon(
                            Icons.image_outlined,
                            color: AppColors.textMuted,
                            size: 28.sp,
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: AppColors.surfaceElevated,
                        child: Center(
                          child: Icon(
                            Icons.broken_image_outlined,
                            color: AppColors.textMuted,
                            size: 28.sp,
                          ),
                        ),
                      ),
                    ),

                    // Bottom gradient fade
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 50.h,
                      child: const DecoratedBox(
                        decoration: BoxDecoration(gradient: AppColors.gradientOverlay),
                      ),
                    ),

                    // Rating badge
                    if (venue.rating > 0)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: 6.w,
                            vertical: 3.h,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.6),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.star_rounded,
                                color: AppColors.ratingColor,
                                size: 12.sp,
                              ),
                              SizedBox(width: 2.w),
                              Text(
                                venue.rating.toStringAsFixed(1),
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.ratingColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Favorite heart
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Obx(() {
                        final updated = venueController.featuredVenues
                                .firstWhereOrNull((v) => v.id == venue.id) ??
                            venueController.venues
                                .firstWhereOrNull((v) => v.id == venue.id);
                        final isFav = updated?.isFavorite ?? venue.isFavorite;

                        return GestureDetector(
                          onTap: () => venueController.toggleFavorite(venue.id),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: isFav
                                  ? AppColors.gradientMid.withOpacity(0.2)
                                  : Colors.black.withOpacity(0.4),
                              shape: BoxShape.circle,
                            ),
                            child: FaIcon(
                              isFav
                                  ? FontAwesomeIcons.solidHeart
                                  : FontAwesomeIcons.heart,
                              color: isFav
                                  ? AppColors.gradientMid
                                  : AppColors.textSecondary,
                              size: 12.sp,
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ),

            // Text content
            Padding(
              padding: EdgeInsets.fromLTRB(10.w, 8.h, 10.w, 10.h),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Venue name — editorial serif font
                  Text(
                    venue.name,
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 15.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),

                  SizedBox(height: 4.h),

                  // Category and area label
                  PpCategoryAreaLabel(
                    category: _formatCategory(venue.category),
                    area: venue.area,
                    fontSize: 9,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
