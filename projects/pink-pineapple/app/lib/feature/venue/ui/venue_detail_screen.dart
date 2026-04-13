import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/pp_button.dart';
import 'package:pineapple/core/helpers/auth_guard.dart';
import 'package:pineapple/feature/venue/controller/venue_controller.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';

class VenueDetailScreen extends StatefulWidget {
  const VenueDetailScreen({super.key, required this.venueId});

  final String venueId;

  @override
  State<VenueDetailScreen> createState() => _VenueDetailScreenState();
}

class _VenueDetailScreenState extends State<VenueDetailScreen> {
  late final VenueController _venueController;

  @override
  void initState() {
    super.initState();
    // Use existing controller if available, otherwise create new one
    if (Get.isRegistered<VenueController>()) {
      _venueController = Get.find<VenueController>();
    } else {
      _venueController = Get.put(VenueController());
    }
    // Clear any previous selection and fetch this venue
    _venueController.selectedVenue.value = null;
    _venueController.fetchVenueDetail(widget.venueId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Obx(() {
        if (_venueController.isDetailLoading.value) {
          return _buildLoadingSkeleton();
        }

        final venue = _venueController.selectedVenue.value;
        if (venue == null) {
          return Center(
            child: Text(
              'Venue not found',
              style: GoogleFonts.poppins(
                color: AppColors.textMuted,
                fontSize: 14.sp,
              ),
            ),
          );
        }

        return Stack(
          children: [
            SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: EdgeInsets.zero,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHero(venue),
                  SizedBox(height: 24.h),
                  _buildVenueName(venue),
                  SizedBox(height: 10.h),
                  _buildCategoryArea(venue),
                  SizedBox(height: 14.h),
                  _buildStatusIndicator(venue),
                  SizedBox(height: 14.h),
                  _buildRating(venue),
                  SizedBox(height: 22.h),
                  _buildDescription(venue),
                  SizedBox(height: 28.h),
                  _buildActionButtons(venue),
                  SizedBox(height: 28.h),
                  _buildInfoCard(venue),
                  SizedBox(height: 40.h),
                ],
              ),
            ),
            // Overlaid back + favorite buttons
            Positioned(
              top: MediaQuery.of(context).padding.top + 8.h,
              left: 16.w,
              right: 16.w,
              child: _buildOverlayControls(venue),
            ),
          ],
        );
      }),
    );
  }

  // ── Loading Skeleton ──────────────────────────────────────────────────────

  Widget _buildLoadingSkeleton() {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero skeleton
          Container(
            height: MediaQuery.of(context).size.height * 0.4,
            width: double.infinity,
            color: AppColors.surface,
            child: Center(child: loading()),
          ),
          SizedBox(height: 24.h),
          // Title skeleton
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w),
            child: Container(
              height: 32.h,
              width: 200.w,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          SizedBox(height: 12.h),
          // Category skeleton
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w),
            child: Container(
              height: 14.h,
              width: 140.w,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
          ),
          SizedBox(height: 16.h),
          // Body skeleton
          ...List.generate(
            4,
            (_) => Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 4.h),
              child: Container(
                height: 12.h,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Hero Image ────────────────────────────────────────────────────────────

  Widget _buildHero(VenueModel venue) {
    final heroHeight = MediaQuery.of(context).size.height * 0.4;
    final imageUrl = venue.heroImage.isNotEmpty
        ? venue.heroImage
        : (venue.photos.isNotEmpty ? venue.photos.first : '');

    return SizedBox(
      height: heroHeight,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (imageUrl.isNotEmpty)
            CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                color: AppColors.surfaceElevated,
                child: Center(child: loading()),
              ),
              errorWidget: (context, url, error) => Container(
                color: AppColors.surfaceElevated,
                child: Center(
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: AppColors.textMuted,
                    size: 48.sp,
                  ),
                ),
              ),
            )
          else
            Container(
              color: AppColors.surfaceElevated,
              child: Center(
                child: Icon(
                  Icons.image_not_supported_outlined,
                  size: 48.sp,
                  color: AppColors.textMuted,
                ),
              ),
            ),
          // Gradient overlay fading to black at bottom
          IgnorePointer(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.transparent,
                    Color(0xCC000000),
                    Color(0xFF000000),
                  ],
                  stops: [0.0, 0.45, 0.85, 1.0],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Overlay Controls ──────────────────────────────────────────────────────

  Widget _buildOverlayControls(VenueModel venue) {
    return Row(
      children: [
        // Back button
        GestureDetector(
          onTap: () => Get.back(),
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.45),
              borderRadius: BorderRadius.circular(40),
              border: Border.all(
                color: Colors.white.withOpacity(0.18),
                width: 0.5,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.arrow_back_ios_new,
                  size: 13.sp,
                  color: Colors.white,
                ),
                SizedBox(width: 6.w),
                Text(
                  'Back',
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
        const Spacer(),
        // Favorite button
        Obx(() {
          final updated = _venueController.venues
                  .firstWhereOrNull((v) => v.id == venue.id) ??
              _venueController.featuredVenues
                  .firstWhereOrNull((v) => v.id == venue.id);
          final isFav = updated?.isFavorite ?? venue.isFavorite;

          return GestureDetector(
            onTap: () async {
              if (!await AuthGuard.requireAuth()) return;
              _venueController.toggleFavorite(venue.id);
            },
            child: Container(
              width: 38.w,
              height: 38.w,
              decoration: BoxDecoration(
                color: isFav
                    ? AppColors.gradientMid.withOpacity(0.2)
                    : Colors.black.withOpacity(0.45),
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withOpacity(0.18),
                  width: 0.5,
                ),
              ),
              child: Center(
                child: FaIcon(
                  isFav
                      ? FontAwesomeIcons.solidHeart
                      : FontAwesomeIcons.heart,
                  color: isFav ? AppColors.gradientMid : Colors.white,
                  size: 17.sp,
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  // ── Venue Name ────────────────────────────────────────────────────────────

  Widget _buildVenueName(VenueModel venue) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Text(
        venue.name,
        style: GoogleFonts.outfit(
          fontSize: 32.sp,
          fontWeight: FontWeight.w800,
          fontStyle: FontStyle.italic,
          color: AppColors.textPrimary,
          height: 1.1,
        ),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  // ── Category . Area ───────────────────────────────────────────────────────

  Widget _buildCategoryArea(VenueModel venue) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: PpCategoryAreaLabel(
        category: venue.category.replaceAll('_', ' '),
        area: venue.area,
        fontSize: 11,
      ),
    );
  }

  // ── Status Indicator ──────────────────────────────────────────────────────

  Widget _buildStatusIndicator(VenueModel venue) {
    // Derive open/closed from opening hours if available
    final statusText = _getStatusText(venue);
    final statusColor = _getStatusColor(venue);

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Row(
        children: [
          Container(
            width: 8.w,
            height: 8.w,
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: statusColor.withOpacity(0.5),
                  blurRadius: 6,
                ),
              ],
            ),
          ),
          SizedBox(width: 8.w),
          Text(
            statusText,
            style: GoogleFonts.poppins(
              fontSize: 12.sp,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w400,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  String _getStatusText(VenueModel venue) {
    if (!venue.isActive) return 'Closed';
    if (venue.openingHours != null) {
      final now = DateTime.now();
      final dayKey = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][now.weekday % 7];
      final todayHours = venue.openingHours?[dayKey];
      if (todayHours is Map && todayHours['close'] != null) {
        return 'Open  ·  Closes ${todayHours['close']}';
      }
    }
    return 'Open';
  }

  Color _getStatusColor(VenueModel venue) {
    if (!venue.isActive) return AppColors.errorColor;
    return AppColors.successColor;
  }

  // ── Rating ────────────────────────────────────────────────────────────────

  Widget _buildRating(VenueModel venue) {
    if (venue.rating <= 0) return const SizedBox.shrink();

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Row(
        children: [
          Text(
            venue.rating.toStringAsFixed(1),
            style: GoogleFonts.poppins(
              fontSize: 16.sp,
              fontWeight: FontWeight.w700,
              color: AppColors.ratingColor,
            ),
          ),
          SizedBox(width: 4.w),
          Icon(
            Icons.star_rounded,
            color: AppColors.ratingColor,
            size: 18.sp,
          ),
          SizedBox(width: 8.w),
          Text(
            '(reviews)',
            style: GoogleFonts.poppins(
              fontSize: 12.sp,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  // ── Description / Editorial ───────────────────────────────────────────────

  Widget _buildDescription(VenueModel venue) {
    final text = venue.editorial.isNotEmpty ? venue.editorial : venue.description;
    if (text.trim().isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Text(
        text,
        style: GoogleFonts.poppins(
          fontSize: 14.sp,
          color: AppColors.textSecondary,
          height: 1.65,
          letterSpacing: 0.1,
        ),
      ),
    );
  }

  // ── Action Buttons ────────────────────────────────────────────────────────

  Widget _buildActionButtons(VenueModel venue) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Column(
        children: [
          PpPrimaryButton(
            label: 'BOOK A TABLE',
            icon: Icons.table_bar_outlined,
            onTap: () async {
              if (!await AuthGuard.requireAuth()) return;
              // TODO: Navigate to booking flow
            },
          ),
          SizedBox(height: 14.h),
          PpSecondaryButton(
            label: 'VIP RESERVATION',
            icon: Icons.star_outline,
            onTap: () async {
              if (!await AuthGuard.requireAuth()) return;
              // TODO: Navigate to VIP booking flow
            },
          ),
        ],
      ),
    );
  }

  // ── Info Card ─────────────────────────────────────────────────────────────

  Widget _buildInfoCard(VenueModel venue) {
    final hasPhone = venue.phone.isNotEmpty;
    final hasInstagram = venue.instagram.isNotEmpty;
    final hasAddress = venue.address.isNotEmpty;

    if (!hasPhone && !hasInstagram && !hasAddress) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 24.w),
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Column(
        children: [
          if (hasAddress) ...[
            _buildInfoRow(Icons.location_on_outlined, 'Address', venue.address),
          ],
          if (hasPhone) ...[
            if (hasAddress)
              Divider(color: AppColors.borderSubtle, height: 24.h),
            _buildInfoRow(Icons.phone_outlined, 'Phone', venue.phone),
          ],
          if (hasInstagram) ...[
            if (hasPhone || hasAddress)
              Divider(color: AppColors.borderSubtle, height: 24.h),
            _buildInfoRow(
              FontAwesomeIcons.instagram,
              'Instagram',
              '@${venue.instagram}',
            ),
          ],
          // Price range
          Divider(color: AppColors.borderSubtle, height: 24.h),
          _buildInfoRow(
            Icons.attach_money,
            'Price Range',
            List.generate(venue.priceRange, (_) => '\$').join(),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16.sp, color: AppColors.gradientMid),
        SizedBox(width: 12.w),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: GoogleFonts.poppins(
                  fontSize: 10.sp,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.8,
                ),
              ),
              SizedBox(height: 2.h),
              Text(
                value,
                style: GoogleFonts.poppins(
                  fontSize: 13.sp,
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
