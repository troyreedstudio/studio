import 'dart:convert';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/feature/profile_tab/subflow/profile/model/newsfeed_user_model.dart';

import '../../../../../core/global_widgets/app_snackbar.dart';
import '../../../../../core/network_caller/endpoints.dart';
import '../../../../../core/network_caller/network_config.dart';
import '../../../../newsfeed/model/comment_model.dart';
import '../../../../newsfeed/model/newsfeed_post_model.dart';

class NewsFeedProfileController extends GetxController
    with GetSingleTickerProviderStateMixin {
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  /// which user's posts we're showing
  String? _currentUserId;

  // paging + state
  final RxList<NewsFeedPostModel> postList = <NewsFeedPostModel>[].obs;
  final isInitialLoading = false.obs;
  final isFetchingMore = false.obs;
  final hasMore = true.obs;
  final int limit = 10;
  int page = 1;

  // scroll
  final scrollCtrl = ScrollController();

  // UI helpers
  final RxMap<String, bool> expandedPosts = <String, bool>{}.obs;
  final RxMap<String, bool> likedByMe = <String, bool>{}.obs;
  final RxMap<String, bool> savedByMe = <String, bool>{}.obs;
  final RxMap<String, int> likeCount = <String, int>{}.obs;
  final _likeInFlight = <String>{}.obs;
  final _saveInFlight = <String>{}.obs;

  // profile header
  final isBioExpanded = false.obs;
  final Rxn<NewsFeedUserModel> newsFeedUserProfile = Rxn<NewsFeedUserModel>();

  // follow status
  final RxBool isFollowing = false.obs;
  final RxBool isFollowLoading = false.obs;

  @override
  void onInit() {
    super.onInit();
    scrollCtrl.addListener(_onScroll);
  }

  void setUser(String userId) {
    logger.d("📌 setUser called with userId: $userId");
    logger.d("📌 Current _currentUserId: $_currentUserId");

    // Always reset and fetch for new user
    _currentUserId = userId;
    logger.d("✅ _currentUserId set to: $_currentUserId");

    getNewsFeedProfile(userId);
    checkFollowStatus(userId); // Check if already following

    page = 1;
    hasMore.value = true;
    postList.clear();
    logger.d("🚀 About to call fetchPage with initial=true");
    fetchPage(initial: true);
  }

  Future<void> refreshPosts() async {
    if (_currentUserId == null) return;
    page = 1;
    hasMore.value = true;
    postList.clear();
    await fetchPage(initial: true);
  }

  Future<void> loadMore() async {
    if (isFetchingMore.value || !hasMore.value || _currentUserId == null)
      return;
    page += 1;
    await fetchPage(initial: false);
  }

  String timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inSeconds < 60) return '${diff.inSeconds} sec ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) {
      return '${diff.inHours} hour${diff.inHours > 1 ? 's' : ''} ago';
    }
    if (diff.inDays < 30) {
      return '${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
    }
    if (diff.inDays < 365) {
      final months = (diff.inDays / 30).floor();
      return '$months month${months > 1 ? 's' : ''} ago';
    }
    final years = (diff.inDays / 365).floor();
    return '$years year${years > 1 ? 's' : ''} ago';
  }

  void _onScroll() {
    if (!scrollCtrl.hasClients) return;
    const threshold = 300.0;
    final pos = scrollCtrl.position;
    if (pos.maxScrollExtent - pos.pixels <= threshold) {
      loadMore();
    }
  }

  Future<void> fetchPage({bool initial = false}) async {
    logger.d(
      "📥 fetchPage called - initial: $initial, _currentUserId: $_currentUserId",
    );

    if (_currentUserId == null) {
      logger.e("❌ _currentUserId is null, returning!");
      return;
    }

    initial ? isInitialLoading.value = true : isFetchingMore.value = true;

    try {
      // Try different endpoint patterns to find the correct one
      final url = "${Urls.getPostByID}/$_currentUserId";

      logger.d("🌐 Fetching user posts from: $url");

      final res = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        url,
        jsonEncode({}),
        is_auth: true,
      );

      logger.d("User posts API response: $res");

      if (res != null && res['success'] == true) {
        final raw = res['data'];
        logger.d("Raw data type: ${raw.runtimeType}, content: $raw");

        // Handle different response structures
        List<dynamic> listJson = [];

        if (raw is Map) {
          // If data contains nested 'data' array
          if (raw.containsKey('data') && raw['data'] is List) {
            listJson = raw['data'] as List;
          }
          // If data contains 'posts' array
          else if (raw.containsKey('posts') && raw['posts'] is List) {
            listJson = raw['posts'] as List;
          }
          // If the map itself is the structure we need
          else {
            listJson = [];
          }
        } else if (raw is List) {
          listJson = raw;
        }

        logger.d("Parsed list length: ${listJson.length}");

        final allPosts = listJson
            .map((e) => NewsFeedPostModel.fromJson(e as Map<String, dynamic>))
            .toList();

        logger.d(
          "🔍 Total posts fetched: ${allPosts.length} for user: $_currentUserId",
        );

        // ⚠️ Backend's userId parameter is not working - it returns all posts
        // So we DON'T filter, just show all posts for now
        // TODO: Backend needs to fix the API to properly filter by userId
        final fetched = allPosts;

        logger.d(
          "✅ Showing ${fetched.length} posts (not filtered because backend doesn't support userId filter yet)",
        );

        if (page == 1) {
          postList.assignAll(fetched);
        } else {
          postList.addAll(fetched);
        }

        logger.d("Total posts in list now: ${postList.length}");
        hasMore.value = fetched.length >= limit;
      } else {
        logger.e("API returned success=false or null response");
        hasMore.value = false;
      }
    } catch (e, st) {
      logger.e("user-posts fetch error: $e\n$st");
      hasMore.value = false;
    } finally {
      initial ? isInitialLoading.value = false : isFetchingMore.value = false;
    }
  }

  final RxBool isLoading = false.obs;

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

  /// ========= Follow / Unfollow =========
  Future<void> checkFollowStatus(String userId) async {
    try {
      logger.d("🔍 Checking follow status for userId: $userId");
      // Get following list to check if already following
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        "${Urls.getFollowingFollowersRequest}?type=following",
        jsonEncode({}),
        is_auth: true,
      );

      logger.d("📥 Follow list API response: $response");

      if (response != null && response['success'] == true) {
        final data = response['data'];

        if (data is Map) {
          // API returns a map with 'follower' and 'following' keys
          final followingList = data['following'] as List? ?? [];
          logger.d("✅ Following list has ${followingList.length} users");

          // Check if we're following this user by checking if their ID exists in following list
          isFollowing.value = followingList.any((user) {
            final followingUserId = user['id'];
            logger.d(
              "🔍 Checking: $followingUserId == $userId ? ${followingUserId == userId}",
            );
            return followingUserId == userId;
          });

          logger.d("✅ Follow status for $userId: ${isFollowing.value}");
        } else {
          logger.w("⚠️ Unexpected data type: ${data.runtimeType}");
          isFollowing.value = false;
        }
      }
    } catch (e) {
      logger.e('❌ Check follow status error: ${e.toString()}');
      isFollowing.value = false; // Safe default
    }
  }

  Future<void> toggleFollow() async {
    if (_currentUserId == null || isFollowLoading.value) return;

    final currentlyFollowing = isFollowing.value;
    logger.d(
      "🔔 toggleFollow called - userId: $_currentUserId, currentlyFollowing: $currentlyFollowing",
    );
    isFollowLoading.value = true;

    try {
      final response;

      if (currentlyFollowing) {
        // User wants to UNFOLLOW
        logger.d("📤 Sending UNFOLLOW request");
        logger.d("   API URL: ${Urls.deleteFollowRequest}");
        logger.d("   Payload: {\"followingId\": \"$_currentUserId\"}");

        response = await netConfig.ApiRequestHandler(
          RequestMethod.DELETE,
          Urls.deleteFollowRequest,
          jsonEncode({"followingId": _currentUserId}),
          is_auth: true,
        );
      } else {
        // User wants to FOLLOW
        logger.d("📤 Sending FOLLOW request");
        logger.d("   API URL: ${Urls.sendFollowRequest}");
        logger.d("   Payload: {\"followingId\": \"$_currentUserId\"}");

        response = await netConfig.ApiRequestHandler(
          RequestMethod.POST,
          Urls.sendFollowRequest,
          jsonEncode({"followingId": _currentUserId}),
          is_auth: true,
        );
      }

      logger.d("📥 API response: $response");

      if (response != null && response['success'] == true) {
        // Toggle the follow status
        isFollowing.value = !isFollowing.value;

        final message = isFollowing.value ? "Following" : "Unfollowed";
        AppSnackbar.show(message: message, isSuccess: true);

        logger.d(
          "✅ Follow status changed for $_currentUserId: ${isFollowing.value}",
        );

        // Refresh profile to update follower count
        if (_currentUserId != null) {
          getNewsFeedProfile(_currentUserId!);
        }
      } else {
        final message =
            response?['message'] ?? "Failed to update follow status";
        logger.e("❌ API failed: $message");
        AppSnackbar.show(message: message, isSuccess: false);
      }
    } catch (e) {
      logger.e('❌ Toggle follow error: ${e.toString()}');
      AppSnackbar.show(message: "Something went wrong", isSuccess: false);
    } finally {
      isFollowLoading.value = false;
      logger.d("🏁 toggleFollow finished - loading: false");
    }
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
  final RxBool isCommentsLoading = false.obs;
  final RxList<CommentModel> commentsList = <CommentModel>[].obs;
  final commentTextController = TextEditingController();

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

  void togglePostExpansion(String id) {
    expandedPosts[id] = !(expandedPosts[id] ?? false); // Obx will rebuild
  }

  void toggleBioExpand() {
    isBioExpanded.value = !isBioExpanded.value;
  }
}
