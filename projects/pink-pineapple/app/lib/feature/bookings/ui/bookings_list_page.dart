import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/app_network_image.dart';
import '../../home/controller/home_controller.dart';
import '../controller/bookings_controller.dart';
import '../model/bookings_model.dart';

class BookingsListPage extends StatelessWidget {
  const BookingsListPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(BookingsListController());

    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            SizedBox(height: 8.h),
            _buildTabBar(controller),
            Expanded(child: _buildTabBarView(controller)),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 4.h),
      child: Row(
        children: [
          const Spacer(),
          Text(
            'MY BOOKINGS',
            style: GoogleFonts.playfairDisplay(
              fontSize: 20.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
              letterSpacing: 3,
            ),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildTabBar(BookingsListController controller) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w),
      height: 44.h,
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(22.r),
        border: Border.all(color: AppColors.borderSubtle, width: 0.5),
      ),
      child: Obx(
        () => TabBar(
          controller: controller.tabController,
          indicator: BoxDecoration(
            gradient: AppColors.gradientPrimary,
            borderRadius: BorderRadius.circular(22.r),
          ),
          indicatorSize: TabBarIndicatorSize.tab,
          indicatorPadding: EdgeInsets.all(3.w),
          labelColor: AppColors.backgroundDark,
          unselectedLabelColor: AppColors.textMuted,
          dividerColor: Colors.transparent,
          labelStyle: GoogleFonts.poppins(
            fontSize: 12.sp,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: GoogleFonts.poppins(
            fontSize: 12.sp,
            fontWeight: FontWeight.w400,
          ),
          tabs: [
            Tab(text: 'Pending (${controller.pendingBookingList.length})'),
            Tab(text: 'Accepted (${controller.acceptedBookingList.length})'),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBarView(BookingsListController controller) {
    return TabBarView(
      controller: controller.tabController,
      children: [
        _buildBookingsList(controller, isPending: true),
        _buildBookingsList(controller, isPending: false),
      ],
    );
  }

  Widget _buildBookingsList(
    BookingsListController controller, {
    required bool isPending,
  }) {
    return Obx(() {
      if (controller.isLoading.value) {
        return Center(child: loading());
      }

      final bookings = isPending
          ? controller.pendingBookingList
          : controller.acceptedBookingList;

      if (bookings.isEmpty) {
        return _buildEmptyState(isPending);
      }

      return RefreshIndicator(
        color: AppColors.accentRoseGold,
        backgroundColor: AppColors.backgroundCard,
        onRefresh: () async => controller.refreshData(),
        child: ListView.builder(
          reverse: true,
          padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 16.h),
          itemCount: bookings.length,
          itemBuilder: (context, index) {
            final booking = bookings[index];
            return _buildBookingCard(booking, controller);
          },
        ),
      );
    });
  }

  Widget _buildBookingCard(
    BookingsListModel booking,
    BookingsListController controller,
  ) {
    final homeController = Get.find<HomeController>();
    final isTable = booking.bookingType?.toUpperCase() == 'TABLE';
    final imageUrl = isTable
        ? (booking.table?.tableImages?.isNotEmpty == true
              ? booking.table!.tableImages!.first
              : '')
        : '';

    return GestureDetector(
      onTap: () {
        controller.logger.d('Booking tapped: ${booking.id}');
      },
      child: Container(
        margin: EdgeInsets.only(bottom: 16.h),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image and Status Badge
            Stack(
              children: [
                if (imageUrl.isNotEmpty)
                  SizedBox(
                    width: double.infinity,
                    height: 120.h,
                    child: ClipRRect(
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(16.r),
                        topRight: Radius.circular(16.r),
                      ),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          ResponsiveNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.cover,
                            borderRadius: 0,
                          ),
                          // Dark overlay
                          Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [Colors.transparent, Color(0x99000000)],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Container(
                    height: 120.h,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSurface,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(16.r),
                        topRight: Radius.circular(16.r),
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        isTable ? Icons.table_bar : Icons.confirmation_number,
                        size: 48.sp,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),

                // Status Badge
                Positioned(
                  top: 10.h,
                  right: 10.w,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                    decoration: BoxDecoration(
                      color: _getStatusColor(booking.status).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20.r),
                      border: Border.all(
                        color: _getStatusColor(booking.status).withOpacity(0.3),
                        width: 0.5,
                      ),
                    ),
                    child: Text(
                      booking.status ?? 'UNKNOWN',
                      style: GoogleFonts.poppins(
                        fontSize: 10.sp,
                        color: _getStatusColor(booking.status),
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),

                // Booking Type Badge
                Positioned(
                  top: 10.h,
                  left: 10.w,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundDark.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(20.r),
                      border: Border.all(color: AppColors.borderSubtle, width: 0.5),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isTable ? Icons.table_bar : Icons.confirmation_number,
                          color: AppColors.accentRoseGold,
                          size: 12.sp,
                        ),
                        SizedBox(width: 4.w),
                        Text(
                          booking.bookingType ?? 'N/A',
                          style: GoogleFonts.poppins(
                            fontSize: 10.sp,
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Booking Details
            Padding(
              padding: EdgeInsets.all(16.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    booking.event?.eventName ?? 'Event Name',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 10.h),

                  // Table Name
                  if (isTable && booking.table?.tableName != null)
                    _infoRow(
                      icon: Icons.table_restaurant,
                      text: booking.table!.tableName!,
                      color: AppColors.accentRoseGold,
                    ),

                  if (isTable && booking.table?.tableName != null)
                    SizedBox(height: 6.h),

                  // Date
                  _infoRow(
                    icon: Icons.calendar_today,
                    text: booking.event?.startDate != null
                        ? homeController.formatDate(booking.event!.startDate.toString())
                        : 'Date not available',
                    color: AppColors.textSecondary,
                  ),

                  SizedBox(height: 14.h),
                  Divider(color: AppColors.borderSubtle, height: 1),
                  SizedBox(height: 14.h),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Guest Count
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.accentRoseGold.withOpacity(0.12),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.people,
                              size: 14.sp,
                              color: AppColors.accentRoseGold,
                            ),
                          ),
                          SizedBox(width: 8.w),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${booking.guest ?? 0} Guests',
                                style: GoogleFonts.poppins(
                                  fontSize: 12.sp,
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (booking.numberOfMale != null || booking.numberOfFemale != null)
                                Text(
                                  'M: ${booking.numberOfMale ?? 0} / F: ${booking.numberOfFemale ?? 0}',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10.sp,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),

                      // Amount
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Total',
                            style: GoogleFonts.poppins(
                              fontSize: 10.sp,
                              color: AppColors.textMuted,
                            ),
                          ),
                          ShaderMask(
                            shaderCallback: (bounds) =>
                                AppColors.gradientPrimary.createShader(bounds),
                            child: Text(
                              '\$${booking.paidAmount?.toStringAsFixed(2) ?? '0.00'}',
                              style: GoogleFonts.playfairDisplay(
                                fontSize: 18.sp,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  SizedBox(height: 10.h),

                  // Booked Date
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 12.sp, color: AppColors.textMuted),
                      SizedBox(width: 4.w),
                      Text(
                        booking.createdAt != null
                            ? 'Booked ${homeController.formatDate(booking.createdAt.toString())}'
                            : 'Booking date unavailable',
                        style: GoogleFonts.poppins(
                          fontSize: 10.sp,
                          color: AppColors.textMuted,
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
    );
  }

  Widget _infoRow({required IconData icon, required String text, required Color color}) {
    return Row(
      children: [
        Icon(icon, size: 13.sp, color: color),
        SizedBox(width: 6.w),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.poppins(
              fontSize: 11.sp,
              color: color,
              fontWeight: FontWeight.w400,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return AppColors.textMuted;
      case 'ACCEPTED':
      case 'CONFIRMED':
        return AppColors.primaryColor;
      case 'REJECTED':
      case 'CANCELLED':
        return AppColors.errorColor;
      default:
        return AppColors.textMuted;
    }
  }

  Widget _buildEmptyState(bool isPending) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.backgroundCard,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.borderSubtle, width: 0.5),
            ),
            child: Icon(
              isPending ? Icons.pending_actions : Icons.check_circle_outline,
              size: 40.sp,
              color: AppColors.textMuted,
            ),
          ),
          SizedBox(height: 20.h),
          Text(
            isPending ? 'No Pending Bookings' : 'No Accepted Bookings',
            style: GoogleFonts.playfairDisplay(
              fontSize: 20.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          SizedBox(height: 8.h),
          Text(
            isPending
                ? 'Your pending bookings will appear here'
                : 'Your accepted bookings will appear here',
            style: GoogleFonts.poppins(
              fontSize: 12.sp,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
