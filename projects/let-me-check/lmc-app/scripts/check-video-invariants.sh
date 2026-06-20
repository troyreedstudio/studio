#!/usr/bin/env bash
# Phase 3 (Video Pipeline) hard invariants gate.
#
# Re-runnable per commit by the executor and re-run after the screens are wired
# (03-05). Exits non-zero on ANY violation. Each gate maps to a locked decision /
# threat in 03-RESEARCH / 03-03-PLAN:
#   1. VID-01  fresh-capture by ABSENCE   — no gallery / image-picker import path
#   2. VID-02  audio off                  — mic never enabled at the camera/config
#   3. VID-03  client never delivers       — no p_to:'delivered' anywhere in app
#   4. T-03-07 no Mux secret in the bundle — no Mux token/signing-key string in app
#
# Run from anywhere: paths resolve relative to this script's location.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"   # lmc-app/
APP_DIR="${APP_ROOT}/app"
APP_CONFIG="${APP_ROOT}/app.config.js"

fail=0

# 1. VID-01 — no gallery / camera-roll import path (fresh-capture by absence)
if grep -rEi "image-picker|launchImageLibrary" "${APP_DIR}" >/dev/null 2>&1; then
  echo "VIOLATION (VID-01): a gallery / image-picker import path exists under app/"
  grep -rEin "image-picker|launchImageLibrary" "${APP_DIR}"
  fail=1
fi

# 2. VID-02 — audio must be off (no audio={true}, no enableAudio:true, no mic perm)
if grep -rEi "audio=\{true\}|enableAudio: ?true|enableMicrophonePermission: ?true" "${APP_DIR}" "${APP_CONFIG}" >/dev/null 2>&1; then
  echo "VIOLATION (VID-02): audio capture / microphone is enabled somewhere"
  grep -rEin "audio=\{true\}|enableAudio: ?true|enableMicrophonePermission: ?true" "${APP_DIR}" "${APP_CONFIG}"
  fail=1
fi

# 3. VID-03 — the client must NEVER transition a check to delivered
if grep -rn "p_to: *'delivered'" "${APP_DIR}" >/dev/null 2>&1; then
  echo "VIOLATION (VID-03): a client-side p_to:'delivered' transition exists (webhook owns delivered)"
  grep -rn "p_to: *'delivered'" "${APP_DIR}"
  fail=1
fi

# 4. T-03-07 — no Mux secret / signing key may live in the RN bundle
if grep -rEi "MUX_TOKEN_SECRET|MUX_SIGNING_PRIVATE_KEY|mux.*tokenSecret" "${APP_DIR}" "${APP_CONFIG}" >/dev/null 2>&1; then
  echo "VIOLATION (T-03-07): a Mux secret / signing key appears in the app bundle"
  grep -rEin "MUX_TOKEN_SECRET|MUX_SIGNING_PRIVATE_KEY|mux.*tokenSecret" "${APP_DIR}" "${APP_CONFIG}"
  fail=1
fi

if [ "${fail}" -ne 0 ]; then
  echo "video-invariants FAILED"
  exit 1
fi

echo "video-invariants OK"
exit 0
