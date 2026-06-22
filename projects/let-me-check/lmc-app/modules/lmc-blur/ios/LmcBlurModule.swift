import ExpoModulesCore
import os

// STEP 2 (08-02): AVFoundation re-encode + Vision face detection. NO BLUR YET.
//
// blurFaces now:
//   1. runs Vision face detection on SAMPLED frames and reports a plausible count
//      (logged to the device console for the Step-2 gate).
//   2. re-encodes the recorded file through AVFoundation (video track only,
//      VID-02) into a NEW playable temp file — Plan 03 swaps the passthrough for a
//      CIFilter.
//
// It returns status 'no_faces' on success because NO pixels are blurred yet
// (Pitfall 5 — never claim 'blurred' until pixels actually change), or 'failed'
// if the export errors (caller uses the fallback, D-04). The DETECTED face count
// rides in facesBlurred as telemetry; the status stays honest.
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
        // 1. Vision face detection (count only — no blur) on the ORIGINAL asset.
        var faceCount = 0
        do {
          let detection = try await LmcFaceDetect.detectFaces(inputPath: inputPath)
          faceCount = detection.faceCount
          log.info("LmcBlur: Vision detected \(detection.faceCount, privacy: .public) face(s) across \(detection.detections.count, privacy: .public) sampled frame(s) — NO blur applied (Step 2)")
        } catch {
          // Detection failure is non-fatal for Step 2: log it, count stays 0.
          log.error("LmcBlur: face detection failed: \(error.localizedDescription, privacy: .public)")
        }

        // 2. AVFoundation re-encode (passthrough, video-only). This is the
        // framework-link check; a failure here routes to status 'failed'.
        do {
          let outputPath = try await LmcVideoExport.reencode(inputPath: inputPath)
          let outputURI = "file://\(outputPath)"
          log.info("LmcBlur: re-encoded to \(outputURI, privacy: .public) (audio-free, no blur)")
          // facesBlurred carries the DETECTED count (telemetry); status stays
          // 'no_faces' because no pixels were changed (Pitfall 5).
          promise.resolve([
            "outputPath": outputURI,
            "facesBlurred": faceCount,
            "status": "no_faces",
          ])
        } catch {
          // Export failed → NEVER pass a broken file as blurred. Return the
          // input path with status 'failed' so the caller uses the fallback (D-04).
          log.error("LmcBlur: re-encode failed: \(error.localizedDescription, privacy: .public)")
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
