import AVFoundation
import CoreImage
import Metal

// STEP 3 (08-03), Task 1: real Core Image face blur applied during export.
//
// Step 2 (08-02) proved the AVFoundation frameworks LINK and an export RUNS, with
// the per-frame handler passing the source straight through. Step 3 swaps that
// passthrough for a CIFilter composite (LmcFaceBlur) that blurs ONLY the detected
// face rects, frame by frame, during the AVAssetExportSession.
//
// Per frame the handler looks up the face rects active at request.compositionTime
// (from the sampled LmcFaceDetect cache — we never re-detect per frame, Pitfall 3)
// and asks LmcFaceBlur to composite a blur over them. Frames with no faces pass
// through unchanged.
//
// VIDEO TRACK ONLY — audio is never carried into the output (VID-02: mic is
// already disabled at capture; re-encode must not re-introduce an audio track).
//
// The Metal-backed CIContext is shared with the blur step for speed.
enum LmcVideoExportError: Error {
  case noVideoTrack
  case cannotCreateExportSession
  case exportFailed(String)
  case missingOutput
}

/// Blur style for the post-record compositor. Mirrors the JS BlurMode contract.
enum LmcBlurMode {
  case gaussian
  case pixelate

  /// Parse the JS `mode` option string ("gaussian" | "pixelate"); defaults gaussian.
  static func from(_ raw: String?) -> LmcBlurMode {
    return raw?.lowercased() == "pixelate" ? .pixelate : .gaussian
  }
}

struct LmcVideoExport {
  // Reused Metal-backed CIContext (Plan 03 blur uses the same instance).
  // Falls back to a default CIContext if no Metal device is available (simulator edge).
  static let ciContext: CIContext = {
    // cacheIntermediates:false stops Core Image from accumulating intermediate
    // textures across frames — a key source of the memory spike that jetsammed the
    // app on submit (ReportMemoryException). Memory stays flat across the clip.
    let opts: [CIContextOption: Any] = [.cacheIntermediates: false]
    if let device = MTLCreateSystemDefaultDevice() {
      return CIContext(mtlDevice: device, options: opts)
    }
    return CIContext(options: opts)
  }()

  /// Re-encode the input clip to a NEW temp file, video track only, blurring the
  /// detected face rects per frame.
  /// - Parameters:
  ///   - inputPath: a file path or file:// URL to the recorded clip.
  ///   - detections: sampled per-time face rects (from LmcFaceDetect). Pass [] to
  ///     re-encode with no blur (passthrough).
  ///   - blur: the Core Image compositor (radius/mode/padding).
  /// - Returns: the file path of the new re-encoded clip.
  static func reencode(
    inputPath: String,
    detections: [LmcFrameDetection] = [],
    blur: LmcFaceBlur = LmcFaceBlur()
  ) async throws -> String {
    let inputURL = normalizedURL(from: inputPath)
    let asset = AVURLAsset(url: inputURL)

    // Confirm there is a video track before we attempt anything.
    let videoTracks = try await asset.loadTracks(withMediaType: .video)
    guard !videoTracks.isEmpty else {
      throw LmcVideoExportError.noVideoTrack
    }

    // Sort the sampled detections by time once so the per-frame lookup is a cheap
    // nearest-sample search (we never re-run Vision per frame — Pitfall 3).
    let lookup = LmcDetectionLookup(detections: detections)

    // BLUR composition: per-frame handler composites a blur over the face rects
    // active at that frame's time. Frames with no faces pass through unchanged.
    let composition = AVMutableVideoComposition(
      asset: asset,
      applyingCIFiltersWithHandler: { request in
        // autoreleasepool releases each frame's CIImage + intermediate buffers
        // immediately instead of letting them pile up until the export finishes —
        // the fix for the iOS per-app memory-limit kill on submit (Jetsam /
        // ReportMemoryException). Memory now stays bounded per frame.
        autoreleasepool {
          let source = request.sourceImage
          let rects = lookup.faceRects(at: request.compositionTime)
          let output = rects.isEmpty
            ? source
            : blur.composite(source: source, normalizedFaceRects: rects)
          request.finish(with: output, context: ciContext)
        }
      }
    )

    // Choose a preset that preserves capture quality (1080p where available).
    let preset = AVAssetExportPresetHighestQuality
    guard let session = AVAssetExportSession(asset: asset, presetName: preset) else {
      throw LmcVideoExportError.cannotCreateExportSession
    }

    let outputURL = makeTempOutputURL()
    // Remove any stale file at the target path.
    try? FileManager.default.removeItem(at: outputURL)

    session.outputURL = outputURL
    session.outputFileType = .mp4
    session.videoComposition = composition
    // VID-02: video track ONLY. Setting an empty audio mix + the video-only
    // composition means no audio track is written into the output.
    session.audioMix = nil
    session.shouldOptimizeForNetworkUse = true

    await session.export()

    switch session.status {
    case .completed:
      // Confirm the file exists and is non-empty (a 0-byte output is a failure).
      let attrs = try? FileManager.default.attributesOfItem(atPath: outputURL.path)
      let size = (attrs?[.size] as? NSNumber)?.intValue ?? 0
      guard FileManager.default.fileExists(atPath: outputURL.path), size > 0 else {
        throw LmcVideoExportError.missingOutput
      }
      return outputURL.path
    case .failed, .cancelled:
      throw LmcVideoExportError.exportFailed(
        session.error?.localizedDescription ?? "unknown export error"
      )
    default:
      throw LmcVideoExportError.exportFailed("export ended in state \(session.status.rawValue)")
    }
  }

  // MARK: - Helpers

  /// Accept both "file:///..." URLs and bare "/path" strings.
  static func normalizedURL(from path: String) -> URL {
    if path.hasPrefix("file://"), let url = URL(string: path) {
      return url
    }
    return URL(fileURLWithPath: path)
  }

  private static func makeTempOutputURL() -> URL {
    let dir = FileManager.default.temporaryDirectory
    let name = "lmc-blur-\(UUID().uuidString).mp4"
    return dir.appendingPathComponent(name)
  }
}
