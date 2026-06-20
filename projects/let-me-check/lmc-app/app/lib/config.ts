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
