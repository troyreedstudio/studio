import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/feature/fav_saved_hidden_post/controller/post_controller.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/global_widgets/custom_text.dart';
import '../model/post_model.dart';

class UnifiedPostsPage extends StatelessWidget {
  final PostType postType;

  const UnifiedPostsPage({Key? key, required this.postType}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(PostsController());

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0D0D1A), Color(0xFF000000)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(controller), // ✅ fixed (no context needed)
              Expanded(
                child: Obx(() {
                  if (controller.isLoading.value) {
                    return const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primaryColor,
                      ),
                    );
                  }

                  final posts = controller.getPostsByType(postType);

                  if (posts.isEmpty) {
                    return _buildEmptyState();
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      controller.refreshPosts(postType);
                    },
                    child: ListView.builder(
                      padding: EdgeInsets.all(16.w),
                      itemCount: posts.length,
                      itemBuilder: (context, index) {
                        return _buildPostCard(posts[index], controller);
                      },
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ✅ FIXED: removed context usage (Get.back())
  Widget _buildAppBar(PostsController controller) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
      child: Row(
        children: [
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundCard,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 1),
            ),
            child: IconButton(
              onPressed: () => Get.back(), // ✅ no context needed
              icon: Icon(
                Icons.arrow_back_ios,
                color: Colors.white,
                size: 24.sp,
              ),
            ),
          ),
          SizedBox(width: 8.w),
          Expanded(
            child: headingText(
              text: controller.getPageTitle(postType),
              color: AppColors.secondaryColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _getEmptyStateIcon(),
            size: 80.sp,
            color: AppColors.primaryColor.withOpacity(0.5),
          ),
          SizedBox(height: 20.h),
          headingText(
            text: _getEmptyStateTitle(),
            color: AppColors.secondaryColor,
          ),
          SizedBox(height: 8.h),
          normalText(
            text: _getEmptyStateSubtitle(),
            color: AppColors.secondaryColor.withOpacity(0.7),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  IconData _getEmptyStateIcon() {
    switch (postType) {
      case PostType.favourites:
        return Icons.favorite_border;
      case PostType.saved:
        return Icons.bookmark_border;
      case PostType.hidden:
        return Icons.visibility_off_outlined;
    }
  }

  String _getEmptyStateTitle() {
    switch (postType) {
      case PostType.favourites:
        return 'No Favourites Yet';
      case PostType.saved:
        return 'No Saved Posts';
      case PostType.hidden:
        return 'No Hidden Posts';
    }
  }

  String _getEmptyStateSubtitle() {
    switch (postType) {
      case PostType.favourites:
        return 'Start adding posts to your favourites\nto see them here';
      case PostType.saved:
        return 'Save posts you want to\nread later';
      case PostType.hidden:
        return 'Hidden posts will appear here';
    }
  }

  Widget _buildPostCard(PostModel post, PostsController controller) {
    return Container(
      margin: EdgeInsets.only(bottom: 16.h),
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildPostImage(post),
          SizedBox(width: 12.w),
          Expanded(child: _buildPostContent(post)),
          _buildActionButton(post, controller),
        ],
      ),
    );
  }

  Widget _buildPostImage(PostModel post) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8.r),
      child: ResponsiveNetworkImage(
        imageUrl: post.imageUrl,
        widthPercent: 0.2,
        heightPercent: 0.12,
        fit: BoxFit.cover,
        shape: ImageShape.roundedRectangle,
        borderRadius: 8.r,
      ),
    );
  }

  Widget _buildPostContent(PostModel post) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        smallText(
          text: post.title,
          fontWeight: FontWeight.w600,
          color: AppColors.secondaryColor,
          maxLines: 1,
        ),
        if (postType != PostType.favourites) ...[
          SizedBox(height: 4.h),
          smallerText(
            text: post.description,
            color: AppColors.secondaryColor.withOpacity(0.8),
            maxLines: 3,
          ),
        ],
        SizedBox(height: 8.h),
        _buildPostMeta(post),
      ],
    );
  }

  Widget _buildPostMeta(PostModel post) {
    if (postType == PostType.favourites) {
      return Row(
        children: [
          Icon(
            Icons.location_on_outlined,
            size: 14.sp,
            color: AppColors.primaryColor,
          ),
          SizedBox(width: 4.w),
          Expanded(
            child: smallerText(
              text: post.location,
              color: AppColors.secondaryColor.withOpacity(0.7),
            ),
          ),
        ],
      );
    } else {
      return smallerText(
        text: '${post.date} • ${post.time}',
        color: AppColors.secondaryColor.withOpacity(0.7),
      );
    }
  }

  Widget _buildActionButton(PostModel post, PostsController controller) {
    return Column(
      children: [
        if (postType == PostType.favourites)
          _buildFavouriteButton(post, controller)
        else if (postType == PostType.saved)
          _buildSavedButton(post, controller)
        else
          _buildRestoreButton(post, controller),
        if (postType == PostType.favourites) ...[
          SizedBox(height: 12.h),
          Column(
            children: [
              smallerText(
                text: post.date,
                color: AppColors.secondaryColor.withOpacity(0.7),
              ),
              SizedBox(height: 2.h),
              smallerText(
                text: post.time,
                color: AppColors.secondaryColor.withOpacity(0.7),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildFavouriteButton(PostModel post, PostsController controller) {
    return GestureDetector(
      onTap: () => controller.toggleFavourite(post.id),
      child: Container(
        padding: EdgeInsets.all(8.w),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.primaryColor,
        ),
        child: Icon(Icons.favorite, color: Colors.white, size: 20.sp),
      ),
    );
  }

  Widget _buildSavedButton(PostModel post, PostsController controller) {
    return GestureDetector(
      onTap: () => controller.removeFromSaved(post.id),
      child: Container(
        padding: EdgeInsets.all(8.w),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.primaryColor,
        ),
        child: Icon(Icons.bookmark, color: Colors.white, size: 20.sp),
      ),
    );
  }

  Widget _buildRestoreButton(PostModel post, PostsController controller) {
    return ElevatedButton(
      onPressed: () => controller.restoreHiddenPost(post.id),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.buttonColor,
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
        ),
        elevation: 2,
      ),
      child: const Icon(Icons.repeat_rounded, color: Colors.white),
    );
  }
}
