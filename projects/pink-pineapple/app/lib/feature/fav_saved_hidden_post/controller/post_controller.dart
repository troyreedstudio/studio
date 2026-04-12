import 'package:get/get.dart';

import '../model/post_model.dart';

enum PostType { favourites, saved, hidden }

class PostsController extends GetxController {
  // Observable lists for different post types
  var favouritePosts = <PostModel>[].obs;
  var savedPosts = <PostModel>[].obs;
  var hiddenPosts = <PostModel>[].obs;

  // Loading states
  var isLoading = false.obs;

  @override
  void onInit() {
    super.onInit();
  }

  List<PostModel> getPostsByType(PostType type) {
    switch (type) {
      case PostType.favourites:
        return favouritePosts;
      case PostType.saved:
        return savedPosts;
      case PostType.hidden:
        return hiddenPosts;
    }
  }

  String getPageTitle(PostType type) {
    switch (type) {
      case PostType.favourites:
        return 'Favourites';
      case PostType.saved:
        return 'Saved Posts';
      case PostType.hidden:
        return 'Hidden Posts';
    }
  }

  void toggleFavourite(String postId) {
    // Find and update in favourites list
    final index = favouritePosts.indexWhere((post) => post.id == postId);
    if (index != -1) {
      favouritePosts.removeAt(index);
    }
  }

  void removeFromSaved(String postId) {
    savedPosts.removeWhere((post) => post.id == postId);
  }

  void restoreHiddenPost(String postId) {
    hiddenPosts.removeWhere((post) => post.id == postId);
  }

  void refreshPosts(PostType type) {
    // No-op until real API integration is added
  }
}
