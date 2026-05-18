import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/feature/home/services/plan_my_night_storage.dart';
import 'package:pineapple/feature/home/services/night_plan_service.dart';
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

  // Server-side NightPlan id once a plan is persisted to the backend.
  // Null until _generateItinerary runs and the POST succeeds. We hold
  // onto it so we can later PATCH the plan when a stop is booked.
  String? _serverPlanId;

  static const _areas = ['Canggu', 'Seminyak', 'Uluwatu', 'Surprise me'];
  static const _vibes = [
    {'label': 'Chill dinner & drinks', 'icon': Icons.restaurant_outlined, 'subtitle': '2 stops · relaxed'},
    {'label': 'Dinner & dancing', 'icon': Icons.nightlife, 'subtitle': '4 stops · full night'},
    {'label': 'Up late', 'icon': Icons.dark_mode_outlined, 'subtitle': '3 stops · club hopping'},
    {'label': 'Date night', 'icon': Icons.favorite_outline, 'subtitle': '2 stops · romantic'},
    {'label': 'Beach club day party', 'icon': Icons.beach_access_outlined, 'subtitle': '4 stops · all day into night'},
  ];

  @override
  void initState() {
    super.initState();
    _restoreSavedPlan();
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  // Auto-save on every state change. Auto-restore on screen open if a plan
  // was saved within the last 24h. After 24h the storage layer self-clears
  // because last night's plan stops being relevant.

  Future<void> _restoreSavedPlan() async {
    final saved = await PlanMyNightStorage.load();
    if (saved == null) return;

    // Rehydrate itinerary venues from VenueController. Stops whose venue is
    // no longer in the list (deleted, deactivated) are skipped — we'd rather
    // surface a partial plan than crash on a missing reference.
    final venueCtrl = Get.find<VenueController>();
    final venues = venueCtrl.venues.toList();
    final restoredStops = <_ItineraryStop>[];
    for (final s in saved.itinerary) {
      final v = venues.firstWhereOrNull((x) => x.id == s.venueId);
      if (v == null) continue;
      restoredStops.add(_ItineraryStop(
        time: s.time,
        label: s.label,
        venue: v,
        distanceKmFromPrev: s.distanceKm,
      ));
    }

    if (!mounted) return;
    setState(() {
      _area = saved.area;
      _vibe = saved.vibe;
      _groupSize = saved.groupSize;
      _itinerary = restoredStops;
      // If the saved plan was at the itinerary step but venues couldn't be
      // rehydrated (offline first load, etc.), step back to group-size step.
      _step = saved.step == 3 && restoredStops.isEmpty ? 2 : saved.step;
    });
  }

  Future<void> _persist() async {
    await PlanMyNightStorage.save(SavedPlan(
      savedAt: DateTime.now(),
      step: _step,
      area: _area,
      vibe: _vibe,
      groupSize: _groupSize,
      itinerary: _itinerary
          .map((s) => SavedStop(
                venueId: s.venue.id,
                venueSlug: s.venue.slug,
                venueName: s.venue.name,
                time: s.time,
                label: s.label,
                distanceKm: s.distanceKmFromPrev,
              ))
          .toList(),
    ));
  }

  Future<void> _startOver() async {
    await PlanMyNightStorage.clear();
    if (!mounted) return;
    setState(() {
      _step = 0;
      _area = '';
      _vibe = '';
      _groupSize = 2;
      _itinerary = [];
    });
  }

  void _selectArea(String area) {
    setState(() {
      _area = area;
      _step = 1;
    });
    _persist();
  }

  void _selectVibe(String vibe) {
    setState(() {
      _vibe = vibe;
      _step = 2;
    });
    _persist();
  }

  void _setGroupSize(int size) {
    setState(() {
      _groupSize = size;
    });
    _persist();
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
    final usedSlugs = <String>{};

    // Pick the closest venue to `from` from the candidate pool, with a small
    // randomisation among the top 3 closest so the shuffle button still
    // surfaces variety. Falls back to first candidate if no coords are usable.
    VenueModel? pickClosest(VenueModel? from, List<VenueModel> pool) {
      final candidates = pool.where((v) => !usedSlugs.contains(v.slug)).toList();
      if (candidates.isEmpty) return null;
      if (from == null || from.latitude == null || from.longitude == null) {
        return candidates.first;
      }
      final withCoords = candidates
          .where((v) => v.latitude != null && v.longitude != null)
          .toList();
      if (withCoords.isEmpty) return candidates.first;
      withCoords.sort((a, b) {
        final da = _haversineKm(from.latitude!, from.longitude!, a.latitude!, a.longitude!);
        final db = _haversineKm(from.latitude!, from.longitude!, b.latitude!, b.longitude!);
        return da.compareTo(db);
      });
      final topN = withCoords.take(3).toList()..shuffle();
      return topN.first;
    }

    void addStop(String time, String label, VenueModel? venue, VenueModel? prev) {
      if (venue == null) return;
      double? dist;
      if (prev != null &&
          prev.latitude != null && prev.longitude != null &&
          venue.latitude != null && venue.longitude != null) {
        dist = _haversineKm(prev.latitude!, prev.longitude!, venue.latitude!, venue.longitude!);
      }
      stops.add(_ItineraryStop(
        time: time,
        label: label,
        venue: venue,
        distanceKmFromPrev: dist,
      ));
      usedSlugs.add(venue.slug);
    }

    if (_vibe == 'Beach club day party') {
      if (beachClubs.isNotEmpty) {
        final v1 = beachClubs.first; // Curated first beach club
        addStop('12:00 PM', 'Beach club', v1, null);
        final v2 = pickClosest(v1, beachClubs);
        if (v2 != null) {
          addStop('3:00 PM', 'Pool party', v2, v1);
          final v3 = pickClosest(v2, beachClubs);
          if (v3 != null) addStop('5:30 PM', 'Sunset session', v3, v2);
        }
        final dinnerFrom = stops.isNotEmpty ? stops.last.venue : v1;
        final r = pickClosest(dinnerFrom, restaurants);
        if (r != null) addStop('8:00 PM', 'Dinner', r, dinnerFrom);
      }
    } else if (_vibe == 'Chill dinner & drinks') {
      if (restaurants.isNotEmpty) {
        final r = restaurants.first;
        addStop('7:00 PM', 'Dinner', r, null);
        final b = pickClosest(r, bars);
        if (b != null) addStop('9:30 PM', 'Drinks & vibes', b, r);
      }
    } else if (_vibe == 'Date night') {
      if (restaurants.isNotEmpty) {
        final r = restaurants.first;
        addStop('7:00 PM', 'Dinner for two', r, null);
        final b = pickClosest(r, bars);
        if (b != null) addStop('9:30 PM', 'Cocktails', b, r);
      }
    } else if (_vibe == 'Up late') {
      if (nightlife.isNotEmpty) {
        final v1 = nightlife.first;
        addStop('10:00 PM', 'Warm up', v1, null);
        final v2 = pickClosest(v1, nightlife);
        if (v2 != null) {
          addStop('12:00 AM', 'Main event', v2, v1);
          final v3 = pickClosest(v2, nightlife);
          if (v3 != null) addStop('2:00 AM', 'After hours', v3, v2);
        }
      }
    } else {
      // Dinner & dancing — dinner → drinks → club → late night
      if (restaurants.isNotEmpty) {
        final r = restaurants.first;
        addStop('7:30 PM', 'Dinner', r, null);
        final b = pickClosest(r, bars);
        if (b != null) {
          addStop('9:30 PM', 'Pre-drinks', b, r);
          final n1 = pickClosest(b, nightlife);
          if (n1 != null) {
            addStop('11:00 PM', 'Main event', n1, b);
            final n2 = pickClosest(n1, nightlife);
            if (n2 != null) addStop('1:00 AM', 'Late night', n2, n1);
          }
        }
      }
    }

    setState(() {
      _itinerary = stops;
      _step = 3;
    });
    _persist();
    _syncToBackend();
  }

  /// Fire-and-forget POST to /night-plans so the plan persists across
  /// device switch / reinstall. Failures are silent — local cache is
  /// the source of truth on this device; the backend record is purely
  /// for cross-device sync, the My Bookings banner, and analytics.
  Future<void> _syncToBackend() async {
    if (_itinerary.isEmpty) return;
    final stops = <Map<String, dynamic>>[];
    for (var i = 0; i < _itinerary.length; i++) {
      final s = _itinerary[i];
      // endTime defaults to the next stop's start, or +2h for the last stop.
      final next = i + 1 < _itinerary.length ? _itinerary[i + 1].time : null;
      stops.add({
        'venueId': s.venue.id,
        'role': s.label,
        'startTime': s.time,
        'endTime': next ?? _shiftTime(s.time, 120),
        'booked': false,
        'walkingMinutesFromPrev': s.distanceKmFromPrev != null
            ? _estimateTripMinutes(s.distanceKmFromPrev!)
            : null,
      });
    }
    final id = await NightPlanService.createPlan(
      vibe: _vibe,
      eventDate: DateTime.now(),
      stops: stops,
    );
    if (id != null && mounted) {
      setState(() => _serverPlanId = id);
    }
  }

  /// "8:00 PM" + 120 minutes → "10:00 PM". Defensive — if the input
  /// can't be parsed (free-text labels), returns the original.
  String _shiftTime(String hhmm, int minutes) {
    final match = RegExp(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', caseSensitive: false)
        .firstMatch(hhmm.trim());
    if (match == null) return hhmm;
    var hour = int.parse(match.group(1)!);
    final minute = int.parse(match.group(2)!);
    final ampm = match.group(3)?.toUpperCase();
    if (ampm == 'PM' && hour != 12) hour += 12;
    if (ampm == 'AM' && hour == 12) hour = 0;
    var total = hour * 60 + minute + minutes;
    final h24 = (total ~/ 60) % 24;
    final m = total % 60;
    final isPM = h24 >= 12;
    var h12 = h24 % 12;
    if (h12 == 0) h12 = 12;
    return ampm != null
        ? '$h12:${m.toString().padLeft(2, '0')} ${isPM ? 'PM' : 'AM'}'
        : '${h24.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
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
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              vibe['label'] as String,
                              style: GoogleFonts.poppins(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: 2.h),
                            Text(
                              vibe['subtitle'] as String,
                              style: GoogleFonts.poppins(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
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

          // Shuffle + Start over actions
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton.icon(
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
              SizedBox(width: 8.w),
              TextButton.icon(
                onPressed: _startOver,
                icon: Icon(Icons.refresh, color: AppColors.textMuted, size: 18.sp),
                label: Text(
                  'Start over',
                  style: GoogleFonts.poppins(
                    color: AppColors.textMuted,
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
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
                          fontSize: 11.sp,
                          color: AppColors.textSecondary,
                          letterSpacing: 0.5,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      if (stop.distanceKmFromPrev != null) ...[
                        SizedBox(height: 8.h),
                        Row(
                          children: [
                            Icon(Icons.directions_outlined, size: 14.sp, color: AppColors.textSecondary),
                            SizedBox(width: 6.w),
                            Text(
                              '${_estimateTripMinutes(stop.distanceKmFromPrev!)} min · ${stop.distanceKmFromPrev!.toStringAsFixed(1)} km from last stop',
                              style: GoogleFonts.poppins(
                                fontSize: 12.sp,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
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
  final double? distanceKmFromPrev;

  _ItineraryStop({
    required this.time,
    required this.label,
    required this.venue,
    this.distanceKmFromPrev,
  });
}

// Haversine great-circle distance in km between two lat/lng points.
double _haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371.0;
  final dLat = (lat2 - lat1) * math.pi / 180;
  final dLng = (lng2 - lng1) * math.pi / 180;
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(lat1 * math.pi / 180) *
          math.cos(lat2 * math.pi / 180) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  return r * 2 * math.asin(math.min(1.0, math.sqrt(a)));
}

// Approximate scooter travel time in Bali — ~12 km/h average through traffic.
int _estimateTripMinutes(double km) => (km / 12.0 * 60).round();
