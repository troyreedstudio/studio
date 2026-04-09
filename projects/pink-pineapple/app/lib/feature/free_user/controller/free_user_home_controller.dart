import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/home/model/event_model.dart';

class FreeUserHomeController extends GetxController
    with GetSingleTickerProviderStateMixin {
  final RxInt tabIndex = 0.obs;
  late TabController tabController;
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  @override
  void onInit() {
    tabController = TabController(length: 2, vsync: this);
    super.onInit();
    fetchPublicEvents();
    fetchPublicPosts();
  }

  void changeTab(int index) {
    tabIndex.value = index;
  }

  List<String> tabTitles = ['Newsfeed', 'Event'];

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

  /// 🎯 Public Events fetching - no auth required
  final RxBool isEventsLoading = false.obs;
  final RxList<AllEventModel> publicEventList = <AllEventModel>[].obs;

  Future<void> fetchPublicEvents() async {
    try {
      isEventsLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.publicEvents,
        jsonEncode({}),
        is_auth: false, // No authentication
      );

      if (response != null && response['success'] == true) {
        logger.d('Public Events Fetching Successful');

        final eventsData = response['data']?['data'];
        if (eventsData is List) {
          final List<AllEventModel> validEvents = [];

          for (int i = 0; i < eventsData.length; i++) {
            try {
              final event = AllEventModel.fromJson(
                eventsData[i] as Map<String, dynamic>,
              );
              if (event.eventName != null) {
                validEvents.add(event);
              }
            } catch (e) {
              logger.e('Failed to parse event at index $i: $e');
            }
          }

          publicEventList.assignAll(validEvents);
          logger.d('Successfully parsed ${validEvents.length} public events');
        }
      }
    } catch (e, stackTrace) {
      logger.e(
        'Public Events Fetching Failed: $e',
        error: e,
        stackTrace: stackTrace,
      );
    } finally {
      isEventsLoading.value = false;
    }
  }

  /// 🎯 Public Posts fetching - no auth required
  final RxBool isPostsLoading = false.obs;
  final RxList<dynamic> publicPostList = <dynamic>[].obs;

  Future<void> fetchPublicPosts() async {
    try {
      isPostsLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.allPostList,
        jsonEncode({}),
        is_auth: false, // No authentication
      );

      logger.d('Public Posts Response: $response');

      if (response != null && response['success'] == true) {
        logger.d('Public Posts Fetching Successful');

        // Check if data is nested or direct
        var postsData = response['data'];

        // If data has a 'data' property, use that
        if (postsData is Map && postsData.containsKey('data')) {
          postsData = postsData['data'];
        }

        if (postsData is List) {
          publicPostList.assignAll(postsData);
          logger.d('Successfully fetched ${postsData.length} public posts');
        } else {
          logger.e('Posts data is not a List: ${postsData.runtimeType}');
        }
      } else {
        logger.e('API Response failed or success is false');
      }
    } catch (e, stackTrace) {
      logger.e(
        'Public Posts Fetching Failed: $e',
        error: e,
        stackTrace: stackTrace,
      );
    } finally {
      isPostsLoading.value = false;
    }
  }

  /// Refresh data
  Future<void> refreshData() async {
    await Future.wait([fetchPublicEvents(), fetchPublicPosts()]);
  }
}
