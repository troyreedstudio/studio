import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';
import 'package:lottie/lottie.dart';
import '../const/app_colors.dart';

// Widget loading({Color colors = AppColors.primaryColor, double value = 40}) {
Widget loading({Color colors = AppColors.primaryColor, double value = 40}) {
  return Center(
    child: LoadingAnimationWidget.staggeredDotsWave(
      color: AppColors.buttonColor,
      size: value.h,
    ),
  );
}

Widget loadingSmall() {
  return Center(
    child: LoadingAnimationWidget.progressiveDots(
      color: Colors.green,
      size: 20.h,
    ),
  );
}

Widget btnLoading() {
  return Center(
    child: LoadingAnimationWidget.staggeredDotsWave(
      color: Colors.green,
      size: 40.h,
    ),
  );
}

Widget lottieLoading() {
  return Center(
    child: Lottie.asset("assets/animation/loading.json") ,
  );
}

