import 'package:flutter/material.dart';

/// Pink Pineapple — Design System colour tokens
///
/// Source of truth: `projects/pink-pineapple/docs/DESIGN-SYSTEM.md` (LOCKED)
/// Dark-first luxury aesthetic — pure black backgrounds, rose-gold gradient.
///
/// When adding new colours, add them to DESIGN-SYSTEM.md first, then mirror
/// the token here. Do NOT introduce hex literals outside this file.
class AppColors {
  // ═══════════════════════════════════════════════════════════════
  // CORE SURFACES
  // ═══════════════════════════════════════════════════════════════

  /// App background — pure black.
  static const Color background = Color(0xFF000000);

  /// Cards, input fields, overlays.
  static const Color surface = Color(0xFF1A1A1A);

  /// Elevated cards, modals, raised sheets.
  static const Color surfaceElevated = Color(0xFF2A2A2A);

  // ═══════════════════════════════════════════════════════════════
  // BRAND GRADIENT — Rose-Gold
  // ═══════════════════════════════════════════════════════════════

  /// Gradient start — deep rose.
  static const Color gradientStart = Color(0xFF8B4060);

  /// Gradient midpoint — the signature Pink Pineapple accent / solid fallback.
  static const Color gradientMid = Color(0xFFC4707E);

  /// Gradient end — soft pink.
  static const Color gradientEnd = Color(0xFFE8A0B0);

  /// Primary brand gradient — use for CTAs, highlights, active states.
  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [gradientStart, gradientEnd],
  );

  /// Diagonal variant (135deg) — matches the CSS `--pp-gradient` token.
  static const LinearGradient brandGradientDiagonal = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [gradientStart, gradientEnd],
  );

  /// Dark background gradient — transparent → black, for hero image fades.
  static const LinearGradient gradientDark = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x00000000), Color(0xFF000000)],
  );

  /// Card overlay gradient — fade venue hero image to text area.
  static const LinearGradient gradientOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x00000000), Color(0xCC000000)],
  );

  // ═══════════════════════════════════════════════════════════════
  // TEXT
  // ═══════════════════════════════════════════════════════════════

  /// Headlines, primary text.
  static const Color textPrimary = Color(0xFFFFFFFF);

  /// Descriptions, secondary info.
  static const Color textSecondary = Color(0xFFB0B0B0);

  /// Timestamps, tertiary info.
  static const Color textMuted = Color(0xFF6B6B6B);

  // ═══════════════════════════════════════════════════════════════
  // SEMANTIC
  // ═══════════════════════════════════════════════════════════════

  /// Open status, confirmations.
  static const Color successColor = Color(0xFF00C853);

  /// Closing soon, limited availability.
  static const Color warningColor = Color(0xFFFFB800);

  /// Errors, closed status.
  static const Color errorColor = Color(0xFFFF3B3B);

  /// Star ratings (same hex as warning).
  static const Color ratingColor = Color(0xFFFFB800);

  /// Active bottom-nav tab indicator.
  static const Color navActive = Color(0xFFC4707E);

  // ═══════════════════════════════════════════════════════════════
  // BORDERS & DIVIDERS
  // ═══════════════════════════════════════════════════════════════

  static const Color borderSubtle = Color(0xFF2A2A2A);
  static const Color borderAccent = Color(0xFF3A3A3A);
  static const Color dividerColor = Color(0xFF1A1A1A);

  // ═══════════════════════════════════════════════════════════════
  // LEGACY ALIASES
  // ───────────────────────────────────────────────────────────────
  // Kept so existing widgets keep compiling while we migrate call
  // sites to the canonical tokens above. Do NOT add new aliases —
  // use the canonical names for any new code.
  // ═══════════════════════════════════════════════════════════════

  /// Legacy → `gradientMid`. Signature Pink Pineapple rose.
  static const Color primaryColor = gradientMid;

  /// Legacy → `background`. Pure black.
  static const Color secondaryColor = background;

  /// Legacy → `gradientMid`. Button/CTA fill.
  static const Color buttonColor = gradientMid;

  /// Legacy → `textPrimary`. White text on dark buttons.
  static const Color buttonTextColor = textPrimary;

  /// Legacy → `textPrimary`. Default body text colour.
  static const Color textColor = textPrimary;

  /// Legacy → `background`.
  static const Color backgroundDark = background;

  /// Legacy → `surface`.
  static const Color backgroundCard = surface;

  /// Legacy → `surface`.
  static const Color backgroundSurface = surface;

  /// Legacy → `surfaceElevated`.
  static const Color backgroundElevated = surfaceElevated;

  /// Legacy → `gradientStart`. Deep rose.
  static const Color accentRoseGold = gradientStart;

  /// Legacy → `gradientEnd`. Soft pink.
  static const Color accentChampagne = gradientEnd;

  /// Legacy → `gradientMid`. Mid rose / default brand colour.
  static const Color accentDeepRose = gradientMid;

  /// Legacy → `errorColor`.
  static Color redColor = Colors.red[400]!;

  /// Legacy → `successColor`.
  static Color greenColor = Colors.green[400]!;

  /// Legacy → `textPrimary`.
  static const Color whiteColor = Colors.white;

  /// Legacy → `brandGradientDiagonal`. Same rose-gold, diagonal direction.
  static const LinearGradient gradientColor = brandGradientDiagonal;

  /// Legacy → `brandGradientDiagonal`. Canonical name for the primary CTA gradient.
  static const LinearGradient gradientPrimary = brandGradientDiagonal;

  /// Legacy (typo, used in image_picker_controller) → `borderSubtle`.
  static const Color boderColor = borderSubtle;

  /// Legacy → `surface`. Used for outlined/ghost button backgrounds.
  static const Color buttonBg = surface;

  /// Legacy → `textPrimary`. Default icon colour on dark surfaces.
  static const Color iconColor = textPrimary;
}
