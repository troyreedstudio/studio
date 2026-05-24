import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/const/country_list.dart';
import '../../../core/const/image_path.dart';
import '../../../core/global_widgets/app_loading.dart';
import '../../../core/global_widgets/app_snackbar.dart';
import '../../../core/global_widgets/country_code_picker.dart';
import '../controller/2.sign_up_cnt.dart';
import '1.login_ui.dart';

/// Single-page sign-up form. Replaces the previous 3-step flow
/// (register → OTP → profile setup) introduced in v1.3.0+15.
///
/// Field order is locked per product decision:
///   1. First name        2. Last name
///   3. Gender            4. Date of birth
///   5. Country (origin)  6. Email
///   7. Phone             8. Instagram handle
///   9. Password
///
/// Photo, city, and "full address" are intentionally dropped from
/// sign-up — photo isn't surfaced anywhere yet, city wasn't worth the
/// data quality cost, and what was labelled "full address" was really
/// trying to be country.
class SignUpPage extends StatelessWidget {
  SignUpPage({super.key});

  final TextEditingController firstNameController = TextEditingController();
  final TextEditingController lastNameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController instagramController = TextEditingController();
  final SignInController controller = Get.put(SignInController());

  // DOB pickers
  final Rx<int?> selectedDay = Rx<int?>(null);
  final Rx<int?> selectedMonth = Rx<int?>(null);
  final Rx<int?> selectedYear = Rx<int?>(null);

  // Gender
  final Rx<String?> selectedGender = Rx<String?>(null);
  static const genderOptions = [
    'Male',
    'Female',
    'Non-binary',
    'Prefer not to say',
  ];

  // Country of origin (where the tourist is arriving from). Stored as
  // the country's name; sent to backend as `country` field.
  final Rx<String?> selectedCountry = Rx<String?>(null);

  InputDecoration _brandInputDecoration({
    required String hint,
    IconData? prefixIcon,
    Widget? suffixWidget,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.poppins(
        color: AppColors.textMuted,
        fontSize: 14.sp,
      ),
      filled: true,
      fillColor: AppColors.backgroundSurface,
      prefixIcon: prefixIcon != null
          ? Icon(prefixIcon, color: AppColors.textMuted, size: 18)
          : null,
      suffixIcon: suffixWidget,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderSubtle),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide:
            const BorderSide(color: AppColors.accentRoseGold, width: 1.5),
      ),
      contentPadding:
          EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 6.h),
      child: Text(
        text,
        style: GoogleFonts.poppins(
          fontSize: 12.sp,
          color: AppColors.textSecondary,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _dropdownShell<T>({
    required T? value,
    required String hint,
    required List<DropdownMenuItem<T>> items,
    required void Function(T?) onChanged,
  }) {
    return Container(
      height: 48.h,
      padding: EdgeInsets.symmetric(horizontal: 14.w),
      decoration: BoxDecoration(
        color: AppColors.backgroundSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          hint: Text(
            hint,
            style: GoogleFonts.poppins(
                color: AppColors.textMuted, fontSize: 13.sp),
          ),
          dropdownColor: AppColors.backgroundCard,
          style: GoogleFonts.poppins(
              color: AppColors.textPrimary, fontSize: 13.sp),
          icon: Icon(Icons.keyboard_arrow_down_rounded,
              color: AppColors.textMuted, size: 18),
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Unique country list (deduplicated by name) for the country-of-origin
    // dropdown. Reuses the existing countryList file rather than adding
    // a second source of truth.
    final countries = <Map<String, String>>[
      for (final c in countryList)
        if (c['name'] != null && c['name']!.isNotEmpty) c,
    ];

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
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: 24.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: 24.h),
                // Logo
                Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20.w),
                    child: Image.asset(
                      ImagePath.splashLogo,
                      width: double.infinity,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                SizedBox(height: 18.h),
                Text(
                  'Create Account',
                  style: GoogleFonts.outfit(
                    fontSize: 30.sp,
                    fontWeight: FontWeight.w800,
                    fontStyle: FontStyle.italic,
                    color: AppColors.textPrimary,
                    letterSpacing: 0.5,
                  ),
                ),
                SizedBox(height: 6.h),
                Text(
                  "Join Pink Pineapple and discover Bali's finest venues",
                  style: GoogleFonts.poppins(
                    fontSize: 13.sp,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w300,
                  ),
                ),
                SizedBox(height: 24.h),

                // 1 + 2. First name + Last name (side-by-side)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('First Name'),
                          TextField(
                            controller: firstNameController,
                            textCapitalization: TextCapitalization.words,
                            style: GoogleFonts.poppins(
                              color: AppColors.textPrimary,
                              fontSize: 14.sp,
                            ),
                            decoration: _brandInputDecoration(
                              hint: 'First name',
                              prefixIcon: Icons.person_outline_rounded,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: 12.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('Last Name'),
                          TextField(
                            controller: lastNameController,
                            textCapitalization: TextCapitalization.words,
                            style: GoogleFonts.poppins(
                              color: AppColors.textPrimary,
                              fontSize: 14.sp,
                            ),
                            decoration: _brandInputDecoration(
                              hint: 'Last name',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 16.h),

                // 3. Gender
                _label('Gender'),
                Obx(() => _dropdownShell<String>(
                      value: selectedGender.value,
                      hint: 'Select gender',
                      items: genderOptions
                          .map((g) => DropdownMenuItem(
                                value: g,
                                child: Text(g),
                              ))
                          .toList(),
                      onChanged: (v) => selectedGender.value = v,
                    )),
                SizedBox(height: 16.h),

                // 4. Date of birth — Day / Month / Year
                _label('Date of Birth'),
                Row(
                  children: [
                    Expanded(
                      child: Obx(() => _dropdownShell<int>(
                            value: selectedDay.value,
                            hint: 'Day',
                            items: List.generate(31, (i) => i + 1)
                                .map((d) => DropdownMenuItem(
                                      value: d,
                                      child: Text(d.toString()),
                                    ))
                                .toList(),
                            onChanged: (v) => selectedDay.value = v,
                          )),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      flex: 2,
                      child: Obx(() => _dropdownShell<int>(
                            value: selectedMonth.value,
                            hint: 'Month',
                            items: const [
                              'Jan',
                              'Feb',
                              'Mar',
                              'Apr',
                              'May',
                              'Jun',
                              'Jul',
                              'Aug',
                              'Sep',
                              'Oct',
                              'Nov',
                              'Dec',
                            ]
                                .asMap()
                                .entries
                                .map((e) => DropdownMenuItem(
                                      value: e.key + 1,
                                      child: Text(e.value),
                                    ))
                                .toList(),
                            onChanged: (v) => selectedMonth.value = v,
                          )),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Obx(() => _dropdownShell<int>(
                            value: selectedYear.value,
                            hint: 'Year',
                            items: List.generate(
                                    DateTime.now().year - 1924,
                                    (i) => DateTime.now().year - i)
                                .map((y) => DropdownMenuItem(
                                      value: y,
                                      child: Text(y.toString()),
                                    ))
                                .toList(),
                            onChanged: (v) => selectedYear.value = v,
                          )),
                    ),
                  ],
                ),
                SizedBox(height: 16.h),

                // 5. Country of origin — opens searchable picker
                _label('Where are you arriving from?'),
                Obx(() {
                  final selectedName = selectedCountry.value;
                  final selectedMeta = selectedName == null
                      ? null
                      : countries.firstWhere(
                          (c) => c['name'] == selectedName,
                          orElse: () => const {'name': '', 'icon': '🌍'},
                        );
                  return GestureDetector(
                    onTap: () async {
                      final result = await showCountryCodePicker(
                        context: context,
                      );
                      if (result != null && result['name'] != null) {
                        selectedCountry.value = result['name'];
                      }
                    },
                    child: Container(
                      height: 48.h,
                      padding: EdgeInsets.symmetric(horizontal: 14.w),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSurface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Row(
                        children: [
                          Text(
                            (selectedMeta?['icon'] ?? '🌍')!,
                            style: TextStyle(fontSize: 18.sp),
                          ),
                          SizedBox(width: 10.w),
                          Expanded(
                            child: Text(
                              selectedName ?? 'Select country',
                              style: GoogleFonts.poppins(
                                color: selectedName == null
                                    ? AppColors.textMuted
                                    : AppColors.textPrimary,
                                fontSize: 13.sp,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Icon(Icons.keyboard_arrow_down_rounded,
                              color: AppColors.textMuted, size: 18),
                        ],
                      ),
                    ),
                  );
                }),
                SizedBox(height: 16.h),

                // 6. Email — autocaps off, lowercase enforced via formatter
                _label('Email'),
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  textCapitalization: TextCapitalization.none,
                  autocorrect: false,
                  // Forces lowercase as the user types so what they see
                  // matches what gets sent. Prevents iOS auto-cap from
                  // creating Foo@gmail.com when the user means foo@gmail.com.
                  inputFormatters: [
                    FilteringTextInputFormatter.deny(RegExp(r'\s')),
                    TextInputFormatter.withFunction((oldValue, newValue) =>
                        newValue.copyWith(text: newValue.text.toLowerCase())),
                  ],
                  style: GoogleFonts.poppins(
                    color: AppColors.textPrimary,
                    fontSize: 14.sp,
                  ),
                  decoration: _brandInputDecoration(
                    hint: 'your@email.com',
                    prefixIcon: Icons.mail_outline_rounded,
                  ),
                ),
                SizedBox(height: 16.h),

                // 7. Phone number with country code picker
                _label('WhatsApp / Phone'),
                Row(
                  children: [
                    Obx(() {
                      return GestureDetector(
                        onTap: () async {
                          final selected = await showCountryCodePicker(
                            context: context,
                            currentCode:
                                controller.selectedCountryCode.value,
                          );
                          if (selected != null) {
                            controller.selectedCountryCode.value =
                                selected['code']!;
                            controller.selectedCountryFlag.value =
                                selected['icon'] ?? '🌍';
                          }
                        },
                        child: Container(
                          height: 48.h,
                          padding: EdgeInsets.symmetric(horizontal: 12.w),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundSurface,
                            borderRadius: BorderRadius.circular(12),
                            border:
                                Border.all(color: AppColors.borderSubtle),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                controller.selectedCountryFlag.value,
                                style: TextStyle(fontSize: 18.sp),
                              ),
                              SizedBox(width: 6.w),
                              Text(
                                controller.selectedCountryCode.value,
                                style: GoogleFonts.poppins(
                                    color: AppColors.textPrimary,
                                    fontSize: 13.sp),
                              ),
                              Icon(Icons.keyboard_arrow_down_rounded,
                                  color: AppColors.textMuted, size: 16),
                            ],
                          ),
                        ),
                      );
                    }),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: TextField(
                        controller: phoneController,
                        keyboardType: TextInputType.phone,
                        style: GoogleFonts.poppins(
                          color: AppColors.textPrimary,
                          fontSize: 14.sp,
                        ),
                        decoration: _brandInputDecoration(
                          hint: 'Phone number',
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 16.h),

                // 8. Instagram
                _label('Instagram Handle'),
                TextField(
                  controller: instagramController,
                  textCapitalization: TextCapitalization.none,
                  autocorrect: false,
                  inputFormatters: [
                    FilteringTextInputFormatter.deny(RegExp(r'\s')),
                  ],
                  style: GoogleFonts.poppins(
                    color: AppColors.textPrimary,
                    fontSize: 14.sp,
                  ),
                  decoration: _brandInputDecoration(
                    hint: '@yourhandle',
                    prefixIcon: Icons.camera_alt_outlined,
                  ),
                ),
                SizedBox(height: 16.h),

                // 9. Password
                _label('Password'),
                Obx(() => TextField(
                      controller: passwordController,
                      obscureText: controller.obscureText.value,
                      style: GoogleFonts.poppins(
                        color: AppColors.textPrimary,
                        fontSize: 14.sp,
                      ),
                      decoration: _brandInputDecoration(
                        hint: 'Create a password',
                        prefixIcon: Icons.lock_outline_rounded,
                        suffixWidget: IconButton(
                          icon: Icon(
                            controller.obscureText.value
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: AppColors.textMuted,
                            size: 18,
                          ),
                          onPressed: controller.toggleVisibility,
                        ),
                      ),
                    )),
                SizedBox(height: 20.h),

                // Terms / privacy
                RichText(
                  text: TextSpan(
                    style: GoogleFonts.poppins(
                      color: AppColors.textMuted,
                      fontSize: 11.sp,
                    ),
                    children: [
                      const TextSpan(
                          text:
                              'By creating an account you agree to our '),
                      TextSpan(
                        text: 'Terms',
                        style: GoogleFonts.poppins(
                          color: AppColors.accentRoseGold,
                          fontSize: 11.sp,
                          fontWeight: FontWeight.w500,
                        ),
                        recognizer: TapGestureRecognizer()..onTap = () {},
                      ),
                      const TextSpan(text: ' and '),
                      TextSpan(
                        text: 'Privacy Policy',
                        style: GoogleFonts.poppins(
                          color: AppColors.accentRoseGold,
                          fontSize: 11.sp,
                          fontWeight: FontWeight.w500,
                        ),
                        recognizer: TapGestureRecognizer()..onTap = () {},
                      ),
                      const TextSpan(text: '.'),
                    ],
                  ),
                ),
                SizedBox(height: 20.h),

                // Create Account button
                Obx(
                  () => controller.isRegisterLoading.value
                      ? Center(child: loading())
                      : Container(
                          width: double.infinity,
                          height: 52.h,
                          decoration: BoxDecoration(
                            gradient: AppColors.gradientPrimary,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.accentRoseGold
                                    .withOpacity(0.3),
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
                              // Validate every required field. Snackbars
                              // explain exactly what's missing rather
                              // than a generic "fill all fields".
                              if (firstNameController.text.trim().isEmpty) {
                                AppSnackbar.showWarning(
                                    'First name is required');
                                return;
                              }
                              if (lastNameController.text.trim().isEmpty) {
                                AppSnackbar.showWarning(
                                    'Last name is required');
                                return;
                              }
                              if (selectedGender.value == null) {
                                AppSnackbar.showWarning(
                                    'Please select your gender');
                                return;
                              }
                              if (selectedYear.value == null ||
                                  selectedMonth.value == null ||
                                  selectedDay.value == null) {
                                AppSnackbar.showWarning(
                                    'Please enter your full date of birth');
                                return;
                              }
                              final dob = DateTime(
                                  selectedYear.value!,
                                  selectedMonth.value!,
                                  selectedDay.value!);
                              final today = DateTime.now();
                              int age = today.year - dob.year;
                              if (today.month < dob.month ||
                                  (today.month == dob.month &&
                                      today.day < dob.day)) {
                                age--;
                              }
                              if (age < 18) {
                                AppSnackbar.showWarning(
                                    'You must be 18 or over to use Pink Pineapple.');
                                return;
                              }
                              if (selectedCountry.value == null ||
                                  selectedCountry.value!.isEmpty) {
                                AppSnackbar.showWarning(
                                    'Where are you arriving from?');
                                return;
                              }
                              if (emailController.text.trim().isEmpty) {
                                AppSnackbar.showWarning(
                                    'Email is required');
                                return;
                              }
                              if (phoneController.text.trim().isEmpty) {
                                AppSnackbar.showWarning(
                                    'Phone number is required');
                                return;
                              }
                              if (instagramController.text.trim().isEmpty) {
                                AppSnackbar.showWarning(
                                    'Instagram handle is required');
                                return;
                              }
                              if (passwordController.text.isEmpty) {
                                AppSnackbar.showWarning(
                                    'Password is required');
                                return;
                              }

                              final dobStr =
                                  '${selectedYear.value}-${selectedMonth.value.toString().padLeft(2, '0')}-${selectedDay.value.toString().padLeft(2, '0')}';
                              controller.registerUser(
                                firstName: firstNameController.text,
                                lastName: lastNameController.text,
                                email: emailController.text,
                                phone: phoneController.text,
                                instagram: instagramController.text,
                                dob: dobStr,
                                gender: selectedGender.value ?? '',
                                country: selectedCountry.value ?? '',
                                password: passwordController.text,
                              );
                            },
                            child: Text(
                              'Create Account',
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
                SizedBox(height: 20.h),

                // Login link
                Center(
                  child: RichText(
                    text: TextSpan(
                      text: 'Already have an account?  ',
                      style: GoogleFonts.poppins(
                        color: AppColors.textSecondary,
                        fontSize: 13.sp,
                      ),
                      children: [
                        TextSpan(
                          text: 'Sign In',
                          style: GoogleFonts.poppins(
                            color: AppColors.accentRoseGold,
                            fontWeight: FontWeight.w600,
                            fontSize: 13.sp,
                          ),
                          recognizer: TapGestureRecognizer()
                            ..onTap = () => Get.off(() => LoginPage()),
                        ),
                      ],
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
