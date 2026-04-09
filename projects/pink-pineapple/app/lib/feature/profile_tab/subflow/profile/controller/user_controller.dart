import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/feature/profile_tab/subflow/profile/model/newsfeed_user_model.dart';

import '../../../../../core/global_widgets/app_snackbar.dart';
import '../../../../../core/network_caller/endpoints.dart';
import '../../../../../core/network_caller/network_config.dart';
import '../../../../newsfeed/model/comment_model.dart';
import '../../../../newsfeed/model/newsfeed_post_model.dart';

class UserProfileController extends GetxController
    with GetSingleTickerProviderStateMixin {
  final RxInt selectedTab = 0.obs;
  late TabController tabController;
  final netConfig = NetworkConfigV1();
  final logger = Logger();
  final isBioExpanded = false.obs;
  final RxBool isMyProfile = false.obs;
  final RxBool isLoading = false.obs;
  final Rxn<NewsFeedUserModel> newsFeedUserProfile = Rxn<NewsFeedUserModel>();

  /// my posts
  final RxList<NewsFeedPostModel> postList = <NewsFeedPostModel>[].obs;
  final isInitialLoading = false.obs;
  final isFetchingMore = false.obs;
  final hasMore = true.obs;

  /// paging
  int page = 1;
  final int limit = 10;
  int total = 0;
  final scrollCtrl = ScrollController();

  void onScroll() {
    if (!scrollCtrl.hasClients) return;
    const threshold = 300.0; // px to bottom
    final pos = scrollCtrl.position;
    if (pos.maxScrollExtent - pos.pixels <= threshold) {
      loadMore();
    }
  }

  /// expose the same helpers used by your card
  final RxMap<String, bool> expandedPosts = <String, bool>{}.obs;
  final RxMap<String, bool> likedByMe = <String, bool>{}.obs;
  final RxMap<String, bool> savedByMe = <String, bool>{}.obs;
  final RxMap<String, int> likeCount = <String, int>{}.obs;
  final _likeInFlight = <String>{}.obs;
  final _saveInFlight = <String>{}.obs;

  // comments
  final RxList<CommentModel> commentsList = <CommentModel>[].obs;
  final isCommentsLoading = false.obs;
  final commentTextController = TextEditingController();

  final RxString privacy = Privacy.viewable.name.obs;

  void toggleBioExpand() {
    isBioExpanded.value = !isBioExpanded.value;
  }

  @override
  void onInit() {
    tabController = TabController(length: 2, vsync: this);
    super.onInit();

    scrollCtrl.addListener(onScroll); // attach here

    // Get the current user's ID from UserInfoController
    if (Get.isRegistered<UserInfoController>()) {
      final userInfoController = Get.find<UserInfoController>();
      final userId = userInfoController.userInfo.value?.userProfile?.id;

      if (userId != null) {
        // Fetch the user's profile data
        getNewsFeedProfile(userId);
      }
    }

    _fetchPage(initial: true);
  }

  void changeTab(int index) {
    selectedTab.value = index;
  }

  List<String> tabTitles = ['Newsfeed', 'Event'];

  Future<void> getNewsFeedProfile(String userID) async {
    final logger = Logger();
    try {
      isLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        "${Urls.getSingleUser}/$userID",
        jsonEncode({}),
        is_auth: true,
      );

      // 🔴 CRITICAL: Check if response is null FIRST
      if (response == null) {
        logger.e("API response is null. Possible network/auth issue.");
        AppSnackbar.show(message: "Failed to load user info", isSuccess: false);
        return;
      }

      // Now safe to access response['...']
      if (response['success'] == true) {
        newsFeedUserProfile.value = NewsFeedUserModel.fromJson(
          response['data'],
        );
        logger.t("Raw API response: ${response['data']}");
      } else {
        final message = response['message'] ?? "Unknown error";
        logger.e("API error: $message");
        AppSnackbar.show(message: message, isSuccess: false);
      }
    } catch (e) {
      logger.e('User info retrieve error: ${e.toString()}');
      AppSnackbar.show(message: "Something went wrong", isSuccess: false);
    } finally {
      logger.d('Fetching User info Api Called');
      isLoading.value = false;
    }
  }

  Future<void> refreshPosts() async {
    page = 1;
    hasMore.value = true;
    postList.clear();
    await _fetchPage(initial: true);
  }

  Future<void> loadMore() async {
    if (isFetchingMore.value || !hasMore.value) return;
    page += 1;
    await _fetchPage();
  }

  String timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inSeconds < 60) return '${diff.inSeconds} sec ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24)
      return '${diff.inHours} hour${diff.inHours > 1 ? 's' : ''} ago';
    if (diff.inDays < 30)
      return '${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
    if (diff.inDays < 365) {
      final months = (diff.inDays / 30).floor();
      return '$months month${months > 1 ? 's' : ''} ago';
    }
    final years = (diff.inDays / 365).floor();
    return '$years year${years > 1 ? 's' : ''} ago';
  }

  /// ========= hide/unhide Post =========
  Future<void> hideUnhidePost(String postID) async {
    try {
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.PUT, // change to PUT if your API requires
        "${Urls.hideUnhidePost}/$postID",
        jsonEncode({}),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        // remove hidden post from local list
        postList.removeWhere((post) => post.id == postID);
        total = (total - 1).clamp(0, 1 << 31);

        // load more if more posts available
        if (hasMore.value) {
          await loadMore();
        }

        AppSnackbar.show(
          message: response['message'] ?? "Post hidden successfully",
          isSuccess: true,
        );
      } else {
        final message = response?['message'] ?? "Failed to hide post";
        AppSnackbar.show(message: message, isSuccess: false);
      }
    } catch (e, st) {
      logger.e("Hide/Unhide API error: $e", error: e, stackTrace: st);
      AppSnackbar.show(
        message: "Something went wrong. Try again later.",
        isSuccess: false,
      );
    }
  }

  /// ========= Delete Post =========
  Future<void> deletePosts(String postID) async {
    try {
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.DELETE,
        "${Urls.deletePost}/$postID",
        jsonEncode({}),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        postList.removeWhere((post) => post.id == postID);
        total = (total - 1).clamp(0, 1 << 31);
        // top-up if list got shorter and there are more on server
        if (hasMore.value) {
          await loadMore();
        }
      } else {
        final message = response?['message'] ?? "Unknown error";
        AppSnackbar.show(message: message, isSuccess: false);
      }
    } catch (e, st) {
      logger.e("API error: $e");
      logger.e("Stack: $st");
      AppSnackbar.show(message: "Something went wrong", isSuccess: false);
    }
  }

  // ---- API fetch (ONLY my posts) ----
  Future<void> _fetchPage({bool initial = false}) async {
    if (initial) {
      isInitialLoading.value = true;
    } else {
      isFetchingMore.value = true;
    }
    try {
      // adjust to your real endpoint:
      // e.g. GET /posts?userId=<id>&page=<page>&limit=<limit>
      final res = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        "${Urls.getMyAllPost}?page=$page&limit=$limit",
        // "${Urls.allPosts}?userId=$userId&page=$page&limit=$limit",
        jsonEncode({}),
        is_auth: true,
      );

      if (res != null && res['success'] == true) {
        final raw = res['data'];
        final listJson = (raw is Map && raw['data'] is List)
            ? raw['data'] as List
            : (raw is List ? raw : <dynamic>[]);

        final fetched = listJson
            .map((e) => NewsFeedPostModel.fromJson(e as Map<String, dynamic>))
            .toList();

        if (page == 1) {
          postList.assignAll(fetched);
        } else {
          postList.addAll(fetched);
        }
        hasMore.value = fetched.length >= limit;
      } else {
        hasMore.value = false;
      }
    } catch (_) {
      hasMore.value = false;
    } finally {
      if (initial) {
        isInitialLoading.value = false;
      } else {
        isFetchingMore.value = false;
      }
    }
  }

  // ---- tiny helpers used by your post card ----
  void togglePostExpansion(String id) {
    expandedPosts[id] = !(expandedPosts[id] ?? false); // Obx will rebuild
  }

  /// ========= Like / Save =========
  Future<void> toggleLike(String postId) async {
    if (_likeInFlight.contains(postId)) return;
    _likeInFlight.add(postId);

    final prevLiked = likedByMe[postId] ?? false;
    final prevCount = likeCount[postId] ?? 0;

    likedByMe[postId] = !prevLiked;
    likeCount[postId] = prevCount + (prevLiked ? -1 : 1);

    try {
      final res = await netConfig.ApiRequestHandler(
        RequestMethod.POST,
        "${Urls.likePost}/$postId",
        jsonEncode({}),
        is_auth: true,
      );
      if (res == null || res['success'] != true) {
        likedByMe[postId] = prevLiked;
        likeCount[postId] = prevCount;
      } else {
        final serverCount = res['data']?['likes'] as int?;
        if (serverCount != null) likeCount[postId] = serverCount;
        final serverLiked = res['data']?['isLiked'] as bool?;
        if (serverLiked != null) likedByMe[postId] = serverLiked;
      }
    } catch (e) {
      likedByMe[postId] = prevLiked;
      likeCount[postId] = prevCount;
      logger.e('toggleLike error: $e');
    } finally {
      _likeInFlight.remove(postId);
    }
  }

  Future<void> toggleSave(String postId) async {
    if (_saveInFlight.contains(postId)) return;
    _saveInFlight.add(postId);

    final prevSaved = savedByMe[postId] ?? false;
    savedByMe[postId] = !prevSaved;

    try {
      final res = await netConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.postFavorite,
        jsonEncode({"postId": postId}),
        is_auth: true,
      );
      if (res == null || res['success'] != true) {
        savedByMe[postId] = prevSaved;
      } else {
        final serverSaved = res['data']?['isSaved'] as bool?;
        if (serverSaved != null) savedByMe[postId] = serverSaved;
      }
    } catch (e) {
      savedByMe[postId] = prevSaved;
      logger.e('toggleSave error: $e');
    } finally {
      _saveInFlight.remove(postId);
    }
  }

  /// ========= Comments =========
  Future<void> fetchCommentsForPost(String postID) async {
    isCommentsLoading.value = true;
    try {
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        "${Urls.getCommentsByPostID}/$postID",
        jsonEncode({}),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        commentsList.assignAll(
          (response['data'] as List)
              .map((e) => CommentModel.fromJson(e))
              .toList(),
        );
      } else {
        AppSnackbar.show(
          message: response?['message'] ?? "Unknown error",
          isSuccess: false,
        );
      }
    } catch (e, st) {
      logger.e("API error: $e");
      logger.e("Stack trace: $st");
      AppSnackbar.show(message: "Something went wrong", isSuccess: false);
    } finally {
      isCommentsLoading.value = false;
    }
  }

  Future<void> addCommentForPost(String postID) async {
    isCommentsLoading.value = true;
    try {
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.addComment,
        jsonEncode({
          "postId": postID,
          "text": commentTextController.text.trim(),
        }),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        commentTextController.clear();
        await fetchCommentsForPost(postID);
      } else {
        AppSnackbar.show(
          message: response?['message'] ?? "Unknown error",
          isSuccess: false,
        );
      }
    } catch (e, st) {
      logger.e("API error: $e");
      logger.e("Stack trace: $st");
      AppSnackbar.show(message: "Something went wrong", isSuccess: false);
    } finally {
      isCommentsLoading.value = false;
    }
  }

  @override
  void dispose() {
    scrollCtrl.removeListener(onScroll);
    scrollCtrl.dispose();
    tabController.dispose();
    super.dispose();
  }

  static String coverUrl =
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4';
  static String avatarUrl =
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde';
}

enum Privacy { viewable, hidden }
