import 'dart:convert';

import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';

class VenueController extends GetxController {
  final _netConfig = NetworkConfigV1();
  final _logger = Logger();

  final RxList<VenueModel> venues = <VenueModel>[].obs;
  final RxList<VenueModel> featuredVenues = <VenueModel>[].obs;
  final Rx<VenueModel?> selectedVenue = Rx<VenueModel?>(null);
  final RxMap<String, List<VenueModel>> weeklySchedule =
      <String, List<VenueModel>>{}.obs;
  final RxBool isWhatsOnLoading = false.obs;

  final RxBool isLoading = false.obs;
  final RxBool isDetailLoading = false.obs;
  final RxBool isFeaturedLoading = false.obs;
  final RxString selectedArea = 'CANGGU'.obs;
  final RxString selectedCategory = ''.obs;

  /// Guard to prevent duplicate favorite taps
  final RxSet<String> favoriteInFlight = <String>{}.obs;

  @override
  void onInit() {
    super.onInit();
    fetchFeaturedVenues();
    fetchVenues();
    fetchWhatsOn();
  }

  /// Fetch all venues with optional filters.
  Future<void> fetchVenues({String? area, String? category}) async {
    try {
      isLoading.value = true;

      // Build query parameters
      final queryParams = <String, String>{};
      if (area != null && area.isNotEmpty) queryParams['area'] = area;
      if (category != null && category.isNotEmpty) {
        queryParams['category'] = category;
      }

      // Always fetch enough venues to fill all category sections
      queryParams['limit'] = '100';

      String url = '${Urls.allVenues}?${Uri(queryParameters: queryParams).query}';

      final response = await _netConfig.ApiRequestHandler(
        RequestMethod.GET,
        url,
        jsonEncode({}),
      );

      if (response != null && response['success'] == true) {
        _logger.d('Venues fetched successfully');
        final venuesData = response['data'] is List
            ? response['data']
            : response['data']?['data'];

        if (venuesData is List) {
          final parsed = <VenueModel>[];
          for (int i = 0; i < venuesData.length; i++) {
            try {
              parsed.add(
                VenueModel.fromJson(venuesData[i] as Map<String, dynamic>),
              );
            } catch (e) {
              _logger.e('Failed to parse venue at index $i: $e');
            }
          }
          venues.assignAll(parsed);
          _logger.d(
            'Parsed ${parsed.length} venues out of ${venuesData.length}',
          );
        }
      }
    } catch (e, st) {
      _logger.e('Venue fetch failed: $e', error: e, stackTrace: st);
    } finally {
      isLoading.value = false;
    }
  }

  /// Fetch the weekly "what's on" schedule.
  ///
  /// Tries the dedicated endpoint first. If it fails (e.g. not deployed yet),
  /// falls back to building a schedule from existing [venues] using their
  /// [openingHours] data.
  Future<void> fetchWhatsOn({String? area}) async {
    try {
      isWhatsOnLoading.value = true;

      String url = Urls.whatsOn;
      if (area != null && area.isNotEmpty) {
        url += '?area=${Uri.encodeComponent(area)}';
      }

      final response = await _netConfig.ApiRequestHandler(
        RequestMethod.GET,
        url,
        jsonEncode({}),
      );

      if (response != null && response['success'] == true) {
        _logger.d('What\'s on fetched successfully');
        final data = response['data'];
        if (data is Map<String, dynamic>) {
          final schedule = <String, List<VenueModel>>{};
          for (final dayKey in data.keys) {
            final dayVenues = data[dayKey];
            if (dayVenues is List) {
              final parsed = <VenueModel>[];
              for (final v in dayVenues) {
                try {
                  final venueJson = v as Map<String, dynamic>;
                  // The whats-on endpoint returns "event" or "tonight" with the day's special data.
                  // Inject it into weeklySchedule so the UI can read it.
                  final specialData = venueJson['event'] ?? venueJson['tonight'];
                  if (specialData is Map<String, dynamic>) {
                    venueJson['weeklySchedule'] = {dayKey: specialData};
                  }
                  parsed.add(VenueModel.fromJson(venueJson));
                } catch (e) {
                  _logger.e('Failed to parse whats-on venue: $e');
                }
              }
              schedule[dayKey] = parsed;
            }
          }
          weeklySchedule.assignAll(schedule);
          return;
        }
      }

      // Fallback: build schedule from existing venue data
      _buildFallbackSchedule();
    } catch (e, st) {
      _logger.e('What\'s on fetch failed, using fallback: $e',
          error: e, stackTrace: st);
      _buildFallbackSchedule();
    } finally {
      isWhatsOnLoading.value = false;
    }
  }

  /// Build a weekly schedule from venue [openingHours] as a fallback when the
  /// whats-on endpoint is not available.
  void _buildFallbackSchedule() {
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const shortKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    final schedule = <String, List<VenueModel>>{};
    for (var i = 0; i < dayKeys.length; i++) {
      final openOnDay = venues.where((v) {
        if (v.openingHours == null) return true; // assume open if no data
        final dayData = v.openingHours![dayKeys[i]];
        if (dayData == null) return false;
        if (dayData is Map && dayData['closed'] == true) return false;
        return true;
      }).toList();
      schedule[shortKeys[i]] = openOnDay;
    }
    weeklySchedule.assignAll(schedule);
  }

  /// Fetch featured venues for hero / highlight sections.
  Future<void> fetchFeaturedVenues() async {
    try {
      isFeaturedLoading.value = true;

      final response = await _netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.featuredVenues,
        jsonEncode({}),
      );

      if (response != null && response['success'] == true) {
        _logger.d('Featured venues fetched successfully');
        final venuesData = response['data'] is List
            ? response['data']
            : response['data']?['data'];

        if (venuesData is List) {
          final parsed = <VenueModel>[];
          for (int i = 0; i < venuesData.length; i++) {
            try {
              parsed.add(
                VenueModel.fromJson(venuesData[i] as Map<String, dynamic>),
              );
            } catch (e) {
              _logger.e('Failed to parse featured venue at index $i: $e');
            }
          }
          featuredVenues.assignAll(parsed);
        }
      }
    } catch (e, st) {
      _logger.e('Featured venues fetch failed: $e', error: e, stackTrace: st);
    } finally {
      isFeaturedLoading.value = false;
    }
  }

  /// Fetch venues filtered by area (CANGGU, ULUWATU, SEMINYAK, UBUD).
  Future<void> fetchVenuesByArea(String area) async {
    try {
      isLoading.value = true;
      selectedArea.value = area;

      final response = await _netConfig.ApiRequestHandler(
        RequestMethod.GET,
        '${Urls.venuesByArea}/$area',
        jsonEncode({}),
      );

      if (response != null && response['success'] == true) {
        _logger.d('Venues by area ($area) fetched successfully');
        final venuesData = response['data'] is List
            ? response['data']
            : response['data']?['data'];

        if (venuesData is List) {
          final parsed = <VenueModel>[];
          for (int i = 0; i < venuesData.length; i++) {
            try {
              parsed.add(
                VenueModel.fromJson(venuesData[i] as Map<String, dynamic>),
              );
            } catch (e) {
              _logger.e('Failed to parse area venue at index $i: $e');
            }
          }
          venues.assignAll(parsed);
        }
      }
    } catch (e, st) {
      _logger.e('Venues by area failed: $e', error: e, stackTrace: st);
    } finally {
      isLoading.value = false;
    }
  }

  /// Fetch a single venue's full detail.
  Future<void> fetchVenueDetail(String id) async {
    try {
      isDetailLoading.value = true;
      selectedVenue.value = null;

      final response = await _netConfig.ApiRequestHandler(
        RequestMethod.GET,
        '${Urls.venueDetails}/$id',
        jsonEncode({}),
      );

      if (response != null && response['success'] == true) {
        _logger.d('Venue detail fetched for $id');
        final venueData = response['data'] is Map<String, dynamic>
            ? response['data']
            : response['data']?['data'];

        if (venueData is Map<String, dynamic>) {
          selectedVenue.value = VenueModel.fromJson(venueData);
        }
      } else {
        _logger.e('Venue detail response: $response');
      }
    } catch (e, st) {
      _logger.e('Venue detail fetch failed: $e', error: e, stackTrace: st);
    } finally {
      isDetailLoading.value = false;
    }
  }

  /// Search venues by query string.
  Future<void> searchVenues(String query) async {
    if (query.trim().isEmpty) return;

    try {
      isLoading.value = true;

      final url = '${Urls.searchVenues}?searchTerm=${Uri.encodeComponent(query)}';

      final response = await _netConfig.ApiRequestHandler(
        RequestMethod.GET,
        url,
        jsonEncode({}),
      );

      if (response != null && response['success'] == true) {
        _logger.d('Venue search successful for "$query"');
        final venuesData = response['data'] is List
            ? response['data']
            : response['data']?['data'];

        if (venuesData is List) {
          final parsed = <VenueModel>[];
          for (int i = 0; i < venuesData.length; i++) {
            try {
              parsed.add(
                VenueModel.fromJson(venuesData[i] as Map<String, dynamic>),
              );
            } catch (e) {
              _logger.e('Failed to parse search venue at index $i: $e');
            }
          }
          venues.assignAll(parsed);
        }
      }
    } catch (e, st) {
      _logger.e('Venue search failed: $e', error: e, stackTrace: st);
    } finally {
      isLoading.value = false;
    }
  }

  /// Toggle favorite status on a venue (requires auth).
  Future<void> toggleFavorite(String venueId) async {
    if (favoriteInFlight.contains(venueId)) return;
    favoriteInFlight.add(venueId);

    // Find venue in both lists
    final mainIdx = venues.indexWhere((v) => v.id == venueId);
    final featIdx = featuredVenues.indexWhere((v) => v.id == venueId);

    // Save previous states for rollback
    VenueModel? prevMain;
    VenueModel? prevFeat;

    // Optimistic update
    if (mainIdx != -1) {
      prevMain = venues[mainIdx];
      venues[mainIdx] = prevMain.copyWith(isFavorite: !prevMain.isFavorite);
      venues.refresh();
    }
    if (featIdx != -1) {
      prevFeat = featuredVenues[featIdx];
      featuredVenues[featIdx] =
          prevFeat.copyWith(isFavorite: !prevFeat.isFavorite);
      featuredVenues.refresh();
    }

    try {
      final response = await _netConfig.ApiRequestHandler(
        RequestMethod.POST,
        '${Urls.toggleVenueFavorite}/$venueId/favorite',
        jsonEncode({}),
        is_auth: true,
      );

      if (response == null || response['success'] != true) {
        // Rollback
        if (mainIdx != -1 && prevMain != null) {
          venues[mainIdx] = prevMain;
          venues.refresh();
        }
        if (featIdx != -1 && prevFeat != null) {
          featuredVenues[featIdx] = prevFeat;
          featuredVenues.refresh();
        }
        _logger.e('Toggle favorite failed: bad response');
      } else {
        _logger.d('Toggle favorite successful for $venueId');
      }
    } catch (e, st) {
      // Rollback
      if (mainIdx != -1 && prevMain != null) {
        venues[mainIdx] = prevMain;
        venues.refresh();
      }
      if (featIdx != -1 && prevFeat != null) {
        featuredVenues[featIdx] = prevFeat;
        featuredVenues.refresh();
      }
      _logger.e('Toggle favorite failed: $e', error: e, stackTrace: st);
    } finally {
      favoriteInFlight.remove(venueId);
    }
  }
}
