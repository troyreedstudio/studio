import CoreImage
import CoreImage.CIFilterBuiltins
import CoreGraphics

// STEP 3 (08-03) + tuning (08-04): the Core Image face-blur compositor.
//
// Given a source frame (CIImage) and the Vision face rects that apply at that
// frame's time, this produces a new CIImage where ONLY the detected face rects
// (expanded ~20% padding) are replaced by a blurred copy of the underlying
// pixels. Everything outside the face rects stays sharp.
//
// PROPORTIONAL BLUR (the fix for the "flat white box" problem):
//   A SINGLE fixed radius cannot fit all face sizes. A radius tuned for a close
//   (e.g. 500px) face is so large relative to a distant (e.g. 120px) face that
//   the gaussian washes the small face to near-white — a harsh flat box, not a
//   blur. So each face gets its OWN blur strength SCALED to its pixel size:
//     gaussian radius ≈ faceWidthPx * 0.30   (clamped 12...220)
//     pixelate block  ≈ faceWidthPx * 0.18   (clamped 8...120)
//   A close-up face → very heavy blur (fully hidden); a distant face → a clean
//   strong blur (obscured, NOT a white box). Privacy is the hard requirement:
//   erring toward MORE blur is fine; under-blur is not (hence the floors).
//
// TECHNIQUE: per-face crop → blur → composite. For each face we crop a padded
// region of the source, blur JUST that crop at the face's own radius, then
// composite the blurred crop back over the source. Each face is processed with
// its own strength, so a small and a large face in the same frame get different
// (size-appropriate) blurs. (The old "blur whole frame once + mask" path could
// only apply ONE radius to every face — that is exactly what produced the white
// box on small faces.)
//
// COORDINATES: Vision boundingBox is normalized (0..1) with a BOTTOM-LEFT origin.
// Core Image's coordinate space is ALSO bottom-left origin (in pixels). So a
// normalized Vision rect maps to CI pixels by multiplying by the frame extent —
// origins already agree, no Y-flip needed. (LmcFaceDetect runs the generator with
// appliesPreferredTrackTransform=true, so the sampled frame and the export frame
// share the same upright orientation.)
//
// This is a first-party CIFilter pipeline on the export thread — no worklet/JSI
// bridge, so the worklets-core SIGSEGV class cannot fire here.
struct LmcFaceBlur {
  /// FALLBACK/baseline blur strength (pixels). Used only if a face's pixel size
  /// cannot be derived; per-face blur normally SCALES to each face's size.
  let radius: Double
  /// gaussian (default, strongest) or pixelate (cheaper fallback path).
  let mode: LmcBlurMode
  /// Fractional padding added around each detected face rect (0.20 = +20%).
  let padding: CGFloat

  // MARK: Proportional-blur tuning (08-04). See file header for the rationale.

  /// Gaussian radius as a fraction of a face's pixel width.
  static let gaussianFraction: Double = 0.30
  /// Pixelate block size as a fraction of a face's pixel width.
  static let pixelateFraction: Double = 0.18
  /// Gaussian radius floor: a tiny/distant face is STILL obscured (privacy floor).
  static let gaussianMinRadius: Double = 12.0
  /// Gaussian radius ceiling: caps GPU cost on a huge close-up face.
  static let gaussianMaxRadius: Double = 220.0
  /// Pixelate block floor: a tiny face still gets a coarse mosaic.
  static let pixelateMinBlock: Double = 8.0
  /// Pixelate block ceiling: caps cost on a huge close-up face.
  static let pixelateMaxBlock: Double = 120.0

  init(radius: Double = 18.0, mode: LmcBlurMode = .gaussian, padding: CGFloat = 0.20) {
    // Clamp to sane bounds so a bad config can't produce a no-op (radius 0) blur.
    self.radius = max(4.0, radius)
    self.mode = mode
    self.padding = max(0.0, padding)
  }

  /// Composite blur over the given normalized (Vision, bottom-left, 0..1) face
  /// rects on top of `source`. Each face is blurred at a strength SCALED to its
  /// own pixel size. If `normalizedFaceRects` is empty, returns the source
  /// unchanged (caller treats that frame as face-free).
  func composite(source: CIImage, normalizedFaceRects: [CGRect]) -> CIImage {
    guard !normalizedFaceRects.isEmpty else { return source }

    let extent = source.extent
    guard extent.width > 0, extent.height > 0, extent.isInfinite == false else {
      return source
    }

    // Per-face crop → blur → composite. Each face gets its OWN proportional
    // strength, so a small and a large face in one frame are blurred differently.
    var result = source
    for nrect in normalizedFaceRects {
      let faceRect = paddedPixelRect(nrect, extent: extent)
      guard faceRect.width > 0, faceRect.height > 0 else { continue }
      if let blurredFace = blurredFaceRegion(source: source, faceRect: faceRect) {
        result = blurredFace.composited(over: result)
      }
    }
    return result.cropped(to: extent)
  }

  // MARK: - Per-face blur

  /// Blur JUST the `faceRect` region of `source` at a radius proportional to the
  /// face's pixel width, returning a CIImage cropped to exactly `faceRect`
  /// (ready to composite back over the frame). The face's WIDTH drives strength.
  private func blurredFaceRegion(source: CIImage, faceRect: CGRect) -> CIImage? {
    let faceWidth = Double(faceRect.width)
    switch mode {
    case .gaussian:
      let r = gaussianRadius(forFaceWidth: faceWidth)
      // Clamp the source to extent BEFORE blurring so the gaussian samples real
      // pixels at the crop edge instead of feathering toward transparent —
      // otherwise the face-rect border would lighten/leak.
      let clamped = source.clampedToExtent()
      let f = CIFilter.gaussianBlur()
      f.inputImage = clamped
      f.radius = Float(r)
      guard let blurred = f.outputImage else { return nil }
      return blurred.cropped(to: faceRect)
    case .pixelate:
      let block = pixelateBlock(forFaceWidth: faceWidth)
      let f = CIFilter.pixellate()
      f.inputImage = source
      // Center the mosaic on the face so blocks align to the face region.
      f.center = CGPoint(x: faceRect.midX, y: faceRect.midY)
      f.scale = Float(block)
      guard let pix = f.outputImage else { return nil }
      return pix.cropped(to: faceRect)
    }
  }

  /// Gaussian radius scaled to a face's pixel width, clamped to [min, max].
  /// e.g. 500px face → 150; 120px face → 36; tiny face floored at 12.
  func gaussianRadius(forFaceWidth faceWidthPx: Double) -> Double {
    guard faceWidthPx.isFinite, faceWidthPx > 0 else {
      // No usable size → fall back to the baseline config radius (still clamped).
      return min(Self.gaussianMaxRadius, max(Self.gaussianMinRadius, radius))
    }
    let scaled = faceWidthPx * Self.gaussianFraction
    return min(Self.gaussianMaxRadius, max(Self.gaussianMinRadius, scaled))
  }

  /// Pixelate block size scaled to a face's pixel width, clamped to [min, max].
  func pixelateBlock(forFaceWidth faceWidthPx: Double) -> Double {
    guard faceWidthPx.isFinite, faceWidthPx > 0 else {
      return min(Self.pixelateMaxBlock, max(Self.pixelateMinBlock, radius))
    }
    let scaled = faceWidthPx * Self.pixelateFraction
    return min(Self.pixelateMaxBlock, max(Self.pixelateMinBlock, scaled))
  }

  // MARK: - Geometry

  /// Convert a normalized Vision rect (0..1, bottom-left) to a padded pixel rect
  /// in the frame's coordinate space (also bottom-left), clamped to the extent.
  private func paddedPixelRect(_ nrect: CGRect, extent: CGRect) -> CGRect {
    // Normalized → pixels (origins agree: both bottom-left).
    var rect = CGRect(
      x: extent.origin.x + nrect.origin.x * extent.width,
      y: extent.origin.y + nrect.origin.y * extent.height,
      width: nrect.width * extent.width,
      height: nrect.height * extent.height
    )
    // Expand by `padding` on every side so the blur covers the FULL face plus a
    // margin — a too-tight rect leaks the face edge (T-08-08).
    let dx = rect.width * padding
    let dy = rect.height * padding
    rect = rect.insetBy(dx: -dx, dy: -dy)
    // Keep the rect inside the frame.
    return rect.intersection(extent)
  }
}
