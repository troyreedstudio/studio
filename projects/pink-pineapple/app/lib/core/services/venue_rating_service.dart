import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Local venue rating service — stores user ratings on device.
/// Phase 1: local only. Phase 2: sync to backend for aggregate ratings.
class VenueRatingService extends GetxController {
  static const _storageKey = 'venue_user_ratings';

  /// User's own ratings: slug -> rating (1-5)
  final RxMap<String, double> userRatings = <String, double>{}.obs;

  @override
  void onInit() {
    super.onInit();
    _loadFromStorage();
  }

  /// Rate a venue (1.0 to 5.0)
  Future<void> rateVenue(String slug, double rating) async {
    if (slug.isEmpty || rating < 1 || rating > 5) return;
    userRatings[slug] = rating;
    await _saveToStorage();
  }

  /// Get user's rating for a venue (null if not rated)
  double? getUserRating(String slug) => userRatings[slug];

  /// Check if user has rated a venue
  bool hasRated(String slug) => userRatings.containsKey(slug);

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_storageKey);
      if (json != null) {
        final decoded = jsonDecode(json) as Map<String, dynamic>;
        userRatings.assignAll(
          decoded.map((k, v) => MapEntry(k, (v as num).toDouble())),
        );
      }
    } catch (_) {}
  }

  Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, jsonEncode(userRatings));
    } catch (_) {}
  }
}
