---
status: awaiting_human_verify
trigger: "Fix on-device clip upload broken after New Architecture enabled"
created: 2026-06-21T00:00:00Z
updated: 2026-06-21T00:00:00Z
---

## Current Focus

hypothesis: expo-file-system/legacy createUploadTask silently no-ops under New Architecture (RN 0.83 / SDK 54 / newArchEnabled:true), so the PUT to Mux never fires
test: replace legacy upload task with the new File class createUploadTask from expo-file-system (no /legacy suffix), which is built for New Architecture
expecting: PUT reaches Mux, mux_asset_id gets set, asset.ready webhook fires
next_action: implement fix in lmc-app/app/lib/clips.ts + fix optimistic UI in submitted.tsx

## Symptoms

expected: Scout records clip, submits, bytes are PUT to Mux upload URL, Mux fires asset.ready webhook, check transitions to delivered
actual: clips row created with mux_upload_id but NO mux_asset_id / mux_playback_id; Mux webhook never fires; check stuck in filming/pending; no upload bytes reach Mux server
errors: no JS error thrown (silent failure) — upload PUT appears to start but no bytes travel
reproduction: open filming screen, record 15s clip, tap Submit; observe no Mux asset after 3+ minutes
started: today, when ios.newArchEnabled: true was set in app.config.js to fix Google Sign-In

## Eliminated

- hypothesis: Mux upload URL invalid / Edge Function mux-upload-url broken
  evidence: clips row has mux_upload_id set, which only happens after mux-upload-url returns successfully — the server side is working
  timestamp: 2026-06-21

- hypothesis: network blip
  evidence: reproduced consistently over 3+ minutes; not a transient issue
  timestamp: 2026-06-21

- hypothesis: capturedPath null (no file recorded)
  evidence: filming screen guards against null path before calling clipUpload.submit(); also camera is real vision-camera so files are produced
  timestamp: 2026-06-21

## Evidence

- timestamp: 2026-06-21
  checked: app.config.js
  found: ios.newArchEnabled: true added today to fix Google Sign-In; this is the ONLY change between working and broken state
  implication: New Architecture is the trigger

- timestamp: 2026-06-21
  checked: lmc-app/app/lib/clips.ts uploadClip()
  found: imports from expo-file-system/legacy; uses FileSystem.createUploadTask() + task.uploadAsync() — the old resumable task API
  implication: legacy API is the failure point; it does not bridge correctly to the New Architecture JSI/TurboModule layer

- timestamp: 2026-06-21
  checked: expo-file-system 19 (SDK 54) architecture split
  found: SDK 54 moved the new class-based File/Directory API to the default expo-file-system export (New Arch safe); pushed old NSURLSession resumable tasks API to /legacy. The /legacy entry point uses old bridge (NativeModule) which cannot reliably fire in RN 0.83 New Arch (bridgeless) — it can silently no-op or return without actually executing the background NSURLSession task.
  implication: switching to new File class createUploadTask fixes this

- timestamp: 2026-06-21
  checked: expo github issue #42420
  found: "no API provided to get the progress while uploading a file" in new API (reported Jan 2026); guidance is expo/fetch or new File class createUploadTask
  implication: new File class createUploadTask DOES support progress via onProgress option

- timestamp: 2026-06-21
  checked: Mux RN docs
  found: Mux direct upload = PUT of raw file bytes to single-use URL; Content-Type video/* preferred; no auth header needed on the upload URL itself
  implication: new File.createUploadTask with httpMethod PUT and UploadType.BINARY_CONTENT is the correct replacement

- timestamp: 2026-06-21
  checked: submitted.tsx stage machine
  found: hardcoded 2.2s / 4.4s timeouts auto-advance through verifying->delivered->accepted REGARDLESS of real upload status; shows "payment cleared" after 4.4s even if upload failed silently
  implication: optimistic UI actively masks failures; must be tied to real upload outcome passed from filming.tsx

## Resolution

root_cause: expo-file-system/legacy createUploadTask uses the old NativeModule bridge, which silently no-ops under New Architecture (RN 0.83 bridgeless). The background NSURLSession PUT task is created but never actually fires because the legacy bridge cannot schedule it in the New Arch runtime. Enabling newArchEnabled:true today was the trigger.

fix: 
  1. Replace legacy upload in clips.ts: import { File, UploadType } from 'expo-file-system' (no /legacy); use new File(localPath).createUploadTask(uploadUrl, { httpMethod: 'PUT', uploadType: UploadType.BINARY_CONTENT, onProgress }) + task.uploadAsync(). Keep uploadWithRetry wrapper and progress/error contracts unchanged.
  2. Fix submitted.tsx optimistic UI: receive real upload outcome (uploadOk: boolean) via route param from filming.tsx; start the timeline from real state rather than faking all stages on auto-timers.

verification: empty until verified
files_changed: [lmc-app/app/lib/clips.ts, lmc-app/app/(scout)/submitted.tsx, lmc-app/app/(scout)/filming.tsx]
