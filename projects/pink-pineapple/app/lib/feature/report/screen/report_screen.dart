import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/global_widgets/app_snackbar.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/global_widgets/bg_screen_widget.dart';
import '../../../core/global_widgets/custom_textform_widget.dart';
import '../../../core/global_widgets/subpage_appbar_widget.dart';
import '../controller/report_controller.dart';

class ReportScreen extends StatelessWidget {
  ReportScreen({super.key});

  final reportController = Get.put(ReportController());

  @override
  Widget build(BuildContext context) {
    return BackgroundScreen(
      child: SafeArea(
        minimum: EdgeInsets.symmetric(horizontal: 16.w),
        child: Obx(() {
          return reportController.isFirstPage.value
              ? _buildFirstPage(context)
              : _buildSecondPage(context);
        }),
      ),
    );
  }

  Widget _buildFirstPage(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SubPageAppbarWidget(
          appbarTitle: 'Report',
          showSuffixWidget: false,
          prefixOnpressed: () => Navigator.pop(context),
        ),
        SizedBox(height: 20.h),
        Text(
          'Why are you reporting?',
          style: TextStyle(
            color: AppColors.secondaryColor,
            fontSize: 16.sp,
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 10.h),
        Text(
          'Only ThriftHUT admins can view and respond to your report. Your identity will be kept confidential.',
          style: TextStyle(
            color: AppColors.secondaryColor.withAlpha(90),
            fontSize: 12.sp,
          ),
        ),
        SizedBox(height: 20.h),

        ...List.generate(reportController.reports.length, (index) {
          return Column(
            children: [
              InkWell(
                onTap: () {
                  log(reportController.reports[index]);
                  reportController.goLastPage();
                  reportController.selectedReport.value =
                      reportController.reports[index];
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      reportController.reports[index],
                      style: TextStyle(
                        color: AppColors.secondaryColor,
                        fontSize: 12.sp,
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios,
                      color: AppColors.secondaryColor,
                      size: 15.h,
                    ),
                  ],
                ),
              ),
              SizedBox(height: 5.h),
              Divider(),
              SizedBox(height: 5.h),
            ],
          );
        }),
        // Spacer(),
        // CustomButtonWidget(
        //   text: 'Continue',
        //   onPressed: () {
        //     reportController.goLastPage();
        //     log("${reportController.isFirstPage.value}");
        //   },
        // ),
        // SizedBox(height: 10.h),
      ],
    );
  }

  Widget _buildSecondPage(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SubPageAppbarWidget(
          appbarTitle: 'Report',
          showSuffixWidget: false,
          prefixOnpressed: () {
            reportController.goLastPage();
          },
        ),
        SizedBox(height: 20.h),

        CustomTextFormWidget(
          sectionTitle: 'Describe your report....',
          textEditingController: TextEditingController(),
          maxLines: 4,
          hintText: reportController.selectedReport.value,
        ),

        Spacer(),
        // CustomButtonWidget(
        //   text: 'Submit',
        //   onPressed: () {
        //     Navigator.pop(context);
        //   },
        // ),
        _buildSubmitButton(context),

        SizedBox(height: 10.h),
      ],
    );
  }
}

Widget _buildSubmitButton(BuildContext context) {
  return SizedBox(
    height: 30.h,
    width: double.infinity,
    child: ElevatedButton(
      onPressed: () {
        AppSnackbar.show(message: 'Report Send Successful', isSuccess: true);
        Navigator.pop(context);
      },

      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primaryColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Text("Submit", style: TextStyle(color: AppColors.whiteColor)),
    ),
  );
}
