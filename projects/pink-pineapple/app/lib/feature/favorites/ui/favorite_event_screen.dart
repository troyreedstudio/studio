import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/feature/home/model/event_model.dart';
import 'package:pineapple/feature/home/widgets/tonight_event_widget.dart';

import '../../../core/global_widgets/custom_text.dart';
import '../../home/controller/home_controller.dart';
import '../controller/favorite_event_controller.dart';
import '../widget/fav_event_widget.dart';

class FavoriteEventScreen extends StatelessWidget {
  FavoriteEventScreen({super.key});

  final favoriteEventController = Get.put(FavoriteEventController());

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            // header
            _buildHeader(),
            Expanded(
              child: Obx(() {
                if (favoriteEventController.isLoading.value) {
                  return Center(child: loading());
                }
                if (favoriteEventController.favoriteEventList.isEmpty) {
                  return Center(child: _buildEmptyState());
                }

                return _buildContent();
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
      child: Row(
        spacing: 10.w,
        children: [
          GestureDetector(
            onTap: () {
              Navigator.pop(Get.context!);
            },
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
          normalText(
            text: 'Favorites',
            color: AppColors.textPrimary,

            fontWeight: FontWeight.bold,
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: () async => favoriteEventController.refreshData(),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 10.h),
        child: ListView.builder(
          itemCount: favoriteEventController.favoriteEventList.length,
          itemBuilder: (_, index) {
            return FavoriteEventWidget(
              onTap: () {},
              eventName:
                  favoriteEventController.favoriteEventList[index].eventName,
              eventDate: Get.find<HomeController>().formatDate(
                favoriteEventController.favoriteEventList[index].startDate
                    .toString(),
              ),
              imgUrl: favoriteEventController
                  .favoriteEventList[index]
                  .eventImages!
                  .first,
              color: Colors.red,
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_available_outlined,
            size: 80.w,
            color: AppColors.textSecondary,
          ),
          SizedBox(height: 16.h),
          normalText(text: 'No Favorites', color: AppColors.textSecondary),
          SizedBox(height: 8.h),
          smallText(
            text: 'You have no favorite events yet',
            color: AppColors.textMuted,
          ),
        ],
      ),
    );
  }
}
