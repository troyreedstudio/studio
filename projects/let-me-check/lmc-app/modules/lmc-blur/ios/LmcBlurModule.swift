import ExpoModulesCore
import os

// STEP 3 (08-03): AVFoundation re-encode + Vision detection + Core Image BLUR.
//
// blurFaces now actually obscures faces. Flow:
//   1. Vision face detection on SAMPLED frames → per-time face rects + count.
//   2a. ZERO faces → skip the blur/export entirely, return the ORIGINAL file
//       untouched with status 'no_faces' (re-encoding a face-free clip is wasted
//       work; the original is already safe to deliver).
//   2b. faces found → re-encode through AVFoundation (video-only, VID-02) with the
//       LmcFaceBlur compositor masking a CIGaussianBlur/CIPixellate over each face
//       rect, into a NEW playable temp file → status 'blurred' with the count.
//   3. ANY error (detect/export/blur throws) → return the INPUT path with status
//      'failed' so the caller uses the fallback (D-04). NEVER return the sharp
//      file labelled 'blurred' (Pitfall 5 / T-08-09) — the single most important
//      privacy invariant.
//
// Tunables (radius/mode) come from the JS BlurOptions; blur-config.ts holds the
// app-side defaults (BLUR_POST_RECORD_RADIUS / _MODE) the wrapper passes in.
//
// blurFaces is a plain AsyncFunction (Promise-backed) — there is NO frame-processor
// or worklet/JSI camera-thread bridge here, so the worklets-core SIGSEGV class
// (06-RESEARCH-BLUR-V2 Part 1) structurally cannot fire.
public class LmcBlurModule: Module {
  private let log = Logger(subsystem: "com.letmecheck.lmcblur", category: "blur")

  public func definition() -> ModuleDefinition {
    Name("LmcBlur")

    AsyncFunction("blurFaces") { (inputPath: String, options: [String: Any]?, promise: Promise) in
      Task { [log] in
        // Parse optional tunables (radius/mode) from JS; defaults live in LmcFaceBlur.
        let radius = (options?["radius"] as? NSNumber)?.doubleValue ?? 18.0
        let mode = LmcBlurMode.from(options?["mode"] as? String)
        let blur = LmcFaceBlur(radius: radius, mode: mode)

        do {
          // 1. Detect faces on the ORIGINAL asset (per-time rects + count).
          let detection = try await LmcFaceDetect.detectFaces(inputPath: inputPath)
          let faceCount = detection.faceCount
          log.info("LmcBlur: Vision detected \(faceCount, privacy: .public) face(s) across \(detection.detections.count, privacy: .public) sampled frame(s)")

          // 2a. No faces → return the original untouched (safe; no wasted re-encode).
          guard faceCount > 0 else {
            log.info("LmcBlur: no faces — returning original untouched (no_faces)")
            promise.resolve([
              "outputPath": inputPath,
              "facesBlurred": 0,
              "status": "no_faces",
            ])
            return
          }

          // 2b. Faces found → re-encode WITH the blur composite over the rects.
          let outputPath = try await LmcVideoExport.reencode(
            inputPath: inputPath,
            detections: detection.detections,
            blur: blur
          )
          let outputURI = "file://\(outputPath)"
          log.info("LmcBlur: blurred \(faceCount, privacy: .public) face(s) → \(outputURI, privacy: .public) (audio-free)")
          promise.resolve([
            "outputPath": outputURI,
            "facesBlurred": faceCount,
            "status": "blurred",
          ])
        } catch {
          // ANY failure (detect/export/blur) → NEVER pass the sharp file as
          // blurred. Return the input with status 'failed' so the caller uses the
          // fallback (D-04 / Pitfall 5).
          log.error("LmcBlur: blur pipeline failed: \(error.localizedDescription, privacy: .public)")
          promise.resolve([
            "outputPath": inputPath,
            "facesBlurred": 0,
            "status": "failed",
          ])
        }
      }
    }
  }
}
