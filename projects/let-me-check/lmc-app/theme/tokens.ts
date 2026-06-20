// LMC design tokens — the single source of truth for the visual system.
//
// Change a value HERE and it flips everywhere a screen uses the token.
// Screens import from this file instead of hard-coding colours/fonts inline,
// so a redesign (or a dark↔light flip) becomes a one-place edit.
//
// Locked design system (see memory: feedback_lmc_color_system / _button_style):
//   green  = action / active / success / money
//   gold   = reward / ratings / premium / priority
//   navy   = selected-card surface only (not an action colour)
//   muted-white = quiet section labels
//   fonts: Inter (UI) · JetBrains Mono (numbers + button labels) · Orbitron (logo)

export const colors = {
  // ---- surfaces ----
  bg: '#000000',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.12)',
  card: '#0d0d0d',
  selectedSurface: 'rgba(20,55,130,0.5)', // deep navy — the "selected card" highlight
  selectedBorder: 'rgba(60,110,200,0.7)',

  // ---- text ----
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',
  label: 'rgba(255,255,255,0.55)', // section labels (muted white)

  // ---- brand / semantic ----
  action: '#00FF7F', // green — actions, active, success, money
  actionTint: 'rgba(0,255,127,0.12)',
  reward: '#FFCB47', // gold — rewards, ratings, priority/premium
  warning: '#FF6B00', // orange — logo / priority accent
  danger: '#FF3B30', // red — record button, destructive
  seeker: '#88B4FF', // Seeker identity (role pill)
  scout: '#00FF7F', // Scout identity = green

  // ---- buttons ----
  btnPrimaryBg: '#ffffff', // primary CTA: solid white on dark
  btnPrimaryText: '#000000',
  btnDisabledBg: 'rgba(255,255,255,0.12)',
  btnDisabledText: 'rgba(255,255,255,0.4)',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14, // default button/card radius
  xl: 18,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
} as const;

// Font families (loaded via @expo-google-fonts). Use the role, not the raw name,
// so we can swap a typeface in one place.
export const font = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium', // data / timers / prices
  monoBold: 'JetBrainsMono_700Bold', // emphasised numbers + button labels
  logo: 'Orbitron_700Bold', // the LET ME CHECK wordmark
} as const;

export const theme = { colors, radius, spacing, font } as const;
export default theme;
