import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/feature/chat_tab/controller/chat_controller.dart';
import 'package:pineapple/feature/chat_tab/model/chat_model.dart';
import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../../core/global_widgets/custom_text.dart';

class MessagesPage extends StatelessWidget {
  const MessagesPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(MessagesController());

    return Scaffold(
      body: Container(
        color: AppColors.backgroundDark,
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(controller, context),
              SizedBox(height: 16.h),
              Expanded(child: _buildMessagesList(controller)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(MessagesController controller, BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(16.w),
      child: Row(
        children: [
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSurface,
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.borderSubtle,
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => Navigator.pop(context),
                borderRadius: BorderRadius.circular(50),
                splashColor: AppColors.primaryColor.withOpacity(0.3),
                highlightColor: AppColors.primaryColor.withOpacity(0.1),
                child: Padding(
                  padding: EdgeInsets.all(12.w),
                  child: Icon(
                    Icons.arrow_back_ios_new_rounded,
                    color: AppColors.primaryColor,
                    size: 20.sp,
                  ),
                ),
              ),
            ),
          ),
          SizedBox(width: 8.w),
          headingText(
            text: 'Messages',
            color: AppColors.textPrimary,
            fontFamily: 'Cormorant Garamond',
          ),
          const Spacer(),
          Obx(() {
            final unreadCount = controller.totalUnreadCount;
            if (unreadCount > 0) {
              return Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                decoration: BoxDecoration(
                  color: AppColors.primaryColor,
                  borderRadius: BorderRadius.circular(12.r),
                ),
                child: smallText(
                  text: unreadCount > 99 ? '99+' : unreadCount.toString(),
                  color: AppColors.backgroundDark,
                  fontWeight: FontWeight.w600,
                ),
              );
            }
            return const SizedBox.shrink();
          }),
        ],
      ),
    );
  }

  Widget _buildMessagesList(MessagesController controller) {
    return Obx(() {
      if (controller.isLoading.value) {
        return Center(
          child: CircularProgressIndicator(color: AppColors.primaryColor),
        );
      }

      final messages = controller.personalMessages;

      if (messages.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.chat_outlined, size: 80.w, color: AppColors.textMuted),
              SizedBox(height: 16.h),
              normalText(text: 'No Messages', color: AppColors.textSecondary),
              SizedBox(height: 8.h),
              smallText(
                text: 'Start a conversation with someone',
                color: AppColors.textMuted,
              ),
            ],
          ),
        );
      }

      return RefreshIndicator(
        color: AppColors.primaryColor,
        backgroundColor: AppColors.backgroundCard,
        onRefresh: () async => controller.refreshData(),
        child: ListView.separated(
          padding: EdgeInsets.symmetric(horizontal: 16.w),
          itemCount: messages.length,
          separatorBuilder: (_, __) => Divider(
            color: AppColors.borderSubtle,
            height: 1,
            thickness: 1,
          ),
          itemBuilder: (context, index) {
            final message = messages[index];
            return _buildMessageItem(message, controller);
          },
        ),
      );
    });
  }

  Widget _buildMessageItem(
    MessageModel message,
    MessagesController controller,
  ) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.borderSubtle, width: 1.w),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => controller.onMessageTap(message),
          onLongPress: () => controller.onMessageLongPress(message),
          borderRadius: BorderRadius.circular(16.r),
          child: Padding(
            padding: EdgeInsets.all(16.w),
            child: Row(
              children: [
                Stack(
                  children: [
                    ResponsiveNetworkImage(
                      imageUrl: message.senderProfileImage,
                      shape: ImageShape.circle,
                      widthPercent: 0.12,
                      heightPercent: 0.06,
                      fit: BoxFit.cover,
                      errorWidget: Container(
                        width: 52.w,
                        height: 52.h,
                        decoration: BoxDecoration(
                          color: AppColors.backgroundSurface,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.person,
                          color: AppColors.textMuted,
                          size: 28.w,
                        ),
                      ),
                    ),
                    if (message.isOnline)
                      Positioned(
                        right: 2.w,
                        bottom: 2.h,
                        child: Container(
                          width: 12.w,
                          height: 12.h,
                          decoration: BoxDecoration(
                            color: AppColors.successColor,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.backgroundCard,
                              width: 2.w,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                SizedBox(width: 12.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Flexible(
                                  child: smallText(
                                    text: message.senderName,
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w600,
                                    maxLines: 1,
                                  ),
                                ),
                                if (message.isVerified == true) ...[
                                  SizedBox(width: 4.w),
                                  Icon(
                                    Icons.verified,
                                    color: AppColors.primaryColor,
                                    size: 14.w,
                                  ),
                                ],
                              ],
                            ),
                          ),
                          smallerText(
                            text: message.formattedTime,
                            color: AppColors.textMuted,
                          ),
                        ],
                      ),
                      SizedBox(height: 4.h),
                      Row(
                        children: [
                          Expanded(
                            child: smallerText(
                              text: message.lastMessage,
                              color: AppColors.textSecondary,
                              maxLines: 1,
                            ),
                          ),
                          if (message.unreadCount > 0)
                            Container(
                              margin: EdgeInsets.only(left: 8.w),
                              padding: EdgeInsets.symmetric(
                                horizontal: 8.w,
                                vertical: 2.h,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primaryColor,
                                borderRadius: BorderRadius.circular(10.r),
                              ),
                              child: smallerText(
                                text: message.unreadCount > 9
                                    ? '9+'
                                    : message.unreadCount.toString(),
                                color: AppColors.backgroundDark,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
