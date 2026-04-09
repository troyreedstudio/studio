import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pin_code_fields/pin_code_fields.dart';
import '../../../core/const/app_colors.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../controller/4.otp_controller.dart';

class SignUpOTPVerification extends StatelessWidget {
  SignUpOTPVerification({super.key});
  final TextEditingController otpController = TextEditingController();
  final OtpController controller = Get.put(OtpController());

  @override
  Widget build(BuildContext context) {
    final String email = Get.arguments['email'] ?? '';

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF000000), Color(0xFF1A1A1A)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: 16.h),
                // Back button
                GestureDetector(
                  onTap: () => Get.back(),
                  child: Container(
                    height: 40,
                    width: 40,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: const Icon(Icons.arrow_back_ios_new_rounded,
                        color: Colors.white, size: 16),
                  ),
                ),
                SizedBox(height: 24.h),

                // Logo
                Center(
                  child: Image.asset(
                    ImagePath.splashLogo,
                    height: 56.h,
                    fit: BoxFit.contain,
                  ),
                ),
                SizedBox(height: 32.h),

                // Heading
                Text(
                  'Verify Account',
                  style: GoogleFonts.cormorantGaramond(
                    fontSize: 28.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    letterSpacing: 0.5,
                  ),
                ),
                SizedBox(height: 8.h),
                Text(
                  'Check your email for a 4-digit code',
                  style: GoogleFonts.poppins(
                    fontSize: 13.sp,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w300,
                  ),
                ),
                if (email.isNotEmpty) ...[
                  SizedBox(height: 6.h),
                  Text(
                    email,
                    style: GoogleFonts.poppins(
                      fontSize: 14.sp,
                      color: AppColors.accentRoseGold,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
                SizedBox(height: 40.h),

                // OTP Input
                Center(
                  child: PinCodeTextField(
                    appContext: context,
                    length: 4,
                    obscureText: false,
                    cursorColor: AppColors.accentRoseGold,
                    animationType: AnimationType.fade,
                    keyboardType: TextInputType.number,
                    controller: otpController,
                    textStyle: GoogleFonts.poppins(
                      color: AppColors.textPrimary,
                      fontSize: 20.sp,
                      fontWeight: FontWeight.w600,
                    ),
                    pinTheme: PinTheme(
                      shape: PinCodeFieldShape.box,
                      borderRadius: BorderRadius.circular(12),
                      fieldHeight: 60,
                      fieldWidth: 60,
                      activeFillColor: AppColors.backgroundSurface,
                      inactiveFillColor: AppColors.backgroundCard,
                      selectedFillColor: AppColors.backgroundSurface,
                      activeColor: AppColors.accentRoseGold,
                      inactiveColor: AppColors.borderSubtle,
                      selectedColor: AppColors.accentRoseGold,
                      activeBorderWidth: 1.5,
                      selectedBorderWidth: 1.5,
                      inactiveBorderWidth: 1,
                    ),
                    enableActiveFill: true,
                    onChanged: (value) {},
                    onCompleted: (value) {},
                  ),
                ),
                const Spacer(),

                // Verify button
                Obx(
                  () => controller.isLoading.value
                      ? Center(child: loading())
                      : Container(
                          width: double.infinity,
                          height: 52.h,
                          decoration: BoxDecoration(
                            gradient: AppColors.gradientPrimary,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.accentRoseGold.withOpacity(0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () {
                              String otpCode = otpController.text.trim();
                              int otp = int.parse(otpCode);
                              controller.otpVerifyToLogin(email, otp);
                            },
                            child: Text(
                              'Verify Account',
                              style: GoogleFonts.poppins(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.w600,
                                color: AppColors.backgroundDark,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ),
                ),
                SizedBox(height: 16.h),
                // Resend OTP
                Center(
                  child: GestureDetector(
                    onTap: () {
                      // TODO: trigger resend OTP
                    },
                    child: Text(
                      'Resend OTP',
                      style: GoogleFonts.poppins(
                        fontSize: 13.sp,
                        color: AppColors.accentRoseGold,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 32.h),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
