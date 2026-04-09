import 'dart:convert';
import 'package:get/get.dart';
import 'package:logger/logger.dart';

import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../model/saved_post_model.dart'; // your SavedPostModel file

class SavedPostsController extends GetxController {
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  final isLoading = false.obs;
  final saved = <SavedPostModel>[].obs;

  @override
  void onInit() {
    super.onInit();
    fetchSaved();
  }

  Future<void> fetchSaved() async {
    isLoading.value = true;
    try {
      final res = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.savedFavoritePost, // -> GET /post-favorite (set this in your Urls)
        jsonEncode({}),
        is_auth: true,
      );

      if (res == null || res['success'] != true) {
        AppSnackbar.show(message: res?['message'] ?? 'Failed to load saved posts', isSuccess: false);
        return;
      }

      final data = res['data'];
      if (data is! List) {
        logger.e('Unexpected payload for saved posts: ${data.runtimeType}');
        return;
      }

      final parsed = <SavedPostModel>[];
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          parsed.add(SavedPostModel.fromJson(item));
        }
      }

      saved.assignAll(parsed);
    } catch (e, st) {
      logger.e('fetchSaved error: $e');
      logger.e('stack: $st');
      AppSnackbar.show(message: 'Something went wrong', isSuccess: false);
    } finally {
      isLoading.value = false;
    }
  }

  /// Optimistic toggle save: POST /post-favorite { postId }
  Future<void> toggleSave(String postId) async {
    // optimistic remove from list if present
    final idx = saved.indexWhere((e) => e.post?.id == postId);
    SavedPostModel? removed;
    if (idx != -1) {
      removed = saved[idx];
      saved.removeAt(idx);
    }

    try {
      final res = await netConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.postFavorite, // -> POST /post-favorite
        jsonEncode({"postId": postId}),
        is_auth: true,
      );

      if (res == null || res['success'] != true) {
        // rollback
        if (removed != null) {
          saved.insert(idx.clamp(0, saved.length), removed);
        }
        AppSnackbar.show(message: res?['message'] ?? 'Failed to update save', isSuccess: false);
      }
    } catch (e) {
      if (removed != null) {
        saved.insert(idx.clamp(0, saved.length), removed);
      }
    }
  }

  String timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 30) return '${diff.inDays}d ago';
    final months = (diff.inDays / 30).floor();
    if (months < 12) return '${months}mo ago';
    final years = (diff.inDays / 365).floor();
    return '${years}y ago';
  }

  Future<void> refresh() => fetchSaved();
}
