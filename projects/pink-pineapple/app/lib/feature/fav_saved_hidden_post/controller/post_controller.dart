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
    loadDummyData();
  }

  void loadDummyData() {
    isLoading.value = true;

    // Dummy data for favourites
    favouritePosts.value = [
      PostModel(
        id: '1',
        title: 'Summer Music Fest',
        description:
            'Join us for an amazing summer music festival with live performances.',
        imageUrl:
            'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
        location: 'Garden Park, Bali',
        date: 'Dec 24',
        time: '3:00 PM',
        isFavourite: true,
      ),
      PostModel(
        id: '2',
        title: 'Indian Music Fest',
        description:
            'Experience the rich culture of Indian music with traditional and modern performances.',
        imageUrl:
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        location: 'Garden Park, Bali',
        date: 'Dec 25',
        time: '4:00 PM',
        isFavourite: true,
      ),
      PostModel(
        id: '3',
        title: 'Local Farmers Market',
        description:
            'Fresh produce and local goods from our community farmers.',
        imageUrl:
            'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        location: 'Garden Park, Bali',
        date: 'Dec 26',
        time: '8:00 AM',
        isFavourite: true,
      ),
    ];

    // Dummy data for saved posts
    savedPosts.value = [
      PostModel(
        id: '4',
        title: 'Art Exhibition Opening',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...See More',
        imageUrl:
            'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        location: 'City Gallery',
        date: '7 Hours',
        time: '1 Day Ago',
        isSaved: true,
      ),
      PostModel(
        id: '5',
        title: 'Food Festival',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...See More',
        imageUrl:
            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
        location: 'Downtown Plaza',
        date: '5 Hours',
        time: '1 Day Ago',
        isSaved: true,
      ),
      PostModel(
        id: '6',
        title: 'Tech Conference 2024',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...See More',
        imageUrl:
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
        location: 'Convention Center',
        date: '3 Hours',
        time: '1 Day Ago',
        isSaved: true,
      ),
    ];

    // Dummy data for hidden posts
    hiddenPosts.value = [
      PostModel(
        id: '7',
        title: 'Yoga Workshop',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...See More',
        imageUrl:
            'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
        location: 'Wellness Center',
        date: '2 Hours',
        time: '2 Days Ago',
        isHidden: true,
      ),
      PostModel(
        id: '8',
        title: 'Photography Walk',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...See More',
        imageUrl:
            'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400',
        location: 'City Park',
        date: '4 Hours',
        time: '3 Days Ago',
        isHidden: true,
      ),
      PostModel(
        id: '9',
        title: 'Cooking Class',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...See More',
        imageUrl:
            'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
        location: 'Culinary School',
        date: '6 Hours',
        time: '4 Days Ago',
        isHidden: true,
      ),
    ];

    isLoading.value = false;
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
    isLoading.value = true;
    // Simulate API call delay
    Future.delayed(Duration(seconds: 2), () {
      loadDummyData();
    });
  }
}
