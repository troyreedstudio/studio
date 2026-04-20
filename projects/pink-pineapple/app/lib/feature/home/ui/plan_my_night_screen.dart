import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/feature/venue/controller/venue_controller.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';
import 'package:pineapple/feature/venue/ui/venue_detail_screen.dart';

class PlanMyNightScreen extends StatefulWidget {
  const PlanMyNightScreen({super.key});

  @override
  State<PlanMyNightScreen> createState() => _PlanMyNightScreenState();
}

class _PlanMyNightScreenState extends State<PlanMyNightScreen> {
  // Step tracking
  int _step = 0;

  // User choices
  String _area = '';
  String _vibe = '';
  int _groupSize = 2;

  // Results
  List<_ItineraryStop> _itinerary = [];

  static const _areas = ['Canggu', 'Seminyak', 'Uluwatu', 'Surprise me'];
  static const _vibes = [
    {'label': 'Chill dinner & drinks', 'icon': Icons.restaurant_outlined},
    {'label': 'Dinner & dancing', 'icon': Icons.nightlife},
    {'label': 'Up late', 'icon': Icons.dark_mode_outlined},
    {'label': 'Date night', 'icon': Icons.favorite_outline},
    {'label': 'Beach club day party', 'icon': Icons.beach_access_outlined},
  ];

  void _selectArea(String area) {
    setState(() {
      _area = area;
      _step = 1;
    });
  }

  void _selectVibe(String vibe) {
    setState(() {
      _vibe = vibe;
      _step = 2;
    });
  }

  void _setGroupSize(int size) {
    setState(() {
      _groupSize = size;
    });
  }

  void _generateItinerary() {
    final venueCtrl = Get.find<VenueController>();
    final allVenues = venueCtrl.venues.toList();

    // Filter by area
    String areaFilter = _area.toUpperCase();
    if (_area == 'Surprise me') areaFilter = '';

    final areaVenues = areaFilter.isEmpty
        ? allVenues
        : allVenues.where((v) => v.area.toUpperCase() == areaFilter).toList();

    // Categorize — area-filtered for dinner/nightlife
    final restaurants = areaVenues
        .where((v) => v.category == 'RESTAURANT')
        .toList()..shuffle();
    final nightlife = areaVenues
        .where((v) => v.category == 'NIGHTLIFE')
        .toList()..shuffle();

    // Beach clubs — respect area filter, use curated order per area
    const beachClubOrder = <String, List<String>>{
      'CANGGU': ['finns-beach-club', 'atlas-beach-club', 'desa-kitsune', 'la-brisa', 'morabito', 'the-lawn', 'como-beach-club'],
      'SEMINYAK': ['ku-de-ta', 'potato-head-seminyak', 'mrs-sippy'],
      'ULUWATU': ['savaya', 'omnia-dayclub', 'sundays-beach-club', 'ulu-cliffhouse', 'karma-beach', 'the-edge'],
    };

    List<VenueModel> beachClubSource;
    if (areaFilter.isEmpty) {
      // "Surprise me" — all beach clubs
      beachClubSource = allVenues.where((v) => v.category == 'BEACH_CLUB').toList();
    } else {
      beachClubSource = areaVenues.where((v) => v.category == 'BEACH_CLUB').toList();
    }

    // Sort by curated order for the selected area
    final order = beachClubOrder[areaFilter] ?? [];
    if (order.isNotEmpty) {
      beachClubSource.sort((a, b) {
        final ia = order.indexOf(a.slug);
        final ib = order.indexOf(b.slug);
        if (ia == -1 && ib == -1) return 0;
        if (ia == -1) return 1;
        if (ib == -1) return -1;
        return ia.compareTo(ib);
      });
    }
    final beachClubs = beachClubSource;

    final bars = [...restaurants, ...beachClubs]..shuffle();

    final stops = <_ItineraryStop>[];

    if (_vibe == 'Beach club day party') {
      // Afternoon beach club flow — pull from all Bali
      if (beachClubs.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '12:00 PM',
          label: 'Beach club',
          venue: beachClubs.first,
        ));
      }
      if (beachClubs.length > 1) {
        stops.add(_ItineraryStop(
          time: '3:00 PM',
          label: 'Pool party',
          venue: beachClubs[1],
        ));
      }
      if (beachClubs.length > 2) {
        stops.add(_ItineraryStop(
          time: '5:30 PM',
          label: 'Sunset session',
          venue: beachClubs[2],
        ));
      }
      if (restaurants.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '8:00 PM',
          label: 'Dinner',
          venue: restaurants.first,
        ));
      }
    } else if (_vibe == 'Chill dinner & drinks') {
      // Relaxed evening
      if (restaurants.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '7:00 PM',
          label: 'Dinner',
          venue: restaurants.first,
        ));
      }
      if (bars.isNotEmpty) {
        final bar = bars.firstWhere(
          (v) => v.slug != (restaurants.isNotEmpty ? restaurants.first.slug : ''),
          orElse: () => bars.first,
        );
        stops.add(_ItineraryStop(
          time: '9:30 PM',
          label: 'Drinks & vibes',
          venue: bar,
        ));
      }
    } else if (_vibe == 'Date night') {
      // Romantic evening
      if (restaurants.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '7:00 PM',
          label: 'Dinner for two',
          venue: restaurants.first,
        ));
      }
      if (bars.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '9:30 PM',
          label: 'Cocktails',
          venue: bars.first,
        ));
      }
    } else if (_vibe == 'Up late') {
      // Club hopping — no dinner, just nightlife
      if (nightlife.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '10:00 PM',
          label: 'Warm up',
          venue: nightlife.first,
        ));
      }
      if (nightlife.length > 1) {
        stops.add(_ItineraryStop(
          time: '12:00 AM',
          label: 'Main event',
          venue: nightlife[1],
        ));
      }
      if (nightlife.length > 2) {
        stops.add(_ItineraryStop(
          time: '2:00 AM',
          label: 'After hours',
          venue: nightlife[2],
        ));
      }
    } else {
      // Dinner & dancing — dinner → drinks → club → late night
      if (restaurants.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '7:30 PM',
          label: 'Dinner',
          venue: restaurants.first,
        ));
      }
      if (bars.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '9:30 PM',
          label: 'Pre-drinks',
          venue: bars.first,
        ));
      }
      if (nightlife.isNotEmpty) {
        stops.add(_ItineraryStop(
          time: '11:00 PM',
          label: 'Main event',
          venue: nightlife.first,
        ));
      }
      if (nightlife.length > 1) {
        stops.add(_ItineraryStop(
          time: '1:00 AM',
          label: 'Late night',
          venue: nightlife[1],
        ));
      }
    }

    setState(() {
      _itinerary = stops;
      _step = 3;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: AppColors.textPrimary, size: 18.sp),
          onPressed: () {
            if (_step > 0 && _step < 3) {
              setState(() => _step--);
            } else {
              Get.back();
            }
          },
        ),
        title: Text(
          'Plan My Night',
          style: GoogleFonts.outfit(
            fontSize: 18.sp,
            fontWeight: FontWeight.w800,
            fontStyle: FontStyle.italic,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: _step == 0
              ? _buildAreaStep()
              : _step == 1
                  ? _buildVibeStep()
                  : _step == 2
                      ? _buildGroupStep()
                      : _buildItinerary(),
        ),
      ),
    );
  }

  // ── Step 0: Where? ────────────────────────────────────────────────────────

  Widget _buildAreaStep() {
    return Padding(
      key: const ValueKey('area'),
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 32.h),
          Text(
            'Where are you\nheaded tonight?',
            style: GoogleFonts.outfit(
              fontSize: 28.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
          SizedBox(height: 32.h),
          ...List.generate(_areas.length, (i) {
            return Padding(
              padding: EdgeInsets.only(bottom: 12.h),
              child: GestureDetector(
                onTap: () => _selectArea(_areas[i]),
                child: Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.borderSubtle, width: 0.5),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.location_on_outlined, color: AppColors.accentRoseGold, size: 20.sp),
                      SizedBox(width: 14.w),
                      Text(
                        _areas[i],
                        style: GoogleFonts.poppins(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const Spacer(),
                      Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20.sp),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ── Step 1: What vibe? ────────────────────────────────────────────────────

  Widget _buildVibeStep() {
    return Padding(
      key: const ValueKey('vibe'),
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 32.h),
          Text(
            'What\'s the vibe?',
            style: GoogleFonts.outfit(
              fontSize: 28.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
          SizedBox(height: 8.h),
          Text(
            _area,
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              color: AppColors.accentRoseGold,
              fontWeight: FontWeight.w400,
            ),
          ),
          SizedBox(height: 32.h),
          ...List.generate(_vibes.length, (i) {
            final vibe = _vibes[i];
            return Padding(
              padding: EdgeInsets.only(bottom: 12.h),
              child: GestureDetector(
                onTap: () => _selectVibe(vibe['label'] as String),
                child: Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.borderSubtle, width: 0.5),
                  ),
                  child: Row(
                    children: [
                      Icon(vibe['icon'] as IconData, color: AppColors.accentRoseGold, size: 20.sp),
                      SizedBox(width: 14.w),
                      Text(
                        vibe['label'] as String,
                        style: GoogleFonts.poppins(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const Spacer(),
                      Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20.sp),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ── Step 2: Group size ────────────────────────────────────────────────────

  Widget _buildGroupStep() {
    return Padding(
      key: const ValueKey('group'),
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 32.h),
          Text(
            'How many people?',
            style: GoogleFonts.outfit(
              fontSize: 28.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
          SizedBox(height: 8.h),
          Text(
            '$_area · $_vibe',
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              color: AppColors.accentRoseGold,
              fontWeight: FontWeight.w400,
            ),
          ),
          SizedBox(height: 48.h),
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _circleButton(Icons.remove, () {
                  if (_groupSize > 1) _setGroupSize(_groupSize - 1);
                }),
                SizedBox(width: 32.w),
                Text(
                  '$_groupSize',
                  style: GoogleFonts.outfit(
                    fontSize: 48.sp,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(width: 32.w),
                _circleButton(Icons.add, () {
                  if (_groupSize < 20) _setGroupSize(_groupSize + 1);
                }),
              ],
            ),
          ),
          SizedBox(height: 16.h),
          Center(
            child: Text(
              _groupSize == 1 ? 'Just me' : '$_groupSize people',
              style: GoogleFonts.poppins(
                fontSize: 14.sp,
                color: AppColors.textMuted,
              ),
            ),
          ),
          SizedBox(height: 48.h),
          // Build my night button
          Container(
            width: double.infinity,
            height: 52.h,
            decoration: BoxDecoration(
              gradient: AppColors.gradientPrimary,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: AppColors.accentRoseGold.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: _generateItinerary,
              child: Text(
                'BUILD MY NIGHT',
                style: GoogleFonts.outfit(
                  fontSize: 15.sp,
                  fontWeight: FontWeight.w800,
                  fontStyle: FontStyle.italic,
                  color: AppColors.backgroundDark,
                  letterSpacing: 1,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48.w,
        height: 48.w,
        decoration: BoxDecoration(
          color: AppColors.surface,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        child: Icon(icon, color: AppColors.accentRoseGold, size: 22.sp),
      ),
    );
  }

  // ── Step 3: Itinerary ─────────────────────────────────────────────────────

  Widget _buildItinerary() {
    return SingleChildScrollView(
      key: const ValueKey('itinerary'),
      padding: EdgeInsets.symmetric(horizontal: 24.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 24.h),
          Text(
            'Your Night',
            style: GoogleFonts.outfit(
              fontSize: 28.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: 4.h),
          Text(
            '$_area · $_vibe · $_groupSize ${_groupSize == 1 ? 'person' : 'people'}',
            style: GoogleFonts.poppins(
              fontSize: 12.sp,
              color: AppColors.accentRoseGold,
            ),
          ),
          SizedBox(height: 28.h),

          // Timeline
          ...List.generate(_itinerary.length, (i) {
            final stop = _itinerary[i];
            final isLast = i == _itinerary.length - 1;
            return _buildTimelineStop(stop, isLast);
          }),

          SizedBox(height: 28.h),

          // Shuffle button
          Center(
            child: TextButton.icon(
              onPressed: _generateItinerary,
              icon: Icon(Icons.shuffle, color: AppColors.accentRoseGold, size: 18.sp),
              label: Text(
                'Shuffle',
                style: GoogleFonts.poppins(
                  color: AppColors.accentRoseGold,
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),

          SizedBox(height: 40.h),
        ],
      ),
    );
  }

  Widget _buildTimelineStop(_ItineraryStop stop, bool isLast) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline line + dot
          SizedBox(
            width: 40.w,
            child: Column(
              children: [
                Container(
                  width: 12.w,
                  height: 12.w,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientPrimary,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 1.5,
                      color: AppColors.borderSubtle,
                    ),
                  ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: 24.h),
              child: GestureDetector(
                onTap: () => Get.to(() => VenueDetailScreen(venueId: stop.venue.id)),
                child: Container(
                  padding: EdgeInsets.all(16.w),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.borderSubtle, width: 0.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            stop.time,
                            style: GoogleFonts.poppins(
                              fontSize: 11.sp,
                              color: AppColors.accentRoseGold,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          SizedBox(width: 8.w),
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                            decoration: BoxDecoration(
                              color: AppColors.accentRoseGold.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              stop.label,
                              style: GoogleFonts.poppins(
                                fontSize: 9.sp,
                                color: AppColors.accentRoseGold,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 8.h),
                      Text(
                        stop.venue.name,
                        style: GoogleFonts.outfit(
                          fontSize: 18.sp,
                          fontWeight: FontWeight.w800,
                          fontStyle: FontStyle.italic,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 4.h),
                      Text(
                        '${stop.venue.category.replaceAll("_", " ")} · ${stop.venue.area}',
                        style: GoogleFonts.poppins(
                          fontSize: 10.sp,
                          color: AppColors.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (stop.venue.rating > 0) ...[
                        SizedBox(height: 4.h),
                        Row(
                          children: [
                            Icon(Icons.star_rounded, size: 12.sp, color: AppColors.ratingColor),
                            SizedBox(width: 3.w),
                            Text(
                              stop.venue.rating.toStringAsFixed(1),
                              style: GoogleFonts.poppins(
                                fontSize: 11.sp,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItineraryStop {
  final String time;
  final String label;
  final VenueModel venue;

  _ItineraryStop({
    required this.time,
    required this.label,
    required this.venue,
  });
}
