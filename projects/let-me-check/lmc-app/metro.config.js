// Metro config for LMC.
//
// Keep *.test.ts(x) out of the app bundle. Vitest finds and runs them via its own
// tooling (it does not use Metro), but Expo Router's route scan would otherwise pull
// them — and the testing libs they import (vitest/vite, which use `import.meta`) — into
// the shipped JS bundle, which Hermes cannot compile. Blocking them here removes the
// test code from the app entirely.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const TEST_FILES = /.*\.test\.(ts|tsx)$/;
const existing = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existing)
  ? [...existing, TEST_FILES]
  : existing
    ? [existing, TEST_FILES]
    : [TEST_FILES];

module.exports = config;
