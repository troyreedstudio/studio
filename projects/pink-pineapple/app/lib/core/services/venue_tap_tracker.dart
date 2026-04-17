import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Tracks venue tap/interaction counts for popularity-based ranking.
/// Phase 1: stores locally on device via SharedPreferences.
/// Phase 2: syncs to backend for cross-user ranking.
class VenueTapTracker extends GetxController {
  static const _storageKey = 'venue_tap_counts';
  static const _dayStorageKey = 'venue_day_taps';

  /// Total taps per venue slug (all-time)
  final RxMap<String, int> tapCounts = <String, int>{}.obs;

  /// Taps per venue per day-of-week: "mon:slug" -> count
  final RxMap<String, int> dayTaps = <String, int>{}.obs;

  @override
  void onInit() {
    super.onInit();
    _loadFromStorage();
  }

  /// Record a tap on a venue. Call this when:
  /// - User opens a venue detail page
  /// - User taps "Book a Table" or "VIP Reservation"
  /// - User taps a venue in search results
  void recordTap(String slug, {String? dayKey}) {
    if (slug.isEmpty) return;

    // Increment total taps
    tapCounts[slug] = (tapCounts[slug] ?? 0) + 1;

    // Increment day-specific taps if day is known
    if (dayKey != null && dayKey.isNotEmpty) {
      final key = '$dayKey:$slug';
      dayTaps[key] = (dayTaps[key] ?? 0) + 1;
    }

    _saveToStorage();
  }

  /// Record a booking action (weighted higher than a tap)
  void recordBooking(String slug) {
    if (slug.isEmpty) return;
    // A booking counts as 5 taps for ranking purposes
    tapCounts[slug] = (tapCounts[slug] ?? 0) + 5;
    _saveToStorage();
  }

  /// Get the tap count for a venue
  int getTapCount(String slug) => tapCounts[slug] ?? 0;

  /// Get the day-specific tap count
  int getDayTapCount(String dayKey, String slug) =>
      dayTaps['$dayKey:$slug'] ?? 0;

  /// Get popularity score for a venue on a specific day.
  /// Combines total taps with day-specific taps (day taps weighted 2x).
  int getPopularityScore(String slug, {String? dayKey}) {
    final total = tapCounts[slug] ?? 0;
    if (dayKey != null) {
      final dayCount = dayTaps['$dayKey:$slug'] ?? 0;
      return total + (dayCount * 2);
    }
    return total;
  }

  /// Get top venues sorted by popularity (for analytics)
  List<MapEntry<String, int>> getTopVenues({int limit = 20}) {
    final sorted = tapCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(limit).toList();
  }

  /// Get top venues for a specific day
  List<MapEntry<String, int>> getTopVenuesForDay(String dayKey,
      {int limit = 20}) {
    final dayEntries = <String, int>{};
    for (final entry in dayTaps.entries) {
      if (entry.key.startsWith('$dayKey:')) {
        final slug = entry.key.substring(dayKey.length + 1);
        dayEntries[slug] = entry.value;
      }
    }
    final sorted = dayEntries.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(limit).toList();
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final tapsJson = prefs.getString(_storageKey);
      if (tapsJson != null) {
        final decoded = json.decode(tapsJson) as Map<String, dynamic>;
        tapCounts.assignAll(
          decoded.map((k, v) => MapEntry(k, (v as num).toInt())),
        );
      }

      final dayJson = prefs.getString(_dayStorageKey);
      if (dayJson != null) {
        final decoded = json.decode(dayJson) as Map<String, dynamic>;
        dayTaps.assignAll(
          decoded.map((k, v) => MapEntry(k, (v as num).toInt())),
        );
      }
    } catch (_) {
      // First run or corrupted data — start fresh
    }
  }

  Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, json.encode(tapCounts));
      await prefs.setString(_dayStorageKey, json.encode(dayTaps));
    } catch (_) {
      // Storage write failed — non-critical
    }
  }
}
