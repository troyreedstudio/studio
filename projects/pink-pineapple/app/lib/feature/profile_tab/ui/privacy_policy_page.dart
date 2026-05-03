import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
import 'package:pineapple/core/global_widgets/custom_text.dart';

class PrivacyPolicyPage extends StatelessWidget {
  const PrivacyPolicyPage({super.key});

  Future<Map<String, dynamic>> _loadPrivacyPolicy() async {
    try {
      final String response = await rootBundle.loadString(
        'assets/jsons/privacy_policy.json',
      );
      return json.decode(response);
    } catch (e) {
      print('Error loading privacy policy: $e');
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16.w),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              SizedBox(height: 20.h),
              Expanded(
                child: FutureBuilder<Map<String, dynamic>>(
                  future: _loadPrivacyPolicy(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return Center(
                        child: CircularProgressIndicator(
                          color: AppColors.accentRoseGold,
                        ),
                      );
                    } else if (snapshot.hasError) {
                      return Center(
                        child: Text(
                          'Error loading privacy policy: ${snapshot.error}',
                          style: GoogleFonts.poppins(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      );
                    } else if (snapshot.hasData) {
                      final data = snapshot.data!;
                      final sections = data['sections'] as List<dynamic>;
                      return ListView.builder(
                        itemCount: sections.length,
                        itemBuilder: (context, index) {
                          final section =
                              sections[index] as Map<String, dynamic>;
                          return Padding(
                            padding: EdgeInsets.only(bottom: 16.h),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                normalText(
                                  text: section['title'],
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                                SizedBox(height: 8.h),
                                normalText(
                                  text: section['content'],
                                  color: AppColors.textSecondary,
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    } else {
                      return Center(
                        child: Text(
                          'No data',
                          style: GoogleFonts.poppins(
                            color: AppColors.textMuted,
                          ),
                        ),
                      );
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        GestureDetector(
          onTap: () => Get.back(),
          child: Container(
            padding: EdgeInsets.all(8.w),
            decoration: BoxDecoration(
              color: AppColors.backgroundCard,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.borderSubtle, width: 0.5),
            ),
            child: Icon(
              Icons.arrow_back_ios_new,
              size: 14.sp,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        SizedBox(width: 14.w),
        Text(
          'PRIVACY POLICY',
          style: GoogleFonts.outfit(
            fontSize: 20.sp,
            fontWeight: FontWeight.w800,
            fontStyle: FontStyle.italic,
            color: AppColors.textPrimary,
            letterSpacing: 3,
          ),
        ),
      ],
    );
  }
}
