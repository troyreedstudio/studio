// Device-side clip upload + playback seam (VID-03 / VID-04).
//
// DO NOT mark delivered here — the webhook owns it (VID-03).
//
// The client's job is narrow and honest: ask a server-owned Edge Function for a
// single-use Mux direct-upload URL, PUT the locally recorded file straight to
// Mux (the bytes never touch our server), retry on a weak network, and STOP at
// "upload PUT returned success". The check is transitioned to `delivered` ONLY
// by the signature-verified Mux webhook (03-02) — never by this module. There is
// therefore no client-side delivered transition (no transition_check call) here.
//
// Secrets stay server-side: the device only ever holds a one-time upload URL and
// a short-lived playback JWT. No Mux token/secret lives in the RN bundle.
//
// Fresh-capture (VID-01) is enforced by ABSENCE: this module imports no gallery
// / photo-library API; the only clip source is the live recorder's path handed
// in as `localPath`.

// expo-file-system 19 (SDK 54) moved the resumable upload task API to the
// `/legacy` entry point; createUploadTask + FileSystemUploadType live there.
import { useCallback, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// ── Shared Edge Function fetch helper ─────────────────────────────────────────
// Plain fetch() with explicit 30s timeout, bypassing supabase.functions.invoke
// whose tslib.__awaiter generator chain can hang indefinitely on Hermes/Release.
async function invokeEdgeFunction(
  functionName: string,
  body: unknown,
): Promise<unknown> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      controller.signal.aborted
        ? `invokeEdgeFunction(${functionName}): timed out after 30s`
        : `invokeEdgeFunction(${functionName}): network error — ${msg}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { /* ignore */ }
    throw new Error(
      `invokeEdgeFunction(${functionName}): HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`invokeEdgeFunction(${functionName}): invalid JSON in response`);
  }
  return data;
}

/**
 * VID-03/04: mint a single-use Mux direct-upload URL for this check via the
 * server-owned `mux-upload-url` Edge Function (which holds the Mux secret and
 * sets passthrough=checkId + signed playback policy). Throws on error.
 *
 * Phase 5: accepts an optional `gps` param. When present, the filmed GPS
 * (lat/lng/accuracyM) is sent to the Edge Function which persists it on the
 * clips row (filmed_lat, filmed_lng, filmed_accuracy_m) so verify-clip has
 * real data to work with (VER-01). This closes the Phase-3 seam where
 * capturedGps.current was accepted by submit() but then silently ignored.
 */
export async function requestUploadUrl(
  checkId: string,
  gps?: { lat: number; lng: number; accuracyM?: number },
): Promise<{ uploadUrl: string; uploadId: string }> {
  const data = await invokeEdgeFunction('mux-upload-url', {
    checkId,
    filmed_lat: gps?.lat,
    filmed_lng: gps?.lng,
    filmed_accuracy_m: gps?.accuracyM,
  }) as Record<string, unknown>;
  if (!data?.uploadUrl || !data?.uploadId) {
    throw new Error('requestUploadUrl: missing uploadUrl/uploadId in response');
  }
  return { uploadUrl: data.uploadUrl as string, uploadId: data.uploadId as string };
}

/**
 * VID-03: PUT the locally recorded clip straight to the Mux upload URL using
 * expo-file-system's resumable upload task (Mux's official RN method). Throws on
 * any HTTP >= 300. Does NOT transition the check — the webhook owns `delivered`.
 */
export async function uploadClip(
  localPath: string,
  uploadUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const task = FileSystem.createUploadTask(
    uploadUrl,
    localPath,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    },
    (p) => {
      const total = p.totalBytesExpectedToSend || 0;
      if (onProgress && total > 0) onProgress(p.totalBytesSent / total);
    },
  );

  const res = await task.uploadAsync();
  if (!res || res.status >= 300) {
    throw new Error(`uploadClip: upload failed (status ${res?.status ?? 'unknown'})`);
  }
  // Intentionally returns here. DO NOT mark delivered — the webhook owns it (VID-03).
}

/**
 * VID-03: resilient upload on weak mobile networks. Wraps `uploadClip` in a
 * bounded exponential backoff (1s, 2s, 4s, 8s...) and throws after `max`
 * attempts. The local file is kept by the caller until this resolves, so a
 * dropped network can be resumed — and never produces a phantom delivery.
 */
export async function uploadWithRetry(
  localPath: string,
  uploadUrl: string,
  max = 4,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  let attempt = 0;
  let delay = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await uploadClip(localPath, uploadUrl, onProgress);
      return;
    } catch (e) {
      attempt += 1;
      if (attempt >= max) throw e;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/**
 * VID-04: fetch a short-lived signed Mux playback JWT for this check via the
 * `mux-playback-token` Edge Function, which verifies the caller owns the check
 * before signing. The delivery screen puts the returned token in the HLS URL so
 * the stream stays private to the buying Seeker. Throws on error.
 */
export async function getPlaybackToken(checkId: string): Promise<string> {
  const data = await invokeEdgeFunction('mux-playback-token', { checkId }) as Record<string, unknown>;
  if (!data?.token) throw new Error('getPlaybackToken: missing token in response');
  return data.token as string;
}

// ────────────────────────────────────────────────────────────────────────────
// Submit orchestration (extracted from filming.tsx — VID-03).
//
// This is the upload flow the Scout's filming screen drives on "submit", lifted
// OUT of the screen so the screen stays a thin presenter (CLAUDE.md <500 lines)
// and the orchestration is unit-testable in node. Given a locally recorded clip
// path it: mints a single-use Mux upload URL (requestUploadUrl), then PUTs the
// file with bounded retry (uploadWithRetry), surfacing progress + a small status
// machine. It NEVER transitions the check — `delivered` is owned by the
// signature-verified Mux webhook (03-02). The screen's job ends at 'processing'.
// ────────────────────────────────────────────────────────────────────────────

export type ClipUploadStatus = 'idle' | 'uploading' | 'processing' | 'error';

export type ClipUploadGps = { lat: number; lng: number; accuracyM?: number } | null;

export type UseClipUpload = {
  /** 0..1 upload fraction (drives the screen's progress bar). */
  progress: number;
  /** Small status machine the screen renders from. */
  status: ClipUploadStatus;
  /** Last error message when status === 'error', else null. */
  error: string | null;
  /**
   * Run the real submit flow for a freshly recorded clip. Resolves true once the
   * upload PUT succeeded (status -> 'processing'); resolves false on failure
   * (status -> 'error') so the Scout can retake/retry. Never throws to the
   * caller and never marks the check delivered.
   */
  submit: (checkId: string, localPath: string, gps?: ClipUploadGps) => Promise<boolean>;
  /** Reset back to idle (e.g. before a retry). */
  reset: () => void;
};

/**
 * VID-03: the extracted recorder-upload orchestration the thin filming screen
 * calls. Composes requestUploadUrl + uploadWithRetry, exposes progress/status,
 * and — by construction — never calls transition_check (the webhook owns
 * `delivered`). The optional GPS stamp is accepted for the provenance trail but
 * is not verified here (verification is Phase 5).
 */
export function useClipUpload(): UseClipUpload {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ClipUploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  // Guard against a double-submit while an upload is already in flight.
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    inFlight.current = false;
    setProgress(0);
    setStatus('idle');
    setError(null);
  }, []);

  const submit = useCallback(
    async (checkId: string, localPath: string, gps?: ClipUploadGps): Promise<boolean> => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setStatus('uploading');
      setProgress(0);
      setError(null);
      try {
        // Phase 5: forward filmed GPS (incl. accuracy) to mux-upload-url so it
        // persists filmed_lat/lng/accuracy_m on the clips row for verify-clip (VER-01).
        const gpsArg = gps
          ? { lat: gps.lat, lng: gps.lng, accuracyM: gps.accuracyM }
          : undefined;
        const { uploadUrl } = await requestUploadUrl(checkId, gpsArg);
        await uploadWithRetry(localPath, uploadUrl, 4, (f) => setProgress(f));
        // Upload PUT returned success. We STOP here — the webhook drives the
        // check to delivered. The screen shows "processing" until Realtime flips.
        setProgress(1);
        setStatus('processing');
        inFlight.current = false;
        return true;
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Upload failed');
        inFlight.current = false;
        return false;
      }
    },
    [],
  );

  return { progress, status, error, submit, reset };
}
