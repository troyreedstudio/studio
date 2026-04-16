import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/user_info/user_info_controller.dart';

/// Opens a venue's booking URL in a WebView and auto-fills the customer's
/// info (name, email, phone) from their Pink Pineapple profile.
class VenueBookingWebView extends StatefulWidget {
  const VenueBookingWebView({
    super.key,
    required this.bookingUrl,
    required this.venueName,
  });

  final String bookingUrl;
  final String venueName;

  @override
  State<VenueBookingWebView> createState() => _VenueBookingWebViewState();
}

class _VenueBookingWebViewState extends State<VenueBookingWebView> {
  late final WebViewController _controller;
  final _isLoading = true.obs;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => _isLoading.value = true,
        onPageFinished: (_) {
          _isLoading.value = false;
          _autoFillForm();
        },
      ))
      ..loadRequest(Uri.parse(widget.bookingUrl));
  }

  /// Auto-fill form fields with the user's Pink Pineapple profile data.
  /// Tries common field selectors used by booking platforms.
  Future<void> _autoFillForm() async {
    try {
      final userCtrl = Get.find<UserInfoController>();
      final profile = userCtrl.userInfo.value?.userProfile;
      if (profile == null) return;

      final name = _escapeJs(profile.fullName ?? '');
      final email = _escapeJs(profile.email ?? '');
      final phone = _escapeJs(profile.phoneNumber ?? '');

      // JavaScript to find and fill common form fields
      // Covers: standard input names, booketing.com IDs, generic patterns
      final js = '''
        (function() {
          function fill(selectors, value) {
            if (!value) return;
            for (var i = 0; i < selectors.length; i++) {
              var el = document.querySelector(selectors[i]);
              if (el) {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }

          // Name fields
          fill([
            'input[name="name"]',
            'input[name="fullName"]',
            'input[name="full_name"]',
            'input[name="firstName"]',
            'input[id*="name" i]',
            'input[placeholder*="name" i]',
            'input[placeholder*="Name" i]',
          ], '$name');

          // Email fields
          fill([
            'input[name="email"]',
            'input[type="email"]',
            'input[id*="email" i]',
            'input[placeholder*="email" i]',
          ], '$email');

          // Phone fields
          fill([
            'input[name="phone"]',
            'input[name="phoneNumber"]',
            'input[name="whatsapp"]',
            'input[type="tel"]',
            'input[id*="phone" i]',
            'input[placeholder*="phone" i]',
            'input[placeholder*="WhatsApp" i]',
            '#uvgl-phonefull',
          ], '$phone');
        })();
      ''';

      await _controller.runJavaScript(js);
    } catch (_) {
      // Silently fail — auto-fill is a convenience, not critical
    }
  }

  String _escapeJs(String s) {
    return s
        .replaceAll('\\', '\\\\')
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: AppColors.textPrimary, size: 22.sp),
          onPressed: () => Get.back(),
        ),
        title: Text(
          widget.venueName,
          style: GoogleFonts.outfit(
            fontSize: 16.sp,
            fontWeight: FontWeight.w700,
            fontStyle: FontStyle.italic,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: AppColors.textMuted, size: 20.sp),
            onPressed: () => _controller.reload(),
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          // Loading indicator
          Obx(() {
            if (!_isLoading.value) return const SizedBox.shrink();
            return Container(
              color: AppColors.background,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      color: AppColors.accentRoseGold,
                      strokeWidth: 2,
                    ),
                    SizedBox(height: 16.h),
                    Text(
                      'Loading booking...',
                      style: GoogleFonts.poppins(
                        fontSize: 13.sp,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
