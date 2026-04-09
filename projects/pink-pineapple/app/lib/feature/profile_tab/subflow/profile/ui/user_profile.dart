import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/core/global_widgets/app_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/core/global_widgets/custom_text.dart';
import 'package:pineapple/feature/profile_tab/subflow/profile/controller/user_controller.dart';

import '../../../../../core/style/global_text_style.dart';
import '../../../../newsfeed/model/comment_model.dart';
import '../../../../newsfeed/model/newsfeed_post_model.dart';
import '../../../../newsfeed/widgets/comment_bottom_sheet.dart';
import '../../profile_edit/ui/profile_edit_ui.dart';

class UserProfilePage extends StatefulWidget {
  const UserProfilePage({super.key});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
  final controller = Get.put(UserProfileController());
  final userInfo = Get.find<UserInfoController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: CustomScrollView(
        controller: controller.scrollCtrl,
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ===== Cover =====
          SliverAppBar(
            expandedHeight: 100.h,
            pinned: true,
            backgroundColor: AppColors.backgroundDark,
            elevation: 0,
            automaticallyImplyLeading: false,
            leadingWidth: 60.w,
            leading: Padding(
              padding: EdgeInsets.all(8.w),
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSurface.withOpacity(0.8),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Icon(
                    Icons.arrow_back_ios_new,
                    color: AppColors.textPrimary,
                    size: 18.sp,
                  ),
                ),
              ),
            ),
            title: Text(
              userInfo.userInfo.value?.userProfile?.fullName ?? "no name",
              style: GoogleFonts.cormorantGaramond(
                color: AppColors.textPrimary,
                fontSize: 16.sp,
                fontWeight: FontWeight.w600,
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  ResponsiveNetworkImage(
                    imageUrl:
                        userInfo.userInfo.value?.userProfile?.profileImage ??
                        "",
                    fit: BoxFit.cover,
                    borderRadius: 0,
                  ),

                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.backgroundDark.withOpacity(0.5),
                          Colors.transparent,
                          AppColors.backgroundDark.withOpacity(0.7),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ===== Body =====
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.backgroundDark,
              ),
              child: Obx(() {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    // avatar overlap
                    Transform.translate(
                      offset: Offset(-130.w, 5.h),
                      child: Container(
                        height: 60.h,
                        width: 60.h,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10.r),
                          border: Border.all(color: AppColors.primaryColor, width: 2.5.w),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryColor.withOpacity(0.3),
                              blurRadius: 12,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8.r),
                          child: ResponsiveNetworkImage(
                            imageUrl:
                                userInfo
                                    .userInfo
                                    .value
                                    ?.userProfile
                                    ?.profileImage ??
                                "",
                          ),
                        ),
                      ),
                    ),
                    SizedBox(height: 10.h),
                    // name & handle row + follow & more
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16.w),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          // Left side: name & handle
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    normalText(
                                      text:
                                          userInfo
                                              .userInfo
                                              .value
                                              ?.userProfile
                                              ?.fullName ??
                                          "no name",
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    SizedBox(height: 4.h),
                                    smallerText(
                                      text:
                                          "@${userInfo.userInfo.value?.userProfile?.username ?? "no username"}",
                                      color: AppColors.textSecondary,
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(width: 120.w),
                              // reserve some space for the button
                            ],
                          ),

                          // Edit button anchored to top-right
                          Positioned(
                            right: 0,
                            top: -20.h, // lift it visually if you want overlap
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () async {
                                  // Navigate to edit screen and refresh when returning
                                  await Get.to(() => ProfileEditScreen());
                                  // Refresh user info after returning from edit
                                  await userInfo.fetchUserInfo();
                                  // Force rebuild
                                  if (mounted) setState(() {});
                                },
                                borderRadius: BorderRadius.circular(12.r),
                                child: Container(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: 12.w,
                                    vertical: 8.h,
                                  ),
                                  decoration: BoxDecoration(
                                    gradient: AppColors.gradientPrimary,
                                    borderRadius: BorderRadius.circular(12.r),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.primaryColor.withOpacity(0.3),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.edit,
                                        size: 15.sp,
                                        color: AppColors.backgroundDark,
                                      ),
                                      SizedBox(width: 6.w),
                                      smallText(
                                        text: 'Edit',
                                        color: AppColors.backgroundDark,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    SizedBox(height: 10.h),

                    // location
                    Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        SizedBox(width: 16.w),
                        Icon(
                          Icons.location_on,
                          size: 16.sp,
                          color: AppColors.primaryColor,
                        ),
                        SizedBox(width: 6.w),
                        smallerText(
                          text:
                              userInfo
                                  .userInfo
                                  .value
                                  ?.userProfile
                                  ?.fullAddress ??
                              '', // place
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                    SizedBox(height: 10.h),

                    // bio with "See more"
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16.w),
                      child: GestureDetector(
                        onTap: () => controller.toggleBioExpand(),
                        child: smallText(
                          text:
                              userInfo.userInfo.value?.userProfile?.bio ??
                              "no bio",
                          color: AppColors.textSecondary,
                          maxLines: controller.isBioExpanded.value ? 10 : 2,
                          overflow: controller.isBioExpanded.value
                              ? TextOverflow.visible
                              : TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    userInfo.userInfo.value!.userProfile!.bio!.isEmpty
                        ? SizedBox.shrink()
                        : Align(
                            alignment: Alignment.centerLeft,
                            child: Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: 16.w,
                                vertical: 6.h,
                              ),
                              child: GestureDetector(
                                onTap: () => controller.toggleBioExpand(),
                                child: smallText(
                                  text: controller.isBioExpanded.value
                                      ? 'See Less'
                                      : '...See More',
                                  color: AppColors.primaryColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),

                    SizedBox(height: 8.h),
                    // stats row
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16.w),
                      child: _StatsRow(
                        items: [
                          _StatItem(
                            count: "${userInfo.userInfo.value?.post ?? '0'}",
                            label: 'Posts',
                          ),
                          _StatItem(
                            count:
                                "${userInfo.userInfo.value?.follower ?? '0'}",
                            label: 'Followers',
                          ),
                          _StatItem(
                            count:
                                "${userInfo.userInfo.value?.following ?? '0'}",
                            label: 'Followings',
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 10.h),

                    // posts
                  ],
                );
              }),
            ),
          ),

          // ===== News Feed =====
          // ===== Posts list (my posts only) =====
          Obx(() {
            if (controller.isInitialLoading.value &&
                controller.postList.isEmpty) {
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, __) => const _PostSkeleton(),
                  childCount: 5,
                ),
              );
            }

            if (controller.postList.isEmpty) {
              return SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.only(top: 80.h),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(Icons.post_add, size: 64.sp, color: AppColors.textMuted),
                        SizedBox(height: 8.h),
                        Text(
                          "No posts yet",
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }
            // List of my posts + a footer row
            return SliverList(
              delegate: SliverChildBuilderDelegate((ctx, i) {
                final isFooter = i == controller.postList.length;
                if (isFooter) {
                  if (controller.isFetchingMore.value) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (!controller.hasMore.value) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(child: Text("No more posts", style: TextStyle(color: AppColors.textMuted))),
                    );
                  }
                  return const SizedBox.shrink();
                }

                final post = controller.postList[i];
                return _postCard(ctx, post, controller); // ⬅️ reuse your card
              }, childCount: controller.postList.length + 1),
            );
          }),
        ],
      ),
    );
  }
}

/// ===== widgets
Widget _postCard(
  BuildContext context,
  NewsFeedPostModel post,
  UserProfileController controller,
) {
  return Container(
    margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 5.h),
    padding: EdgeInsets.all(12.w),
    decoration: BoxDecoration(
      color: AppColors.backgroundCard,
      borderRadius: BorderRadius.circular(12.r),
      border: Border.all(color: AppColors.borderSubtle, width: 0.5),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // header
        Row(
          children: [
            GestureDetector(
              onTap: () {
                // if (post.user?.id ==
                //     userController.userInfo.value?.userProfile?.id) {
                //   Get.to(() => UserProfilePage());
                // } else {
                //   Get.to(() => NewsfeedProfilePage(userID: post.user?.id));
                // }
              },
              child: SizedBox(
                height: 30.h,
                width: 30.h,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20.r),
                  child: ResponsiveNetworkImage(
                    borderRadius: 20.r,
                    imageUrl:
                        (controller
                                .newsFeedUserProfile
                                .value
                                ?.userProfile
                                ?.profileImage
                                ?.isNotEmpty ??
                            false)
                        ? controller
                              .newsFeedUserProfile
                              .value!
                              .userProfile!
                              .profileImage!
                        : "https://randomuser.me/api/portraits/men/33.jpg",
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
                    controller
                            .newsFeedUserProfile
                            .value
                            ?.userProfile
                            ?.fullName ??
                        "User",
                    style: globalTextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
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
                            color: AppColors.textSecondary,
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
                  onPressed: () =>
                      _showPostOptionsMenu(btnCtx, post, controller),
                  // pass btnCtx
                  icon: FaIcon(FontAwesomeIcons.ellipsis, color: AppColors.textSecondary),
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
                  style: globalTextStyle(fontSize: 14.sp, color: AppColors.textPrimary),
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
                  mainAxisSize: MainAxisSize.min,
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
                    SizedBox(width: 6.w),
                    Text("$count", style: globalTextStyle(fontSize: 14.sp, color: AppColors.textSecondary)),
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
                mainAxisSize: MainAxisSize.min,
                children: [
                  FaIcon(
                    FontAwesomeIcons.comment,
                    color: AppColors.textSecondary,
                    size: 18.sp,
                  ),
                  SizedBox(width: 6.w),
                  Text(
                    "${post.comments?.length ?? 0}",
                    style: globalTextStyle(fontSize: 14.sp, color: AppColors.textSecondary),
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
                child: Container(height: 14.h, color: AppColors.backgroundSurface),
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

void _showPostOptionsMenu(
  BuildContext context,
  NewsFeedPostModel post,
  UserProfileController controller,
) {
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
        const PopupMenuItem(
          value: 'edit',
          child: _MenuRow(
            icon: Icons.edit,
            color: Colors.blue,
            text: "Edit Post",
          ),
        ),
      if (post.user?.id ==
          Get.find<UserInfoController>().userInfo.value?.userProfile?.id)
        const PopupMenuItem(
          value: 'hide',
          child: _MenuRow(
            icon: Icons.visibility_off,
            color: Colors.grey,
            text: "Hide Post",
          ),
        ),
      if (post.user?.id ==
          Get.find<UserInfoController>().userInfo.value?.userProfile?.id)
        const PopupMenuItem(
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
        const PopupMenuItem(
          value: 'report',
          child: _MenuRow(
            icon: Icons.report,
            color: Colors.orange,
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
        // controller.confirmDeletePost(context, post);
        break;
      case 'report':
        // Get.to(() => ReportScreen());
        break;
    }
  });
}

void confirmDeletePost(
  BuildContext context,
  NewsFeedPostModel post,
  UserProfileController controller,
) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text("Delete Post?"),
      content: const Text(
        "Are you sure you want to delete this post? This action cannot be undone.",
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text("Cancel"),
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

Widget _buildImageGrid(List<String> images) {
  if (images.isEmpty) return const SizedBox.shrink();

  switch (images.length) {
    case 1:
      return ClipRRect(
        borderRadius: BorderRadius.circular(8.r),
        child: ResponsiveNetworkImage(
          imageUrl: images[0],
          widthPercent: 1,
          heightPercent: 0.3,
          fit: BoxFit.cover,
          borderRadius: 8.r,
        ),
      );
    case 2:
      return Row(
        children: [
          Expanded(
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
          SizedBox(width: 8.w),
          Expanded(
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
        ],
      );
    case 3:
      return Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8.r),
            child: ResponsiveNetworkImage(
              imageUrl: images[0],
              widthPercent: 1,
              heightPercent: .2,
              fit: BoxFit.cover,
              borderRadius: 8.r,
            ),
          ),
          SizedBox(height: 8.h),
          Row(
            children: [
              Expanded(
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
              SizedBox(width: 8.w),
              Expanded(
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
            ],
          ),
        ],
      );
    default:
      return Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8.r),
            child: ResponsiveNetworkImage(
              imageUrl: images[0],
              widthPercent: 1,
              heightPercent: .22,
              fit: BoxFit.cover,
              borderRadius: 8.r,
            ),
          ),
          SizedBox(height: 8.h),
          Row(
            children: [
              Expanded(
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
              SizedBox(width: 8.w),
              Expanded(
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
                            color: Colors.black.withOpacity(0.6),
                            borderRadius: BorderRadius.only(
                              bottomRight: Radius.circular(8.r),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              '+${images.length - 3}',
                              style: globalTextStyle(
                                fontSize: 24.sp,
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
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
        Text(text, style: TextStyle(color: danger ? AppColors.errorColor : AppColors.textPrimary)),
      ],
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.items});

  final List<_StatItem> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(vertical: 10.h),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(14.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Row(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            Expanded(
              child: Column(
                children: [
                  normalText(
                    text: items[i].count,
                    color: AppColors.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                  SizedBox(height: 2.h),
                  smallerText(text: items[i].label, color: AppColors.textSecondary),
                ],
              ),
            ),
            if (i != items.length - 1)
              Container(
                height: 34.h,
                width: 1,
                color: AppColors.borderSubtle,
              ),
          ],
        ],
      ),
    );
  }
}

class _StatItem {
  final String count;
  final String label;

  const _StatItem({required this.count, required this.label});
}
