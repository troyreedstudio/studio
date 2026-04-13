import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../const/app_colors.dart';
import '../const/country_list.dart';

/// Full-screen modal bottom sheet for searching and selecting a country code.
///
/// Opens via [showCountryCodePicker]. The caller receives the selected country
/// map (`{name, code, icon}`) or `null` if the user dismisses the sheet.
Future<Map<String, String>?> showCountryCodePicker({
  required BuildContext context,
  String? currentCode,
}) {
  return showModalBottomSheet<Map<String, String>>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _CountryCodePickerSheet(currentCode: currentCode),
  );
}

class _CountryCodePickerSheet extends StatefulWidget {
  const _CountryCodePickerSheet({this.currentCode});

  final String? currentCode;

  @override
  State<_CountryCodePickerSheet> createState() =>
      _CountryCodePickerSheetState();
}

class _CountryCodePickerSheetState extends State<_CountryCodePickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  late List<Map<String, String>> _allCountries;
  List<Map<String, String>> _filtered = [];

  @override
  void initState() {
    super.initState();
    // Sort alphabetically by country name.
    _allCountries = List<Map<String, String>>.from(countryList)
      ..sort((a, b) =>
          (a['name'] ?? '').toLowerCase().compareTo(
                (b['name'] ?? '').toLowerCase(),
              ));
    _filtered = _allCountries;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    final q = query.trim().toLowerCase();
    setState(() {
      if (q.isEmpty) {
        _filtered = _allCountries;
      } else {
        _filtered = _allCountries.where((c) {
          final name = (c['name'] ?? '').toLowerCase();
          final code = (c['code'] ?? '').toLowerCase();
          return name.contains(q) || code.contains(q);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      child: Column(
        children: [
          // Drag handle
          Padding(
            padding: EdgeInsets.only(top: 12.h, bottom: 4.h),
            child: Container(
              width: 40.w,
              height: 4.h,
              decoration: BoxDecoration(
                color: AppColors.borderAccent,
                borderRadius: BorderRadius.circular(2.r),
              ),
            ),
          ),

          // Title
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
            child: Text(
              'Select Country',
              style: GoogleFonts.poppins(
                fontSize: 16.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),

          // Search field
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.w),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              style: GoogleFonts.poppins(
                color: AppColors.textPrimary,
                fontSize: 14.sp,
              ),
              decoration: InputDecoration(
                hintText: 'Search country or dial code',
                hintStyle: GoogleFonts.poppins(
                  color: AppColors.textMuted,
                  fontSize: 14.sp,
                ),
                filled: true,
                fillColor: AppColors.surfaceElevated,
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: AppColors.textMuted,
                  size: 20,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12.r),
                  borderSide: const BorderSide(color: AppColors.borderSubtle),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12.r),
                  borderSide: const BorderSide(
                    color: AppColors.gradientStart,
                    width: 1.5,
                  ),
                ),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 16.w,
                  vertical: 12.h,
                ),
              ),
            ),
          ),

          SizedBox(height: 8.h),

          // Country list
          Expanded(
            child: _filtered.isEmpty
                ? Center(
                    child: Text(
                      'No countries found',
                      style: GoogleFonts.poppins(
                        color: AppColors.textMuted,
                        fontSize: 14.sp,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: EdgeInsets.symmetric(horizontal: 4.w),
                    itemCount: _filtered.length,
                    separatorBuilder: (_, __) => Divider(
                      height: 1,
                      color: AppColors.borderSubtle,
                      indent: 16.w,
                      endIndent: 16.w,
                    ),
                    itemBuilder: (context, index) {
                      final country = _filtered[index];
                      final isSelected =
                          country['code'] == widget.currentCode;
                      return InkWell(
                        onTap: () => Navigator.of(context).pop(country),
                        child: Padding(
                          padding: EdgeInsets.symmetric(
                            horizontal: 16.w,
                            vertical: 14.h,
                          ),
                          child: Row(
                            children: [
                              Text(
                                country['icon'] ?? '',
                                style: TextStyle(fontSize: 24.sp),
                              ),
                              SizedBox(width: 12.w),
                              Expanded(
                                child: Text(
                                  country['name'] ?? '',
                                  style: GoogleFonts.poppins(
                                    color: AppColors.textPrimary,
                                    fontSize: 14.sp,
                                    fontWeight: FontWeight.w400,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              SizedBox(width: 8.w),
                              Text(
                                country['code'] ?? '',
                                style: GoogleFonts.poppins(
                                  color: AppColors.textMuted,
                                  fontSize: 14.sp,
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                              if (isSelected) ...[
                                SizedBox(width: 8.w),
                                Icon(
                                  Icons.check_rounded,
                                  color: AppColors.gradientMid,
                                  size: 20,
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
