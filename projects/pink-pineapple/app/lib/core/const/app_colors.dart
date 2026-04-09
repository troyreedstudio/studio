import 'package:flutter/material.dart';

/// Pink Pineapple Brand Colors
/// Dark luxury aesthetic — deep rose gradient, pure black backgrounds
/// Palette locked in with Frankie: #8B4060 → #C4707E → #E8A0B0
class AppColors {
  // === BRAND PRIMARIES ===
  /// Mid rose — the signature Pink Pineapple accent
  static const Color primaryColor = Color(0xFFC4707E);

  /// Mid rose — buttons, CTAs, highlights
  static const Color buttonColor = Color(0xFFC4707E);

  /// Pure black background — luxury dark-first
  static const Color secondaryColor = Color(0xFF000000);

  // === BACKGROUNDS ===
  static const Color backgroundDark = Color(0xFF000000);
  static const Color backgroundCard = Color(0xFF1A1A1A);
  static const Color backgroundSurface = Color(0xFF1A1A1A);
  static const Color backgroundElevated = Color(0xFF2A2A2A);

  // === TEXT ===
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B0B0);
  static const Color textMuted = Color(0xFF6B6B6B);
  static const Color textColor = Color(0xFFFFFFFF); // alias for legacy usage

  // === ACCENTS ===
  /// Deep rose — gradient start
  static const Color accentRoseGold = Color(0xFF8B4060);
  /// Soft pink — gradient end
  static const Color accentChampagne = Color(0xFFE8A0B0);
  /// Mid rose — default brand colour
  static const Color accentDeepRose = Color(0xFFC4707E);

  // === STATUS ===
  static Color redColor = Colors.red[400]!;
  static Color greenColor = Colors.green[400]!;
  static const Color successColor = Color(0xFF00C853);
  static const Color errorColor = Color(0xFFFF3B3B);

  // === MISC ===
  static const Color whiteColor = Colors.white;
  static const Color buttonTextColor = Color(0xFFFFFFFF);

  // === GRADIENTS ===
  /// Primary deep-rose gradient — use for CTAs, highlights, active states
  static const LinearGradient gradientPrimary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF8B4060), Color(0xFFE8A0B0)],
  );

  /// Legacy gradient color alias — points to primary
  static const LinearGradient gradientColor = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF8B4060), Color(0xFFE8A0B0)],
  );

  /// Dark background gradient — use behind hero images
  static const LinearGradient gradientDark = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x00000000), Color(0xFF000000)],
  );

  /// Overlay gradient — use on venue cards to fade image to text
  static const LinearGradient gradientOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x00000000), Color(0xCC000000)],
  );

  // === BORDERS & DIVIDERS ===
  static const Color borderSubtle = Color(0xFF2A2A2A);
  static const Color borderAccent = Color(0xFF3A3A3A);
  static const Color dividerColor = Color(0xFF1A1A1A);
}
