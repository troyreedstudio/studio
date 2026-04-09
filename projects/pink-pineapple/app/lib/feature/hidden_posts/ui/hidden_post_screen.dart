import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/app_network_image.dart';
import 'package:pineapple/core/style/global_text_style.dart';
import 'package:pineapple/core/const/app_colors.dart';

import '../controller/hidden_post_controller.dart';
import '../model/hidden_post_model.dart';

class HiddenPostsPage extends StatelessWidget {
  HiddenPostsPage({super.key});

  final c = Get.put(HiddenPostsController());

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            _header(), // ✅ no context needed
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primaryColor,
                onRefresh: c.refresh,
                child: Obx(() {
                  if (c.isLoading.value && c.hidden.isEmpty) {
                    return Center(
                      child: SizedBox(height: 200.h, child: loading()),
                    );
                  }

                  if (c.hidden.isEmpty) {
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        SizedBox(height: 180.h),
                        Center(
                          child: Column(
                            children: [
                              FaIcon(
                                FontAwesomeIcons.eyeSlash,
                                size: 48.sp,
                                color: AppColors.secondaryColor,
                              ),
                              SizedBox(height: 12.h),
                              Text(
                                'No hidden posts',
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
                    padding: EdgeInsets.symmetric(
                      horizontal: 16.w,
                      vertical: 12.h,
                    ),
                    itemCount: c.hidden.length,
                    separatorBuilder: (_, __) => SizedBox(height: 10.h),
                    itemBuilder: (_, i) => _HiddenCard(
                      item: c.hidden[i],
                      onUnhide: () => c.unhidePost(c.hidden[i].id!),
                      timeAgo: c.timeAgo,
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Get.back(), // ✅ fixes context problem
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
          SizedBox(width: 10.w), // ✅ replaces Row(spacing:)
          Text(
            'Hidden Posts',
            style: globalTextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _HiddenCard extends StatelessWidget {
  const _HiddenCard({
    required this.item,
    required this.onUnhide,
    required this.timeAgo,
  });

  final HiddenPostModel item;
  final VoidCallback onUnhide;
  final String Function(DateTime) timeAgo;

  @override
  Widget build(BuildContext context) {
    final photos = (item.photos ?? [])
        .map((e) => e.url ?? '')
        .where((u) => u.isNotEmpty)
        .toList();

    final commentsCount = item.count?.comments ?? (item.comments?.length ?? 0);
    final likes = item.likeCount ?? 0;

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
                    imageUrl: item.user?.profileImage ?? '',
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.user?.fullName != null
                            ? fullNameValues.reverse[item.user!.fullName] ??
                                  'User'
                            : 'User',
                        style: globalTextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (item.createdAt != null)
                        Text(
                          timeAgo(item.createdAt!),
                          style: globalTextStyle(
                            fontSize: 11.sp,
                            color: AppColors.secondaryColor,
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Unhide',
                  onPressed: onUnhide,
                  icon: const FaIcon(FontAwesomeIcons.eye),
                  color: AppColors.primaryColor,
                ),
              ],
            ),
          ),

          // text
          if ((item.text ?? '').isNotEmpty) ...[
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12.w),
              child: Text(item.text!, style: globalTextStyle(fontSize: 14.sp)),
            ),
            SizedBox(height: 8.h),
          ],

          // images
          if (photos.isNotEmpty)
            Padding(
              padding: EdgeInsets.only(bottom: 8.h),
              child: _buildImageGrid(photos),
            ),

          // meta row (counts only)
          Padding(
            padding: EdgeInsets.fromLTRB(12.w, 0, 12.w, 12.h),
            child: Row(
              children: [
                Icon(
                  FontAwesomeIcons.solidHeart,
                  size: 14.sp,
                  color: AppColors.secondaryColor,
                ),
                SizedBox(width: 6.w),
                Text(
                  '$likes',
                  style: globalTextStyle(
                    fontSize: 12.sp,
                    color: AppColors.secondaryColor,
                  ),
                ),
                SizedBox(width: 16.w),
                Icon(
                  FontAwesomeIcons.comment,
                  size: 14.sp,
                  color: AppColors.secondaryColor,
                ),
                SizedBox(width: 6.w),
                Text(
                  '$commentsCount',
                  style: globalTextStyle(
                    fontSize: 12.sp,
                    color: AppColors.secondaryColor,
                  ),
                ),
              ],
            ),
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
