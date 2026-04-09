import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/global_widgets/custom_text.dart';
import '../../../core/style/global_text_style.dart';
import '../controller/saved_post_controller.dart';
import '../model/saved_post_model.dart';

class SavedPostsPage extends StatelessWidget {
  SavedPostsPage({super.key});

  final controller = Get.put(SavedPostsController());

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            Expanded(child: _buildContent()),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: EdgeInsets.all(5.w),
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Icon(
                Icons.arrow_back_ios,
                size: 18.sp,
                color: AppColors.primaryColor,
              ),
            ),
          ),
          SizedBox(width: 10.w), // ✅ Row has no "spacing:" so use SizedBox
          normalText(
            text: 'Saved Posts',
            color: AppColors.secondaryColor,
            fontWeight: FontWeight.bold,
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      color: AppColors.primaryColor,
      onRefresh: () => controller.refresh(),
      child: Obx(() {
        if (controller.isLoading.value && controller.saved.isEmpty) {
          return Center(
            child: SizedBox(height: 200.h, child: loading()),
          );
        }

        if (controller.saved.isEmpty) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              SizedBox(height: 180.h),
              Center(
                child: Column(
                  children: [
                    Icon(
                      FontAwesomeIcons.bookmark,
                      size: 48.sp,
                      color: AppColors.secondaryColor,
                    ),
                    SizedBox(height: 12.h),
                    Text(
                      'No saved posts yet',
                      style: globalTextStyle(
                        fontSize: 14.sp,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        }

        return ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
          itemCount: controller.saved.length,
          separatorBuilder: (_, __) => SizedBox(height: 10.h),
          itemBuilder: (_, i) => _SavedCard(
            item: controller.saved[i],
            onUnsave: () =>
                controller.toggleSave(controller.saved[i].post!.id!),
            timeAgo: controller.timeAgo,
          ),
        );
      }),
    );
  }
}

class _SavedCard extends StatelessWidget {
  const _SavedCard({
    required this.item,
    required this.onUnsave,
    required this.timeAgo,
  });

  final SavedPostModel item;
  final VoidCallback onUnsave;
  final String Function(DateTime) timeAgo;

  @override
  Widget build(BuildContext context) {
    final post = item.post;
    final user = post?.user;
    final photos = (post?.photos ?? [])
        .map((e) => e.url ?? '')
        .where((u) => u.isNotEmpty)
        .toList();

    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: AppColors.borderSubtle),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // header
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18.r,
                  child: ResponsiveNetworkImage(
                    borderRadius: 18.r,
                    imageUrl: user?.profileImage ?? '',
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.fullName ?? 'User',
                        style: globalTextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (post?.createdAt != null)
                        Text(
                          timeAgo(post!.createdAt!),
                          style: globalTextStyle(
                            fontSize: 11.sp,
                            color: AppColors.secondaryColor,
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Unsave',
                  onPressed: onUnsave,
                  icon: const FaIcon(FontAwesomeIcons.solidBookmark),
                  color: AppColors.primaryColor,
                ),
              ],
            ),
          ),

          // text
          if ((post?.text ?? '').isNotEmpty) ...[
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12.w),
              child: Text(post!.text!, style: globalTextStyle(fontSize: 14.sp)),
            ),
            SizedBox(height: 8.h),
          ],

          // images
          if (photos.isNotEmpty)
            Padding(
              padding: EdgeInsets.only(bottom: 8.h),
              child: _buildImageGrid(photos),
            ),
        ],
      ),
    );
  }

  Widget _buildImageGrid(List<String> images) {
    if (images.isEmpty) return const SizedBox.shrink();

    switch (images.length) {
      case 1:
        return _one(images[0]);
      case 2:
        return _two(images[0], images[1]);
      default:
        return _three(images[0], images[1], images[2]);
    }
  }

  Widget _one(String a) {
    return ClipRRect(
      borderRadius: BorderRadius.only(
        bottomLeft: Radius.circular(12.r),
        bottomRight: Radius.circular(12.r),
      ),
      child: ResponsiveNetworkImage(
        imageUrl: a,
        widthPercent: 1,
        heightPercent: 0.28,
        fit: BoxFit.cover,
        borderRadius: 0,
      ),
    );
  }

  Widget _two(String a, String b) {
    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.only(bottomLeft: Radius.circular(12.r)),
            child: ResponsiveNetworkImage(
              imageUrl: a,
              heightPercent: .22,
              fit: BoxFit.cover,
              borderRadius: 0,
            ),
          ),
        ),
        SizedBox(width: 8.w),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.only(bottomRight: Radius.circular(12.r)),
            child: ResponsiveNetworkImage(
              imageUrl: b,
              heightPercent: .22,
              fit: BoxFit.cover,
              borderRadius: 0,
            ),
          ),
        ),
      ],
    );
  }

  Widget _three(String a, String b, String c) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8.r),
          child: ResponsiveNetworkImage(
            imageUrl: a,
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
                  bottomLeft: Radius.circular(12.r),
                ),
                child: ResponsiveNetworkImage(
                  imageUrl: b,
                  heightPercent: .18,
                  fit: BoxFit.cover,
                  borderRadius: 0,
                ),
              ),
            ),
            SizedBox(width: 8.w),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.only(
                  bottomRight: Radius.circular(12.r),
                ),
                child: ResponsiveNetworkImage(
                  imageUrl: c,
                  heightPercent: .18,
                  fit: BoxFit.cover,
                  borderRadius: 0,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
