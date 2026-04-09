import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/home/model/all_users.dart';
import 'package:pineapple/feature/home/model/event_model.dart';

class HomeController extends GetxController
    with GetSingleTickerProviderStateMixin {
  final RxInt tabIndex = 0.obs;
  late TabController tabController;
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  // Area filter state (0 = All Bali, 1 = Canggu, 2 = Seminyak, 3 = Uluwatu, 4 = Kuta)
  final RxInt selectedAreaIndex = 0.obs;

  @override
  void onInit() {
    tabController = TabController(length: 2, vsync: this);
    super.onInit();
    fetchEvents();
    fetchTonightEvents();
    fetchCommunityProfile();
  }

  void changeTab(int index) {
    tabIndex.value = index;
  }

  // Legacy — kept for any remaining references
  List<String> tabTitles = ['Discover', 'Events'];

  @override
  void dispose() {
    tabController.dispose();
    super.dispose();
  }

  String formatDate(String? date) {
    if (date == null) return "-";
    final parseDate = DateTime.parse(date);
    final formatDate = DateFormat('E, MMM d').format(parseDate);
    return formatDate;
  }

  /// 🎯 Event fetching api call
  final RxBool isTrendingLoading = false.obs;
  final RxList<AllEventModel> allEventList = <AllEventModel>[].obs;
  final RxList<AllEventModel> tonightEventList = <AllEventModel>[].obs;

  Future<void> fetchEvents() async {
    try {
      isTrendingLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.allEvents,
        jsonEncode({}),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        logger.d('Event Fetching Successful');

        final eventsData = response['data']?['data'];
        if (eventsData is List) {
          final List<AllEventModel> validEvents = [];

          for (int i = 0; i < eventsData.length; i++) {
            try {
              final event = AllEventModel.fromJson(
                eventsData[i] as Map<String, dynamic>,
              );
              // Only add events that have required fields
              if (event.eventName != null) {
                validEvents.add(event);
              }
            } catch (e) {
              logger.e('Failed to parse event at index $i: $e');
            }
          }

          allEventList.assignAll(validEvents);
          logger.d(
            'Successfully parsed ${validEvents.length} events out of ${eventsData.length}',
          );
        }
      }
    } catch (e, stackTrace) {
      logger.e('Event Fetching Failed: $e', error: e, stackTrace: stackTrace);
    } finally {
      isTrendingLoading.value = false;
    }
  }

  Future<void> fetchTonightEvents() async {
    try {
      isTrendingLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.tonightEvent,
        jsonEncode({}),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        logger.d('Tonight Event Fetching Successful');

        final eventsData = response['data'];
        if (eventsData is List) {
          final List<AllEventModel> validEvents = [];

          for (int i = 0; i < eventsData.length; i++) {
            try {
              final event = AllEventModel.fromJson(
                eventsData[i] as Map<String, dynamic>,
              );
              // Only add events that have required fields
              if (event.eventName != null) {
                validEvents.add(event);
              }
            } catch (e) {
              logger.e('Failed to parse Tonight event at index $i: $e');
            }
          }

          tonightEventList.assignAll(validEvents);
          logger.d(
            'Successfully parsed ${validEvents.length} Tonight events out of ${eventsData.length}',
          );
        }
      }
    } catch (e, stackTrace) {
      logger.e(
        'Tonight Event Fetching Failed: $e',
        error: e,
        stackTrace: stackTrace,
      );
    } finally {
      isTrendingLoading.value = false;
    }
  }

  /// 🎯 community profile fetching api call
  final RxBool isProfileLoading = false.obs;
  final RxList<AllUsersModel> allUserList = <AllUsersModel>[].obs;

  Future<void> fetchCommunityProfile() async {
    try {
      isProfileLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.allUsers,
        jsonEncode({}),
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        logger.d('User Fetching Successful');
        allUserList.assignAll(
          (response['data']['data'] as List).map(
            (e) => AllUsersModel.fromJson(e),
          ),
        );
      }
    } catch (e) {
      logger.e('User Fetching Failed');
    } finally {
      isProfileLoading.value = false;
    }
  }

  /// 🎯 event tap favorite api call
  // Future<void> postFavorite(String eventId, String userId) async {
  //   try {
  //     final response = await netConfig.ApiRequestHandler(
  //       RequestMethod.POST,
  //       Urls.favoriteEvent,
  //       jsonEncode({"eventId": eventId, "userId": userId}),
  //       is_auth: true,
  //     );
  //     if (response != null && response['success'] == true) {
  //       allEventList.map((e)=> allEventList.where(e.id == eventId)).forEach((element) {
  //
  //       });
  //       logger.d('Favorite Event Successful');
  //     }
  //   } catch (e) {
  //     logger.e('Favorite Event Failed');
  //   }
  // }

  // Prevent double taps while a specific event is updating
  final RxSet<String> favoriteInFlight = <String>{}.obs;

  /// Optimistic favorite toggle
  Future<void> postFavorite(String eventId, String userId) async {
    final idx = allEventList.indexWhere((e) => e.id == eventId);
    if (idx == -1) {
      logger.w('Event not found for favorite toggle: $eventId');
      return;
    }

    // Guard: avoid rapid repeat taps on same event
    if (favoriteInFlight.contains(eventId)) return;
    favoriteInFlight.add(eventId);

    final prev = allEventList[idx];
    final optimistic = prev.copyWith(isFavorite: !(prev.isFavorite!));

    // 🔄 Optimistic UI update
    allEventList[idx] = optimistic;
    allEventList.refresh();

    try {
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.favoriteEvent,
        jsonEncode({"eventId": eventId, "userId": userId}),
        is_auth: true,
      );

      if (response == null || response['success'] != true) {
        allEventList[idx] = prev;
        allEventList.refresh();
        logger.e('Favorite Event Failed: bad response');
        return;
      }

      final updatedJson = response['data']?['event'];
      if (updatedJson is Map<String, dynamic>) {
        allEventList[idx] = AllEventModel.fromJson(updatedJson);
        allEventList.refresh();
      } else {
        logger.d('Favorite Event Successful (kept optimistic state)');
      }
    } catch (e, st) {
      allEventList[idx] = prev;
      allEventList.refresh();
      logger.e('Favorite Event Failed: $e', error: e, stackTrace: st);
    } finally {
      favoriteInFlight.remove(eventId);
    }
  }

  /// follow user
  final RxSet<String> followInFlight =
      <String>{}.obs; // per-user in-flight guard
  final RxMap<String, bool> followRequested =
      <String, bool>{}.obs; // optimistic requested-state

  bool isFollowRequested(String userId) => followRequested[userId] ?? false;

  // --- Add this method to HomeController ---
  Future<void> sendFollowRequest(String targetUserId) async {
    // guard: avoid double taps
    if (followInFlight.contains(targetUserId)) return;
    followInFlight.add(targetUserId);

    // optimistic UI: mark requested
    final prevRequested = followRequested[targetUserId] ?? false;
    followRequested[targetUserId] = true;

    try {
      // Build payload (matches your other POSTs using "userId")
      final payload = jsonEncode({"followingId": targetUserId});

      // Debug (helps if backend returns 4xx/404)
      logger.i('➡️ POST ${Urls.sendFollowRequest}  payload=$payload');

      final res = await netConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.sendFollowRequest,
        payload,
        is_auth: true,
      );

      logger.i('⬅️ Follow response: $res');

      if (res == null || res['success'] != true) {
        // rollback on failure
        followRequested[targetUserId] = prevRequested;
        logger.e('Follow request failed: bad response');
        return;
      }

      // Optional: if API returns latest relationship, you can sync here.
      // final data = res['data']; // e.g., { isFollowing: false, requested: true }
    } catch (e, st) {
      // rollback on error
      followRequested[targetUserId] = prevRequested;
      logger.e('sendFollowRequest error: $e', error: e, stackTrace: st);
    } finally {
      followInFlight.remove(targetUserId);
    }
  }
}
