module.exports = function (api) {
  api.cache(true);
  return {
    // Expo SDK 54 default. The worklets-core babel plugin (and its proposal
    // plugins) was removed alongside the abandoned live-blur scaffold — the
    // post-record lmc-blur module needs no babel transforms.
    presets: ['babel-preset-expo'],
  };
};
