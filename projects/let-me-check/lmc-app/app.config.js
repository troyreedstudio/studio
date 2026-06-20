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
    ],
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
