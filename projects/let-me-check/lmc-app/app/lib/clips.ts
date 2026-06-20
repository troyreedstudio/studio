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
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

/**
 * VID-03/04: mint a single-use Mux direct-upload URL for this check via the
 * server-owned `mux-upload-url` Edge Function (which holds the Mux secret and
 * sets passthrough=checkId + signed playback policy). Throws on error.
 */
export async function requestUploadUrl(
  checkId: string,
): Promise<{ uploadUrl: string; uploadId: string }> {
  const { data, error } = await supabase.functions.invoke('mux-upload-url', {
    body: { checkId },
  });
  if (error) throw error;
  if (!data?.uploadUrl || !data?.uploadId) {
    throw new Error('requestUploadUrl: missing uploadUrl/uploadId in response');
  }
  return { uploadUrl: data.uploadUrl, uploadId: data.uploadId };
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
): Promise<void> {
  let attempt = 0;
  let delay = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await uploadClip(localPath, uploadUrl);
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
  const { data, error } = await supabase.functions.invoke('mux-playback-token', {
    body: { checkId },
  });
  if (error) throw error;
  if (!data?.token) throw new Error('getPlaybackToken: missing token in response');
  return data.token;
}
