import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Live vibe check service — users report crowd level, music, and energy.
/// Phase 1: local/device. Phase 2: sync to backend for cross-user data.
class VenueVibeService extends GetxController {
  static const _storageKey = 'venue_vibes';

  /// Vibe data per venue slug: { crowd, music, energy, timestamp, count }
  final RxMap<String, Map<String, dynamic>> vibeData =
      <String, Map<String, dynamic>>{}.obs;

  static const crowdLevels = ['Empty', 'Chill', 'Filling up', 'Packed', 'At capacity'];
  static const musicLevels = ['No music', 'Background', 'Good', 'Great', 'Incredible'];
  static const energyLevels = ['Dead', 'Mellow', 'Warming up', 'Lit', 'On fire'];

  @override
  void onInit() {
    super.onInit();
    _loadFromStorage();
  }

  /// Submit a vibe check for a venue
  Future<void> submitVibe(String slug, {
    required int crowd,
    required int music,
    required int energy,
  }) async {
    final existing = vibeData[slug];
    final count = (existing?['count'] as int? ?? 0) + 1;

    // Running average for smoother data
    double avgCrowd = crowd.toDouble();
    double avgMusic = music.toDouble();
    double avgEnergy = energy.toDouble();

    if (existing != null && count > 1) {
      avgCrowd = ((existing['crowd'] as num) * (count - 1) + crowd) / count;
      avgMusic = ((existing['music'] as num) * (count - 1) + music) / count;
      avgEnergy = ((existing['energy'] as num) * (count - 1) + energy) / count;
    }

    vibeData[slug] = {
      'crowd': avgCrowd,
      'music': avgMusic,
      'energy': avgEnergy,
      'count': count,
      'timestamp': DateTime.now().toIso8601String(),
    };

    await _saveToStorage();
  }

  /// Get vibe data for a venue (null if no reports)
  Map<String, dynamic>? getVibe(String slug) => vibeData[slug];

  /// Check if vibe data is recent (within last 4 hours)
  bool isRecent(String slug) {
    final vibe = vibeData[slug];
    if (vibe == null) return false;
    final ts = DateTime.tryParse(vibe['timestamp'] as String? ?? '');
    if (ts == null) return false;
    return DateTime.now().difference(ts).inHours < 4;
  }

  /// Get a human-readable label for a level
  static String crowdLabel(double level) =>
      crowdLevels[level.round().clamp(0, 4)];
  static String musicLabel(double level) =>
      musicLevels[level.round().clamp(0, 4)];
  static String energyLabel(double level) =>
      energyLevels[level.round().clamp(0, 4)];

  /// Get the crowd emoji
  static String crowdEmoji(double level) {
    final i = level.round().clamp(0, 4);
    return ['🔵', '🟢', '🟡', '🟠', '🔴'][i];
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null) {
        final decoded = json.decode(raw) as Map<String, dynamic>;
        vibeData.assignAll(decoded.map((k, v) =>
            MapEntry(k, Map<String, dynamic>.from(v as Map))));
      }
    } catch (_) {}
  }

  Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, json.encode(vibeData));
    } catch (_) {}
  }
}
