// Expo config plugin — adds `use_modular_headers!` to the generated Podfile.
//
// The Google Sign-In transitive pods (AppCheckCore -> GoogleUtilities,
// RecaptchaInterop) are Swift pods that don't define modules, so a static-library
// `pod install` fails unless modular headers are enabled. Doing this as a config
// plugin makes it survive `expo prebuild` (a manual Podfile edit gets wiped every
// time the native project is regenerated, e.g. when a native dep like
// react-native-vision-camera is added).
const { withPodfile } = require('@expo/config-plugins');

module.exports = function withModularHeaders(config) {
  return withPodfile(config, (cfg) => {
    const contents = cfg.modResults.contents;
    if (!contents.includes('use_modular_headers!')) {
      // Insert right after the `platform :ios, ...` line.
      cfg.modResults.contents = contents.replace(
        /(platform :ios[^\n]*\n)/,
        `$1use_modular_headers!\n`
      );
    }
    return cfg;
  });
};
