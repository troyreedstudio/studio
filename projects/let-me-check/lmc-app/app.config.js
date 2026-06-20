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
        NSMicrophoneUsageDescription:
          'Let Me Check uses your microphone for sound in verification clips.',
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
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: '59bc5e82-de99-4541-b883-82e09005acfc',
      },
    },
    owner: 'troyreed26',
  },
};
