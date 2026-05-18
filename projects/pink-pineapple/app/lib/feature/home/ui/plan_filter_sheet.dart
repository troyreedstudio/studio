import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';

/// Result of the Plan My Night filter sheet — the selections the user
/// wants applied to itinerary regeneration. All fields are non-null
/// (empty list = no constraint on that dimension).
class PlanFilterResult {
  final List<String> cuisines;
  final List<String> musicGenres;

  const PlanFilterResult({
    required this.cuisines,
    required this.musicGenres,
  });

  bool get hasAny => cuisines.isNotEmpty || musicGenres.isNotEmpty;
}

// Mirrors the backend VenueCuisine enum (15 values).
const List<Map<String, String>> _cuisineOptions = [
  {'value': 'ITALIAN', 'label': 'Italian'},
  {'value': 'JAPANESE', 'label': 'Japanese'},
  {'value': 'INDIAN', 'label': 'Indian'},
  {'value': 'INDONESIAN', 'label': 'Indonesian'},
  {'value': 'ASIAN_FUSION', 'label': 'Asian Fusion'},
  {'value': 'MEDITERRANEAN', 'label': 'Mediterranean'},
  {'value': 'MEXICAN', 'label': 'Mexican'},
  {'value': 'MIDDLE_EASTERN', 'label': 'Middle Eastern'},
  {'value': 'FRENCH', 'label': 'French'},
  {'value': 'STEAKHOUSE', 'label': 'Steakhouse'},
  {'value': 'SEAFOOD', 'label': 'Seafood'},
  {'value': 'VEGAN', 'label': 'Vegan'},
  {'value': 'PIZZA', 'label': 'Pizza'},
  {'value': 'SUSHI', 'label': 'Sushi'},
  {'value': 'INTERNATIONAL', 'label': 'International'},
  {'value': 'CAFE_BRUNCH', 'label': 'Café / Brunch'},
];

// Mirrors the backend VenueMusicGenre enum (12 values).
const List<Map<String, String>> _genreOptions = [
  {'value': 'EDM', 'label': 'EDM'},
  {'value': 'HOUSE', 'label': 'House'},
  {'value': 'DEEP_HOUSE', 'label': 'Deep House'},
  {'value': 'TECHNO', 'label': 'Techno'},
  {'value': 'AFRO_HOUSE', 'label': 'Afro House'},
  {'value': 'HIP_HOP', 'label': 'Hip-Hop'},
  {'value': 'R_AND_B', 'label': 'R&B'},
  {'value': 'POP', 'label': 'Pop'},
  {'value': 'COMMERCIAL', 'label': 'Commercial'},
  {'value': 'REGGAETON', 'label': 'Reggaeton'},
  {'value': 'LATIN', 'label': 'Latin'},
  {'value': 'LIVE_BAND', 'label': 'Live Band'},
];

/// Show the Plan My Night filter sheet. Returns null if the user
/// dismisses, or a [PlanFilterResult] if they tap Apply.
Future<PlanFilterResult?> showPlanFilterSheet({
  required BuildContext context,
  required PlanFilterResult initial,
}) {
  return showModalBottomSheet<PlanFilterResult>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _PlanFilterSheet(initial: initial),
  );
}

class _PlanFilterSheet extends StatefulWidget {
  const _PlanFilterSheet({required this.initial});
  final PlanFilterResult initial;

  @override
  State<_PlanFilterSheet> createState() => _PlanFilterSheetState();
}

class _PlanFilterSheetState extends State<_PlanFilterSheet> {
  late Set<String> _cuisines;
  late Set<String> _genres;

  @override
  void initState() {
    super.initState();
    _cuisines = widget.initial.cuisines.toSet();
    _genres = widget.initial.musicGenres.toSet();
  }

  void _toggleCuisine(String v) {
    setState(() {
      if (_cuisines.contains(v)) {
        _cuisines.remove(v);
      } else {
        _cuisines.add(v);
      }
    });
  }

  void _toggleGenre(String v) {
    setState(() {
      if (_genres.contains(v)) {
        _genres.remove(v);
      } else {
        _genres.add(v);
      }
    });
  }

  void _clearAll() {
    setState(() {
      _cuisines.clear();
      _genres.clear();
    });
  }

  void _apply() {
    Navigator.of(context).pop(
      PlanFilterResult(
        cuisines: _cuisines.toList(),
        musicGenres: _genres.toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;

    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.backgroundDark,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: EdgeInsets.symmetric(vertical: 10.h),
              width: 40.w,
              height: 4.h,
              decoration: BoxDecoration(
                color: AppColors.borderSubtle,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(24.w, 4.h, 24.w, 14.h),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Refine your night',
                          style: GoogleFonts.outfit(
                            fontSize: 22.sp,
                            fontWeight: FontWeight.w800,
                            fontStyle: FontStyle.italic,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        SizedBox(height: 4.h),
                        Text(
                          'Pick the vibes you\'re in the mood for',
                          style: GoogleFonts.poppins(
                            fontSize: 11.sp,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: _clearAll,
                    child: Text(
                      'Clear',
                      style: GoogleFonts.poppins(
                        fontSize: 12.sp,
                        color: AppColors.accentRoseGold,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(24.w, 0, 24.w, 16.h),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _sectionLabel('Cuisine'),
                    SizedBox(height: 10.h),
                    _chipGrid(_cuisineOptions, _cuisines, _toggleCuisine),
                    SizedBox(height: 22.h),
                    _sectionLabel('Music'),
                    SizedBox(height: 10.h),
                    _chipGrid(_genreOptions, _genres, _toggleGenre),
                    SizedBox(height: 24.h),
                  ],
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(24.w, 0, 24.w, 24.h),
              child: GestureDetector(
                onTap: _apply,
                child: Container(
                  width: double.infinity,
                  height: 52.h,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientPrimary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      _cuisines.isEmpty && _genres.isEmpty
                          ? 'Apply (no filters)'
                          : 'Apply ${_cuisines.length + _genres.length}',
                      style: GoogleFonts.poppins(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.backgroundDark,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String label) => Text(
        label.toUpperCase(),
        style: GoogleFonts.poppins(
          fontSize: 11.sp,
          color: AppColors.accentRoseGold,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
        ),
      );

  Widget _chipGrid(
    List<Map<String, String>> options,
    Set<String> selected,
    void Function(String) onToggle,
  ) =>
      Wrap(
        spacing: 8.w,
        runSpacing: 8.h,
        children: options.map((opt) {
          final value = opt['value']!;
          final label = opt['label']!;
          final isSelected = selected.contains(value);
          return GestureDetector(
            onTap: () => onToggle(value),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.accentRoseGold.withOpacity(0.15)
                    : AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected
                      ? AppColors.accentRoseGold
                      : AppColors.borderSubtle,
                  width: isSelected ? 1.2 : 0.6,
                ),
              ),
              child: Text(
                label,
                style: GoogleFonts.poppins(
                  fontSize: 12.sp,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  color: isSelected
                      ? AppColors.accentRoseGold
                      : AppColors.textPrimary,
                ),
              ),
            ),
          );
        }).toList(),
      );
}
