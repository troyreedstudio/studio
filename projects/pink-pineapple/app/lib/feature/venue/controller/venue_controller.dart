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

  final RxBool isLoading = false.obs;
  final RxBool isFeaturedLoading = false.obs;
  final RxString selectedArea = 'CANGGU'.obs;

  /// Guard to prevent duplicate favorite taps
  final RxSet<String> favoriteInFlight = <String>{}.obs;

  @override
  void onInit() {
    super.onInit();
    fetchFeaturedVenues();
    fetchVenues();
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

      String url = Urls.allVenues;
      if (queryParams.isNotEmpty) {
        url += '?${Uri(queryParameters: queryParams).query}';
      }

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
      isLoading.value = true;

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
      }
    } catch (e, st) {
      _logger.e('Venue detail fetch failed: $e', error: e, stackTrace: st);
    } finally {
      isLoading.value = false;
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
