import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/user_info/user_info_controller.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../event_details/UI/event_details_page.dart';
import '../../home/controller/home_controller.dart';
import '../../home/model/event_model.dart';
import '../controller/explore_controller.dart';

class ExploreScreen extends StatelessWidget {
  ExploreScreen({super.key});

  final c = Get.put(ExploreController());
  final homeController = Get.find<HomeController>();

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(12.w, 8.h, 12.w, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(height: 12.h),

              // Header
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 8.w),
                child: Text(
                  'EXPLORE',
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 22.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    letterSpacing: 3,
                  ),
                ),
              ),

              SizedBox(height: 12.h),

              // Search bar
              _SearchBar(controller: c),

              SizedBox(height: 16.h),

              // Results count
              Obx(() {
                if (c.results.isEmpty) return const SizedBox.shrink();
                return Padding(
                  padding: EdgeInsets.only(left: 8.w, bottom: 8.h),
                  child: Text(
                    '${c.results.length} event${c.results.length != 1 ? 's' : ''} found',
                    style: GoogleFonts.poppins(
                      fontSize: 12.sp,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                );
              }),

              // Body
              Expanded(
                child: Obx(() {
                  if (c.isLoading.value && c.results.isEmpty) {
                    return Center(
                      child: CircularProgressIndicator(
                        color: AppColors.accentRoseGold,
                        strokeWidth: 2,
                      ),
                    );
                  }

                  if (c.query.isEmpty && c.results.isEmpty) {
                    return _buildRecentSearches();
                  }

                  if (c.results.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: AppColors.backgroundCard,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.borderSubtle,
                                width: 0.5,
                              ),
                            ),
                            child: Icon(
                              Icons.search_off,
                              size: 40.sp,
                              color: AppColors.textMuted,
                            ),
                          ),
                          SizedBox(height: 20.h),
                          Text(
                            'No events found',
                            style: GoogleFonts.playfairDisplay(
                              color: AppColors.textSecondary,
                              fontSize: 20.sp,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          SizedBox(height: 8.h),
                          Text(
                            'Try a different search term',
                            style: GoogleFonts.poppins(
                              color: AppColors.textMuted,
                              fontSize: 12.sp,
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    color: AppColors.accentRoseGold,
                    backgroundColor: AppColors.backgroundCard,
                    onRefresh: c.refresh,
                    child: ListView.separated(
                      controller: c.scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: EdgeInsets.only(bottom: 16.h),
                      itemCount: c.results.length + 1,
                      separatorBuilder: (_, __) => SizedBox(height: 12.h),
                      itemBuilder: (_, i) {
                        if (i == c.results.length) {
                          if (c.isLoadingMore.value) {
                            return Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.h),
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: AppColors.accentRoseGold,
                                  strokeWidth: 2,
                                ),
                              ),
                            );
                          }
                          if (!c.hasMoreData.value && c.results.length >= c.limit) {
                            return Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.h),
                              child: Center(
                                child: Text(
                                  'No more events',
                                  style: GoogleFonts.poppins(
                                    color: AppColors.textMuted,
                                    fontSize: 12.sp,
                                  ),
                                ),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        }

                        return _EventSearchCard(
                          event: c.results[i],
                          homeController: homeController,
                        );
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

  Widget _buildRecentSearches() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 8.w),
          child: Text(
            'Recent Searches',
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.w600,
              fontSize: 13.sp,
              color: AppColors.textSecondary,
              letterSpacing: 0.3,
            ),
          ),
        ),
        SizedBox(height: 12.h),
        Obx(() {
          final items = c.recent.toList();
          if (items.isEmpty) {
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: 8.w),
              child: Text(
                'Start typing to search events...',
                style: GoogleFonts.poppins(
                  color: AppColors.textMuted,
                  fontSize: 12.sp,
                ),
              ),
            );
          }
          return Wrap(
            spacing: 8.w,
            runSpacing: 8.h,
            children: items.map((q) {
              return ActionChip(
                label: Text(
                  q,
                  style: GoogleFonts.poppins(
                    color: AppColors.textSecondary,
                    fontSize: 12.sp,
                  ),
                ),
                backgroundColor: AppColors.backgroundCard,
                side: BorderSide(color: AppColors.borderSubtle, width: 0.5),
                onPressed: () {
                  c.textController.text = q;
                  c.textController.selection = TextSelection.fromPosition(
                    TextPosition(offset: q.length),
                  );
                  c.submit();
                },
              );
            }).toList(),
          );
        }),
        SizedBox(height: 24.h),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 8.w),
          child: Text(
            'All Events',
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.w600,
              fontSize: 13.sp,
              color: AppColors.textSecondary,
              letterSpacing: 0.3,
            ),
          ),
        ),
        SizedBox(height: 12.h),
        Expanded(
          child: Obx(() {
            if (homeController.allEventList.isEmpty) {
              return Center(
                child: Text(
                  'No events available',
                  style: GoogleFonts.poppins(
                    color: AppColors.textMuted,
                    fontSize: 13.sp,
                  ),
                ),
              );
            }
            return ListView.separated(
              padding: EdgeInsets.only(bottom: 16.h),
              itemCount: homeController.allEventList.length,
              separatorBuilder: (_, __) => SizedBox(height: 12.h),
              itemBuilder: (_, i) => _EventSearchCard(
                event: homeController.allEventList[i],
                homeController: homeController,
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _EventSearchCard extends StatelessWidget {
  const _EventSearchCard({
    Key? key,
    required this.event,
    required this.homeController,
  }) : super(key: key);

  final AllEventModel event;
  final HomeController homeController;

  @override
  Widget build(BuildContext context) {
    final String dateText =
        homeController.formatDate(event.endDate.toString()) ?? 'Date not set';
    final String locationText = event.user?.fullAddress ?? 'Location not available';

    return GestureDetector(
      onTap: () {
        Get.to(() => EventDetailsPage(), arguments: event.id);
      },
      child: Container(
        padding: EdgeInsets.all(12.w),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Event Image
            ClipRRect(
              borderRadius: BorderRadius.circular(12.r),
              child: SizedBox(
                width: 80.w,
                height: 80.w,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ResponsiveNetworkImage(
                      imageUrl: event.eventImages?.first ?? "",
                      fit: BoxFit.cover,
                    ),
                    // Subtle dark overlay
                    Container(
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SizedBox(width: 14.w),

            // Event info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.eventName ?? 'Untitled Event',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),

                  SizedBox(height: 6.h),

                  Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        size: 11.sp,
                        color: AppColors.accentRoseGold,
                      ),
                      SizedBox(width: 4.w),
                      Expanded(
                        child: Text(
                          locationText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 11.sp,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: 4.h),

                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today,
                        size: 11.sp,
                        color: AppColors.textMuted,
                      ),
                      SizedBox(width: 4.w),
                      Expanded(
                        child: Text(
                          dateText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 11.sp,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            SizedBox(width: 8.w),

            // Favorite button
            InkWell(
              onTap: () {
                final eventId = event.id;
                if (eventId != null) {
                  homeController.postFavorite(
                    eventId,
                    Get.find<UserInfoController>()
                        .userInfo
                        .value!
                        .userProfile!
                        .id!,
                  );
                }
              },
              child: Obx(() {
                final updatedEvent = homeController.allEventList
                    .firstWhereOrNull((e) => e.id == event.id);
                final isFav = updatedEvent?.isFavorite ?? false;

                return Container(
                  padding: EdgeInsets.all(8.w),
                  decoration: BoxDecoration(
                    color: isFav
                        ? AppColors.accentRoseGold.withOpacity(0.15)
                        : AppColors.backgroundSurface,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isFav
                          ? AppColors.accentRoseGold.withOpacity(0.4)
                          : AppColors.borderSubtle,
                      width: 0.5,
                    ),
                  ),
                  child: FaIcon(
                    isFav
                        ? FontAwesomeIcons.solidHeart
                        : FontAwesomeIcons.heart,
                    color: isFav
                        ? AppColors.accentRoseGold
                        : AppColors.textMuted,
                    size: 16.sp,
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.controller});

  final ExploreController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 14.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(24.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.search, color: AppColors.textMuted, size: 18.sp),
          SizedBox(width: 8.w),
          Expanded(
            child: TextField(
              controller: controller.textController,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => controller.submit(),
              style: GoogleFonts.poppins(
                color: AppColors.textPrimary,
                fontSize: 14.sp,
              ),
              decoration: InputDecoration(
                hintText: 'Search events, locations...',
                hintStyle: GoogleFonts.poppins(
                  color: AppColors.textMuted,
                  fontSize: 13.sp,
                ),
                border: InputBorder.none,
              ),
            ),
          ),
          Obx(() {
            if (controller.query.isNotEmpty) {
              return IconButton(
                onPressed: controller.clearQuery,
                icon: Icon(Icons.clear, color: AppColors.textMuted, size: 18.sp),
                tooltip: 'Clear',
              );
            }
            return const SizedBox.shrink();
          }),
          IconButton(
            onPressed: () => controller.openFilters(context),
            icon: Icon(Icons.tune, color: AppColors.accentRoseGold, size: 18.sp),
            tooltip: 'Filters',
          ),
        ],
      ),
    );
  }
}
