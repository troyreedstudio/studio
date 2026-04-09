// lib/feature/home/widgets/comment_bottom_sheet.dart

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/core/style/global_text_style.dart';
import 'package:pineapple/feature/newsfeed/controller/news_feed_controller.dart';
import 'package:pineapple/feature/newsfeed/model/comment_model.dart';

import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/app_snackbar.dart';

class CommentBottomSheet extends StatelessWidget {
  CommentBottomSheet({
    super.key,
    required this.commentModel,
    required this.postID,
  });

  final newsFeedController = Get.find<NewsFeedController>();
  final CommentModel commentModel;
  final String postID;
  final userInfo = Get.find<UserInfoController>();

  @override
  Widget build(BuildContext context) {
    newsFeedController.fetchCommentsForPost(postID);
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        height: 550.h,
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20.r),
            topRight: Radius.circular(20.r),
          ),
        ),
        child: Column(
          children: [
            // Handle bar
            Padding(
              padding: EdgeInsets.symmetric(vertical: 16.h, horizontal: 20.w),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 40.w,
                    height: 4.h,
                    decoration: BoxDecoration(
                      color: AppColors.textMuted,
                      borderRadius: BorderRadius.circular(2.r),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.w),
              child: Text(
                "Comments",
                style: globalTextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            SizedBox(height: 8.h),
            Divider(color: AppColors.borderSubtle, height: 1),
            SizedBox(height: 8.h),

            // Comments List
            Obx(() {
              return Expanded(
                child: ListView.builder(
                  padding: EdgeInsets.zero,
                  itemCount: newsFeedController.commentsList.length,
                  itemBuilder: (context, index) {
                    return _buildCommentItem(
                      context,
                      newsFeedController.commentsList[index],
                    );
                  },
                ),
              );
            }),

            // Divider above input
            Divider(color: AppColors.borderSubtle, height: 1),

            // Input Field + Send Button
            Padding(
              padding: EdgeInsets.all(16.w),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16.r,
                    backgroundColor: AppColors.backgroundSurface,
                    backgroundImage: NetworkImage(
                      userInfo.userInfo.value?.userProfile?.profileImage ?? "",
                    ),
                  ),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: TextField(
                      controller: newsFeedController.commentTextController,
                      decoration: InputDecoration(
                        hintText: "Drop Comment...",
                        hintStyle: globalTextStyle(
                          fontSize: 14.sp,
                          color: AppColors.textMuted,
                        ),
                        filled: true,
                        fillColor: AppColors.backgroundSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20.r),
                          borderSide: BorderSide(color: AppColors.borderSubtle),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20.r),
                          borderSide: BorderSide(color: AppColors.borderSubtle),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20.r),
                          borderSide: BorderSide(color: AppColors.primaryColor),
                        ),
                      ),
                      style: globalTextStyle(
                        fontSize: 14.sp,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  SizedBox(width: 8.w),
                  Container(
                    decoration: BoxDecoration(
                      gradient: AppColors.gradientPrimary,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      onPressed: () =>
                          newsFeedController.addCommentForPost(postID),
                      icon: FaIcon(
                        FontAwesomeIcons.paperPlane,
                        size: 18.sp,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommentItem(BuildContext context, CommentModel commentModel) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18.r,
            backgroundColor: AppColors.backgroundSurface,
            backgroundImage: NetworkImage(
              commentModel.user?.profileImage ??
                  "https://randomuser.me/api/portraits/men/${30 + DateTime.now().millisecond % 5}.jpg",
            ),
          ),
          SizedBox(width: 12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      commentModel.user?.fullName ?? "no name",
                      style: globalTextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(width: 8.w),
                    Text(
                      newsFeedController.timeAgo(commentModel.createdAt!),
                      style: globalTextStyle(
                        fontSize: 12.sp,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 4.h),
                Text(
                  commentModel.text ?? "",
                  style: globalTextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _isTextTruncated(String text, BuildContext context) {
    final TextPainter textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: globalTextStyle(fontSize: 14.sp),
      ),
      maxLines: 2,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout(
      maxWidth: MediaQuery.of(context).size.width - 100.w,
    ); // approx container width
    return textPainter.didExceedMaxLines;
  }
}
