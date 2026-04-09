import 'package:flutter/material.dart';

import '../const/app_colors.dart';
import '../const/image_path.dart';
import '../style/global_text_style.dart';

// ignore: must_be_immutable
class NoDataFoundContainer extends StatelessWidget {
  String? title;
  NoDataFoundContainer({super.key, this.title});

  @override
  Widget build(BuildContext context) {
    // Get screen height and width
    double screenWidth = MediaQuery.of(context).size.width;

    return Container(
      padding: const EdgeInsets.only(bottom: 10),
      width: screenWidth * 1,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: AppColors.backgroundDark,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(ImagePath.sample_imagePath, height: 150, fit: BoxFit.contain),
          Text(
            title!,
            style: globalTextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.bold,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
