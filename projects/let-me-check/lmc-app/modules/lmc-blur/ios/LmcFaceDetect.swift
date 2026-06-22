import AVFoundation
import CoreImage
import Vision

// STEP 2 (08-02), Task 2: Vision face detection (count only — still NO blur).
//
// Runs VNDetectFaceRectanglesRequest over frames SAMPLED at <= 15fps (NOT every
// frame — Pitfall 3) and collects per-time normalized face rects so Plan 03 can
// composite blur exactly where faces are. Reads frames SEQUENTIALLY (sampled),
// never loading the whole clip into RAM (T-08-06).
//
// Exposes both the sampled detections AND a max-faces count for the
// `facesBlurred` telemetry field. No pixels are changed here.

/// Faces detected in a single sampled frame, with the presentation time they apply to.
struct LmcFrameDetection {
  let time: CMTime
  /// Normalized (0..1, Vision bottom-left origin) face bounding boxes for this frame.
  let faceRects: [CGRect]
}

/// Aggregate detection result over the sampled clip.
struct LmcDetectionResult {
  let detections: [LmcFrameDetection]
  /// Max faces seen in any single sampled frame — the plausible "people in shot" count.
  let faceCount: Int
}

/// Per-frame face-rect lookup used by the export handler (08-03).
///
/// Detection runs at <= 15fps (sampled), but export emits every frame. For each
/// export frame we find the NEAREST sampled detection in time and reuse its rects
/// — so we never re-run Vision per frame (Pitfall 3). Faces move little between
/// 15fps samples, so nearest-sample reuse keeps the blur on the face.
struct LmcDetectionLookup {
  /// Sampled detections sorted ascending by time.
  private let sorted: [LmcFrameDetection]

  init(detections: [LmcFrameDetection]) {
    self.sorted = detections.sorted { CMTimeGetSeconds($0.time) < CMTimeGetSeconds($1.time) }
  }

  /// Normalized face rects from the sampled detection nearest to `time`.
  /// Returns [] if there were no detections at all.
  func faceRects(at time: CMTime) -> [CGRect] {
    guard !sorted.isEmpty else { return [] }
    let t = CMTimeGetSeconds(time)

    // Linear nearest-time scan. Sampled-frame counts are small (<=15fps * 15s ~=
    // 225 entries, and only frames WITH faces are stored), so this stays cheap.
    var best = sorted[0]
    var bestDelta = abs(CMTimeGetSeconds(best.time) - t)
    for d in sorted.dropFirst() {
      let delta = abs(CMTimeGetSeconds(d.time) - t)
      if delta < bestDelta {
        bestDelta = delta
        best = d
      }
    }
    return best.faceRects
  }
}

enum LmcFaceDetectError: Error {
  case noVideoTrack
  case generatorFailed(String)
}

struct LmcFaceDetect {
  // Detection sampling: <= 15fps so a 15s 1080p clip stays cheap (Pitfall 3).
  static let sampleFPS: Double = 15.0
  // Confidence threshold (Claude discretion, 08-CONTEXT D-05). 0.3 keeps a real
  // selfie face while rejecting most spurious texture hits; Plan 03/05 backstop
  // under-detection via the fallback. Documented here as the single source.
  static let confidenceThreshold: VNConfidence = 0.3

  /// Detect faces across the clip by sampling frames at <= 15fps.
  static func detectFaces(inputPath: String) async throws -> LmcDetectionResult {
    let url = LmcVideoExport.normalizedURL(from: inputPath)
    let asset = AVURLAsset(url: url)

    let videoTracks = try await asset.loadTracks(withMediaType: .video)
    guard let track = videoTracks.first else {
      throw LmcFaceDetectError.noVideoTrack
    }

    let duration = try await asset.load(.duration)
    let durationSeconds = CMTimeGetSeconds(duration)
    guard durationSeconds.isFinite, durationSeconds > 0 else {
      return LmcDetectionResult(detections: [], faceCount: 0)
    }

    // Build the list of sample times at <= 15fps.
    let step = 1.0 / sampleFPS
    var times: [NSValue] = []
    var t = 0.0
    while t < durationSeconds {
      times.append(NSValue(time: CMTime(seconds: t, preferredTimescale: 600)))
      t += step
    }
    if times.isEmpty {
      times.append(NSValue(time: .zero))
    }

    // Image generator pulls frames sequentially (sampled) — not the whole clip.
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = CMTime(seconds: step / 2, preferredTimescale: 600)
    _ = track // track loaded above to assert a real video track exists

    var detections: [LmcFrameDetection] = []
    var maxFaces = 0

    for value in times {
      let time = value.timeValue
      guard let cgImage = try? generator.copyCGImage(at: time, actualTime: nil) else {
        continue // skip frames that fail to decode; detection is best-effort here
      }

      let request = VNDetectFaceRectanglesRequest()
      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      do {
        try handler.perform([request])
      } catch {
        continue
      }

      let observations = (request.results ?? []).filter { $0.confidence >= confidenceThreshold }
      let rects = observations.map { $0.boundingBox }
      if !rects.isEmpty {
        detections.append(LmcFrameDetection(time: time, faceRects: rects))
        maxFaces = max(maxFaces, rects.count)
      }
    }

    return LmcDetectionResult(detections: detections, faceCount: maxFaces)
  }
}
