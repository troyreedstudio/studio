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
      // Auto-answer App Store "export compliance": the app uses only standard
      // HTTPS/TLS (exempt encryption), so no manual "Missing Compliance" step
      // blocks TestFlight/submission. Set false = exempt.
      config: {
        usesNonExemptEncryption: false,
      },
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
        // Microphone + speech recognition — required for the voice search feature.
        // Vision-camera itself never opens the mic (enableMicrophonePermission:false,
        // VID-02), but the iOS Speech framework used by expo-speech-recognition
        // needs both strings or App Store review will reject the binary.
        NSMicrophoneUsageDescription:
          'Let Me Check uses the microphone for voice search.',
        NSSpeechRecognitionUsageDescription:
          'Let Me Check uses speech recognition so you can search for a place by voice.',
        // NSPhotoLibraryUsageDescription intentionally absent: the app uses no
        // photo-library API (no MediaLibrary, CameraRoll, saveToPhotos, or
        // ImagePicker anywhere in the codebase). Declaring it unused would
        // trigger an Apple review query (5.1.1 minimum permissions).
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
      // Durable iOS deployment target 15.5. Set here so a clean prebuild
      // regenerates ios/ at 15.5 (ios/ is gitignored). The lmc-blur post-record
      // module (Vision + Core Image) is comfortable at this target.
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
      // expo-notifications plugin — adds the APNs entitlement to the iOS binary
      // (without this, push permission is granted but APNs rejects delivery).
      // SDK 54 deprecates the old top-level `notification` config key in favour of this plugin.
      // enableBackgroundRemoteNotifications defaults to false (correct for LMC — standard push only).
      ['expo-notifications', {}],
      // Voice search — iOS Speech framework + microphone.
      // Permissions are declared in ios.infoPlist above (NSSpeechRecognitionUsageDescription
      // + NSMicrophoneUsageDescription). The plugin wires the native Speech framework
      // entitlement so expo-speech-recognition works in Release builds (not Expo Go).
      'expo-speech-recognition',
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
    // On-device face blur — POST-RECORD path (Phase 8):
    // Faces are blurred AFTER recording by the first-party `lmc-blur` native
    // module (modules/lmc-blur — AVFoundation + Vision + Core Image), which
    // re-encodes the saved clip before upload. No third-party native blur
    // packages are required.
    // The OLD Phase-6 live-viewfinder scaffold (react-native-worklets-core,
    // react-native-vision-camera-face-detector, @shopify/react-native-skia +
    // the worklets-core babel plugin) was ABANDONED (08-CONTEXT D-02) and has
    // been REMOVED — it caused native build-linking fragility (undefined
    // RNWorklet symbol, Hermes heap corruption) with no benefit. Do NOT re-add it.
    // The dormant server-side detect-and-hold net (face-blur-check +
    // market_config.blur_enabled) remains as the last-resort fallback.
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
      // Google Places API key — empty string until the key is added to .env.
      // Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in lmc-app/.env to activate.
      googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
    },
    owner: 'troyreed26',
  },
};
