import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/venue/controller/venue_controller.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';
import 'package:pineapple/feature/venue/ui/venue_detail_screen.dart';

class FavoriteVenuesScreen extends StatefulWidget {
  const FavoriteVenuesScreen({super.key});

  @override
  State<FavoriteVenuesScreen> createState() => _FavoriteVenuesScreenState();
}

class _FavoriteVenuesScreenState extends State<FavoriteVenuesScreen> {
  final _venues = <VenueModel>[].obs;
  final _isLoading = true.obs;
  final _net = NetworkConfigV1();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final response = await _net.ApiRequestHandler(
        RequestMethod.GET,
        Urls.favoriteVenues,
        '{}',
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        final list = (response['data'] as List? ?? [])
            .map((j) => VenueModel.fromJson(j as Map<String, dynamic>))
            .toList();
        _venues.assignAll(list);
      }
    } catch (_) {
      // swallow — show empty state
    } finally {
      _isLoading.value = false;
    }
  }

  Future<void> _refresh() async {
    await _fetch();
  }

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: Obx(() {
                if (_isLoading.value) {
                  return Center(child: loading());
                }
                if (_venues.isEmpty) {
                  return _buildEmptyState();
                }
                return RefreshIndicator(
                  color: AppColors.gradientMid,
                  backgroundColor: AppColors.surface,
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: EdgeInsets.fromLTRB(16.w, 8.h, 16.w, 24.h),
                    itemCount: _venues.length,
                    separatorBuilder: (_, __) => SizedBox(height: 12.h),
                    itemBuilder: (_, i) => _FavoriteVenueRow(venue: _venues[i]),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 8.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: EdgeInsets.all(8.w),
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: Icon(Icons.arrow_back_ios_new, color: AppColors.textPrimary, size: 14.sp),
            ),
          ),
          SizedBox(width: 14.w),
          Text(
            'MY WISHLIST',
            style: GoogleFonts.outfit(
              fontSize: 20.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
              letterSpacing: 3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 40.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: FaIcon(
                FontAwesomeIcons.heart,
                size: 32.sp,
                color: AppColors.textMuted,
              ),
            ),
            SizedBox(height: 20.h),
            Text(
              'Your wishlist is empty',
              style: GoogleFonts.outfit(
                fontSize: 20.sp,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
                color: AppColors.textSecondary,
              ),
            ),
            SizedBox(height: 8.h),
            Text(
              'Tap the heart on any venue to add it here',
              style: GoogleFonts.poppins(
                fontSize: 13.sp,
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Horizontal row card — image left, text right, heart on far right.
class _FavoriteVenueRow extends StatelessWidget {
  final VenueModel venue;
  const _FavoriteVenueRow({required this.venue});

  @override
  Widget build(BuildContext context) {
    final venueController = Get.find<VenueController>();
    return GestureDetector(
      onTap: () => Get.to(() => VenueDetailScreen(venueId: venue.id)),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        child: Row(
          children: [
            // Hero image
            ClipRRect(
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(14.r),
                bottomLeft: Radius.circular(14.r),
              ),
              child: SizedBox(
                width: 96.w,
                height: 96.w,
                child: CachedNetworkImage(
                  imageUrl: venue.heroImage.isNotEmpty
                      ? venue.heroImage
                      : (venue.photos.isNotEmpty ? venue.photos.first : ''),
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    color: AppColors.surfaceElevated,
                    child: Icon(Icons.image_outlined,
                        size: 24.sp, color: AppColors.textMuted),
                  ),
                  errorWidget: (_, __, ___) => Container(
                    color: AppColors.surfaceElevated,
                    child: Icon(Icons.broken_image_outlined,
                        size: 24.sp, color: AppColors.textMuted),
                  ),
                ),
              ),
            ),
            SizedBox(width: 12.w),
            // Body
            Expanded(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 10.h),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      venue.name,
                      style: GoogleFonts.outfit(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w800,
                        fontStyle: FontStyle.italic,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: 3.h),
                    Text(
                      '${venue.category.replaceAll("_", " ")} · ${venue.area}',
                      style: GoogleFonts.poppins(
                        fontSize: 11.sp,
                        color: AppColors.textSecondary,
                        letterSpacing: 0.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (venue.recentVibe != null) ...[
                      SizedBox(height: 4.h),
                      Row(
                        children: [
                          Text('🔥', style: TextStyle(fontSize: 11.sp)),
                          SizedBox(width: 4.w),
                          Expanded(
                            child: Text(
                              _vibeSummary(venue.recentVibe!),
                              style: GoogleFonts.poppins(
                                fontSize: 10.sp,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFFE8A0B0),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            // Heart toggle
            Padding(
              padding: EdgeInsets.only(right: 12.w),
              child: GestureDetector(
                onTap: () => venueController.toggleFavorite(venue.id),
                child: Padding(
                  padding: EdgeInsets.all(8.w),
                  child: FaIcon(
                    FontAwesomeIcons.solidHeart,
                    color: AppColors.gradientMid,
                    size: 18.sp,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _vibeSummary(Map<String, dynamic> vibe) {
    const crowdShort = ['Empty', 'Chill', 'Filling', 'Packed', 'Capped'];
    const musicShort = ['Silent', 'Background', 'Good', 'Great', 'Incredible'];
    const energyShort = ['Dead', 'Mellow', 'Warming', 'Lit', 'Fire'];
    final c = (vibe['crowd'] as num?)?.toInt().clamp(0, 4) ?? 2;
    final m = (vibe['music'] as num?)?.toInt().clamp(0, 4) ?? 2;
    final e = (vibe['energy'] as num?)?.toInt().clamp(0, 4) ?? 2;
    return '${crowdShort[c]} · ${musicShort[m]} · ${energyShort[e]}';
  }
}
