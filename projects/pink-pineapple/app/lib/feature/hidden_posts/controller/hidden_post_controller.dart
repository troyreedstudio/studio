import 'dart:convert';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/global_widgets/app_snackbar.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';

import '../model/hidden_post_model.dart';

class HiddenPostsController extends GetxController {
  final logger = Logger();
  final netConfig = NetworkConfigV1();

  final RxBool isLoading = false.obs;
  final RxList<HiddenPostModel> hidden = <HiddenPostModel>[].obs;

  @override
  void onInit() {
    super.onInit();
    fetchHiddenPosts();
  }

  String timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)  return '${diff.inHours}h ago';
    if (diff.inDays < 30)   return '${diff.inDays}d ago';
    if (diff.inDays < 365)  return '${(diff.inDays / 30).floor()}mo ago';
    return '${(diff.inDays / 365).floor()}y ago';
  }

  Future<void> fetchHiddenPosts() async {
    isLoading.value = true;
    try {
      final res = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.allPostList,
        jsonEncode({}),
        is_auth: true,
      );

      if (res == null || res['success'] != true) {
        throw Exception(res?['message'] ?? 'Failed to load hidden posts');
      }

      // Expected: { data: { data: [ ...posts ] } } OR { data: [ ...posts ] }
      final list = (res['data']?['data'] ?? res['data']) as List?;
      final items = (list ?? <dynamic>[])
          .map((e) => HiddenPostModel.fromJson(e as Map<String, dynamic>))
          .where((p) => p.isHidden == true)
          .toList();

      hidden.assignAll(items);
    } catch (e, st) {
      logger.e('fetchHiddenPosts error: $e', error: e, stackTrace: st);
      AppSnackbar.show(message: e.toString(), isSuccess: false);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refresh() async => fetchHiddenPosts();

  /// Unhide = call same toggle API, then remove locally
  Future<void> unhidePost(String postId) async {
    try {
      final res = await netConfig.ApiRequestHandler(
        RequestMethod.PUT, // change to PUT if needed
        "${Urls.hideUnhidePost}/$postId",
        jsonEncode({}),
        is_auth: true,
      );

      if (res == null || res['success'] != true) {
        AppSnackbar.show(
          message: res?['message'] ?? 'Failed to unhide post',
          isSuccess: false,
        );
        return;
      }

      hidden.removeWhere((p) => p.id == postId);
      AppSnackbar.show(
        message: res['message'] ?? 'Post is now visible',
        isSuccess: true,
      );
    } catch (e, st) {
      logger.e('unhidePost error: $e', error: e, stackTrace: st);
      AppSnackbar.show(message: 'Something went wrong', isSuccess: false);
    }
  }
}
