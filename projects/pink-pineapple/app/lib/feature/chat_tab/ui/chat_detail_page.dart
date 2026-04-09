import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

import '../controller/chat_detail_controller.dart';
import '../model/chat_model.dart';
import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/custom_text.dart';
import '../../../core/global_widgets/app_network_image.dart';

class ChatDetailPage extends StatelessWidget {
  const ChatDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    final args = (Get.arguments ?? {}) as Map<String, dynamic>;

    final controller = Get.put(
      ChatDetailController(
        myUserId: args["myUserId"],
        receiverId: args["receiverId"],
        receiverName: args["receiverName"] ?? "Chat",
        receiverImage: args["receiverImage"],
      ),
      tag: args["receiverId"], // per-user controller
    );

    return Scaffold(
      body: Container(
        color: AppColors.backgroundDark,
        child: SafeArea(
          child: Column(
            children: [
              _Header(controller: controller),
              Expanded(child: _Messages(controller: controller)),
              _Composer(controller: controller),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final ChatDetailController controller;
  const _Header({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        border: Border(
          bottom: BorderSide(color: AppColors.borderSubtle, width: 1),
        ),
      ),
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
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: controller.onBack,
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
          SizedBox(width: 12.w),
          controller.receiverImage != null &&
                  controller.receiverImage!.isNotEmpty
              ? ResponsiveNetworkImage(
                  imageUrl: controller.receiverImage!,
                  shape: ImageShape.circle,
                  widthPercent: 0.11,
                  heightPercent: 0.055,
                  fit: BoxFit.cover,
                  errorWidget: Container(
                    width: 44.w,
                    height: 44.h,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSurface,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.borderSubtle,
                        width: 2,
                      ),
                    ),
                    child: Icon(Icons.person, color: AppColors.textMuted, size: 24.w),
                  ),
                )
              : Container(
                  width: 44.w,
                  height: 44.h,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSurface,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.borderSubtle,
                      width: 2,
                    ),
                  ),
                  child: Icon(Icons.person, color: AppColors.textMuted, size: 24.w),
                ),
          SizedBox(width: 12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                normalText(
                  text: controller.receiverName,
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  maxLines: 1,
                ),
                SizedBox(height: 2.h),
                Obx(
                  () => Row(
                    children: [
                      Container(
                        width: 8.w,
                        height: 8.h,
                        decoration: BoxDecoration(
                          color: controller.isReceiverOnline.value
                              ? AppColors.successColor
                              : AppColors.textMuted,
                          shape: BoxShape.circle,
                        ),
                      ),
                      SizedBox(width: 4.w),
                      smallerText(
                        text: controller.isReceiverOnline.value
                            ? "Online"
                            : "Offline",
                        color: AppColors.textMuted,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Messages extends StatelessWidget {
  final ChatDetailController controller;
  const _Messages({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.backgroundDark,
      child: Obx(() {
        if (controller.isLoading.value) {
          return Center(
            child: CircularProgressIndicator(color: AppColors.primaryColor),
          );
        }

        if (controller.messages.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.chat_bubble_outline,
                  size: 80.w,
                  color: AppColors.textMuted,
                ),
                SizedBox(height: 16.h),
                normalText(
                  text: "No messages yet",
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
                SizedBox(height: 8.h),
                smallText(
                  text: "Start the conversation",
                  color: AppColors.textMuted,
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          controller: controller.scrollCtrl,
          padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
          itemCount: controller.messages.length,
          itemBuilder: (_, i) {
            final m = controller.messages[i];
            final me = controller.isMe(m);
            return _Bubble(message: m, isMe: me);
          },
        );
      }),
    );
  }
}

class _Bubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMe;
  const _Bubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final align = isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    final bg = isMe ? AppColors.primaryColor : AppColors.backgroundSurface;
    final fg = isMe ? const Color(0xFF1A1A2E) : AppColors.textPrimary;
    final borderColor = isMe
        ? AppColors.accentDeepRose
        : AppColors.borderSubtle;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
      child: Column(
        crossAxisAlignment: align,
        children: [
          Container(
            constraints: BoxConstraints(maxWidth: 0.75.sw),
            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16.r),
                topRight: Radius.circular(16.r),
                bottomLeft: isMe ? Radius.circular(16.r) : Radius.circular(4.r),
                bottomRight: isMe
                    ? Radius.circular(4.r)
                    : Radius.circular(16.r),
              ),
              border: Border.all(color: borderColor, width: 1.w),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: smallText(text: message.message, color: fg, maxLines: 100),
          ),
          SizedBox(height: 4.h),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 8.w),
            child: smallerText(
              text: _formatTime(message.createdAt),
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }
}

class _Composer extends StatelessWidget {
  final ChatDetailController controller;
  const _Composer({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.all(12.w),
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(24.r),
        border: Border.all(color: AppColors.borderSubtle, width: 1.w),
        boxShadow: [
          BoxShadow(
            blurRadius: 10,
            color: Colors.black.withOpacity(0.2),
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller.inputCtrl,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => controller.send(),
              style: TextStyle(fontSize: 14.sp, color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: "Type a message...",
                hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 14.sp),
                filled: true,
                fillColor: AppColors.backgroundSurface,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 16.w,
                  vertical: 10.h,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16.r),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16.r),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16.r),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          SizedBox(width: 8.w),
          Container(
            decoration: BoxDecoration(
              color: AppColors.primaryColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryColor.withOpacity(0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: controller.send,
                borderRadius: BorderRadius.circular(50),
                splashColor: AppColors.accentChampagne.withOpacity(0.3),
                child: Padding(
                  padding: EdgeInsets.all(10.w),
                  child: Icon(
                    Icons.send_rounded,
                    color: AppColors.backgroundDark,
                    size: 20.sp,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
