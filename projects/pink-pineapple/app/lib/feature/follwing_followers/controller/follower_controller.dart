import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';

import '../../../core/network_caller/network_config.dart';
import '../../../core/network_caller/endpoints.dart';
import '../model/follower_model.dart';

class FollowingsFollowersController extends GetxController
    with GetSingleTickerProviderStateMixin {
  // Tabs
  late TabController tabController;
  final RxInt currentTabIndex = 0.obs;

  // Network + logs
  final net = NetworkConfigV1();
  final logger = Logger();

  // State
  final RxBool isLoading = false.obs;
  final RxBool isSearching = false.obs;

  // Raw data
  final RxList<Follow> followings = <Follow>[].obs;
  final RxList<Follow> followers = <Follow>[].obs;

  // Filtered (search)
  final RxList<Follow> filteredFollowings = <Follow>[].obs;
  final RxList<Follow> filteredFollowers = <Follow>[].obs;

  // Search text
  final TextEditingController searchCtrl = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: 2, vsync: this);
    tabController.addListener(
      () => currentTabIndex.value = tabController.index,
    );
    fetchFollowingFollowers();
  }

  @override
  void onClose() {
    tabController.dispose();
    searchCtrl.dispose();
    super.onClose();
  }

  Future<void> fetchFollowingFollowers() async {
    try {
      isLoading.value = true;
      final res = await net.ApiRequestHandler(
        RequestMethod.GET,
        Urls.getFollowingFollowersRequest,
        jsonEncode({}),
        is_auth: true,
      );

      if (res != null && res['success'] == true) {
        // Expecting: { success, message, data: { follower: [...], following: [...] } } OR flat arrays
        final data = res['data'];
        List<dynamic> followerJson = [];
        List<dynamic> followingJson = [];

        if (data is Map<String, dynamic>) {
          followerJson = (data['follower'] as List?) ?? [];
          followingJson = (data['following'] as List?) ?? [];
        } else if (data is List) {
          // If backend returns a flat list (fallback to empty lists)
          followerJson = [];
          followingJson = [];
        }

        final f1 = followerJson
            .map((e) => Follow.fromJson(e as Map<String, dynamic>))
            .toList();
        final f2 = followingJson
            .map((e) => Follow.fromJson(e as Map<String, dynamic>))
            .toList();

        followers.assignAll(f1);
        followings.assignAll(f2);

        // default filtered = all
        filteredFollowers.assignAll(f1);
        filteredFollowings.assignAll(f2);

        logger.d('Fetched followers=${f1.length}, followings=${f2.length}');
      } else {
        logger.e('Fetch failed: ${res?['message'] ?? 'Unknown error'}');
      }
    } catch (e, st) {
      logger.e('fetchFollowingFollowers error: $e', error: e, stackTrace: st);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refreshData() async {
    await fetchFollowingFollowers();
  }

  // Search (by fullName or fullAddress)
  void search(String q) {
    final query = q.trim().toLowerCase();
    isSearching.value = query.isNotEmpty;

    if (!isSearching.value) {
      // reset
      filteredFollowers.assignAll(followers);
      filteredFollowings.assignAll(followings);
      return;
    }

    bool matches(Follow u) {
      final name = (u.fullName ?? '').toLowerCase();
      final addr = (u.fullAddress ?? '').toLowerCase();
      return name.contains(query) || addr.contains(query);
    }

    filteredFollowers.assignAll(followers.where(matches));
    filteredFollowings.assignAll(followings.where(matches));
  }

  void clearSearch() {
    searchCtrl.clear();
    isSearching.value = false;
    filteredFollowers.assignAll(followers);
    filteredFollowings.assignAll(followings);
  }

  // Helpers
  int get followersCount => followers.length;
  int get followingsCount => followings.length;

  void onBackPressed() => Navigator.pop(Get.context!);
}
