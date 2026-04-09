// lib/feature/newsfeed/ui/news_feed_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/image_path.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/feature/newsfeed/model/comment_model.dart';
import 'package:pineapple/feature/newsfeed/model/newsfeed_post_model.dart';
import 'package:pineapple/feature/profile_tab/subflow/profile/ui/newsfeed_profile_page.dart';
import 'package:pineapple/feature/report/screen/report_screen.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/style/global_text_style.dart';
import '../../profile_tab/subflow/profile/ui/user_profile.dart';
import '../controller/news_feed_controller.dart';
import '../widgets/comment_bottom_sheet.dart';
import '../widgets/create_post_widget_screen.dart';
import '../widgets/fullscreen_image_viewer.dart';

class NewsFeedPage extends StatefulWidget {
  const NewsFeedPage({super.key});

  @override
  State<NewsFeedPage> createState() => _NewsFeedPageState();
}

class _NewsFeedPageState extends State<NewsFeedPage> {
  final controller = Get.put(NewsFeedController());
  final userController = Get.find<UserInfoController>();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.backgroundDark,
      child: Obx(() {
        // First page skeleton
        if (controller.isInitialLoading.value && controller.postList.isEmpty) {
          return ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: 5,
            itemBuilder: (_, __) => const _PostSkeleton(),
          );
        }

        return RefreshIndicator(
          color: AppColors.primaryColor,
          backgroundColor: AppColors.backgroundSurface,
          onRefresh: controller.refreshPosts,
          child: ListView.builder(
            controller: controller.scrollCtrl,
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: controller.postList.length + 2, // header + footer
            itemBuilder: (context, index) {
              // Header (composer)
              if (index == 0) {
                return _postComposer();
              }

              // Footer
              if (index == controller.postList.length + 1) {
                if (controller.isFetchingMore.value) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primaryColor,
                      ),
                    ),
                  );
                }
                if (!controller.hasMore && controller.postList.isNotEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        "No more posts",
                        style: globalTextStyle(
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                  );
                }
                // empty feed
                if (controller.postList.isEmpty) {
                  return Padding(
                    padding: EdgeInsets.only(top: 120.h),
                    child: Column(
                      children: [
                        Icon(Icons.post_add, size: 80.sp, color: AppColors.textMuted),
                        SizedBox(height: 16.h),
                        Text(
                          'No posts yet',
                          style: globalTextStyle(
                            fontSize: 16.sp,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        SizedBox(height: 8.h),
                        Text(
                          'Be the first to create a post!',
                          style: globalTextStyle(
                            fontSize: 14.sp,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return const SizedBox.shrink();
              }

              final post = controller.postList[index - 1]; // adjust for header
              return _postCard(context, post);
            },
          ),
        );
      }),
    );
  }

  Widget _postComposer() {
    return GestureDetector(
      onTap: () => Get.to(() => CreatePostScreen()),
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
        decoration: BoxDecoration(
          color: AppColors.backgroundSurface,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Row(
          children: [
            Obx(() {
              final url =
                  userController.userInfo.value?.userProfile?.profileImage ??
                  '';
              if (url.isNotEmpty) {
                return SizedBox(
                  height: 30.h,
                  width: 30.h,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20.r),
                    child: ResponsiveNetworkImage(
                      borderRadius: 10.r,
                      fit: BoxFit.cover,
                      imageUrl: url,
                    ),
                  ),
                );
              }
              return CircleAvatar(
                radius: 15.r,
                backgroundColor: AppColors.backgroundElevated,
                child: Icon(
                  Icons.person,
                  size: 16.sp,
                  color: AppColors.textSecondary,
                ),
              );
            }),
            SizedBox(width: 12.w),
            Expanded(
              child: TextField(
                readOnly: true,
                decoration: InputDecoration(
                  hintText: "What's On Your Mind?",
                  hintStyle: globalTextStyle(
                    fontSize: 16.sp,
                    color: AppColors.textMuted,
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
                style: globalTextStyle(
                  fontSize: 16.sp,
                  color: AppColors.textPrimary,
                ),
                onTap: () => Get.to(() => CreatePostScreen()),
              ),
            ),
            FaIcon(
              FontAwesomeIcons.image,
              size: 20.sp,
              color: AppColors.primaryColor,
            ),
          ],
        ),
      ),
    );
  }

  Widget _postCard(BuildContext context, NewsFeedPostModel post) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 5.h),
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // header
          Row(
            children: [
              GestureDetector(
                onTap: () {
                  if (post.user?.id ==
                      userController.userInfo.value?.userProfile?.id) {
                    Get.to(() => UserProfilePage());
                  } else {
                    Get.to(() => NewsfeedProfilePage(userID: post.user?.id));
                  }
                },

                child: SizedBox(
                  height: 30.h,
                  width: 30.h,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20.r),
                    child: ResponsiveNetworkImage(
                      borderRadius: 20.r,
                      imageUrl: (post.user?.profileImage?.isNotEmpty ?? false)
                          ? post.user!.profileImage!
                          : ImagePath.noPhoto,
                    ),
                  ),
                ),
              ),
              SizedBox(width: 10.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.user?.fullName ?? "User",
                      style: globalTextStyle(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        fontFamily: 'Cormorant Garamond',
                      ),
                    ),
                    Row(
                      children: [
                        if (post.user?.fullAddress != null &&
                            post.user!.fullAddress!.isNotEmpty) ...[
                          FaIcon(
                            FontAwesomeIcons.locationDot,
                            size: 12.sp,
                            color: AppColors.primaryColor,
                          ),
                          SizedBox(width: 4.w),
                          Flexible(
                            child: Text(
                              post.user!.fullAddress!,
                              style: globalTextStyle(
                                fontSize: 12.sp,
                                color: AppColors.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          SizedBox(width: 8.w),
                        ],
                        if (post.createdAt != null)
                          Text(
                            "• ${controller.timeAgo(post.createdAt!)}",
                            style: globalTextStyle(
                              fontSize: 12.sp,
                              color: AppColors.textMuted,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              // inside _postCard header row
              Builder(
                builder: (btnCtx) {
                  return IconButton(
                    onPressed: () => _showPostOptionsMenu(btnCtx, post),
                    // pass btnCtx
                    icon: FaIcon(
                      FontAwesomeIcons.ellipsis,
                      color: AppColors.textSecondary,
                    ),
                  );
                },
              ),
            ],
          ),
          SizedBox(height: 10.h),

          // text
          if ((post.text ?? '').isNotEmpty) ...[
            Obx(() {
              final isExpanded = controller.expandedPosts[post.id] ?? false;
              final needsExpansion = (post.text?.length ?? 0) > 150;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    post.text!,
                    style: globalTextStyle(
                      fontSize: 14.sp,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: isExpanded ? null : 3,
                    overflow: isExpanded ? null : TextOverflow.ellipsis,
                  ),
                  if (needsExpansion)
                    GestureDetector(
                      onTap: () => controller.togglePostExpansion(post.id!),
                      child: Text(
                        isExpanded ? "See Less" : "See More",
                        style: globalTextStyle(
                          fontSize: 14.sp,
                          color: AppColors.primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              );
            }),
            SizedBox(height: 10.h),
          ],

          // images
          if ((post.photos ?? []).isNotEmpty)
            _buildImageGrid(
              post.photos!
                  .map((e) => e.url ?? '')
                  .where((u) => u.isNotEmpty)
                  .toList(),
            ),

          SizedBox(height: 15.h),

          // divider above actions
          Divider(color: AppColors.borderSubtle, height: 1),
          SizedBox(height: 10.h),

          // actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // like
              GestureDetector(
                onTap: () {
                  if (post.id != null) controller.toggleLike(post.id!);
                },
                child: Obx(() {
                  final liked = controller.likedByMe[post.id] ?? false;
                  final count =
                      controller.likeCount[post.id] ?? (post.likeCount ?? 0);
                  return Row(
                    children: [
                      FaIcon(
                        liked
                            ? FontAwesomeIcons.solidHeart
                            : FontAwesomeIcons.heart,
                        color: liked
                            ? AppColors.primaryColor
                            : AppColors.textSecondary,
                        size: 18.sp,
                      ),
                      SizedBox(width: 4.w),
                      Text(
                        "$count",
                        style: globalTextStyle(
                          fontSize: 14.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  );
                }),
              ),

              // comment
              GestureDetector(
                onTap: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(20.r),
                        topRight: Radius.circular(20.r),
                      ),
                    ),
                    builder: (context) => CommentBottomSheet(
                      commentModel: CommentModel(),
                      postID: post.id!,
                    ),
                  );
                },
                child: Row(
                  children: [
                    FaIcon(
                      FontAwesomeIcons.comment,
                      color: AppColors.textSecondary,
                      size: 18.sp,
                    ),
                    SizedBox(width: 4.w),
                    Text(
                      "${post.comments?.length ?? 0}",
                      style: globalTextStyle(
                        fontSize: 14.sp,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // save
              GestureDetector(
                onTap: () {
                  if (post.id != null) controller.toggleSave(post.id!);
                },
                child: Obx(() {
                  final saved = controller.savedByMe[post.id] ?? false;
                  return FaIcon(
                    saved
                        ? FontAwesomeIcons.solidBookmark
                        : FontAwesomeIcons.bookmark,
                    color: saved
                        ? AppColors.primaryColor
                        : AppColors.textSecondary,
                    size: 18.sp,
                  );
                }),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showPostOptionsMenu(BuildContext context, NewsFeedPostModel post) {
    final button = context.findRenderObject() as RenderBox;
    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox;

    showMenu<String>(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      color: AppColors.backgroundElevated,
      context: context,
      position: RelativeRect.fromRect(
        Rect.fromPoints(
          button.localToGlobal(Offset.zero, ancestor: overlay),
          button.localToGlobal(
            button.size.bottomRight(Offset.zero),
            ancestor: overlay,
          ),
        ),
        Offset.zero & overlay.size,
      ),
      items: [
        if (post.user?.id ==
            Get.find<UserInfoController>().userInfo.value?.userProfile?.id)
          PopupMenuItem(
            value: 'edit',
            child: _MenuRow(
              icon: Icons.edit,
              color: AppColors.primaryColor,
              text: "Edit Post",
            ),
          ),
        if (post.user?.id ==
            Get.find<UserInfoController>().userInfo.value?.userProfile?.id)
          PopupMenuItem(
            value: 'hide',
            child: _MenuRow(
              icon: Icons.visibility_off,
              color: AppColors.textSecondary,
              text: "Hide Post",
            ),
          ),
        if (post.user?.id ==
            Get.find<UserInfoController>().userInfo.value?.userProfile?.id)
          PopupMenuItem(
            value: 'delete',
            child: _MenuRow(
              icon: Icons.delete,
              color: Colors.red,
              text: "Delete Post",
              danger: true,
            ),
          ),
        if (post.user?.id !=
            Get.find<UserInfoController>().userInfo.value?.userProfile?.id)
          PopupMenuItem(
            value: 'report',
            child: _MenuRow(
              icon: Icons.report,
              color: AppColors.accentChampagne,
              text: "Report Post",
            ),
          ),
      ],
    ).then((String? selected) {
      if (selected == null) return;
      switch (selected) {
        case 'edit':
          // TODO: navigate to edit
          break;
        case 'hide':
          controller.hideUnhidePost(post.id!);
          break;
        case 'delete':
          _confirmDeletePost(context, post);
          break;
        case 'report':
          Get.to(() => ReportScreen());
          break;
      }
    });
  }

  void _confirmDeletePost(BuildContext context, NewsFeedPostModel post) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.backgroundElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.r),
          side: BorderSide(color: AppColors.borderSubtle),
        ),
        title: Text(
          "Delete Post?",
          style: globalTextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          "Are you sure you want to delete this post? This action cannot be undone.",
          style: globalTextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              "Cancel",
              style: globalTextStyle(color: AppColors.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              controller.deletePosts(post.id!);
            },
            child: const Text("Delete", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _openFullscreenViewer(List<String> images, int initialIndex) {
    Get.to(
      () => FullscreenImageViewer(images: images, initialIndex: initialIndex),
      transition: Transition.fade,
      duration: const Duration(milliseconds: 300),
    );
  }

  Widget _buildImageGrid(List<String> images) {
    if (images.isEmpty) return const SizedBox.shrink();

    switch (images.length) {
      case 1:
        return GestureDetector(
          onTap: () => _openFullscreenViewer(images, 0),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8.r),
            child: ResponsiveNetworkImage(
              imageUrl: images[0],
              widthPercent: 1,
              heightPercent: 0.3,
              fit: BoxFit.cover,
              borderRadius: 8.r,
            ),
          ),
        );
      case 2:
        return Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => _openFullscreenViewer(images, 0),
                child: ClipRRect(
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(8.r),
                    bottomLeft: Radius.circular(8.r),
                  ),
                  child: ResponsiveNetworkImage(
                    imageUrl: images[0],
                    heightPercent: .3,
                    fit: BoxFit.cover,
                    borderRadius: 0,
                  ),
                ),
              ),
            ),
            SizedBox(width: 8.w),
            Expanded(
              child: GestureDetector(
                onTap: () => _openFullscreenViewer(images, 1),
                child: ClipRRect(
                  borderRadius: BorderRadius.only(
                    topRight: Radius.circular(8.r),
                    bottomRight: Radius.circular(8.r),
                  ),
                  child: ResponsiveNetworkImage(
                    imageUrl: images[1],
                    heightPercent: .3,
                    fit: BoxFit.cover,
                    borderRadius: 0,
                  ),
                ),
              ),
            ),
          ],
        );
      case 3:
        return Column(
          children: [
            GestureDetector(
              onTap: () => _openFullscreenViewer(images, 0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8.r),
                child: ResponsiveNetworkImage(
                  imageUrl: images[0],
                  widthPercent: 1,
                  heightPercent: .2,
                  fit: BoxFit.cover,
                  borderRadius: 8.r,
                ),
              ),
            ),
            SizedBox(height: 8.h),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _openFullscreenViewer(images, 1),
                    child: ClipRRect(
                      borderRadius: BorderRadius.only(
                        bottomLeft: Radius.circular(8.r),
                      ),
                      child: ResponsiveNetworkImage(
                        imageUrl: images[1],
                        heightPercent: .2,
                        fit: BoxFit.cover,
                        borderRadius: 0,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _openFullscreenViewer(images, 2),
                    child: ClipRRect(
                      borderRadius: BorderRadius.only(
                        bottomRight: Radius.circular(8.r),
                      ),
                      child: ResponsiveNetworkImage(
                        imageUrl: images[2],
                        heightPercent: .2,
                        fit: BoxFit.cover,
                        borderRadius: 0,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
      default:
        return Column(
          children: [
            GestureDetector(
              onTap: () => _openFullscreenViewer(images, 0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8.r),
                child: ResponsiveNetworkImage(
                  imageUrl: images[0],
                  widthPercent: 1,
                  heightPercent: .22,
                  fit: BoxFit.cover,
                  borderRadius: 8.r,
                ),
              ),
            ),
            SizedBox(height: 8.h),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _openFullscreenViewer(images, 1),
                    child: ClipRRect(
                      borderRadius: BorderRadius.only(
                        bottomLeft: Radius.circular(8.r),
                      ),
                      child: ResponsiveNetworkImage(
                        imageUrl: images[1],
                        heightPercent: .18,
                        fit: BoxFit.cover,
                        borderRadius: 0,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _openFullscreenViewer(images, 2),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.only(
                            bottomRight: Radius.circular(8.r),
                          ),
                          child: ResponsiveNetworkImage(
                            imageUrl: images[2],
                            heightPercent: .18,
                            fit: BoxFit.cover,
                            borderRadius: 0,
                          ),
                        ),
                        if (images.length > 3)
                          Positioned.fill(
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.backgroundDark.withOpacity(0.7),
                                borderRadius: BorderRadius.only(
                                  bottomRight: Radius.circular(8.r),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  '+${images.length - 3}',
                                  style: globalTextStyle(
                                    fontSize: 24.sp,
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
    }
  }
}

class _PostSkeleton extends StatelessWidget {
  const _PostSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 30.w,
                height: 30.w,
                decoration: BoxDecoration(
                  color: AppColors.backgroundSurface,
                  borderRadius: BorderRadius.circular(15.r),
                ),
              ),
              SizedBox(width: 10.w),
              Expanded(
                child: Container(
                  height: 14.h,
                  color: AppColors.backgroundSurface,
                ),
              ),
            ],
          ),
          SizedBox(height: 10.h),
          Container(
            height: 120.h,
            decoration: BoxDecoration(
              color: AppColors.backgroundSurface,
              borderRadius: BorderRadius.circular(8.r),
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;
  final bool danger;

  const _MenuRow({
    required this.icon,
    required this.color,
    required this.text,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 10),
        Text(
          text,
          style: TextStyle(
            color: danger ? Colors.red : AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
