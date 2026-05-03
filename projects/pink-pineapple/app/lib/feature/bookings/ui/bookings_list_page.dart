import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/core/services/venue_rating_service.dart';
import 'package:pineapple/core/services/venue_vibe_service.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../home_bottom_nav/controller/home_nav_controller.dart';
import '../controller/bookings_controller.dart';
import '../model/bookings_model.dart';

class BookingsListPage extends StatelessWidget {
  const BookingsListPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(BookingsListController());

    return BackgroundScreen(
      child: SafeArea(
        child: Obx(() {
          if (controller.isLoading.value) {
            return Column(
              children: [
                _buildHeader(),
                SizedBox(height: 24.h),
                Expanded(child: Center(child: loading())),
              ],
            );
          }

          final allBookings = <BookingsListModel>[
            ...controller.acceptedBookingList,
            ...controller.pendingBookingList,
          ];

          if (allBookings.isEmpty) {
            return Column(
              children: [
                _buildHeader(),
                const Expanded(child: _EmptyState()),
              ],
            );
          }

          return Column(
            children: [
              _buildHeader(),
              Expanded(
                child: RefreshIndicator(
                  color: AppColors.gradientMid,
                  backgroundColor: AppColors.surface,
                  onRefresh: () async => controller.refreshData(),
                  child: _ItineraryList(bookings: allBookings),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 0),
      child: Column(
        children: [
          Text(
            'MY BOOKINGS',
            style: GoogleFonts.outfit(
              fontSize: 20.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
              letterSpacing: 3,
            ),
          ),
          SizedBox(height: 4.h),
          Text(
            'Your Bali itinerary',
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              fontWeight: FontWeight.w400,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Itinerary list — groups bookings by date, shows timeline
// ---------------------------------------------------------------------------

class _ItineraryList extends StatefulWidget {
  final List<BookingsListModel> bookings;
  const _ItineraryList({required this.bookings});

  @override
  State<_ItineraryList> createState() => _ItineraryListState();
}

class _ItineraryListState extends State<_ItineraryList> {
  bool _pastExpanded = false;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    // Split bookings into upcoming (today+future) and past
    final upcoming = <BookingsListModel>[];
    final past = <BookingsListModel>[];

    for (final b in widget.bookings) {
      final date = _bookingDate(b);
      if (date != null && date.isBefore(today)) {
        // Only include past bookings from last 30 days
        if (today.difference(date).inDays <= 30) {
          past.add(b);
        }
      } else {
        upcoming.add(b);
      }
    }

    // Group upcoming by date
    final upcomingByDate = <DateTime, List<BookingsListModel>>{};
    for (final b in upcoming) {
      final date = _bookingDate(b) ?? today;
      final key = DateTime(date.year, date.month, date.day);
      upcomingByDate.putIfAbsent(key, () => []).add(b);
    }

    // Sort each day's bookings by time
    for (final list in upcomingByDate.values) {
      list.sort((a, b) {
        final da = a.event?.startDate ?? a.createdAt ?? DateTime(2099);
        final db = b.event?.startDate ?? b.createdAt ?? DateTime(2099);
        return da.compareTo(db);
      });
    }

    // Build the 7-day window (today + next 6 days)
    final dayKeys = List.generate(7, (i) => today.add(Duration(days: i)));

    // Tonight booking (today, accepted or pending)
    final tonightBookings = upcomingByDate[today] ?? [];

    // Group past by date descending
    final pastByDate = <DateTime, List<BookingsListModel>>{};
    for (final b in past) {
      final date = _bookingDate(b) ?? today;
      final key = DateTime(date.year, date.month, date.day);
      pastByDate.putIfAbsent(key, () => []).add(b);
    }
    final pastDates = pastByDate.keys.toList()
      ..sort((a, b) => b.compareTo(a));

    return ListView(
      padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 32.h),
      children: [
        // Share-the-vibe — venues user is at right now (or just left)
        const _TonightVibeSection(),

        // Things to rate — venues from past bookings that user hasn't rated
        const _ThingsToRateSection(),

        // Tonight highlight
        if (tonightBookings.isNotEmpty) ...[
          _TonightHighlight(bookings: tonightBookings),
          SizedBox(height: 24.h),
        ],

        // Upcoming 7-day window
        for (final day in dayKeys) ...[
          _DateHeader(date: day, today: today),
          SizedBox(height: 8.h),
          if (upcomingByDate.containsKey(day)) ...[
            for (final b in upcomingByDate[day]!)
              Padding(
                padding: EdgeInsets.only(bottom: 12.h),
                child: _BookingCard(booking: b),
              ),
          ] else ...[
            _EmptyDayPrompt(),
            SizedBox(height: 4.h),
          ],
          SizedBox(height: 16.h),
        ],

        // Past section
        if (pastDates.isNotEmpty) ...[
          SizedBox(height: 8.h),
          _PastSectionHeader(
            expanded: _pastExpanded,
            count: past.length,
            onTap: () => setState(() => _pastExpanded = !_pastExpanded),
          ),
          if (_pastExpanded) ...[
            SizedBox(height: 12.h),
            for (final day in pastDates) ...[
              _DateHeader(date: day, today: today, isPast: true),
              SizedBox(height: 8.h),
              for (final b in pastByDate[day]!)
                Padding(
                  padding: EdgeInsets.only(bottom: 12.h),
                  child: Opacity(
                    opacity: 0.6,
                    child: _BookingCard(booking: b, showRatePrompt: true),
                  ),
                ),
              SizedBox(height: 12.h),
            ],
          ],
        ],
      ],
    );
  }

  DateTime? _bookingDate(BookingsListModel b) {
    return b.event?.startDate ?? b.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Tonight highlight card
// ---------------------------------------------------------------------------

class _TonightHighlight extends StatelessWidget {
  final List<BookingsListModel> bookings;
  const _TonightHighlight({required this.bookings});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(
          color: AppColors.gradientMid,
          width: 1.5,
        ),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.gradientStart.withValues(alpha: 0.15),
            AppColors.surface,
          ],
        ),
      ),
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // TONIGHT label
          ShaderMask(
            shaderCallback: (bounds) =>
                AppColors.brandGradient.createShader(bounds),
            child: Text(
              'TONIGHT',
              style: GoogleFonts.outfit(
                fontSize: 12.sp,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
                color: Colors.white,
                letterSpacing: 3,
              ),
            ),
          ),
          SizedBox(height: 12.h),
          for (int i = 0; i < bookings.length; i++) ...[
            if (i > 0) ...[
              Divider(color: AppColors.borderSubtle, height: 20.h),
            ],
            _TonightBookingRow(booking: bookings[i]),
          ],
        ],
      ),
    );
  }
}

class _TonightBookingRow extends StatelessWidget {
  final BookingsListModel booking;
  const _TonightBookingRow({required this.booking});

  @override
  Widget build(BuildContext context) {
    final time = _formatTime(booking.event?.startDate);
    final venueName = booking.event?.eventName ?? 'Venue';
    final bookingType = _bookingTypeLabel(booking);

    return Row(
      children: [
        // Time
        SizedBox(
          width: 52.w,
          child: Text(
            time,
            style: GoogleFonts.poppins(
              fontSize: 16.sp,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        SizedBox(width: 12.w),
        // Venue info
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                venueName,
                style: GoogleFonts.outfit(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.w800,
                  fontStyle: FontStyle.italic,
                  color: AppColors.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              SizedBox(height: 2.h),
              Text(
                _guestLabel(booking),
                style: GoogleFonts.poppins(
                  fontSize: 11.sp,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        SizedBox(width: 8.w),
        // Booking type pill
        _BookingTypePill(label: bookingType),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Date header
// ---------------------------------------------------------------------------

class _DateHeader extends StatelessWidget {
  final DateTime date;
  final DateTime today;
  final bool isPast;

  const _DateHeader({
    required this.date,
    required this.today,
    this.isPast = false,
  });

  @override
  Widget build(BuildContext context) {
    final tomorrow = today.add(const Duration(days: 1));
    final isToday = date == today;
    final isTomorrow = date == tomorrow;

    String label;
    if (isToday) {
      label = 'Today, ${DateFormat('EEE d MMM').format(date)}';
    } else if (isTomorrow) {
      label = 'Tomorrow, ${DateFormat('EEE d MMM').format(date)}';
    } else {
      label = DateFormat('EEE d MMM').format(date);
    }

    final bool hasSpecialLabel = isToday || isTomorrow;

    return Row(
      children: [
        if (hasSpecialLabel && !isPast)
          ShaderMask(
            shaderCallback: (bounds) =>
                AppColors.brandGradient.createShader(bounds),
            child: Text(
              isToday ? 'Today' : 'Tomorrow',
              style: GoogleFonts.poppins(
                fontSize: 13.sp,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        if (hasSpecialLabel && !isPast) ...[
          Text(
            ', ${DateFormat('EEE d MMM').format(date)}',
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              fontWeight: FontWeight.w500,
              color: isPast ? AppColors.textMuted : AppColors.textSecondary,
            ),
          ),
        ] else ...[
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              fontWeight: FontWeight.w500,
              color: isPast ? AppColors.textMuted : AppColors.textSecondary,
            ),
          ),
        ],
        SizedBox(width: 12.w),
        Expanded(
          child: Container(
            height: 0.5,
            color: AppColors.borderSubtle,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Booking card — timeline row
// ---------------------------------------------------------------------------

class _BookingCard extends StatelessWidget {
  final BookingsListModel booking;
  final bool showRatePrompt;

  const _BookingCard({
    required this.booking,
    this.showRatePrompt = false,
  });

  @override
  Widget build(BuildContext context) {
    final time = _formatTime(booking.event?.startDate);
    final venueName = booking.event?.eventName ?? 'Venue';
    final bookingType = _bookingTypeLabel(booking);
    final isAccepted =
        booking.status?.toUpperCase() == 'ACCEPTED' ||
        booking.status?.toUpperCase() == 'CONFIRMED';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16.r),
        border: Border(
          left: BorderSide(
            color: isAccepted
                ? AppColors.gradientMid
                : Colors.transparent,
            width: 3,
          ),
        ),
      ),
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 14.h),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Time column
              SizedBox(
                width: 48.w,
                child: Text(
                  time,
                  style: GoogleFonts.poppins(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              SizedBox(width: 10.w),

              // Venue info column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Venue name + status dot
                    Row(
                      children: [
                        _StatusDot(status: booking.status),
                        SizedBox(width: 6.w),
                        Expanded(
                          child: Text(
                            venueName,
                            style: GoogleFonts.outfit(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w800,
                              fontStyle: FontStyle.italic,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 3.h),
                    // Area + guest info
                    Text(
                      _guestLabel(booking),
                      style: GoogleFonts.poppins(
                        fontSize: 11.sp,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),

              SizedBox(width: 8.w),
              // Booking type pill
              _BookingTypePill(label: bookingType),
            ],
          ),
          if (showRatePrompt) ...[
            SizedBox(height: 10.h),
            Divider(color: AppColors.borderSubtle, height: 1),
            SizedBox(height: 10.h),
            Align(
              alignment: Alignment.centerLeft,
              child: ShaderMask(
                shaderCallback: (bounds) =>
                    AppColors.brandGradient.createShader(bounds),
                child: Text(
                  'Rate your experience \u2192',
                  style: GoogleFonts.poppins(
                    fontSize: 12.sp,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

class _StatusDot extends StatelessWidget {
  final String? status;
  const _StatusDot({this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
      case 'CONFIRMED':
        color = AppColors.successColor;
        break;
      case 'PENDING':
        color = AppColors.warningColor;
        break;
      case 'REJECTED':
      case 'CANCELLED':
        color = AppColors.errorColor;
        break;
      default:
        color = AppColors.textMuted;
    }

    return Container(
      width: 8.w,
      height: 8.w,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Booking type pill
// ---------------------------------------------------------------------------

class _BookingTypePill extends StatelessWidget {
  final String label;
  const _BookingTypePill({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
      decoration: BoxDecoration(
        color: AppColors.gradientStart.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20.r),
        border: Border.all(
          color: AppColors.gradientStart.withValues(alpha: 0.3),
          width: 0.5,
        ),
      ),
      child: Text(
        label,
        style: GoogleFonts.poppins(
          fontSize: 10.sp,
          fontWeight: FontWeight.w600,
          color: AppColors.gradientMid,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty day prompt — "Nothing planned"
// ---------------------------------------------------------------------------

class _EmptyDayPrompt extends StatelessWidget {
  const _EmptyDayPrompt();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Navigate to Discover tab (index 0)
        final navController = Get.find<HomeNavController>();
        navController.changeIndex(0);
      },
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 8.h),
        child: Row(
          children: [
            SizedBox(width: 4.w),
            Text(
              'Nothing planned yet',
              style: GoogleFonts.poppins(
                fontSize: 12.sp,
                color: AppColors.textMuted,
              ),
            ),
            SizedBox(width: 8.w),
            ShaderMask(
              shaderCallback: (bounds) =>
                  AppColors.brandGradient.createShader(bounds),
              child: Text(
                'Browse venues \u2192',
                style: GoogleFonts.poppins(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Past section header
// ---------------------------------------------------------------------------

class _PastSectionHeader extends StatelessWidget {
  final bool expanded;
  final int count;
  final VoidCallback onTap;

  const _PastSectionHeader({
    required this.expanded,
    required this.count,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Text(
            'Past bookings ($count)',
            style: GoogleFonts.poppins(
              fontSize: 13.sp,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
            ),
          ),
          SizedBox(width: 8.w),
          Expanded(
            child: Container(height: 0.5, color: AppColors.borderSubtle),
          ),
          SizedBox(width: 8.w),
          Icon(
            expanded
                ? Icons.keyboard_arrow_up_rounded
                : Icons.keyboard_arrow_down_rounded,
            size: 20.sp,
            color: AppColors.textMuted,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Full empty state — no bookings at all
// ---------------------------------------------------------------------------

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 40.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: Icon(
                Icons.calendar_today_outlined,
                size: 40.sp,
                color: AppColors.textMuted,
              ),
            ),
            SizedBox(height: 24.h),
            Text(
              'No bookings yet',
              style: GoogleFonts.outfit(
                fontSize: 22.sp,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
                color: AppColors.textSecondary,
              ),
            ),
            SizedBox(height: 8.h),
            Text(
              'Start exploring Bali\'s best venues',
              style: GoogleFonts.poppins(
                fontSize: 13.sp,
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 28.h),
            GestureDetector(
              onTap: () {
                final navController = Get.find<HomeNavController>();
                navController.changeIndex(0);
              },
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 32.w, vertical: 14.h),
                decoration: BoxDecoration(
                  gradient: AppColors.brandGradient,
                  borderRadius: BorderRadius.circular(28.r),
                ),
                child: Text(
                  'Discover Venues',
                  style: GoogleFonts.poppins(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.background,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Things to rate — fetched from /venues/ratable
// ---------------------------------------------------------------------------

class _RatableItem {
  final String venueId;
  final String venueSlug;
  final String venueName;
  final String venueArea;
  final String heroImage;
  final DateTime? visitedAt;

  _RatableItem({
    required this.venueId,
    required this.venueSlug,
    required this.venueName,
    required this.venueArea,
    required this.heroImage,
    this.visitedAt,
  });

  factory _RatableItem.fromJson(Map<String, dynamic> j) {
    final event = j['event'] as Map<String, dynamic>?;
    final venue = event?['venue'] as Map<String, dynamic>?;
    return _RatableItem(
      venueId: venue?['id']?.toString() ?? '',
      venueSlug: venue?['slug']?.toString() ?? '',
      venueName: venue?['name']?.toString() ?? 'Venue',
      venueArea: venue?['area']?.toString() ?? '',
      heroImage: venue?['heroImage']?.toString() ?? '',
      visitedAt: event?['endDate'] != null
          ? DateTime.tryParse(event!['endDate'].toString())
          : null,
    );
  }
}

class _ThingsToRateSection extends StatefulWidget {
  const _ThingsToRateSection();

  @override
  State<_ThingsToRateSection> createState() => _ThingsToRateSectionState();
}

class _ThingsToRateSectionState extends State<_ThingsToRateSection> {
  final _items = <_RatableItem>[].obs;
  final _isLoading = true.obs;
  final _net = NetworkConfigV1();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final response = await _net.ApiRequestHandler(
        RequestMethod.GET,
        Urls.ratableBookings,
        '{}',
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        final data = response['data'] as List? ?? [];
        // Dedup by venueId — multiple past bookings at same unrated venue should
        // only prompt once until rated.
        final seen = <String>{};
        final items = <_RatableItem>[];
        for (final j in data) {
          final item = _RatableItem.fromJson(j as Map<String, dynamic>);
          if (item.venueId.isEmpty || seen.contains(item.venueId)) continue;
          seen.add(item.venueId);
          items.add(item);
        }
        _items.assignAll(items);
      }
    } catch (_) {
      // Silent — section just doesn't render.
    } finally {
      _isLoading.value = false;
    }
  }

  void _removeAfterRating(String venueId) {
    _items.removeWhere((i) => i.venueId == venueId);
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (_isLoading.value || _items.isEmpty) {
        return const SizedBox.shrink();
      }
      return Padding(
        padding: EdgeInsets.only(bottom: 24.h),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'RATE WHERE YOU WENT',
              style: GoogleFonts.poppins(
                fontSize: 11.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
                letterSpacing: 2,
              ),
            ),
            SizedBox(height: 4.h),
            Text(
              'Help fellow Bali locals find the good stuff',
              style: GoogleFonts.poppins(
                fontSize: 12.sp,
                color: AppColors.textSecondary,
              ),
            ),
            SizedBox(height: 12.h),
            for (final item in _items)
              Padding(
                padding: EdgeInsets.only(bottom: 8.h),
                child: _RatableVenueCard(
                  item: item,
                  onRated: () => _removeAfterRating(item.venueId),
                ),
              ),
          ],
        ),
      );
    });
  }
}

class _RatableVenueCard extends StatefulWidget {
  final _RatableItem item;
  final VoidCallback onRated;

  const _RatableVenueCard({required this.item, required this.onRated});

  @override
  State<_RatableVenueCard> createState() => _RatableVenueCardState();
}

class _RatableVenueCardState extends State<_RatableVenueCard> {
  int _hoverScore = 0;
  bool _submitting = false;

  Future<void> _submit(int score) async {
    if (_submitting) return;
    setState(() => _submitting = true);
    final ratingService = Get.put(VenueRatingService(), permanent: true);
    await ratingService.rateVenue(
      widget.item.venueSlug,
      score.toDouble(),
      venueId: widget.item.venueId,
    );
    Get.snackbar(
      'Thanks!',
      'You rated ${widget.item.venueName} $score star${score > 1 ? 's' : ''}',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: AppColors.surface,
      colorText: AppColors.textPrimary,
      duration: const Duration(seconds: 2),
    );
    widget.onRated();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      padding: EdgeInsets.all(14.w),
      child: Row(
        children: [
          // Pineapple accent icon
          Container(
            width: 42.w,
            height: 42.w,
            decoration: BoxDecoration(
              color: AppColors.accentRoseGold.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            padding: EdgeInsets.all(8.w),
            child: Image.asset(
              'assets/images/pinaple.png',
              color: AppColors.accentRoseGold,
            ),
          ),
          SizedBox(width: 12.w),
          // Venue info + stars
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.item.venueName,
                  style: GoogleFonts.outfit(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w800,
                    fontStyle: FontStyle.italic,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4.h),
                Row(
                  children: List.generate(5, (i) {
                    final starValue = i + 1;
                    final isFilled = starValue <= _hoverScore;
                    return GestureDetector(
                      onTapDown: (_) => setState(() => _hoverScore = starValue),
                      onTap: () => _submit(starValue),
                      child: Padding(
                        padding: EdgeInsets.only(right: 8.w),
                        child: Image.asset(
                          'assets/images/pinaple.png',
                          width: 28.sp,
                          height: 28.sp,
                          color: isFilled
                              ? const Color(0xFFE8A0B0)
                              : const Color(0xFFE8A0B0).withValues(alpha: 0.25),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tonight vibe — fetched from /venues/tonight-vibe
// ---------------------------------------------------------------------------

class _TonightVibeSection extends StatefulWidget {
  const _TonightVibeSection();

  @override
  State<_TonightVibeSection> createState() => _TonightVibeSectionState();
}

class _TonightVibeSectionState extends State<_TonightVibeSection> {
  final _items = <_RatableItem>[].obs;
  final _isLoading = true.obs;
  final _net = NetworkConfigV1();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final response = await _net.ApiRequestHandler(
        RequestMethod.GET,
        Urls.tonightVibeBookings,
        '{}',
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        final data = response['data'] as List? ?? [];
        final seen = <String>{};
        final items = <_RatableItem>[];
        for (final j in data) {
          final item = _RatableItem.fromJson(j as Map<String, dynamic>);
          if (item.venueId.isEmpty || seen.contains(item.venueId)) continue;
          seen.add(item.venueId);
          items.add(item);
        }
        _items.assignAll(items);
      }
    } catch (_) {
      // Silent — section just doesn't render.
    } finally {
      _isLoading.value = false;
    }
  }

  void _removeAfterSubmit(String venueId) {
    _items.removeWhere((i) => i.venueId == venueId);
  }

  Future<void> _openVibeModal(_RatableItem item) async {
    final crowd = 2.obs;
    final music = 2.obs;
    final energy = 2.obs;

    await Get.bottomSheet(
      Container(
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
        ),
        padding: EdgeInsets.fromLTRB(24.w, 16.h, 24.w, 24.h),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: EdgeInsets.only(bottom: 16.h),
                  decoration: BoxDecoration(
                    color: AppColors.textMuted,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                'How\'s the vibe at ${item.venueName}?',
                style: GoogleFonts.outfit(
                  fontSize: 20.sp,
                  fontWeight: FontWeight.w800,
                  fontStyle: FontStyle.italic,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(height: 4.h),
              Text(
                'Help fellow Pink Pineapple users decide where to go',
                style: GoogleFonts.poppins(
                  fontSize: 12.sp,
                  color: AppColors.textSecondary,
                ),
              ),
              SizedBox(height: 24.h),
              _VibeSlider(
                label: 'Crowd',
                value: crowd,
                levels: VenueVibeService.crowdLevels,
              ),
              SizedBox(height: 16.h),
              _VibeSlider(
                label: 'Music',
                value: music,
                levels: VenueVibeService.musicLevels,
              ),
              SizedBox(height: 16.h),
              _VibeSlider(
                label: 'Energy',
                value: energy,
                levels: VenueVibeService.energyLevels,
              ),
              SizedBox(height: 24.h),
              GestureDetector(
                onTap: () async {
                  final svc = Get.put(VenueVibeService(), permanent: true);
                  await svc.submitVibe(
                    item.venueSlug,
                    crowd: crowd.value,
                    music: music.value,
                    energy: energy.value,
                    venueId: item.venueId,
                  );
                  Get.back();
                  Get.snackbar(
                    'Vibe shared!',
                    'Thanks — others will see this for the next 4 hours',
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: AppColors.surface,
                    colorText: AppColors.textPrimary,
                    duration: const Duration(seconds: 2),
                  );
                  _removeAfterSubmit(item.venueId);
                },
                child: Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(vertical: 14.h),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF8B4060), Color(0xFFC4707E), Color(0xFFE8A0B0)],
                    ),
                    borderRadius: BorderRadius.circular(14.r),
                  ),
                  child: Center(
                    child: Text(
                      'SHARE THE VIBE',
                      style: GoogleFonts.outfit(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w800,
                        fontStyle: FontStyle.italic,
                        color: Colors.white,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (_isLoading.value || _items.isEmpty) {
        return const SizedBox.shrink();
      }
      return Padding(
        padding: EdgeInsets.only(bottom: 24.h),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SHARE THE VIBE',
              style: GoogleFonts.poppins(
                fontSize: 11.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
                letterSpacing: 2,
              ),
            ),
            SizedBox(height: 4.h),
            Text(
              'You\'re here — what\'s it really like?',
              style: GoogleFonts.poppins(
                fontSize: 12.sp,
                color: AppColors.textSecondary,
              ),
            ),
            SizedBox(height: 12.h),
            for (final item in _items)
              Padding(
                padding: EdgeInsets.only(bottom: 8.h),
                child: GestureDetector(
                  onTap: () => _openVibeModal(item),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14.r),
                      border: Border.all(
                        color: const Color(0xFFE8A0B0).withValues(alpha: 0.5),
                        width: 1.0,
                      ),
                    ),
                    padding: EdgeInsets.all(14.w),
                    child: Row(
                      children: [
                        Text('🔥', style: TextStyle(fontSize: 22.sp)),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.venueName,
                                style: GoogleFonts.outfit(
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.w800,
                                  fontStyle: FontStyle.italic,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              SizedBox(height: 2.h),
                              Text(
                                'Tap to share the vibe',
                                style: GoogleFonts.poppins(
                                  fontSize: 11.sp,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right, color: const Color(0xFFE8A0B0), size: 22.sp),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    });
  }
}

class _VibeSlider extends StatelessWidget {
  final String label;
  final RxInt value;
  final List<String> levels;

  const _VibeSlider({
    required this.label,
    required this.value,
    required this.levels,
  });

  @override
  Widget build(BuildContext context) {
    return Obx(() => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 12.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
                letterSpacing: 1.5,
              ),
            ),
            Text(
              levels[value.value],
              style: GoogleFonts.poppins(
                fontSize: 13.sp,
                fontWeight: FontWeight.w600,
                color: const Color(0xFFE8A0B0),
              ),
            ),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: const Color(0xFFE8A0B0),
            inactiveTrackColor: AppColors.borderSubtle,
            thumbColor: const Color(0xFFE8A0B0),
            overlayColor: const Color(0xFFE8A0B0).withValues(alpha: 0.2),
            trackHeight: 4,
          ),
          child: Slider(
            value: value.value.toDouble(),
            min: 0,
            max: 4,
            divisions: 4,
            onChanged: (v) => value.value = v.round(),
          ),
        ),
      ],
    ));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

String _formatTime(DateTime? dt) {
  if (dt == null) return '--:--';
  return DateFormat('HH:mm').format(dt);
}

String _bookingTypeLabel(BookingsListModel booking) {
  final type = booking.bookingType?.toUpperCase();
  final guest = booking.guest ?? 1;

  if (type == 'TABLE') {
    if (guest > 1) return 'Table for $guest';
    return 'Table';
  } else if (type == 'TICKET') {
    if (guest > 1) return '$guest Tickets';
    return 'Ticket';
  }
  return booking.bookingType ?? 'Booking';
}

String _guestLabel(BookingsListModel booking) {
  final type = booking.bookingType?.toUpperCase();
  final guest = booking.guest ?? 1;
  final tableName = booking.table?.tableName;

  final parts = <String>[];

  if (type == 'TABLE' && tableName != null) {
    parts.add(tableName);
  }

  if (guest > 1) {
    parts.add('$guest guests');
  }

  return parts.isEmpty ? (type ?? 'Booking') : parts.join(' \u00B7 ');
}
