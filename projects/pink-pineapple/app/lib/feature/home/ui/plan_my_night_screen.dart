import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/feature/home/services/plan_my_night_storage.dart';
import 'package:pineapple/feature/home/services/night_plan_service.dart';
import 'package:pineapple/feature/home_bottom_nav/controller/home_nav_controller.dart';
import 'package:pineapple/feature/home/ui/plan_filter_sheet.dart';
import 'package:pineapple/feature/venue/controller/venue_controller.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';
import 'package:pineapple/feature/venue/ui/venue_detail_screen.dart';

/// Nightlife timing tier — when a venue is at its best during the night.
/// Used by [_generateItinerary] to fill the right slot with the right
/// venue (a 1am-onwards late-night spot like Mesa shouldn't be the
/// 10pm warm-up; a 6pm-midnight beach club like Savaya shouldn't be
/// the 2am after-hours pick).
enum _NightTier { warmup, peak, lateNight }

class _VenueTiming {
  const _VenueTiming({
    required this.tier,
    this.peakDays = const [],
    this.closesAtHour = 26, // default 2am next day (26 = 24 + 2)
  });
  final _NightTier tier;
  // Day-of-week (DateTime.monday..sunday = 1..7) when this venue is at
  // its most "popping". When the user's plan lands on one of these
  // days, this venue gets first pick for its tier's slot regardless
  // of shuffle order. Empty list = no day-specific popping.
  final List<int> peakDays;
  // Hour (24-h, with 24+ for next-day) when this venue typically
  // closes / wraps up. Used to exclude e.g. Savaya (closes midnight)
  // from a 2am after-hours slot. Defaults to 2am if unspecified.
  final int closesAtHour;
}

/// Per-venue timing hints. Hardcoded for v1.3 — should migrate to the
/// Prisma Venue model + dashboard editable in v1.4 so partners can
/// update their own peak nights. Slugs match the DB venue.slug.
const Map<String, _VenueTiming> _venueTiming = {
  // PEAK — core 9pm/10pm to 2am clubs with day-specific popping nights.
  'desa-kitsune': _VenueTiming(
    tier: _NightTier.peak,
    peakDays: [DateTime.tuesday, DateTime.friday],
  ),
  'jade-by-todd-english': _VenueTiming(
    tier: _NightTier.peak,
    peakDays: [DateTime.monday, DateTime.thursday],
  ),
  'bella': _VenueTiming(
    tier: _NightTier.peak,
    peakDays: [DateTime.monday, DateTime.wednesday],
  ),
  'da-maria': _VenueTiming(
    tier: _NightTier.peak,
    peakDays: [DateTime.wednesday],
  ),
  // Savaya is a flagship Uluwatu venue — day club AND night club Fri,
  // Sat & Sun, 6pm–1am. Fills the 11pm PEAK slot AND a 12am main-event
  // slot but wraps before 2am so it's excluded from after-hours.
  'savaya': _VenueTiming(
    tier: _NightTier.peak,
    peakDays: [DateTime.friday, DateTime.saturday, DateTime.sunday],
    closesAtHour: 25,
  ),
  // Other PEAK clubs (no day-specific popping — generic nightclub vibe).
  'motel-mexicola': _VenueTiming(tier: _NightTier.peak),
  'shishi': _VenueTiming(tier: _NightTier.peak),
  'la-favela': _VenueTiming(tier: _NightTier.peak),
  'iron-fairies': _VenueTiming(tier: _NightTier.peak),
  'amavi': _VenueTiming(tier: _NightTier.peak),
  'gimme-shelter': _VenueTiming(tier: _NightTier.peak),
  'back-room': _VenueTiming(tier: _NightTier.peak),

  // LATE_NIGHT — midnight–4am, any day.
  'mesa': _VenueTiming(tier: _NightTier.lateNight),
  'miss-fish': _VenueTiming(tier: _NightTier.lateNight),
  'shady-pig': _VenueTiming(tier: _NightTier.lateNight),

  // WARMUP — dinner-spillover, pre-club, sunset cocktail.
  // Single Fin closes early (surf-bar, not a late spot) so we tag it
  // closesAtHour 22 to keep it out of post-10pm slots.
  'woo-bar': _VenueTiming(tier: _NightTier.warmup),
  'old-mans': _VenueTiming(tier: _NightTier.warmup),
  // Single Fin — sunset bar with casual dinner, drinks run till about
  // midnight per Troy's correction. Mainly a sunset spot, not a late
  // venue, so cap at midnight.
  'single-fin': _VenueTiming(tier: _NightTier.warmup, closesAtHour: 24),
  'rock-bar': _VenueTiming(tier: _NightTier.warmup, closesAtHour: 24),
  'luigi': _VenueTiming(tier: _NightTier.warmup),
  // El Kabron is a clifftop sunset spot in Uluwatu — early-evening
  // drinks + dinner, closes around 11pm.
  'el-kabron': _VenueTiming(tier: _NightTier.warmup, closesAtHour: 23),
  // Il Salotto — Uluwatu drinks + dinner that turns into a club on
  // Friday and Saturday. Runs 10pm to 4am on those nights, so it can
  // fill any slot from pre-drinks all the way through after-hours.
  'il-salotto': _VenueTiming(
    tier: _NightTier.peak,
    peakDays: [DateTime.friday, DateTime.saturday],
    closesAtHour: 28, // 4am
  ),
};

/// Venues that double as proper drinks-with-DJ spots — eligible for
/// the "Pre-drinks" / "Drinks & vibes" / "Cocktails" slot alongside
/// beach clubs. These are restaurants and bar-restaurants that have
/// a real bar scene with a DJ in the evening (per Sascha's notes),
/// not just sit-down places.
const Set<String> _drinksVenueSlugs = {
  'motel-mexicola',
  'old-mans',
  'single-fin', // sunset-only — closesAtHour 22 keeps it out of post-10pm slots
  'el-kabron',
  'il-salotto',
};

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

  // Active filter selections from the Refine bottom sheet. Empty lists
  // mean "no constraint on that dimension". Applied during itinerary
  // regeneration to narrow the venue candidate pool.
  PlanFilterResult _filters = const PlanFilterResult(
    cuisines: [],
    musicGenres: [],
  );

  static const _areas = ['Canggu', 'Seminyak', 'Uluwatu'];
  static const _vibes = [
    {'label': 'Chill dinner & drinks', 'icon': Icons.restaurant_outlined, 'subtitle': '2 stops · relaxed'},
    {'label': 'Dinner & dancing', 'icon': Icons.nightlife, 'subtitle': '3 stops · dinner then clubs'},
    {'label': 'Up late', 'icon': Icons.dark_mode_outlined, 'subtitle': '3 stops · club hopping'},
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
      _filters = const PlanFilterResult(cuisines: [], musicGenres: []);
    });
  }

  /// Open the Refine bottom sheet. Applies the user's picks immediately
  /// by regenerating the itinerary on dismiss. No-op if user dismisses
  /// without tapping Apply.
  Future<void> _openFilterSheet() async {
    final result = await showPlanFilterSheet(
      context: context,
      initial: _filters,
    );
    if (result == null) return;
    setState(() => _filters = result);
    _generateItinerary();
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

    // Apply the Refine sheet's cuisine + genre filters. Each filter is
    // an OR across the user's picks but only constrains the category it
    // naturally applies to (cuisine → RESTAURANT, genre → NIGHTLIFE).
    // Beach clubs ignore both filters because the data there is weakly
    // informative (most tagged INTERNATIONAL / HOUSE) and users picked
    // them because they want a beach club regardless of menu/music.
    bool matchesCuisine(VenueModel v) =>
        _filters.cuisines.isEmpty ||
        v.cuisines.any((c) => _filters.cuisines.contains(c));
    bool matchesGenre(VenueModel v) =>
        _filters.musicGenres.isEmpty ||
        v.musicGenres.any((g) => _filters.musicGenres.contains(g));

    // Categorize — area-filtered for dinner/nightlife.
    //
    // Restaurants for the dinner slot. Bella, Luigi, Jade, Miss Fish,
    // Da Maria are RESTAURANT-category in the DB but have a `nightlife`
    // tag — we treat them as nightlife venues when building the night
    // pool below (so they can serve as main-event clubs on their
    // popping nights), and we exclude them from the dinner pool so
    // we don't accidentally pick Bella for dinner *and* main event on
    // a Wednesday.
    bool isAlsoNightlife(VenueModel v) => v.tags.contains('nightlife');

    final restaurants = areaVenues
        .where((v) =>
            v.category == 'RESTAURANT' &&
            !isAlsoNightlife(v) &&
            matchesCuisine(v))
        .toList()
      ..shuffle();

    // Nightlife pool = NIGHTLIFE category + RESTAURANT/BEACH_CLUB with
    // a `nightlife` tag (Bella, Luigi, Jade, Miss Fish, Da Maria, Savaya).
    // Then split by the _venueTiming map into warmup / peak / late-night
    // buckets per slot. Popping-night venues (e.g. Bella on Wed) get
    // first pick within their tier.
    final nightlifeAll = areaVenues.where((v) {
      if (v.category == 'NIGHTLIFE' || isAlsoNightlife(v)) {
        return matchesGenre(v);
      }
      return false;
    }).toList();

    // Tier-pool builder. `slotStartHour24` is the slot's start hour in
    // 24-h (e.g. 22 for 10pm, 24 for midnight, 26 for 2am). Used to
    // exclude venues whose `closesAtHour` is earlier than the slot
    // start so we don't pick Savaya for a 2am after-hours slot.
    //
    // Source of truth is venue.nightlifeTier / peakDays / closesAtHour
    // from the API. A local fallback map (_venueTiming) is consulted
    // when a venue hasn't been curated yet — Sascha + Troy update via
    // the dashboard's "Nightlife timing" section.
    String? venueTierString(VenueModel v) {
      final apiTier = v.nightlifeTier;
      if (apiTier != null && apiTier.isNotEmpty) return apiTier;
      final local = _venueTiming[v.slug];
      if (local == null) return null;
      switch (local.tier) {
        case _NightTier.warmup:
          return 'WARMUP';
        case _NightTier.peak:
          return 'PEAK';
        case _NightTier.lateNight:
          return 'LATE_NIGHT';
      }
    }

    List<int> venuePeakDays(VenueModel v) {
      if (v.peakDays.isNotEmpty) return v.peakDays;
      return _venueTiming[v.slug]?.peakDays ?? const [];
    }

    int venueClosesAtHour(VenueModel v) {
      if (v.closesAtHour != null) return v.closesAtHour!;
      return _venueTiming[v.slug]?.closesAtHour ?? 26; // default 2am
    }

    String tierLabel(_NightTier t) => switch (t) {
          _NightTier.warmup => 'WARMUP',
          _NightTier.peak => 'PEAK',
          _NightTier.lateNight => 'LATE_NIGHT',
        };

    List<VenueModel> nightlifeTier(_NightTier tier, int slotStartHour24) {
      final want = tierLabel(tier);
      return nightlifeAll.where((v) {
        final tierStr = venueTierString(v);
        if (tierStr == null) {
          // Unknown venue (not curated yet) — default to PEAK so it
          // doesn't silently disappear from the itinerary.
          return tier == _NightTier.peak;
        }
        if (tierStr != want) return false;
        return venueClosesAtHour(v) > slotStartHour24;
      }).toList();
    }

    int eventWeekday = DateTime.now().weekday; // Mon=1..Sun=7
    List<VenueModel> sortByPopping(List<VenueModel> pool) {
      final popping = <VenueModel>[];
      final rest = <VenueModel>[];
      for (final v in pool) {
        if (venuePeakDays(v).contains(eventWeekday)) {
          popping.add(v);
        } else {
          rest.add(v);
        }
      }
      popping.shuffle();
      rest.shuffle();
      return [...popping, ...rest];
    }

    // Convenience for the legacy "nightlife" var used by some vibes that
    // don't care about tiering (e.g. Date night doesn't use this).
    final nightlife = nightlifeAll.toList()..shuffle();

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

    // Bars pool for the drinks / pre-drinks / cocktails slot. Beach
    // clubs plus the curated `_drinksVenueSlugs` set (Motel Mexicola,
    // Old Man's, Single Fin, El Kabron) — bar-restaurants with a real
    // DJ-driven drinks scene that fit "go for a drink" alongside the
    // beach clubs. Generic restaurants are deliberately excluded so we
    // don't get a dinner-restaurant + drinks-restaurant duplicate.
    final extraDrinksVenues = areaVenues
        .where((v) =>
            _drinksVenueSlugs.contains(v.slug) &&
            !beachClubs.any((b) => b.slug == v.slug))
        .toList();
    final bars = [...beachClubs, ...extraDrinksVenues]..shuffle();

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
    } else if (_vibe == 'Up late') {
      // Tier-aware: WARMUP 10pm → PEAK midnight → LATE_NIGHT 2am.
      // Popping-tonight venues float to the front within each tier.
      final warmupPool = sortByPopping(nightlifeTier(_NightTier.warmup, 22));
      final peakPool = sortByPopping(nightlifeTier(_NightTier.peak, 24));
      final latePool = sortByPopping(nightlifeTier(_NightTier.lateNight, 26));
      // Fall back gracefully if a tier is empty in this area.
      final v1 = warmupPool.isNotEmpty
          ? warmupPool.first
          : (peakPool.isNotEmpty ? peakPool.first : null);
      if (v1 != null) addStop('10:00 PM', 'Warm up', v1, null);
      final v2 = pickClosest(v1, peakPool) ??
          pickClosest(v1, sortByPopping(nightlifeAll));
      if (v2 != null) addStop('12:00 AM', 'Main event', v2, v1);
      final v3 = pickClosest(v2, latePool) ??
          pickClosest(v2, sortByPopping(nightlifeAll));
      if (v3 != null) addStop('2:00 AM', 'After hours', v3, v2);
    } else {
      // Dinner & dancing — simplified per Troy's UX feedback. Three
      // stops: dinner restaurant → warm-up club → main-event club.
      // No bars / pre-drinks (users on this vibe want to eat then
      // dance, not bar-hop), no after-hours (that's the "Up late"
      // vibe's job).
      //
      // We still pre-reserve the popping main-event venue BEFORE
      // picking dinner so e.g. Bella (Wed Canggu EDM night) is locked
      // as the main event, not dinner.
      final warmupPool = sortByPopping(nightlifeTier(_NightTier.warmup, 21));
      final peakPool = sortByPopping(nightlifeTier(_NightTier.peak, 23));
      VenueModel? mainEvent;
      if (peakPool.isNotEmpty) {
        final firstPeak = peakPool.first;
        if (venuePeakDays(firstPeak).contains(eventWeekday)) {
          mainEvent = firstPeak;
          usedSlugs.add(mainEvent.slug);
        }
      }

      if (restaurants.isNotEmpty) {
        final r = restaurants.first;
        addStop('7:30 PM', 'Dinner', r, null);
        // Warm-up club: prefer WARMUP-tier venue closest to dinner,
        // fall back to a PEAK venue if no WARMUP available in the
        // selected area (Uluwatu can be light on WARMUP options).
        final warmup = pickClosest(r, warmupPool) ?? pickClosest(r, peakPool);
        if (warmup != null) {
          addStop('10:00 PM', 'Warm-up club', warmup, r);
          // Main event: reserved popping venue, or closest peak to
          // warm-up if no popping reservation.
          final n1 = mainEvent ?? pickClosest(warmup, peakPool);
          if (n1 != null) addStop('12:00 AM', 'Main event', n1, warmup);
        }
      }
    }

    setState(() {
      _itinerary = stops;
      _step = 3;
      // Each fresh shuffle is a draft until the user explicitly hits
      // "Save this plan". Resets any prior save state so the CTA
      // re-prompts them to lock the new one in.
      _serverPlanId = null;
    });
    _persist();
  }

  /// Persist the current itinerary to the backend and surface
  /// feedback to the user. If a plan is already saved for tonight,
  /// asks the user whether to replace it or keep both before saving.
  Future<void> _saveCurrentPlan() async {
    if (_itinerary.isEmpty) return;

    // Conflict check — if there's an existing ACTIVE plan for today
    // the user has to choose: replace, keep both, or cancel the save.
    final existing = await NightPlanService.findTonightPlan();
    if (!mounted) return;

    bool? replaceExisting; // null = cancel
    if (existing != null) {
      replaceExisting = await _showSaveConflictDialog(existing);
      if (!mounted || replaceExisting == null) return;
    } else {
      replaceExisting = false;
    }

    await _syncToBackend(replaceExisting: replaceExisting);
    if (!mounted) return;
    if (_serverPlanId != null) {
      // Confirmation modal with a clear deep-link to the Bookings tab.
      // Previously this was a 2s snackbar with no action button, which
      // testers reported missing — leaving them stuck on the Plan
      // screen unsure if anything had happened. The modal is dismissable
      // (tap outside or Stay here) but the primary CTA hops them to
      // the Bookings tab where they can see Tonight's Plan banner.
      await _showSavedSheet();
    } else {
      Get.snackbar(
        'Save failed',
        'Couldn\'t save just now — check your connection and try again.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: AppColors.surface,
        colorText: AppColors.textPrimary,
        duration: const Duration(seconds: 3),
      );
    }
  }

  /// Post-save confirmation modal with "View in My Bookings" CTA.
  Future<void> _showSavedSheet() async {
    await showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.backgroundCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(24.w, 16.h, 24.w, 24.h),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: EdgeInsets.only(bottom: 18.h),
                    decoration: BoxDecoration(
                      color: AppColors.textMuted,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Icon(
                  Icons.check_circle_outline_rounded,
                  color: AppColors.accentRoseGold,
                  size: 48.sp,
                ),
                SizedBox(height: 12.h),
                Text(
                  "Tonight is locked in",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 22.sp,
                    fontWeight: FontWeight.w800,
                    fontStyle: FontStyle.italic,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: 6.h),
                Text(
                  "Your plan is saved. Pull it up any time from My Bookings.",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 13.sp,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                SizedBox(height: 20.h),
                GestureDetector(
                  onTap: () {
                    Navigator.of(ctx).pop();
                    // Close Plan My Night screen, switch to Bookings tab.
                    try {
                      Get.find<HomeNavController>().changeIndex(1);
                    } catch (_) {}
                    if (Get.key.currentState?.canPop() ?? false) {
                      Get.back();
                    }
                  },
                  child: Container(
                    padding: EdgeInsets.symmetric(vertical: 14.h),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0xFF8B4060),
                          Color(0xFFC4707E),
                          Color(0xFFE8A0B0),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Center(
                      child: Text(
                        "VIEW IN MY BOOKINGS",
                        style: GoogleFonts.outfit(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w800,
                          fontStyle: FontStyle.italic,
                          color: Colors.white,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 8.h),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: Text(
                    'Stay here',
                    style: GoogleFonts.poppins(
                      fontSize: 13.sp,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Shown when the user taps "Save this plan" and an ACTIVE plan for
  /// today already exists. Returns true for Replace, false for Keep
  /// both, null for Cancel.
  Future<bool?> _showSaveConflictDialog(Map<String, dynamic> existing) {
    final existingVibe =
        existing['vibe']?.toString() ?? 'a plan';
    return showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.surfaceElevated,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            "You already have tonight's plan saved",
            style: GoogleFonts.outfit(
              fontSize: 17.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
            ),
          ),
          content: Text(
            'Your current plan: "$existingVibe".\n\nReplace it with this new plan, or keep both?',
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          actionsPadding: EdgeInsets.fromLTRB(8.w, 0, 8.w, 12.h),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(null),
              child: Text(
                'Cancel',
                style: GoogleFonts.poppins(
                  fontSize: 13.sp,
                  color: AppColors.textMuted,
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(
                'Keep both',
                style: GoogleFonts.poppins(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(
                'Replace',
                style: GoogleFonts.poppins(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentRoseGold,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  /// POST to /night-plans. Returns the server-side plan id which the
  /// UI uses to know the plan has been saved (button morphs to the
  /// "Saved" state). Failures leave _serverPlanId null so the user
  /// can retry by tapping Save again.
  Future<void> _syncToBackend({bool replaceExisting = false}) async {
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
      replaceExisting: replaceExisting,
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

          // Save / Saved CTA — gives the user explicit control over
          // when their plan is "locked in". Without this it auto-saves
          // silently on every shuffle, which is invisible and feels
          // uncommitted. After save, the button morphs to a tappable
          // confirmation that jumps to My Bookings.
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w),
            child: GestureDetector(
              onTap: () async {
                if (_serverPlanId != null) {
                  // Already saved — jump to My Bookings tab.
                  try {
                    Get.find<HomeNavController>().changeIndex(1);
                  } catch (_) {}
                  return;
                }
                await _saveCurrentPlan();
              },
              child: Container(
                width: double.infinity,
                height: 48.h,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: _serverPlanId == null
                      ? AppColors.gradientPrimary
                      : null,
                  color: _serverPlanId == null
                      ? null
                      : AppColors.accentRoseGold.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                  border: _serverPlanId == null
                      ? null
                      : Border.all(
                          color: AppColors.accentRoseGold.withValues(alpha: 0.85),
                          width: 1.2,
                        ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _serverPlanId == null
                          ? Icons.bookmark_add_outlined
                          : Icons.check_circle_outline,
                      size: 18.sp,
                      color: _serverPlanId == null
                          ? AppColors.backgroundDark
                          : AppColors.accentRoseGold,
                    ),
                    SizedBox(width: 10.w),
                    Text(
                      _serverPlanId == null
                          ? 'Save this plan'
                          : 'Saved · View in My Bookings',
                      style: GoogleFonts.poppins(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                        color: _serverPlanId == null
                            ? AppColors.backgroundDark
                            : AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          SizedBox(height: 14.h),

          // Shuffle + Start over actions. The Refine filter (cuisine +
          // genre) is hidden in v1.3 — until more venues are on the
          // platform with proper cuisine/genre tagging, refine returns
          // poor results. Bring it back when venue profiles are richer.
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
