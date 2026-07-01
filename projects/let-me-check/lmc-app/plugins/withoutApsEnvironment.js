// Expo config plugin — removes the `aps-environment` (Push Notifications)
// entitlement from the generated iOS entitlements.
//
// Push is DEFERRED post-v1 (see app.config.js). Even with the expo-notifications
// plugin unlisted, something in the dependency graph still injects
// `aps-environment` during `expo prebuild`, which makes the production build fail:
// the auto-generated provisioning profile has no Push capability, so signing is
// rejected. Stripping the entitlement here (runs last, after every other mod)
// makes the app's entitlements match the profile and lets the headless build pass.
//
// To restore Push: re-add ['expo-notifications', {}] in app.config.js, remove this
// plugin from the plugins array, and run `eas credentials -p ios` once interactively
// to create the APNs push key, then rebuild.
const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withoutApsEnvironment(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
