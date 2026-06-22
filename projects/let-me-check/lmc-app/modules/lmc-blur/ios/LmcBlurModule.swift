import ExpoModulesCore
import os

// STEP 2 (08-02) Task 1: AVFoundation re-encode passthrough. NO BLUR, NO detection yet.
//
// blurFaces re-encodes the recorded file through AVFoundation (video track only,
// VID-02) into a NEW playable temp file — Plan 03 swaps the passthrough for a
// CIFilter. It returns status 'no_faces' on success (NO pixels blurred yet,
// Pitfall 5) or 'failed' if the export errors (caller uses the fallback, D-04).
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
        // AVFoundation re-encode (passthrough, video-only). This is the
        // framework-link check; a failure here routes to status 'failed'.
        do {
          let outputPath = try await LmcVideoExport.reencode(inputPath: inputPath)
          let outputURI = "file://\(outputPath)"
          log.info("LmcBlur: re-encoded to \(outputURI, privacy: .public) (audio-free, no blur)")
          promise.resolve([
            "outputPath": outputURI,
            "facesBlurred": 0,
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
