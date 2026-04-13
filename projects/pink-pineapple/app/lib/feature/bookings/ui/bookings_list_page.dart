import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
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
