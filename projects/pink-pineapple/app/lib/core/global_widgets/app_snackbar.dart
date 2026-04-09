import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../const/app_colors.dart';

enum SnackbarType { success, error, warning, info }

class AppSnackbar {
  // Existing method
  static void show({
    required String message,
    required bool isSuccess,
    double? topOffset,
  }) {
    _showSnackbar(
      message: message,
      type: isSuccess ? SnackbarType.success : SnackbarType.error,
      topOffset: topOffset,
    );
  }

  // Specific methods
  static void showSuccess(String message, {double? topOffset}) {
    _showSnackbar(
      message: message,
      type: SnackbarType.success,
      topOffset: topOffset,
    );
  }

  static void showError(String message, {double? topOffset}) {
    _showSnackbar(
      message: message,
      type: SnackbarType.error,
      topOffset: topOffset,
    );
  }

  static void showWarning(String message, {double? topOffset}) {
    _showSnackbar(
      message: message,
      type: SnackbarType.warning,
      topOffset: topOffset,
    );
  }

  static void showInfo(String message, {double? topOffset}) {
    _showSnackbar(
      message: message,
      type: SnackbarType.info,
      topOffset: topOffset,
    );
  }

  static void _showSnackbar({
    required String message,
    required SnackbarType type,
    Duration? duration,
    bool showDismissButton = true,
    double? topOffset,
  }) {
    final config = _getSnackbarConfig(type);

    double topPadding = topOffset ?? 8.0;

    Get.snackbar(
      '',
      '',
      titleText: const SizedBox.shrink(),
      messageText: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderSubtle, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon — keep semantic colors for visibility
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: config.iconColor.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                config.icon,
                color: config.iconColor,
                size: 22,
              ),
            ),

            const SizedBox(width: 12),

            // Text section
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    config.title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    message,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                      height: 1.3,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            if (showDismissButton) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => Get.closeCurrentSnackbar(),
                child: Icon(
                  Icons.close,
                  color: AppColors.textMuted,
                  size: 20,
                ),
              ),
            ]
          ],
        ),
      ),
      snackPosition: SnackPosition.TOP,
      snackStyle: SnackStyle.FLOATING,
      backgroundColor: Colors.transparent,
      margin: EdgeInsets.fromLTRB(16, topPadding, 16, 10),
      padding: EdgeInsets.zero,
      duration: duration ?? const Duration(seconds: 3),
      isDismissible: true,
      dismissDirection: DismissDirection.up,
    );
  }

  static _SnackbarConfig _getSnackbarConfig(SnackbarType type) {
    switch (type) {
      case SnackbarType.success:
        return _SnackbarConfig(
          title: 'Success',
          iconColor: const Color(0xFF16A34A), // Green
          icon: Icons.check_circle_rounded,
        );

      case SnackbarType.error:
        return _SnackbarConfig(
          title: 'Error',
          iconColor: const Color(0xFFDC2626), // Red
          icon: Icons.error_rounded,
        );

      case SnackbarType.warning:
        return _SnackbarConfig(
          title: 'Warning',
          iconColor: const Color(0xFFF59E0B), // Amber
          icon: Icons.warning_rounded,
        );

      case SnackbarType.info:
        return _SnackbarConfig(
          title: 'Info',
          iconColor: const Color(0xFF2563EB), // Blue
          icon: Icons.info_rounded,
        );
    }
  }
}

class _SnackbarConfig {
  final String title;
  final Color iconColor;
  final IconData icon;

  _SnackbarConfig({
    required this.title,
    required this.iconColor,
    required this.icon,
  });
}
