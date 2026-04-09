import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/image_path.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';
import 'package:pineapple/feature/home/widgets/trending_event_widget.dart';
import 'package:pineapple/feature/home/widgets/popular_club_widget.dart';
import 'package:pineapple/feature/home/widgets/tonight_event_widget.dart';
import 'package:pineapple/feature/home_bottom_nav/controller/home_nav_controller.dart';

class HomeScreen extends StatelessWidget {
  HomeScreen({super.key});

  final homeController = Get.put(HomeController());

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _HomeHeader(),
            SizedBox(height: 8.h),
            _AreaFilterBar(homeController: homeController),
            SizedBox(height: 4.h),
            Expanded(
              child: _DiscoverContent(homeController: homeController),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Header ──────────────────────────────────────────────────────────────────

class _HomeHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 14.h),
      child: Row(
        children: [
          // Logo / wordmark
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              ShaderMask(
                shaderCallback: (bounds) =>
                    AppColors.gradientPrimary.createShader(bounds),
                child: Text(
                  'PINK PINEAPPLE',
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              Row(
                children: [
                  Icon(
                    Icons.location_on,
                    size: 10.sp,
                    color: AppColors.textMuted,
                  ),
                  SizedBox(width: 2.w),
                  Text(
                    'Bali, Indonesia',
                    style: TextStyle(
                      fontSize: 11.sp,
                      color: AppColors.textMuted,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const Spacer(),
          // Search
          _IconButton(
            icon: Icons.search,
            onTap: () => Get.find<HomeNavController>().changeIndex(1),
          ),
          SizedBox(width: 10.w),
          // Notifications
          _IconButton(
            icon: Icons.notifications_outlined,
            onTap: () {},
            hasBadge: true,
          ),
        ],
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool hasBadge;

  const _IconButton({
    required this.icon,
    required this.onTap,
    this.hasBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38.w,
        height: 38.w,
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.borderSubtle,
            width: 0.5,
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 18.sp, color: AppColors.textSecondary),
            if (hasBadge)
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientPrimary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Area Filter Bar ──────────────────────────────────────────────────────────

class _AreaFilterBar extends StatelessWidget {
  final HomeController homeController;

  const _AreaFilterBar({required this.homeController});

  static const List<Map<String, String>> areas = [
    {'label': 'All Bali', 'emoji': '🌴'},
    {'label': 'Canggu', 'emoji': '🏄'},
    {'label': 'Seminyak', 'emoji': '✨'},
    {'label': 'Uluwatu', 'emoji': '🌊'},
    {'label': 'Kuta', 'emoji': '🎉'},
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38.h,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        itemCount: areas.length,
        itemBuilder: (context, index) {
          return Obx(() {
            final isSelected =
                (homeController.selectedAreaIndex?.value ?? 0) == index;
            return GestureDetector(
              onTap: () {
                if (homeController.selectedAreaIndex != null) {
                  homeController.selectedAreaIndex!.value = index;
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: EdgeInsets.only(right: 10.w),
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                decoration: BoxDecoration(
                  gradient: isSelected ? AppColors.gradientPrimary : null,
                  color: isSelected ? null : AppColors.backgroundCard,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? Colors.transparent
                        : AppColors.borderSubtle,
                    width: 0.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      areas[index]['emoji']!,
                      style: TextStyle(fontSize: 12.sp),
                    ),
                    SizedBox(width: 5.w),
                    Text(
                      areas[index]['label']!,
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: isSelected
                            ? FontWeight.w700
                            : FontWeight.w400,
                        color: isSelected
                            ? AppColors.backgroundDark
                            : AppColors.textSecondary,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ),
              ),
            );
          });
        },
      ),
    );
  }
}

// ── Main Content ─────────────────────────────────────────────────────────────

class _DiscoverContent extends StatelessWidget {
  final HomeController homeController;

  const _DiscoverContent({required this.homeController});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 16.h),

          // Featured Tonight — hero carousel
          _SectionHeader(
            title: 'Featured Tonight',
            subtitle: 'Handpicked for tonight',
            onSeeAll: () => Get.find<HomeNavController>().changeIndex(2),
          ),
          SizedBox(height: 12.h),
          SizedBox(
            height: 220.h,
            child: Obx(() {
              final events = homeController.allEventList;
              return homeController.isTrendingLoading.value
                  ? loading()
                  : events.isEmpty
                      ? _EmptySection(message: 'No events tonight')
                      : ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: EdgeInsets.symmetric(horizontal: 20.w),
                          itemCount: events.length,
                          itemBuilder: (context, index) {
                            return TrendingEventWidget(event: events[index]);
                          },
                        );
            }),
          ),

          SizedBox(height: 28.h),

          // Trending Venues
          _SectionHeader(
            title: 'Trending Venues',
            subtitle: 'Most popular right now',
            onSeeAll: () {},
          ),
          SizedBox(height: 12.h),
          SizedBox(
            height: 200.h,
            child: Obx(() {
              final events = homeController.allEventList;
              return homeController.isTrendingLoading.value
                  ? loading()
                  : events.isEmpty
                      ? _EmptySection(message: 'No venues available')
                      : ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: EdgeInsets.symmetric(horizontal: 20.w),
                          itemCount: events.length > 5 ? 5 : events.length,
                          itemBuilder: (context, index) {
                            return PopularClubsWidget(event: events[index]);
                          },
                        );
            }),
          ),

          SizedBox(height: 28.h),

          // Categories
          _SectionHeader(
            title: 'What\'s Your Vibe?',
            subtitle: 'Explore by category',
          ),
          SizedBox(height: 12.h),
          _CategoryGrid(),

          SizedBox(height: 28.h),

          // Tonight's Events — list
          _SectionHeader(
            title: 'Tonight\'s Events',
            subtitle: 'Don\'t miss out',
            onSeeAll: () => Get.find<HomeNavController>().changeIndex(2),
          ),
          SizedBox(height: 12.h),
          Obx(() {
            return homeController.tonightEventList.isEmpty
                ? _EmptySection(message: 'No events scheduled for tonight')
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: EdgeInsets.symmetric(horizontal: 20.w),
                    itemCount: homeController.tonightEventList.length,
                    itemBuilder: (context, index) {
                      return TonightEventWidget(
                        event: homeController.tonightEventList[index],
                      );
                    },
                  );
          }),

          SizedBox(height: 32.h),
        ],
      ),
    );
  }
}

// ── Section Header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final VoidCallback? onSeeAll;

  const _SectionHeader({
    required this.title,
    this.subtitle,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: 0.2,
                  ),
                ),
                if (subtitle != null) ...[
                  SizedBox(height: 2.h),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      fontSize: 12.sp,
                      color: AppColors.textMuted,
                      letterSpacing: 0.1,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (onSeeAll != null)
            GestureDetector(
              onTap: onSeeAll,
              child: Row(
                children: [
                  ShaderMask(
                    shaderCallback: (bounds) =>
                        AppColors.gradientPrimary.createShader(bounds),
                    child: Text(
                      'See all',
                      style: TextStyle(
                        fontSize: 13.sp,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  SizedBox(width: 3.w),
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 10.sp,
                    color: AppColors.accentRoseGold,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ── Category Grid ─────────────────────────────────────────────────────────────

class _CategoryGrid extends StatelessWidget {
  static const List<Map<String, dynamic>> categories = [
    {'label': 'Beach Clubs', 'icon': Icons.beach_access, 'color': 0xFFC4707E},
    {'label': 'Nightclubs', 'icon': Icons.nightlife, 'color': 0xFFBD7FBD},
    {'label': 'Rooftop Bars', 'icon': Icons.roofing, 'color': 0xFF7FA8D4},
    {'label': 'Day Parties', 'icon': Icons.wb_sunny, 'color': 0xFFD4C574},
    {'label': 'Live Music', 'icon': Icons.music_note, 'color': 0xFF7DD4A5},
    {'label': 'Fine Dining', 'icon': Icons.restaurant, 'color': 0xFFD47F7F},
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 90.h,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          final color = Color(cat['color'] as int);
          return GestureDetector(
            onTap: () {},
            child: Container(
              width: 78.w,
              margin: EdgeInsets.only(right: 10.w),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: color.withOpacity(0.25),
                  width: 0.5,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      cat['icon'] as IconData,
                      color: color,
                      size: 20.sp,
                    ),
                  ),
                  SizedBox(height: 6.h),
                  Text(
                    cat['label'] as String,
                    style: TextStyle(
                      fontSize: 10.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────

class _EmptySection extends StatelessWidget {
  final String message;

  const _EmptySection({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(32.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.event_busy_outlined,
              size: 40.sp,
              color: AppColors.textMuted,
            ),
            SizedBox(height: 10.h),
            Text(
              message,
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 13.sp,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

Widget buildProfileAvatar(String? imageUrl, String? name) {
  if (imageUrl != null && imageUrl.isNotEmpty) {
    return CircleAvatar(
      radius: 35,
      backgroundImage: NetworkImage(imageUrl),
      backgroundColor: AppColors.backgroundCard,
      onBackgroundImageError: (_, __) {},
    );
  }

  String initials = 'U';
  if (name != null && name.isNotEmpty) {
    final parts = name.trim().split(' ');
    if (parts.length > 1) {
      initials = '${parts[0][0].toUpperCase()}${parts[1][0].toUpperCase()}';
    } else {
      initials = parts[0][0].toUpperCase();
    }
  }

  return CircleAvatar(
    radius: 35,
    backgroundColor: AppColors.accentRoseGold.withOpacity(0.15),
    child: Text(
      initials,
      style: TextStyle(
        fontSize: 20.sp,
        fontWeight: FontWeight.bold,
        color: AppColors.accentRoseGold,
      ),
    ),
  );
}
