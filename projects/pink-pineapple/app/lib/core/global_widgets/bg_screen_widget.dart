import 'package:flutter/material.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/image_path.dart';

class BackgroundScreen extends StatelessWidget {
  final Widget child;
  final String? bgImg;
  final bool useSolidBackground;

  const BackgroundScreen({
    super.key,
    required this.child,
    this.bgImg,
    this.useSolidBackground = false,
  });

  @override
  Widget build(BuildContext context) {
    final Size screenSize = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          // Background: image if provided, otherwise solid dark
          if (bgImg != null && !useSolidBackground)
            Stack(
              children: [
                Image.asset(
                  bgImg!,
                  width: screenSize.width,
                  height: screenSize.height,
                  fit: BoxFit.cover,
                ),
                // Dark overlay to ensure brand dark-first aesthetic
                Container(
                  width: screenSize.width,
                  height: screenSize.height,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientDark,
                  ),
                ),
              ],
            )
          else
            // Pure dark background with subtle gradient
            Container(
              width: screenSize.width,
              height: screenSize.height,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF0D0D1A),
                    Color(0xFF000000),
                  ],
                ),
              ),
            ),

          // Foreground content
          Positioned.fill(child: child),
        ],
      ),
    );
  }
}
