import AVFoundation
import CoreImage
import Metal

// STEP 2 (08-02), Task 1: AVFoundation re-encode passthrough.
//
// Proves the AVFoundation frameworks LINK and an export RUNS on device. Takes a
// recorded clip path, builds an AVURLAsset, runs it through an
// AVAssetExportSession with an AVMutableVideoComposition(applyingCIFiltersWithHandler:)
// whose handler currently passes the source frame STRAIGHT THROUGH (no filter).
//
// VIDEO TRACK ONLY — audio is never carried into the output (VID-02: mic is
// already disabled at capture; re-encode must not re-introduce an audio track).
//
// The applyingCIFiltersWithHandler scaffold + the Metal-backed CIContext are built
// now so Plan 03 only swaps the passthrough line for a real CIFilter composite —
// isolating the export plumbing from the blur math.
enum LmcVideoExportError: Error {
  case noVideoTrack
  case cannotCreateExportSession
  case exportFailed(String)
  case missingOutput
}

struct LmcVideoExport {
  // Reused Metal-backed CIContext (Plan 03 blur uses the same instance).
  // Falls back to a default CIContext if no Metal device is available (simulator edge).
  static let ciContext: CIContext = {
    if let device = MTLCreateSystemDefaultDevice() {
      return CIContext(mtlDevice: device)
    }
    return CIContext()
  }()

  /// Re-encode the input clip to a NEW temp file, video track only, NO blur.
  /// - Parameter inputPath: a file path or file:// URL to the recorded clip.
  /// - Returns: the file path of the new re-encoded clip.
  static func reencode(inputPath: String) async throws -> String {
    let inputURL = normalizedURL(from: inputPath)
    let asset = AVURLAsset(url: inputURL)

    // Confirm there is a video track before we attempt anything.
    let videoTracks = try await asset.loadTracks(withMediaType: .video)
    guard !videoTracks.isEmpty else {
      throw LmcVideoExportError.noVideoTrack
    }

    // PASSTHROUGH composition: per-frame handler returns the source image unchanged.
    // Plan 03 replaces `request.sourceImage` with a CIFilter-composited image.
    let composition = AVMutableVideoComposition(
      asset: asset,
      applyingCIFiltersWithHandler: { request in
        let output = request.sourceImage // NO blur applied yet (Step 2).
        request.finish(with: output, context: ciContext)
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
