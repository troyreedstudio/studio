import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';
import 'package:pineapple/feature/home_bottom_nav/controller/home_nav_controller.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/venue/controller/venue_controller.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';
import 'package:pineapple/feature/home/model/event_model.dart';
import 'package:pineapple/feature/venue/ui/venue_detail_screen.dart';
import 'package:pineapple/feature/home/ui/plan_my_night_screen.dart';
import 'package:pineapple/feature/venue/ui/venue_booking_webview.dart';
import 'package:pineapple/feature/venue/widgets/venue_card_widget.dart';

class HomeScreen extends StatelessWidget {
  HomeScreen({super.key});

  final homeController = Get.put(HomeController());
  final venueController = Get.put(VenueController());

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _HomeHeader(),
            SizedBox(height: 8.h),
            _AreaFilterBar(homeController: homeController),
            SizedBox(height: 10.h),
            Expanded(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Column(
                    children: [
                      // Search bar (input only — no dropdown here)
                      _HomeSearchInput(),
                      SizedBox(height: 4.h),
                      Expanded(
                        child: _DiscoverContent(homeController: homeController),
                      ),
                    ],
                  ),
                  // Search results overlay — sits on top of content
                  Positioned(
                    top: 48.h,
                    left: 0,
                    right: 0,
                    child: _HomeSearchResults(),
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

// ── Header ──────────────────────────────────────────────────────────────────

class _HomeHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 16.h),
      child: Center(
        child: Image.asset(
          'assets/images/app_logo_dark.jpg',
          height: 100,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool hasBadge;

  const _IconButton({
    required this.icon,
    required this.onTap,
    this.hasBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38.w,
        height: 38.w,
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.borderSubtle,
            width: 0.5,
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 18.sp, color: AppColors.textSecondary),
            if (hasBadge)
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientPrimary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Area Filter Bar ──────────────────────────────────────────────────────────

class _AreaFilterBar extends StatelessWidget {
  final HomeController homeController;

  const _AreaFilterBar({required this.homeController});

  static const List<String> areas = ['All Bali', 'Canggu', 'Seminyak', 'Uluwatu'];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38.h,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        itemCount: areas.length,
        itemBuilder: (context, index) {
          return Obx(() {
            final isSelected =
                homeController.selectedAreaIndex.value == index;
            return GestureDetector(
              onTap: () {
                homeController.selectedAreaIndex.value = index;
                final venueCtrl = Get.find<VenueController>();
                if (index == 0) {
                  // "All Bali" — fetch all venues + all featured + all whats on
                  venueCtrl.selectedArea.value = '';
                  venueCtrl.selectedCategory.value = '';
                  venueCtrl.fetchVenues();
                  venueCtrl.fetchFeaturedVenues();
                  venueCtrl.fetchWhatsOn();
                } else {
                  final area = areas[index].toUpperCase();
                  venueCtrl.selectedCategory.value = '';
                  venueCtrl.fetchVenuesByArea(area);
                  venueCtrl.fetchVenues(area: area);
                  venueCtrl.fetchWhatsOn(area: area);
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: EdgeInsets.only(right: 10.w),
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                decoration: BoxDecoration(
                  gradient: isSelected ? AppColors.gradientPrimary : null,
                  color: isSelected ? null : AppColors.backgroundCard,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? Colors.transparent
                        : AppColors.borderSubtle,
                    width: 0.5,
                  ),
                ),
                child: Text(
                  areas[index],
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    fontWeight: isSelected
                        ? FontWeight.w700
                        : FontWeight.w400,
                    color: isSelected
                        ? AppColors.backgroundDark
                        : AppColors.textSecondary,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            );
          });
        },
      ),
    );
  }
}

// ── Main Content ─────────────────────────────────────────────────────────────

class _DiscoverContent extends StatelessWidget {
  final HomeController homeController;

  const _DiscoverContent({required this.homeController});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 12.h),

          // Plan My Night
          const _PlanMyNightCard(),

          SizedBox(height: 28.h),

          // This Week — horizontal day browser
          _SectionHeader(
            title: 'This Week',
            subtitle: 'Which night, which venue',
          ),
          SizedBox(height: 12.h),
          const _ThisWeekSection(),

          SizedBox(height: 28.h),

          // Featured Events
          const _FeaturedEventsSection(),

          SizedBox(height: 28.h),

          // Nightlife
          const _CategorySection(
            title: 'Top Nightlife',
            category: 'NIGHTLIFE',
          ),

          SizedBox(height: 28.h),

          // Beach Clubs
          const _CategorySection(
            title: 'Top Beach Clubs',
            category: 'BEACH_CLUB',
          ),

          SizedBox(height: 28.h),

          // Restaurants
          const _CategorySection(
            title: 'Top Restaurants',
            category: 'RESTAURANT',
          ),

          SizedBox(height: 28.h),

          // Gyms
          const _CategorySection(
            title: 'Top Gyms',
            category: 'WELLNESS',
          ),

          SizedBox(height: 40.h),
        ],
      ),
    );
  }
}

// ── Section Header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final VoidCallback? onSeeAll;

  const _SectionHeader({
    required this.title,
    this.subtitle,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w800,
                    fontStyle: FontStyle.italic,
                    color: AppColors.textPrimary,
                    letterSpacing: 0.2,
                  ),
                ),
                if (subtitle != null) ...[
                  SizedBox(height: 2.h),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      fontSize: 12.sp,
                      color: AppColors.textMuted,
                      letterSpacing: 0.1,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (onSeeAll != null)
            GestureDetector(
              onTap: onSeeAll,
              child: Row(
                children: [
                  ShaderMask(
                    shaderCallback: (bounds) =>
                        AppColors.gradientPrimary.createShader(bounds),
                    child: Text(
                      'See all',
                      style: TextStyle(
                        fontSize: 13.sp,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  SizedBox(width: 3.w),
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 10.sp,
                    color: AppColors.accentRoseGold,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ── Home Search Controller (shared state) ───────────────────────────────────

class _HomeSearchController extends GetxController {
  final textController = TextEditingController();
  final focusNode = FocusNode();
  final searchResults = <VenueModel>[].obs;
  final googleResults = <Map<String, dynamic>>[].obs;
  final isSearching = false.obs;
  final _netConfig = NetworkConfigV1();

  @override
  void onClose() {
    textController.dispose();
    focusNode.dispose();
    super.onClose();
  }

  Future<void> doSearch(String query) async {
    if (query.trim().isEmpty) {
      searchResults.clear();
      googleResults.clear();
      isSearching.value = false;
      return;
    }

    isSearching.value = true;

    try {
      // Search Pink Pineapple venues
      final venueUrl =
          '${Urls.searchVenues}?searchTerm=${Uri.encodeComponent(query)}';
      final venueResponse = await _netConfig.ApiRequestHandler(
        RequestMethod.GET, venueUrl, '{}',
      );

      if (venueResponse != null && venueResponse['success'] == true) {
        final venuesData = venueResponse['data'];
        if (venuesData is List) {
          searchResults.assignAll(
            venuesData.map((v) => VenueModel.fromJson(v as Map<String, dynamic>)).toList(),
          );
        } else {
          searchResults.clear();
        }
      } else {
        searchResults.clear();
      }

      // Google Places (temporary local test)
      try {
        const googleApiKey = 'AIzaSyCc43zTzs9uH4w5Y9McHyd2JYt8SzCFpy8';
        final googleReq = await http.post(
          Uri.parse('https://places.googleapis.com/v1/places:searchText'),
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.rating,places.primaryType,places.photos',
          },
          body: json.encode({
            'textQuery': '$query in Bali, Indonesia',
            'maxResultCount': 8,
            'languageCode': 'en',
          }),
        );
        if (googleReq.statusCode == 200) {
          final googleBody = json.decode(googleReq.body);
          final places = googleBody['places'] as List? ?? [];
          googleResults.assignAll(places.map((p) {
            String photoUrl = '';
            if (p['photos'] != null && (p['photos'] as List).isNotEmpty) {
              final photoName = p['photos'][0]['name'];
              photoUrl =
                  'https://places.googleapis.com/v1/$photoName/media?maxHeightPx=400&maxWidthPx=600&key=$googleApiKey';
            }
            return <String, dynamic>{
              'name': p['displayName']?['text'] ?? '',
              'address': p['formattedAddress'] ?? '',
              'category': (p['primaryType'] ?? '').toString().replaceAll('_', ' '),
              'rating': (p['rating'] ?? 0).toDouble(),
              'photoUrl': photoUrl,
              'source': 'google',
            };
          }).toList());
        } else {
          googleResults.clear();
        }
      } catch (_) {
        googleResults.clear();
      }
    } catch (_) {
      searchResults.clear();
      googleResults.clear();
    } finally {
      isSearching.value = false;
    }
  }

  void clearAll() {
    textController.clear();
    focusNode.unfocus();
    searchResults.clear();
    googleResults.clear();
  }
}

// ── Search Input (sits in layout flow) ──────────────────────────────────────

class _HomeSearchInput extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = Get.put(_HomeSearchController(), tag: 'homeSearch');

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w),
      child: Container(
        height: 42.h,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        child: TextField(
          controller: c.textController,
          focusNode: c.focusNode,
          style: GoogleFonts.poppins(fontSize: 13.sp, color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: 'Search venues, clubs, restaurants...',
            hintStyle: GoogleFonts.poppins(fontSize: 13.sp, color: AppColors.textMuted),
            prefixIcon: Icon(Icons.search, size: 18.sp, color: AppColors.textMuted),
            suffixIcon: ValueListenableBuilder<TextEditingValue>(
              valueListenable: c.textController,
              builder: (context, value, _) {
                if (value.text.isEmpty) return const SizedBox.shrink();
                return GestureDetector(
                  onTap: c.clearAll,
                  child: Icon(Icons.close, size: 18.sp, color: AppColors.textMuted),
                );
              },
            ),
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(vertical: 10.h),
          ),
          cursorColor: AppColors.gradientMid,
          onChanged: c.doSearch,
        ),
      ),
    );
  }
}

// ── Search Results Overlay (floats on top of content) ───────────────────────

class _HomeSearchResults extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = Get.find<_HomeSearchController>(tag: 'homeSearch');

    return Obx(() {
      if (c.searchResults.isEmpty && c.googleResults.isEmpty) {
        return const SizedBox.shrink();
      }

      return Padding(
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        child: Material(
          color: Colors.transparent,
          child: Container(
            constraints: BoxConstraints(maxHeight: 340.h),
            decoration: BoxDecoration(
              color: AppColors.backgroundCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.5),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ListView(
              shrinkWrap: true,
              padding: EdgeInsets.symmetric(vertical: 8.h),
              children: [
                // Pink Pineapple venues
                if (c.searchResults.isNotEmpty) ...[
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 4.h),
                    child: Text('PINK PINEAPPLE', style: GoogleFonts.poppins(
                      fontSize: 9.sp, fontWeight: FontWeight.w700,
                      color: AppColors.accentRoseGold, letterSpacing: 1.5,
                    )),
                  ),
                  ...c.searchResults.map((venue) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 2.h),
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 44.w, height: 44.w,
                        child: venue.heroImage.isNotEmpty
                            ? Image.network(venue.heroImage, fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  color: AppColors.surfaceElevated,
                                  child: Icon(Icons.place, color: AppColors.textMuted, size: 20),
                                ))
                            : Container(
                                color: AppColors.surfaceElevated,
                                child: Icon(Icons.place, color: AppColors.textMuted, size: 20),
                              ),
                      ),
                    ),
                    title: Text(venue.name, style: GoogleFonts.outfit(
                      fontSize: 14.sp, fontWeight: FontWeight.w700,
                      fontStyle: FontStyle.italic, color: AppColors.textPrimary,
                    )),
                    subtitle: Text(
                      '${venue.category.replaceAll("_", " ")} · ${venue.area}',
                      style: GoogleFonts.poppins(fontSize: 10.sp, color: AppColors.accentRoseGold, letterSpacing: 0.5),
                    ),
                    trailing: Icon(Icons.chevron_right, color: AppColors.textMuted, size: 18.sp),
                    onTap: () {
                      c.clearAll();
                      Get.to(() => VenueDetailScreen(venueId: venue.id));
                    },
                  )),
                ],

                // Google Places
                if (c.googleResults.isNotEmpty) ...[
                  if (c.searchResults.isNotEmpty)
                    Divider(color: AppColors.borderSubtle, height: 16.h, indent: 14.w, endIndent: 14.w),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 4.h),
                    child: Text('MORE IN BALI', style: GoogleFonts.poppins(
                      fontSize: 9.sp, fontWeight: FontWeight.w700,
                      color: AppColors.textMuted, letterSpacing: 1.5,
                    )),
                  ),
                  ...c.googleResults.map((place) {
                    final name = place['name']?.toString() ?? '';
                    final address = place['address']?.toString() ?? '';
                    final category = place['category']?.toString().replaceAll('_', ' ') ?? '';
                    final rating = (place['rating'] as num?)?.toDouble() ?? 0.0;
                    final photoUrl = place['photoUrl']?.toString() ?? '';

                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 2.h),
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 44.w, height: 44.w,
                          child: photoUrl.isNotEmpty
                              ? Image.network(photoUrl, fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: AppColors.surfaceElevated,
                                    child: Icon(Icons.map_outlined, color: AppColors.textMuted, size: 20),
                                  ))
                              : Container(
                                  color: AppColors.surfaceElevated,
                                  child: Icon(Icons.map_outlined, color: AppColors.textMuted, size: 20),
                                ),
                        ),
                      ),
                      title: Text(name, style: GoogleFonts.poppins(
                        fontSize: 13.sp, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
                      )),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (category.isNotEmpty)
                            Text(category.toUpperCase(), style: GoogleFonts.poppins(
                              fontSize: 9.sp, color: AppColors.textMuted, letterSpacing: 0.8,
                            )),
                          if (address.isNotEmpty)
                            Text(address, maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.poppins(fontSize: 12.sp, color: AppColors.textSecondary)),
                          if (rating > 0)
                            Row(children: [
                              Icon(Icons.star_rounded, size: 13.sp, color: AppColors.ratingColor),
                              SizedBox(width: 3.w),
                              Text(rating.toStringAsFixed(1), style: GoogleFonts.poppins(
                                fontSize: 11.sp, color: AppColors.textSecondary,
                              )),
                            ]),
                        ],
                      ),
                      trailing: Icon(Icons.open_in_new, color: AppColors.textMuted, size: 14.sp),
                      onTap: () {
                        c.focusNode.unfocus();
                      },
                    );
                  }),
                ],
              ],
            ),
          ),
        ),
      );
    });
  }
}

// ── Venue Search Bar (legacy — kept for reference) ──────────────────────────

class _VenueSearchBar extends StatefulWidget {
  @override
  State<_VenueSearchBar> createState() => _VenueSearchBarState();
}

class _VenueSearchBarState extends State<_VenueSearchBar> {
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final venueCtrl = Get.find<VenueController>();

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w),
      child: Container(
        height: 42.h,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.borderSubtle,
            width: 0.5,
          ),
        ),
        child: TextField(
          controller: _textController,
          focusNode: _focusNode,
          style: GoogleFonts.poppins(
            fontSize: 13.sp,
            color: AppColors.textPrimary,
          ),
          decoration: InputDecoration(
            hintText: 'Looking for something specific?',
            hintStyle: GoogleFonts.poppins(
              fontSize: 13.sp,
              color: AppColors.textMuted,
            ),
            prefixIcon: Icon(
              Icons.search,
              size: 18.sp,
              color: AppColors.textMuted,
            ),
            suffixIcon: ValueListenableBuilder<TextEditingValue>(
              valueListenable: _textController,
              builder: (context, value, _) {
                if (value.text.isEmpty) return const SizedBox.shrink();
                return GestureDetector(
                  onTap: () {
                    _textController.clear();
                    _focusNode.unfocus();
                    venueCtrl.fetchVenues();
                  },
                  child: Icon(
                    Icons.close,
                    size: 18.sp,
                    color: AppColors.textMuted,
                  ),
                );
              },
            ),
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(vertical: 10.h),
          ),
          cursorColor: AppColors.gradientMid,
          onChanged: (query) {
            if (query.trim().isEmpty) {
              venueCtrl.fetchVenues();
            } else {
              venueCtrl.searchVenues(query);
            }
          },
        ),
      ),
    );
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────

class _EmptySection extends StatelessWidget {
  final String message;

  const _EmptySection({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(32.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.event_busy_outlined,
              size: 40.sp,
              color: AppColors.textMuted,
            ),
            SizedBox(height: 10.h),
            Text(
              message,
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 13.sp,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Featured Events Section ─────────────────────────────────────────────────

// ── Plan My Night Card ──────────────────────────────────────────────────────

class _PlanMyNightCard extends StatelessWidget {
  const _PlanMyNightCard();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w),
      child: GestureDetector(
        onTap: () => Get.to(() => const PlanMyNightScreen()),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(20.w),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1A1A1A), Color(0xFF2A1A20)],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.accentRoseGold.withOpacity(0.3),
              width: 0.5,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.accentRoseGold.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PLAN MY NIGHT',
                      style: GoogleFonts.outfit(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w800,
                        fontStyle: FontStyle.italic,
                        color: AppColors.textPrimary,
                        letterSpacing: 1,
                      ),
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      'Tell us the vibe, we\'ll build your evening',
                      style: GoogleFonts.poppins(
                        fontSize: 12.sp,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w300,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 12.w),
              Container(
                padding: EdgeInsets.all(12.w),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientPrimary,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.nightlife,
                  color: AppColors.backgroundDark,
                  size: 22.sp,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Featured Events ─────────────────────────────────────────────────────────

class _FeaturedEventsSection extends StatelessWidget {
  const _FeaturedEventsSection();

  // Anchor event — Day Zero Bali pinned first as the flagship festival
  // until/unless an editor flips its data. All other tiles come from the
  // backend (HomeController.allEventList, populated by /api/v1/events).
  static final _anchorEvents = [
    {
      'title': 'Day Zero Bali',
      'subtitle': 'Journey to the Centre of the Universe',
      'venue': 'Savaya · GWK Cultural Park',
      'dates': 'Apr 14–19, 2026',
      'lineup':
          'Bonobo · Damian Lazarus · Jamie Jones · Jan Blomqvist · Âme · John Summit',
      'ticketUrl': 'https://megatix.co.id/events/day-zero-bali',
      'imageUrl':
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    },
  ];

  String _formatDate(DateTime? d) {
    if (d == null) return '';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[d.month - 1]} ${d.day}, ${d.year}';
  }

  Map<String, String> _toCardData(AllEventModel event) {
    final imageUrl =
        (event.eventImages != null && event.eventImages!.isNotEmpty)
            ? event.eventImages!.first
            : '';
    final venueName = event.user?.fullName ?? '';
    final dates = _formatDate(event.startDate);
    final time =
        '${event.startTime ?? ''}${(event.endTime != null && event.endTime!.isNotEmpty) ? ' – ${event.endTime}' : ''}';
    return {
      'title': event.eventName ?? 'Event',
      'subtitle': event.descriptions ?? '',
      'venue': venueName.isNotEmpty ? venueName : (dates.isNotEmpty ? dates : ''),
      'dates': dates,
      'lineup': time.trim(),
      'ticketUrl': '',
      'imageUrl': imageUrl,
      'eventId': event.id ?? '',
    };
  }

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<HomeController>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: 'Featured Events',
          subtitle: "Don't miss out",
        ),
        SizedBox(height: 12.h),
        Obx(() {
          // Filter to APPROVED events with at least an image; drop ones we
          // can't render usefully. Keep newest-first by createdAt (backend
          // orders by createdAt desc by default).
          final apiEvents = controller.allEventList
              .where((e) =>
                  e.eventStatus == 'APPROVED' &&
                  e.eventName != null &&
                  e.eventName!.isNotEmpty)
              .map(_toCardData)
              .toList();

          // Anchor event(s) first, then API events. If the API has 0
          // events, the anchor still renders so the section never empties.
          final cards = [..._anchorEvents, ...apiEvents];

          if (cards.isEmpty) {
            return SizedBox(
              height: 60.h,
              child: Center(
                child: Text(
                  'No featured events yet.',
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
            );
          }

          return SizedBox(
            height: 220.h,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              itemCount: cards.length,
              itemBuilder: (context, index) {
                return _FeaturedEventCard(event: cards[index]);
              },
            ),
          );
        }),
      ],
    );
  }
}

class _FeaturedEventCard extends StatelessWidget {
  const _FeaturedEventCard({required this.event});

  final Map<String, String> event;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        final url = event['ticketUrl'] ?? '';
        if (url.isNotEmpty) {
          Get.to(() => VenueBookingWebView(
            bookingUrl: url,
            venueName: event['title'] ?? 'Event',
          ));
        }
      },
      child: Container(
        width: 300.w,
        margin: EdgeInsets.only(right: 14.w),
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Event image
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
              child: SizedBox(
                height: 110.h,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      event['imageUrl'] ?? '',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.surfaceElevated,
                        child: Icon(Icons.event, color: AppColors.textMuted, size: 32.sp),
                      ),
                    ),
                    // Gradient overlay
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 50.h,
                      child: const DecoratedBox(
                        decoration: BoxDecoration(gradient: AppColors.gradientOverlay),
                      ),
                    ),
                    // Date badge
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                        decoration: BoxDecoration(
                          gradient: AppColors.gradientPrimary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          event['dates'] ?? '',
                          style: GoogleFonts.poppins(
                            fontSize: 9.sp,
                            fontWeight: FontWeight.w700,
                            color: AppColors.backgroundDark,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Event details
            Padding(
              padding: EdgeInsets.fromLTRB(12.w, 8.h, 12.w, 10.h),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event['title'] ?? '',
                    style: GoogleFonts.outfit(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w800,
                      fontStyle: FontStyle.italic,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 2.h),
                  Text(
                    event['venue'] ?? '',
                    style: GoogleFonts.poppins(
                      fontSize: 12.sp,
                      color: AppColors.accentRoseGold,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: 4.h),
                  Text(
                    event['lineup'] ?? '',
                    style: GoogleFonts.poppins(
                      fontSize: 11.sp,
                      color: AppColors.textSecondary,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
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

// ── Category Section ─────────────────────────────────────────────────────────

class _CategorySection extends StatelessWidget {
  final String title;
  final String category;

  const _CategorySection({
    required this.title,
    required this.category,
  });

  // Curated order per category — venues not in the list appear after in default order
  static const _curatedOrder = <String, List<String>>{
    'NIGHTLIFE': ['savaya', 'desa-kitsune', 'shady-pig', 'mesa', 'miss-fish'],
    'BEACH_CLUB': ['finns-beach-club', 'el-kabron', 'atlas-beach-club', 'desa-kitsune', 'potato-head-seminyak', 'ku-de-ta'],
    'RESTAURANT': ['gimme-shelter', 'da-maria', 'yuki', 'muda-suka'],
    'WELLNESS': ['nirvana-fitness', 'obsidian', 'power-and-revive', 'body-factory', 'bamboo-fitness'],
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        _SectionHeader(
          title: title,
        ),
        SizedBox(height: 12.h),
        SizedBox(
          height: 220.h,
          child: Obx(() {
            final venueCtrl = Get.find<VenueController>();

            if (venueCtrl.isLoading.value) {
              return loading();
            }

            final allVenues = venueCtrl.venues;
            var filtered = allVenues
                .where((v) => v.category.toUpperCase() == category)
                .toList();

            // Apply curated order if one exists for this category.
            // Curated list can pull venues from ANY category — many Bali
            // venues are restaurants by day, nightclubs by night.
            final order = _curatedOrder[category];
            if (order != null) {
              final ordered = <VenueModel>[];
              for (final slug in order) {
                // First try within the category, then from all venues
                var match = filtered.firstWhereOrNull((v) => v.slug == slug);
                match ??= allVenues.firstWhereOrNull((v) => v.slug == slug);
                if (match != null) ordered.add(match);
              }
              // Add any remaining same-category venues not in the curated list
              for (final v in filtered) {
                if (!ordered.any((o) => o.slug == v.slug)) ordered.add(v);
              }
              filtered = ordered;
            }

            filtered = filtered.take(10).toList();

            if (filtered.isEmpty) {
              return Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20.w),
                  child: Text(
                    'No ${title.toLowerCase()} found',
                    style: GoogleFonts.poppins(
                      fontSize: 13.sp,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              );
            }

            return ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              itemCount: filtered.length,
              itemBuilder: (context, index) {
                return VenueCardWidget(venue: filtered[index]);
              },
            );
          }),
        ),
      ],
    );
  }
}

// ── This Week Section ────────────────────────────────────────────────────────

class _ThisWeekSection extends StatelessWidget {
  const _ThisWeekSection();

  /// Short day keys matching the controller's weeklySchedule map.
  static const _shortDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  /// Full day labels for display.
  static const _dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  @override
  Widget build(BuildContext context) {
    final venueCtrl = Get.find<VenueController>();

    return SizedBox(
      height: 210.h,
      child: Obx(() {
        if (venueCtrl.isWhatsOnLoading.value && venueCtrl.weeklySchedule.isEmpty) {
          return loading();
        }

        final now = DateTime.now();
        // Build list of 7 days starting from today
        final days = List.generate(7, (i) => now.add(Duration(days: i)));

        return ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: EdgeInsets.symmetric(horizontal: 20.w),
          itemCount: 7,
          itemBuilder: (context, index) {
            final date = days[index];
            final isToday = index == 0;
            // DateTime weekday: 1=Monday .. 7=Sunday
            final shortKey = _shortDays[date.weekday - 1];
            final dayLabel = _dayLabels[date.weekday - 1];
            final dateLabel = DateFormat('d MMM').format(date);

            // Get venues for this day from the schedule
            final dayVenues = venueCtrl.weeklySchedule[shortKey] ?? <VenueModel>[];

            return Padding(
              padding: EdgeInsets.only(right: 12.w),
              child: _DayCard(
                dayLabel: dayLabel,
                dateLabel: dateLabel,
                isToday: isToday,
                venues: dayVenues,
              ),
            );
          },
        );
      }),
    );
  }
}

class _DayCard extends StatelessWidget {
  final String dayLabel;
  final String dateLabel;
  final bool isToday;
  final List<VenueModel> venues;

  const _DayCard({
    required this.dayLabel,
    required this.dateLabel,
    required this.isToday,
    required this.venues,
  });

  void _showDayDetail(BuildContext context) {
    if (venues.isEmpty) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollCtrl) => Column(
          children: [
            SizedBox(height: 12.h),
            Container(
              width: 40.w, height: 4.h,
              decoration: BoxDecoration(
                color: AppColors.textMuted,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            SizedBox(height: 16.h),
            Text(
              isToday ? 'TONIGHT' : dayLabel,
              style: GoogleFonts.outfit(
                fontSize: 24.sp,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              dateLabel,
              style: GoogleFonts.poppins(
                fontSize: 13.sp,
                color: AppColors.textMuted,
              ),
            ),
            SizedBox(height: 16.h),
            Expanded(
              child: ListView.separated(
                controller: scrollCtrl,
                padding: EdgeInsets.symmetric(horizontal: 20.w),
                itemCount: venues.length,
                separatorBuilder: (_, __) => Divider(color: AppColors.borderSubtle, height: 24.h),
                itemBuilder: (context, i) {
                  final venue = venues[i];
                  final shortKey = dayLabel.substring(0, 3).toLowerCase();
                  final specialName = _getSpecialNightName(venue, shortKey);
                  final timeRange = _getTimeRange(venue, shortKey);
                  return GestureDetector(
                    onTap: () {
                      Navigator.pop(context);
                      Get.to(() => VenueDetailScreen(venueId: venue.id));
                    },
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                venue.name,
                                style: GoogleFonts.outfit(
                                  fontSize: 18.sp,
                                  fontWeight: FontWeight.w700,
                                  fontStyle: FontStyle.italic,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              SizedBox(height: 2.h),
                              if (specialName != null)
                                Text(
                                  timeRange != null ? '$specialName \u00B7 $timeRange' : specialName,
                                  style: GoogleFonts.poppins(
                                    fontSize: 13.sp,
                                    color: AppColors.gradientMid,
                                  ),
                                ),
                              Text(
                                '${venue.category.replaceAll("_", " ")} \u00B7 ${venue.area}',
                                style: GoogleFonts.poppins(
                                  fontSize: 11.sp,
                                  color: AppColors.textMuted,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios,
                          size: 14.sp,
                          color: AppColors.gradientMid,
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showDayDetail(context),
      child: Container(
        width: 160.w,
      padding: EdgeInsets.all(14.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isToday ? AppColors.gradientMid : AppColors.borderSubtle,
          width: isToday ? 1.5 : 0.5,
        ),
        boxShadow: isToday
            ? [
                BoxShadow(
                  color: AppColors.gradientMid.withOpacity(0.15),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day label + TODAY badge
          Row(
            children: [
              Text(
                dayLabel,
                style: GoogleFonts.outfit(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w800,
                  fontStyle: FontStyle.italic,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              if (isToday)
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                  decoration: BoxDecoration(
                    gradient: AppColors.brandGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'TODAY',
                    style: GoogleFonts.poppins(
                      fontSize: 8.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.background,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
            ],
          ),
          SizedBox(height: 2.h),
          // Date
          Text(
            dateLabel,
            style: GoogleFonts.poppins(
              fontSize: 11.sp,
              fontWeight: FontWeight.w300,
              color: AppColors.textMuted,
            ),
          ),
          SizedBox(height: 10.h),
          // Venue list
          Expanded(
            child: venues.isEmpty
                ? Text(
                    'No venues',
                    style: GoogleFonts.poppins(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w300,
                      color: AppColors.textMuted,
                      fontStyle: FontStyle.italic,
                    ),
                  )
                : ListView.separated(
                    physics: const NeverScrollableScrollPhysics(),
                    padding: EdgeInsets.zero,
                    itemCount: venues.length > 3 ? 3 : venues.length,
                    separatorBuilder: (_, __) => SizedBox(height: 8.h),
                    itemBuilder: (context, i) {
                      final venue = venues[i];
                      // Check for a special night name and time range from weeklySchedule
                      final dayKey = dayLabel.toLowerCase();
                      final specialName = _getSpecialNightName(venue, dayKey);
                      final timeRange = _getTimeRange(venue, dayKey);
                      return GestureDetector(
                        onTap: () => Get.to(() => VenueDetailScreen(venueId: venue.id)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    venue.name,
                                    style: GoogleFonts.poppins(
                                      fontSize: 13.sp,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                SizedBox(width: 3.w),
                                Icon(
                                  Icons.arrow_forward_ios,
                                  size: 9.sp,
                                  color: AppColors.gradientMid,
                                ),
                              ],
                            ),
                            if (specialName != null)
                              Text(
                                specialName,
                                style: GoogleFonts.poppins(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.gradientMid,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            if (timeRange != null)
                              Text(
                                timeRange,
                                style: GoogleFonts.poppins(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textSecondary,
                                ),
                              )
                            else if (specialName == null)
                              Text(
                                'Open',
                                style: GoogleFonts.poppins(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          // "more" indicator
          if (venues.length > 3)
            Padding(
              padding: EdgeInsets.only(top: 4.h),
              child: Text(
                '+${venues.length - 3} more',
                style: GoogleFonts.poppins(
                  fontSize: 11.sp,
                  fontWeight: FontWeight.w500,
                  color: AppColors.gradientMid,
                ),
              ),
            ),
        ],
      ),
    ),
    );
  }

  /// Extract a special night name from the venue's weeklySchedule if available.
  /// Strips the venue name and day from the event name to avoid repetition.
  String? _getSpecialNightName(VenueModel venue, String dayKey) {
    if (venue.weeklySchedule == null) return null;
    final dayData = venue.weeklySchedule![dayKey];
    if (dayData is Map<String, dynamic>) {
      final rawName = dayData['name']?.toString() ?? '';
      final desc = dayData['description']?.toString() ?? '';
      final genre = dayData['genre']?.toString() ?? '';

      if (rawName.isEmpty) {
        if (desc.isNotEmpty) return desc;
        if (genre.isNotEmpty) return genre;
        return null;
      }

      // Strip venue name prefix (e.g. "Bella Monday" -> "Monday")
      String cleaned = rawName;
      if (cleaned.startsWith(venue.name)) {
        cleaned = cleaned.substring(venue.name.length).trim();
      }

      // Strip day names
      final dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      // Strip trailing day name (e.g. "EDM Monday" -> "EDM")
      for (final d in dayNames) {
        if (cleaned.endsWith(' $d')) {
          cleaned = cleaned.substring(0, cleaned.length - d.length - 1).trim();
          break;
        }
      }

      // If what's left is empty or just a day name, use description or genre
      if (cleaned.isEmpty || dayNames.contains(cleaned)) {
        if (desc.isNotEmpty) return desc;
        if (genre.isNotEmpty) return genre;
        return null;
      }

      return cleaned;
    }
    return null;
  }

  /// Extract start/end time range from the venue's weeklySchedule for a given day.
  String? _getTimeRange(VenueModel venue, String dayKey) {
    if (venue.weeklySchedule == null) return null;
    final dayData = venue.weeklySchedule![dayKey];
    if (dayData is Map<String, dynamic>) {
      final startTime = dayData['startTime']?.toString();
      final endTime = dayData['endTime']?.toString();
      if (startTime != null && endTime != null) {
        return '$startTime\u2013$endTime';
      }
      return startTime;
    }
    return null;
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

Widget buildProfileAvatar(String? imageUrl, String? name) {
  if (imageUrl != null && imageUrl.isNotEmpty) {
    return CircleAvatar(
      radius: 35,
      backgroundImage: NetworkImage(imageUrl),
      backgroundColor: AppColors.backgroundCard,
      onBackgroundImageError: (_, __) {},
    );
  }

  String initials = 'U';
  if (name != null && name.isNotEmpty) {
    final parts = name.trim().split(' ');
    if (parts.length > 1) {
      initials = '${parts[0][0].toUpperCase()}${parts[1][0].toUpperCase()}';
    } else {
      initials = parts[0][0].toUpperCase();
    }
  }

  return CircleAvatar(
    radius: 35,
    backgroundColor: AppColors.accentRoseGold.withOpacity(0.15),
    child: Text(
      initials,
      style: TextStyle(
        fontSize: 20.sp,
        fontWeight: FontWeight.bold,
        color: AppColors.accentRoseGold,
      ),
    ),
  );
}
