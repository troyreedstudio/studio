import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/feature/home/controller/home_controller.dart';
import 'package:pineapple/feature/home_bottom_nav/controller/home_nav_controller.dart';
import 'package:pineapple/feature/venue/controller/venue_controller.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';
import 'package:pineapple/feature/venue/widgets/venue_card_widget.dart';

class HomeScreen extends StatelessWidget {
  HomeScreen({super.key});

  final homeController = Get.put(HomeController());
  final venueController = Get.put(VenueController());

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
          // Logo
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/images/app_logo_dark.jpg',
                height: 80,
                fit: BoxFit.contain,
              ),
              SizedBox(height: 2.h),
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
          // Search — scrolls focus to the inline search bar
          _IconButton(
            icon: Icons.search,
            onTap: () {},
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
                homeController.selectedAreaIndex.value == index;
            return GestureDetector(
              onTap: () {
                homeController.selectedAreaIndex.value = index;
                final venueCtrl = Get.find<VenueController>();
                if (index == 0) {
                  // "All Bali" — fetch all venues + all featured
                  venueCtrl.selectedArea.value = '';
                  venueCtrl.selectedCategory.value = '';
                  venueCtrl.fetchVenues();
                  venueCtrl.fetchFeaturedVenues();
                } else {
                  final area = areas[index]['label']!.toUpperCase();
                  venueCtrl.selectedCategory.value = '';
                  venueCtrl.fetchVenuesByArea(area);
                  // Also filter featured/trending to this area
                  venueCtrl.fetchVenues(area: area);
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
          SizedBox(height: 12.h),

          // Category filter pills
          _CategoryFilterPills(),

          SizedBox(height: 14.h),

          // Search bar
          _VenueSearchBar(),

          SizedBox(height: 20.h),

          // This Week — horizontal day browser
          _SectionHeader(
            title: 'This Week',
            subtitle: 'Which night, which venue',
            onSeeAll: () => Get.find<HomeNavController>().changeIndex(1),
          ),
          SizedBox(height: 12.h),
          const _ThisWeekSection(),

          SizedBox(height: 28.h),

          // Popular Venues — from venue API, responds to category filters
          Obx(() {
            final venueCtrl = Get.find<VenueController>();
            final hasFilter = venueCtrl.selectedCategory.value.isNotEmpty;
            final title = hasFilter
                ? venueCtrl.selectedCategory.value.replaceAll('_', ' ')
                : 'Popular Venues';
            return _SectionHeader(
              title: title,
              subtitle: hasFilter ? 'Filtered results' : 'Most popular right now',
              onSeeAll: () {},
            );
          }),
          SizedBox(height: 12.h),
          SizedBox(
            height: 220.h,
            child: Obx(() {
              final venueCtrl = Get.find<VenueController>();
              final venueList = venueCtrl.venues;
              return venueCtrl.isLoading.value
                  ? loading()
                  : venueList.isEmpty
                      ? _EmptySection(message: 'No venues found')
                      : ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: EdgeInsets.symmetric(horizontal: 20.w),
                          itemCount:
                              venueList.length > 8 ? 8 : venueList.length,
                          itemBuilder: (context, index) {
                            return Padding(
                              padding: EdgeInsets.only(right: 14.w),
                              child: VenueCardWidget(venue: venueList[index]),
                            );
                          },
                        );
            }),
          ),

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

// ── Category Filter Pills ────────────────────────────────────────────────────

class _CategoryFilterPills extends StatelessWidget {
  static const List<Map<String, String>> categories = [
    {'label': 'All', 'value': ''},
    {'label': 'Beach Clubs', 'value': 'BEACH_CLUB'},
    {'label': 'Restaurants', 'value': 'RESTAURANT'},
    {'label': 'Nightlife', 'value': 'NIGHTLIFE'},
    {'label': 'Wellness', 'value': 'WELLNESS'},
    {'label': 'Events', 'value': 'EVENTS'},
  ];

  @override
  Widget build(BuildContext context) {
    final venueCtrl = Get.find<VenueController>();

    return SizedBox(
      height: 32.h,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          return Obx(() {
            final isSelected = venueCtrl.selectedCategory.value ==
                (cat['value'] ?? '');
            return GestureDetector(
              onTap: () {
                final value = cat['value'] ?? '';
                venueCtrl.selectedCategory.value = value;
                if (value.isEmpty) {
                  venueCtrl.fetchVenues();
                } else {
                  venueCtrl.fetchVenues(category: value);
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: EdgeInsets.only(right: 8.w),
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 5.h),
                decoration: BoxDecoration(
                  gradient: isSelected ? AppColors.gradientPrimary : null,
                  color: isSelected ? null : Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected
                        ? Colors.transparent
                        : AppColors.borderSubtle,
                    width: 0.5,
                  ),
                ),
                child: Text(
                  cat['label']!,
                  style: TextStyle(
                    fontSize: 11.sp,
                    fontWeight:
                        isSelected ? FontWeight.w600 : FontWeight.w400,
                    color: isSelected
                        ? AppColors.backgroundDark
                        : AppColors.textSecondary,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            );
          });
        },
      ),
    );
  }
}

// ── Venue Search Bar ─────────────────────────────────────────────────────────

class _VenueSearchBar extends StatefulWidget {
  @override
  State<_VenueSearchBar> createState() => _VenueSearchBarState();
}

class _VenueSearchBarState extends State<_VenueSearchBar> {
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final venueCtrl = Get.find<VenueController>();

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w),
      child: Container(
        height: 42.h,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.borderSubtle,
            width: 0.5,
          ),
        ),
        child: TextField(
          controller: _textController,
          focusNode: _focusNode,
          style: GoogleFonts.poppins(
            fontSize: 13.sp,
            color: AppColors.textPrimary,
          ),
          decoration: InputDecoration(
            hintText: 'Search venues, bars, restaurants...',
            hintStyle: GoogleFonts.poppins(
              fontSize: 13.sp,
              color: AppColors.textMuted,
            ),
            prefixIcon: Icon(
              Icons.search,
              size: 18.sp,
              color: AppColors.textMuted,
            ),
            suffixIcon: ValueListenableBuilder<TextEditingValue>(
              valueListenable: _textController,
              builder: (context, value, _) {
                if (value.text.isEmpty) return const SizedBox.shrink();
                return GestureDetector(
                  onTap: () {
                    _textController.clear();
                    _focusNode.unfocus();
                    venueCtrl.fetchVenues();
                  },
                  child: Icon(
                    Icons.close,
                    size: 18.sp,
                    color: AppColors.textMuted,
                  ),
                );
              },
            ),
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(vertical: 10.h),
          ),
          cursorColor: AppColors.gradientMid,
          onChanged: (query) {
            if (query.trim().isEmpty) {
              venueCtrl.fetchVenues();
            } else {
              venueCtrl.searchVenues(query);
            }
          },
        ),
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

// ── This Week Section ────────────────────────────────────────────────────────

class _ThisWeekSection extends StatelessWidget {
  const _ThisWeekSection();

  /// Short day keys matching the controller's weeklySchedule map.
  static const _shortDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  /// Full day labels for display.
  static const _dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  @override
  Widget build(BuildContext context) {
    final venueCtrl = Get.find<VenueController>();

    return SizedBox(
      height: 210.h,
      child: Obx(() {
        if (venueCtrl.isWhatsOnLoading.value && venueCtrl.weeklySchedule.isEmpty) {
          return loading();
        }

        final now = DateTime.now();
        // Build list of 7 days starting from today
        final days = List.generate(7, (i) => now.add(Duration(days: i)));

        return ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: EdgeInsets.symmetric(horizontal: 20.w),
          itemCount: 7,
          itemBuilder: (context, index) {
            final date = days[index];
            final isToday = index == 0;
            // DateTime weekday: 1=Monday .. 7=Sunday
            final shortKey = _shortDays[date.weekday - 1];
            final dayLabel = _dayLabels[date.weekday - 1];
            final dateLabel = DateFormat('d MMM').format(date);

            // Get venues for this day from the schedule
            final dayVenues = venueCtrl.weeklySchedule[shortKey] ?? <VenueModel>[];

            return Padding(
              padding: EdgeInsets.only(right: 12.w),
              child: _DayCard(
                dayLabel: dayLabel,
                dateLabel: dateLabel,
                isToday: isToday,
                venues: dayVenues,
              ),
            );
          },
        );
      }),
    );
  }
}

class _DayCard extends StatelessWidget {
  final String dayLabel;
  final String dateLabel;
  final bool isToday;
  final List<VenueModel> venues;

  const _DayCard({
    required this.dayLabel,
    required this.dateLabel,
    required this.isToday,
    required this.venues,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140.w,
      padding: EdgeInsets.all(14.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isToday ? AppColors.gradientMid : AppColors.borderSubtle,
          width: isToday ? 1.5 : 0.5,
        ),
        boxShadow: isToday
            ? [
                BoxShadow(
                  color: AppColors.gradientMid.withOpacity(0.15),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day label + TODAY badge
          Row(
            children: [
              Text(
                dayLabel,
                style: GoogleFonts.outfit(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w800,
                  fontStyle: FontStyle.italic,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              if (isToday)
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                  decoration: BoxDecoration(
                    gradient: AppColors.brandGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'TODAY',
                    style: GoogleFonts.poppins(
                      fontSize: 8.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.background,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
            ],
          ),
          SizedBox(height: 2.h),
          // Date
          Text(
            dateLabel,
            style: GoogleFonts.poppins(
              fontSize: 11.sp,
              fontWeight: FontWeight.w300,
              color: AppColors.textMuted,
            ),
          ),
          SizedBox(height: 10.h),
          // Venue list
          Expanded(
            child: venues.isEmpty
                ? Text(
                    'No venues',
                    style: GoogleFonts.poppins(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w300,
                      color: AppColors.textMuted,
                      fontStyle: FontStyle.italic,
                    ),
                  )
                : ListView.separated(
                    physics: const NeverScrollableScrollPhysics(),
                    padding: EdgeInsets.zero,
                    itemCount: venues.length > 3 ? 3 : venues.length,
                    separatorBuilder: (_, __) => SizedBox(height: 8.h),
                    itemBuilder: (context, i) {
                      final venue = venues[i];
                      // Check for a special night name from weeklySchedule
                      final specialName = _getSpecialNightName(venue, dayLabel.toLowerCase());
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            venue.name,
                            style: GoogleFonts.poppins(
                              fontSize: 13.sp,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (specialName != null)
                            Text(
                              specialName,
                              style: GoogleFonts.poppins(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.w300,
                                color: AppColors.gradientMid,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            )
                          else
                            Text(
                              'Regular night',
                              style: GoogleFonts.poppins(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.w300,
                                color: AppColors.textMuted,
                              ),
                            ),
                        ],
                      );
                    },
                  ),
          ),
          // "more" indicator
          if (venues.length > 3)
            Padding(
              padding: EdgeInsets.only(top: 4.h),
              child: Text(
                '+${venues.length - 3} more',
                style: GoogleFonts.poppins(
                  fontSize: 10.sp,
                  fontWeight: FontWeight.w400,
                  color: AppColors.gradientMid,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Extract a special night name from the venue's weeklySchedule if available.
  String? _getSpecialNightName(VenueModel venue, String dayKey) {
    if (venue.weeklySchedule == null) return null;
    final dayData = venue.weeklySchedule![dayKey];
    if (dayData is Map<String, dynamic>) {
      final name = dayData['name']?.toString();
      if (name != null && name.isNotEmpty) return name;
    }
    return null;
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
