// lib/feature/home/controller/create_post_controller.dart

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:logger/logger.dart';

import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../model/newsfeed_post_model.dart';
import 'package:pineapple/feature/newsfeed/model/comment_model.dart';

class NewsFeedController extends GetxController {
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  /// ========= State =========
  final postList = <NewsFeedPostModel>[].obs;

  // loading flags
  final RxBool isInitialLoading = false.obs; // first page spinner
  final RxBool isFetchingMore = false.obs; // loading next page
  final RxBool isRefreshing = false.obs; // pull-to-refresh
  final RxBool isUploadLoading = false.obs; // create post

  // paging
  int currentPage = 1;
  int limit = 10; // keep in sync with server default
  int total = 0;
  bool hasMore = true;

  // Track which posts are expanded (using post ID as key)
  final expandedPosts = <String, bool>{}.obs;

  // --- Reactive state overlays
  final likedByMe = <String, bool>{}.obs;
  final savedByMe = <String, bool>{}.obs;
  final likeCount = <String, int>{}.obs;
  final _likeInFlight = <String>{}.obs;
  final _saveInFlight = <String>{}.obs;

  // comments
  final RxList<CommentModel> commentsList = <CommentModel>[].obs;
  final isCommentsLoading = false.obs;
  final commentTextController = TextEditingController();

  // post create form
  final RxString postText = ''.obs;
  final RxList<File> selectedImages = <File>[].obs;

  // image picker
  final ImagePicker _picker = ImagePicker();

  @override
  void onInit() {
    super.onInit();
    fetchPosts(page: 1, append: false);
    scrollCtrl.addListener(_onScroll);
  }

  final scrollCtrl = ScrollController();
  void _onScroll() {
    if (!scrollCtrl.hasClients) return;
    const threshold = 300.0; // px to bottom
    final pos = scrollCtrl.position;
    if (pos.maxScrollExtent - pos.pixels <= threshold) {
      loadMore();
    }
  }

  /// Humanized time
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

  void togglePostExpansion(String postId) {
    expandedPosts[postId] = !(expandedPosts[postId] ?? false);
  }

  /// ========= Fetch (with pagination) =========
  Future<void> fetchPosts({required int page, required bool append}) async {
    if (!append && page == 1) {
      isInitialLoading.value = true;
    } else if (append) {
      if (isFetchingMore.value || !hasMore) return;
      isFetchingMore.value = true;
    }

    try {
      final url = "${Urls.allPostList}?page=$page&limit=$limit";

      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        url,
        jsonEncode({}), // keep as-is for your handler
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        final meta = response['data']?['meta'] ?? {};
        final data = (response['data']?['data'] as List? ?? []);

        // Debug: Log first post to see API structure
        if (data.isNotEmpty) {
          logger.d("First post JSON: ${data[0]}");
        }

        final list = data.map((e) => NewsFeedPostModel.fromJson(e)).toList();

        if (append) {
          postList.addAll(list);
        } else {
          postList.assignAll(list);
        }

        // Initialize like/save state from API data
        // Only update from API if we have explicit values, otherwise keep existing state
        for (final post in list) {
          if (post.id != null) {
            // Update like state: use API value if available, otherwise keep existing
            if (post.isLiked != null) {
              likedByMe[post.id!] = post.isLiked!;
            } else if (!likedByMe.containsKey(post.id!)) {
              likedByMe[post.id!] = false;
            }

            // Update save state: use API value if available, otherwise keep existing
            if (post.isSaved != null) {
              savedByMe[post.id!] = post.isSaved!;
            } else if (!savedByMe.containsKey(post.id!)) {
              savedByMe[post.id!] = false;
            }

            // Always update like count from API as it's authoritative
            likeCount[post.id!] = post.likeCount ?? 0;

            // Debug logging
            logger.d(
              "Post ${post.id}: API isLiked=${post.isLiked}, isSaved=${post.isSaved}, "
              "Final liked=${likedByMe[post.id!]}, saved=${savedByMe[post.id!]}, count=${post.likeCount}",
            );
          }
        }

        // update paging
        currentPage = meta['page'] ?? page;
        limit = meta['limit'] ?? limit;
        total = meta['total'] ?? total;

        final fetchedSoFar = postList.length;
        hasMore = fetchedSoFar < total;

        logger.d(
          "Fetched page=$currentPage, limit=$limit, total=$total, soFar=$fetchedSoFar, hasMore=$hasMore",
        );
      } else {
        AppSnackbar.show(
          message: response?['message'] ?? "Unknown error",
          isSuccess: false,
        );
      }
    } catch (e, st) {
      logger.e("API error: $e");
      logger.e("Stack: $st");
      AppSnackbar.show(message: "Something went wrong", isSuccess: false);
    } finally {
      isInitialLoading.value = false;
      isFetchingMore.value = false;
      isRefreshing.value = false;
    }
  }

  Future<void> refreshPosts() async {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    currentPage = 1;
    hasMore = true;
    await fetchPosts(page: 1, append: false);
  }

  Future<void> loadMore() async {
    if (!hasMore || isFetchingMore.value) return;
    await fetchPosts(page: currentPage + 1, append: true);
  }

  /// ========= Create Post =========
  Future<void> uploadPosts() async {
    isUploadLoading.value = true;
    try {
      final text = postText.value.trim();
      logger.d("Text: $text");
      logger.d("Images count: ${selectedImages.length}");
      logger.d(
        "Selected Images: ${selectedImages.map((e) => e.path).toList()}",
      );

      final Map<String, dynamic> requestBody = {"text": text};

      final response = await netConfig.ApiRequestHandler(
        RequestMethod.MULTIPART,
        Urls.createPost,
        json.encode(requestBody),
        is_auth: true,
        imagePath: selectedImages.toList(),
        dataPathName: "data",
        filePathName: "photos", // server expects 'photos' (no brackets)
      );

      if (response != null && response['success'] == true) {
        AppSnackbar.show(message: "Post Created", isSuccess: true);

        // clear AFTER success
        clearAll();

        // refresh list from page-1
        await refreshPosts();

        // back
        Navigator.pop(Get.context!);
      } else {
        AppSnackbar.show(
          message: response?['message'] ?? 'Post creation failed',
          isSuccess: false,
        );
      }
    } catch (e, st) {
      logger.e('Upload Post Error: $e');
      logger.e('Stack: $st');
      AppSnackbar.show(message: 'Upload failed', isSuccess: false);
    } finally {
      isUploadLoading.value = false;
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
        if (hasMore) {
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
        if (hasMore) {
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

  /// ========= Picker & Images =========
  Future<void> pickImageFromGallery() async {
    try {
      final List<XFile> images = await _picker.pickMultiImage(
        maxWidth: 1800,
        maxHeight: 1800,
        imageQuality: 50,
      );
      if (images.isNotEmpty) {
        for (var img in images) {
          addImage(File(img.path));
        }
        logger.d("Total images after adding: ${selectedImages.length}");
      }
    } catch (e) {
      logger.e("Error picking image from gallery: $e");
      AppSnackbar.show(message: "Failed to pick images", isSuccess: false);
    }
  }

  Future<void> pickImageFromCamera() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1800,
        maxHeight: 1800,
        imageQuality: 50,
      );
      if (image != null) {
        addImage(File(image.path));
      }
    } catch (e) {
      logger.e("Error picking image from camera: $e");
    }
  }

  // De-dupe by path + keep the 3-limit
  void addImage(File file) {
    if (selectedImages.any((f) => f.path == file.path)) {
      logger.d("Image already added: ${file.path}");
      return;
    }
    if (selectedImages.length >= 3) {
      AppSnackbar.show(
        message: "Limit Reached, You can only add up to 3 images.",
        isSuccess: false,
      );
      return;
    }
    selectedImages.add(file);
    logger.d("✅ Image added. Total: ${selectedImages.length}");
  }

  void removeImage(int index) {
    if (index < selectedImages.length) {
      selectedImages.removeAt(index);
    }
  }

  void clearAll() {
    selectedImages.clear();
    postText.value = '';
  }

  void submitPost() {
    final trimmedText = postText.value.trim();
    if (selectedImages.isEmpty) {
      AppSnackbar.show(
        message: "Please add at least one image before posting.",
        isSuccess: false,
      );
      return;
    }
    if (trimmedText.isEmpty) {
      AppSnackbar.show(message: "Please add some text.", isSuccess: false);
      return;
    }
    uploadPosts();
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
        logger.e('toggleLike failed: ${res?['message']}');
      } else {
        logger.d('toggleLike response: ${res['data']}');
        final serverCount = res['data']?['likes'] as int?;
        if (serverCount != null) likeCount[postId] = serverCount;
        final serverLiked = res['data']?['isLiked'] as bool?;
        logger.d(
          'Server returned isLiked=$serverLiked for post $postId, setting likedByMe to $serverLiked',
        );
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
        logger.e('toggleSave failed: ${res?['message']}');
      } else {
        logger.d('toggleSave response: ${res['data']}');
        final serverSaved = res['data']?['isSaved'] as bool?;
        logger.d(
          'Server returned isSaved=$serverSaved for post $postId, setting savedByMe to $serverSaved',
        );
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

  /// ========= Misc =========
  final RxBool isTextExpanded = false.obs;
  void expandText() => isTextExpanded.value = !isTextExpanded.value;

  @override
  void dispose() {
    commentTextController.dispose();
    super.dispose();
  }
}
