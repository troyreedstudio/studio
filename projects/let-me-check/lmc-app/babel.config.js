module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Phase 6 (on-device blur): the worklets-core plugin compiles the 'worklet'
    // directives in _filming-blur-overlay.tsx (the vision-camera face-detector
    // frame processor). Must be last in the plugins list. Harmless when the
    // BLUR_NATIVE_ENABLED flag is off (no worklets are mounted).
    plugins: [['react-native-worklets-core/plugin']],
  };
};
