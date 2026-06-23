// Public app config, bundled DIRECTLY into the JS so it works in every build type.
//
// Why not expo-constants / app.config `extra`? On a Release build on a physical
// device, the native ExponentConstants module is not reliably linked
// ("No native ExponentConstants module found"), so `Constants.expoConfig` is null
// and `extra` is unavailable — the app crashed at boot with "supabaseUrl is
// required". And Release builds do NOT inline `.env` EXPO_PUBLIC_* either. A plain
// TS module is the one source that is ALWAYS present in the bundle.
//
// Everything here is PUBLIC by design:
//  - the Supabase anon key is the RLS-protected public key (NOT the service role),
//  - Google OAuth client IDs are client-side identifiers,
//  - the Mapbox token below is a public (pk.) token.
// No secret (service-role key, Mux secret, Mapbox sk. token) belongs in this file.
//
// `process.env.EXPO_PUBLIC_*` is kept as an OPTIONAL override for the dev server;
// the hardcoded value is the guaranteed fallback so these are never undefined.

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://cawqasszfbzvbtunamda.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhd3Fhc3N6ZmJ6dmJ0dW5hbWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MjAwMjUsImV4cCI6MjA5NzQ5NjAyNX0.h2y8PmDXKJodAgFOzHdxtg-6UCZvvu9WEZyJWV1n_S0';

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  '676403846721-n1u58r2tdp07n9qb536782kllcgukfnf.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '676403846721-denqiskp74ddp8s5ich1rpqdqhfkr5sq.apps.googleusercontent.com';

// Public Mapbox access token (pk.). Safe to bundle: it ships in the app and is
// the runtime token for map tiles. The SECRET download token (sk.) is build-only
// and lives in .env / app.config plugin — it must NEVER appear here.
export const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
  'pk.eyJ1IjoibGV0bWVjaGVjayIsImEiOiJjbXBvN2k3cGQwMHZtMnZzZG8yaDZwZ2UwIn0.zAh2Xt_hERJW2Z_yihiWzA';

// Stripe PUBLISHABLE key — public by design (never put the secret key here).
// Hardcoded as a fallback so release builds work without .env or expo-constants.
// EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env overrides this for dev server.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
  'pk_test_51TkdlePlOqOhCKIqky9Zlvs2NvN62pA7gSEhjauZr9HNgdo07l79JPeniCe1IwcbhbrtyWuxHWtkkRcraaF3ehT500SOpsOCmG';

// EAS project ID — bundled directly so it is ALWAYS present in Release builds.
// Constants.expoConfig is null on Release builds (no native ExponentConstants link),
// so we NEVER read from expo-constants Extra. Same pattern as SUPABASE_URL.
// This value is the public EAS projectId (not a secret).
export const EAS_PROJECT_ID = '59bc5e82-de99-4541-b883-82e09005acfc';

// Google Places API key — browser/mobile key with Places API enabled.
// To activate real search:
//   1. Go to console.cloud.google.com → APIs & Services → Credentials
//   2. Create (or copy) a key with "Places API" enabled
//   3. Paste it as EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in lmc-app/.env
//   4. Restart the Expo dev server (npm start)
//
// Release builds: hard-code the key here as the fallback (same pattern as
// MAPBOX_TOKEN above). Empty string = graceful "search unavailable" state.
// NEVER put a secret key here — this file is bundled into the JS.
export const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
