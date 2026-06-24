// ── LMC Design Tokens ─────────────────────────────────────────────────────────
//
// LOCKED PALETTE — do not deviate from these values without a brand decision.
//
// Rules:
//   red (#DA251D)   Brand colour. Use for primary CTAs, action buttons, and
//                   accent marks. Every tap-to-act element is red on the LIGHT canvas.
//   white (#FFFFFF) App canvas. All screens use this as the background.
//   black (#0A0A0A) Primary text. Titles, body copy, any content on white.
//   grey             Secondary (#6B7280) and tertiary (#9CA3AF) text hierarchy.
//   verified green  (#16A34A) ONLY for semantic "verified / success / online" states.
//                   No other green in the app. Do not use for actions — that is red.
//   amber (#FFCB47) Priority badge only. Keeps existing priority tier distinction.
//   danger (#B0151B) Darker than brand red — reserved for destructive/error states
//                   so it reads as distinct from the brand accent.
//
// Blue is NOT in this palette. Retire any legacy #143782 / rgba(20,55,130,...) values.
// Green (#22c55e / #00FF7F) is retired from actions — replaced by red for CTAs and
// the verified token for status-only uses.

export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  red: '#DA251D',           // Primary brand + action
  white: '#FFFFFF',         // Canvas (backgrounds)
  black: '#000000',         // True black (for map elements, hard contrast)

  // ── Backgrounds / Surfaces ─────────────────────────────────────────────────
  bg: '#FFFFFF',            // App canvas
  surface: '#F5F5F7',       // Raised cards, input backgrounds
  surfaceAlt: '#FFFFFF',    // Alternate surface (flat on white canvas)

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary: '#0A0A0A',   // Titles, body copy
  textSecondary: '#6B7280', // Supporting labels, meta
  textTertiary: '#9CA3AF',  // Hints, placeholders, timestamps

  // ── Borders ────────────────────────────────────────────────────────────────
  border: '#E5E7EB',        // Default dividers and card borders
  borderStrong: '#D1D5DB',  // Inputs focused / highlighted

  // ── Actions ────────────────────────────────────────────────────────────────
  action: '#DA251D',        // Button fill — same as red (alias for semantic clarity)
  actionText: '#FFFFFF',    // Text on red buttons
  onRed: '#FFFFFF',         // Any text or mark placed on a red surface

  // ── Semantic states ────────────────────────────────────────────────────────
  verified: '#16A34A',      // ONLY for verified checkmarks, "online", success ticks
  danger: '#B0151B',        // Destructive / error (darker than brand red — visually distinct)

  // ── Retained accents ───────────────────────────────────────────────────────
  // amber: used for the PRIORITY tier badge only — keeps tier distinction intact.
  amber: '#FFCB47',
} as const;

export type ColorKey = keyof typeof colors;
