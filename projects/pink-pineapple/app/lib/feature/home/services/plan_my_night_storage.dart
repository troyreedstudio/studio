import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Local persistence for the user's most recent "Plan My Night" selection.
///
/// Auto-saves on every step so a user who closes the app mid-flow returns
/// to where they left off. The stored plan auto-expires after 24h since a
/// "tonight" plan stops being relevant past that.
///
/// Stored locally only (SharedPreferences). If we ever want cross-device
/// sync or share-my-night, this becomes the single source of truth on the
/// client and we add a backend sync layer alongside it without changing
/// how this class is used.
class PlanMyNightStorage {
  static const _kKey = 'plan_my_night_v1';
  // Plans go stale after 24h — "tonight" is over.
  static const _maxAgeMs = 24 * 60 * 60 * 1000;

  static Future<void> save(SavedPlan plan) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kKey, jsonEncode(plan.toJson()));
  }

  /// Returns the saved plan if one exists AND it's less than 24h old.
  /// Returns null if missing, expired, or if parsing fails (defensive
  /// against schema changes between app versions).
  static Future<SavedPlan?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kKey);
    if (raw == null) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final plan = SavedPlan.fromJson(json);
      final age = DateTime.now().millisecondsSinceEpoch -
          plan.savedAt.millisecondsSinceEpoch;
      if (age > _maxAgeMs) {
        // Expired — silently clear so we don't surface yesterday's plan.
        await prefs.remove(_kKey);
        return null;
      }
      return plan;
    } catch (_) {
      // Malformed (probably schema drift) — discard, start fresh.
      await prefs.remove(_kKey);
      return null;
    }
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kKey);
  }
}

/// Serialisable snapshot of the user's current Plan My Night state.
/// Itinerary stops reference venues by id + slug + name so we can rehydrate
/// from VenueController without storing full venue payloads (which would
/// rot if venue data changes server-side).
class SavedPlan {
  final int version;
  final DateTime savedAt;
  final int step; // 0..3 — same scale as the screen state
  final String area;
  final String vibe;
  final int groupSize;
  final List<SavedStop> itinerary;

  SavedPlan({
    this.version = 1,
    required this.savedAt,
    required this.step,
    required this.area,
    required this.vibe,
    required this.groupSize,
    required this.itinerary,
  });

  Map<String, dynamic> toJson() => {
        'version': version,
        'savedAt': savedAt.toIso8601String(),
        'step': step,
        'area': area,
        'vibe': vibe,
        'groupSize': groupSize,
        'itinerary': itinerary.map((s) => s.toJson()).toList(),
      };

  factory SavedPlan.fromJson(Map<String, dynamic> json) => SavedPlan(
        version: json['version'] as int? ?? 1,
        savedAt: DateTime.tryParse(json['savedAt'] as String? ?? '') ??
            DateTime.now(),
        step: json['step'] as int? ?? 0,
        area: json['area'] as String? ?? '',
        vibe: json['vibe'] as String? ?? '',
        groupSize: json['groupSize'] as int? ?? 2,
        itinerary: ((json['itinerary'] as List?) ?? [])
            .map((j) => SavedStop.fromJson(j as Map<String, dynamic>))
            .toList(),
      );
}

class SavedStop {
  final String venueId;
  final String venueSlug;
  final String venueName;
  final String time;
  final String label;
  final double? distanceKm;

  SavedStop({
    required this.venueId,
    required this.venueSlug,
    required this.venueName,
    required this.time,
    required this.label,
    this.distanceKm,
  });

  Map<String, dynamic> toJson() => {
        'venueId': venueId,
        'venueSlug': venueSlug,
        'venueName': venueName,
        'time': time,
        'label': label,
        'distanceKm': distanceKm,
      };

  factory SavedStop.fromJson(Map<String, dynamic> json) => SavedStop(
        venueId: json['venueId'] as String? ?? '',
        venueSlug: json['venueSlug'] as String? ?? '',
        venueName: json['venueName'] as String? ?? '',
        time: json['time'] as String? ?? '',
        label: json['label'] as String? ?? '',
        distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      );
}
