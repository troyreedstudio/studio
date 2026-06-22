module.exports = {
  expo: {
    name: 'Let Me Check',
    slug: 'lmc-app',
    scheme: 'lmc',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'Com.BlackMalibuinc.letmecheck',
      // Explicitly declare New Architecture ON so expo prebuild writes
      // "newArchEnabled":"true" into ios/Podfile.properties.json, which makes
      // the RNGoogleSignin podspec take the `install_modules_dependencies(s)`
      // TurboModule branch instead of the Old Arch React-Core branch.
      // Without this, a clean prebuild after the stripe 0.67.0 bump (which
      // activated stripe-react-native/NewArch) would leave RNGoogleSignin on
      // Old Arch native bridges — causing GoogleSignin.configure() / signIn()
      // to silently no-op on device. stripe-react-native 0.67.0 fully supports
      // New Architecture, so enabling it here does not break Stripe.
      newArchEnabled: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Let Me Check uses your location to find nearby Scouts and verified venues.',
        NSCameraUsageDescription:
          'Let Me Check uses your camera to film verification clips.',
        // No microphone usage string: clips are video-only (audio is never
        // captured — VID-02). vision-camera is configured with the mic disabled.
        NSPhotoLibraryUsageDescription:
          'Let Me Check uses your photo library to save your past check videos.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.blackmalibuinc.letmecheck',
      adaptiveIcon: {
        backgroundColor: '#000000',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      // Durable iOS deployment target 15.5 (Phase 6): MLKit face detector
      // (react-native-vision-camera-face-detector) requires iOS >= 15.5. Set here
      // so a clean prebuild regenerates ios/ at 15.5 (ios/ is gitignored).
      ['expo-build-properties', { ios: { deploymentTarget: '15.5' } }],
      'expo-router',
      'expo-font',
      'expo-video',
      'expo-secure-store',
      // Live in-app capture. Mic disabled so audio is never opened/recorded
      // (VID-02, a hard legal requirement) and no mic permission is requested.
      ['react-native-vision-camera', { enableMicrophonePermission: false }],
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
        },
      ],
      'expo-apple-authentication',
      [
        '@react-native-google-signin/google-signin',
        {
          // Reversed iOS client ID (com.googleusercontent.apps.<ios-client-id>)
          iosUrlScheme:
            'com.googleusercontent.apps.676403846721-denqiskp74ddp8s5ich1rpqdqhfkr5sq',
        },
      ],
      // Durable Podfile `use_modular_headers!` so prebuild can't wipe the Google
      // Sign-In modular-headers fix (AppCheckCore/GoogleUtilities/RecaptchaInterop).
      './plugins/withModularHeaders',
      ['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.com.blackmalibuinc.letmecheck', enableGooglePay: true }],
    ],
    // New Architecture is explicitly ON (ios.newArchEnabled:true above).
    // stripe-react-native 0.67.0 fully supports New Architecture.
    // @react-native-google-signin/google-signin 16.x supports New Architecture
    // via its RCT_NEW_ARCH_ENABLED ifdef — requires newArchEnabled:true here so
    // expo prebuild writes it into ios/Podfile.properties.json and pod install
    // picks up install_modules_dependencies(s) (TurboModule deps) instead of
    // the Old Arch React-Core branch.
    //
    // Phase 6 Category B — on-device blur native stack:
    // Three new native packages were added (06-05-PLAN.md Task 1):
    //   - react-native-worklets-core@1.6.3  (frame processor worklet runtime)
    //   - react-native-vision-camera-face-detector@1.10.2  (MLKit face detector; v1.x for v4.7.x compat — v2.x requires vision-camera v5+)
    //   - @shopify/react-native-skia@2.6.6  (Skia Canvas blur overlay; expo-suggested was 2.2.12 but 2.6.6 pinned per RESEARCH)
    //   - NOTE: react-native-vision-camera-skia has NO v4-compatible version (all versions are v5.x).
    //     The blur overlay falls back to a plain Skia <Canvas> positioned over the viewfinder.
    //   - NOTE: babel.config.js not yet created. The worklets-core babel plugin
    //     ("react-native-worklets-core/plugin") must be added to babel.config.js
    //     before BLUR_NATIVE_ENABLED is flipped true — otherwise 'worklet' directives
    //     in _filming-blur-overlay.tsx will not be compiled for the runtime.
    // New-Arch compatibility is UNVERIFIED for this exact combo on Expo 54 / RN 0.83.2
    // (06-RESEARCH A1-A3). Prior New-Arch bites: createUploadTask + google-signin.
    // BLUR_NATIVE_ENABLED defaults false. Do NOT enable until:
    //   (1) The EAS dev build boots cleanly (Category B — orchestrator runs overnight).
    //   (2) Troy confirms faces are blurred in the filming viewfinder (Category C).
    //   (3) blur_enabled = true is set in market_config (server gate, Plan 04).
    extra: {
      router: {},
      eas: {
        projectId: '59bc5e82-de99-4541-b883-82e09005acfc',
      },
      // Public Supabase config — bundled into the manifest so Release builds have it
      // (Release does not inline .env). The anon key is the public, RLS-protected key.
      supabaseUrl: 'https://cawqasszfbzvbtunamda.supabase.co',
      supabaseAnonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhd3Fhc3N6ZmJ6dmJ0dW5hbWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MjAwMjUsImV4cCI6MjA5NzQ5NjAyNX0.h2y8PmDXKJodAgFOzHdxtg-6UCZvvu9WEZyJWV1n_S0',
      // Public Google OAuth client IDs (also bundled so Release builds have them).
      googleWebClientId:
        '676403846721-n1u58r2tdp07n9qb536782kllcgukfnf.apps.googleusercontent.com',
      googleIosClientId:
        '676403846721-denqiskp74ddp8s5ich1rpqdqhfkr5sq.apps.googleusercontent.com',
    },
    owner: 'troyreed26',
  },
};
