import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/app_loading.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';

/// v1.3.3+32: Notifications inbox. Lists every announcement the user has
/// received (broadcasts are persisted per-user by the backend at send
/// time). Rows open a bottom sheet with the full message — per the house
/// rule, detail goes in the modal, not on the card face. Opening a row
/// also marks it read (GET /notifications/:id does that server-side).
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _items = <_NotificationItem>[].obs;
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
        Urls.notifications,
        jsonEncode({}),
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        final list = (response['data'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(_NotificationItem.fromJson)
            .toList();
        _items.assignAll(list);
      }
    } catch (_) {
      // swallow — show empty state
    } finally {
      _isLoading.value = false;
    }
  }

  Future<void> _refresh() async {
    await _fetch();
  }

  void _open(_NotificationItem item) {
    if (!item.isRead) {
      // Fire-and-forget mark-as-read; the backend marks it on single-fetch.
      _net.ApiRequestHandler(
        RequestMethod.GET,
        '${Urls.notifications}/${item.id}',
        jsonEncode({}),
        is_auth: true,
      );
      final idx = _items.indexWhere((n) => n.id == item.id);
      if (idx != -1) {
        _items[idx] = item.copyWith(isRead: true);
      }
    }
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(24.w, 14.h, 24.w, 32.h),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36.w,
                height: 4.h,
                decoration: BoxDecoration(
                  color: AppColors.borderSubtle,
                  borderRadius: BorderRadius.circular(2.r),
                ),
              ),
            ),
            SizedBox(height: 18.h),
            Text(
              item.title,
              style: GoogleFonts.outfit(
                fontSize: 18.sp,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
                color: AppColors.textPrimary,
              ),
            ),
            SizedBox(height: 4.h),
            Text(
              _timeAgo(item.createdAt),
              style: GoogleFonts.poppins(
                fontSize: 11.sp,
                color: AppColors.textMuted,
              ),
            ),
            SizedBox(height: 14.h),
            Divider(height: 1, color: AppColors.borderSubtle),
            SizedBox(height: 14.h),
            Flexible(
              child: SingleChildScrollView(
                child: Text(
                  item.body,
                  style: GoogleFonts.poppins(
                    fontSize: 14.sp,
                    height: 1.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: Obx(() {
                if (_isLoading.value) {
                  return Center(child: loading());
                }
                if (_items.isEmpty) {
                  return _buildEmptyState();
                }
                return RefreshIndicator(
                  color: AppColors.gradientMid,
                  backgroundColor: AppColors.surface,
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: EdgeInsets.fromLTRB(16.w, 8.h, 16.w, 24.h),
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => SizedBox(height: 10.h),
                    itemBuilder: (_, i) => _NotificationRow(
                      item: _items[i],
                      onTap: () => _open(_items[i]),
                    ),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 8.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: EdgeInsets.all(8.w),
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: Icon(Icons.arrow_back_ios_new,
                  color: AppColors.textPrimary, size: 14.sp),
            ),
          ),
          SizedBox(width: 14.w),
          Text(
            'NOTIFICATIONS',
            style: GoogleFonts.outfit(
              fontSize: 20.sp,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.italic,
              color: AppColors.textPrimary,
              letterSpacing: 3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 40.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle, width: 0.5),
              ),
              child: Icon(
                Icons.notifications_none_rounded,
                size: 32.sp,
                color: AppColors.textMuted,
              ),
            ),
            SizedBox(height: 20.h),
            Text(
              'No announcements yet',
              style: GoogleFonts.outfit(
                fontSize: 20.sp,
                fontWeight: FontWeight.w800,
                fontStyle: FontStyle.italic,
                color: AppColors.textSecondary,
              ),
            ),
            SizedBox(height: 8.h),
            Text(
              'News and event announcements will land here',
              style: GoogleFonts.poppins(
                fontSize: 13.sp,
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

String _timeAgo(DateTime? dt) {
  if (dt == null) return '';
  final diff = DateTime.now().difference(dt.toLocal());
  if (diff.inSeconds < 60) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final local = dt.toLocal();
  return '${local.day} ${months[local.month - 1]}';
}

class _NotificationRow extends StatelessWidget {
  final _NotificationItem item;
  final VoidCallback onTap;
  const _NotificationRow({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14.r),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: AppColors.accentRoseGold.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.notifications_none_rounded,
                size: 17.sp,
                color: AppColors.accentRoseGold,
              ),
            ),
            SizedBox(width: 12.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
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
                      if (!item.isRead) ...[
                        SizedBox(width: 8.w),
                        Container(
                          width: 8.w,
                          height: 8.w,
                          decoration: const BoxDecoration(
                            color: AppColors.gradientMid,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ],
                  ),
                  SizedBox(height: 3.h),
                  Text(
                    item.body,
                    style: GoogleFonts.poppins(
                      fontSize: 12.sp,
                      color: AppColors.textSecondary,
                      height: 1.35,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 5.h),
                  Text(
                    _timeAgo(item.createdAt),
                    style: GoogleFonts.poppins(
                      fontSize: 10.sp,
                      color: AppColors.textMuted,
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
}

class _NotificationItem {
  final String id;
  final String title;
  final String body;
  final bool isRead;
  final DateTime? createdAt;

  const _NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
  });

  factory _NotificationItem.fromJson(Map<String, dynamic> j) {
    return _NotificationItem(
      id: (j['id'] ?? '').toString(),
      title: (j['title'] ?? '').toString(),
      body: (j['body'] ?? '').toString(),
      isRead: j['isRead'] == true,
      createdAt: DateTime.tryParse((j['createdAt'] ?? '').toString()),
    );
  }

  _NotificationItem copyWith({bool? isRead}) {
    return _NotificationItem(
      id: id,
      title: title,
      body: body,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }
}
