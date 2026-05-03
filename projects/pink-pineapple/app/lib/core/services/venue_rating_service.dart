import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';

/// Venue rating service — local cache for instant UI + backend sync for
/// cross-user aggregate. Backend POST is best-effort; local save persists either way.
class VenueRatingService extends GetxController {
  static const _storageKey = 'venue_user_ratings';

  /// User's own ratings: slug -> rating (1-5)
  final RxMap<String, double> userRatings = <String, double>{}.obs;

  final _netConfig = NetworkConfigV1();

  @override
  void onInit() {
    super.onInit();
    _loadFromStorage();
  }

  /// Rate a venue (1.0 to 5.0). Pass [venueId] to also sync to backend.
  Future<void> rateVenue(String slug, double rating, {String? venueId}) async {
    if (slug.isEmpty || rating < 1 || rating > 5) return;
    // Optimistic local save first.
    userRatings[slug] = rating;
    await _saveToStorage();

    // Backend sync — best-effort, don't surface errors to user.
    if (venueId == null || venueId.isEmpty) return;
    try {
      await _netConfig.ApiRequestHandler(
        RequestMethod.POST,
        '${Urls.venueRating}/$venueId/rating',
        jsonEncode({'score': rating.toInt()}),
        is_auth: true,
      );
    } catch (_) {
      // Local copy preserved; backend will resync next time user rates.
    }
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
