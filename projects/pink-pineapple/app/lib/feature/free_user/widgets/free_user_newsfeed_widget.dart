import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/app_network_image.dart';
import 'package:pineapple/core/style/global_text_style.dart';
import 'package:pineapple/feature/free_user/controller/free_user_home_controller.dart';
import 'package:pineapple/feature/free_user/widgets/login_prompt_dialog.dart';

class FreeUserNewsfeedWidget extends StatelessWidget {
  FreeUserNewsfeedWidget({super.key});

  final controller = Get.find<FreeUserHomeController>();

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (controller.isPostsLoading.value &&
          controller.publicPostList.isEmpty) {
        return ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: 5,
          itemBuilder: (_, __) => _PostSkeleton(),
        );
      }

      return RefreshIndicator(
        color: AppColors.primaryColor,
        onRefresh: controller.refreshData,
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: controller.publicPostList.length + 1,
          itemBuilder: (context, index) {
            // Login prompt header
            if (index == 0) {
              return _loginPromptHeader(context);
            }

            // Empty state
            if (controller.publicPostList.isEmpty) {
              return Padding(
                padding: EdgeInsets.only(top: 120.h),
                child: Column(
                  children: [
                    Icon(Icons.post_add, size: 80.sp, color: Colors.grey),
                    SizedBox(height: 16.h),
                    Text(
                      'No posts available',
                      style: globalTextStyle(
                        fontSize: 16.sp,
                        color: Colors.grey,
                      ),
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      'Check back later for new content!',
                      style: globalTextStyle(
                        fontSize: 14.sp,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              );
            }

            final post = controller.publicPostList[index - 1];
            return _postCard(context, post);
          },
        ),
      );
    });
  }

  Widget _loginPromptHeader(BuildContext context) {
    return GestureDetector(
      onTap: () => showLoginPromptDialog(context),
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.primaryColor.withOpacity(0.8),
              AppColors.primaryColor,
            ],
          ),
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 20.r,
              backgroundColor: AppColors.backgroundDark,
              child: Icon(
                Icons.person_add,
                size: 20.sp,
                color: AppColors.primaryColor,
              ),
            ),
            SizedBox(width: 12.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Join the Community!',
                    style: globalTextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'Login to create posts and interact',
                    style: globalTextStyle(
                      fontSize: 12.sp,
                      color: AppColors.backgroundCard,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16.sp),
          ],
        ),
      ),
    );
  }

  Widget _postCard(BuildContext context, dynamic post) {
    final postData = post as Map<String, dynamic>;
    final user = postData['user'] as Map<String, dynamic>?;

    // Get text content
    final content = postData['text'] as String?;

    // Get photos array and extract URLs
    final photos = postData['photos'] as List?;
    List<String>? imageUrls;
    if (photos != null && photos.isNotEmpty) {
      imageUrls = photos
          .map((photo) {
            if (photo is Map<String, dynamic>) {
              return photo['url'] as String?;
            }
            return null;
          })
          .where((url) => url != null)
          .cast<String>()
          .toList();
    }

    return GestureDetector(
      onTap: () => showLoginPromptDialog(context),
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
        padding: EdgeInsets.all(12.w),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(color: Colors.grey.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User info
            Row(
              children: [
                CircleAvatar(
                  radius: 20.r,
                  backgroundColor: AppColors.primaryColor.withOpacity(0.1),
                  backgroundImage: user?['profileImage'] != null
                      ? NetworkImage(user!['profileImage'])
                      : null,
                  child: user?['profileImage'] == null
                      ? Icon(
                          Icons.person,
                          color: AppColors.primaryColor,
                          size: 20.sp,
                        )
                      : null,
                ),
                SizedBox(width: 10.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?['fullName'] ?? 'Unknown User',
                        style: globalTextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        user?['fullAddress'] ?? '',
                        style: globalTextStyle(
                          fontSize: 12.sp,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.more_vert, color: Colors.grey, size: 20.sp),
              ],
            ),
            SizedBox(height: 12.h),

            // Post content
            if (content != null && content.isNotEmpty)
              Text(content, style: globalTextStyle(fontSize: 14.sp)),

            // Post images
            if (imageUrls != null && imageUrls.isNotEmpty) ...[
              SizedBox(height: 12.h),
              SizedBox(
                height: 250.h,
                width: double.infinity,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(15.r),
                  child: ResponsiveNetworkImage(
                    imageUrl: imageUrls.first,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _PostSkeleton() {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(20.r),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(radius: 20.r, backgroundColor: Colors.grey.shade300),
              SizedBox(width: 10.w),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 120.w,
                    height: 12.h,
                    color: Colors.grey.shade300,
                  ),
                  SizedBox(height: 4.h),
                  Container(
                    width: 80.w,
                    height: 10.h,
                    color: Colors.grey.shade300,
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 12.h),
          Container(
            width: double.infinity,
            height: 14.h,
            color: Colors.grey.shade300,
          ),
          SizedBox(height: 8.h),
          Container(width: 200.w, height: 14.h, color: Colors.grey.shade300),
          SizedBox(height: 12.h),
          Container(
            height: 200.h,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(15.r),
            ),
          ),
        ],
      ),
    );
  }
}
