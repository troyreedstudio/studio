import CoreImage
import CoreImage.CIFilterBuiltins
import CoreGraphics

// STEP 3 (08-03), Task 1: the actual Core Image face-blur compositor.
//
// Given a source frame (CIImage) and the Vision face rects that apply at that
// frame's time, this produces a new CIImage where ONLY the detected face rects
// (expanded ~20% padding) are replaced by a blurred copy of the underlying
// pixels. Everything outside the face rects stays sharp.
//
// Technique (06-RESEARCH-BLUR-V2 Part 3, iOS step 2):
//   1. Blur the WHOLE frame once (CIGaussianBlur default, or CIPixellate for the
//      cheaper Plan-05 fallback).
//   2. Build a white-on-black MASK image that is white inside the (padded) union
//      of face rects, black everywhere else.
//   3. CIBlendWithMask(blurred, sharp original, mask) → blurred pixels show
//      through only where the mask is white = inside the faces.
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
  /// Blur strength for CIGaussianBlur (pixels at native frame resolution).
  let radius: Double
  /// gaussian (default, strongest) or pixelate (cheaper fallback path).
  let mode: LmcBlurMode
  /// Fractional padding added around each detected face rect (0.20 = +20%).
  let padding: CGFloat

  init(radius: Double = 18.0, mode: LmcBlurMode = .gaussian, padding: CGFloat = 0.20) {
    // Clamp to sane bounds so a bad config can't produce a no-op (radius 0) blur.
    self.radius = max(4.0, radius)
    self.mode = mode
    self.padding = max(0.0, padding)
  }

  /// Composite blur over the given normalized (Vision, bottom-left, 0..1) face
  /// rects on top of `source`. If `normalizedFaceRects` is empty, returns the
  /// source unchanged (caller treats that frame as face-free).
  func composite(source: CIImage, normalizedFaceRects: [CGRect]) -> CIImage {
    guard !normalizedFaceRects.isEmpty else { return source }

    let extent = source.extent
    guard extent.width > 0, extent.height > 0, extent.isInfinite == false else {
      return source
    }

    // 1. Blur the whole frame, then crop back to the original extent so the
    //    blurred image lines up 1:1 with the sharp source (CIGaussianBlur grows
    //    the extent; CIPixellate keeps it but we crop both for symmetry).
    let blurredFull = blurWholeFrame(source)
    let blurred = blurredFull.cropped(to: extent)

    // 2. Build the white-on-black mask covering the padded union of face rects.
    let mask = makeMask(for: normalizedFaceRects, extent: extent)

    // 3. Blend: blurred inside the mask, sharp original outside.
    let blend = CIFilter.blendWithMask()
    blend.inputImage = blurred           // shown where mask is white
    blend.backgroundImage = source        // shown where mask is black
    blend.maskImage = mask
    return (blend.outputImage ?? source).cropped(to: extent)
  }

  // MARK: - Blur

  private func blurWholeFrame(_ source: CIImage) -> CIImage {
    switch mode {
    case .gaussian:
      // Clamp first so the blur doesn't darken/feather the frame edges.
      let clamped = source.clampedToExtent()
      let f = CIFilter.gaussianBlur()
      f.inputImage = clamped
      f.radius = Float(radius)
      return f.outputImage ?? source
    case .pixelate:
      let f = CIFilter.pixellate()
      f.inputImage = source
      f.center = CGPoint(x: source.extent.midX, y: source.extent.midY)
      // Map the gaussian radius onto a comparable pixelate block size.
      f.scale = Float(max(8.0, radius * 1.5))
      return f.outputImage ?? source
    }
  }

  // MARK: - Mask

  /// White (alpha 1) inside each padded face rect, black elsewhere — sized to the
  /// frame extent so it aligns with both the sharp and blurred images.
  private func makeMask(for normalizedRects: [CGRect], extent: CGRect) -> CIImage {
    // Black background the size of the frame.
    var mask = CIImage(color: CIColor.black).cropped(to: extent)

    for nrect in normalizedRects {
      let pixelRect = paddedPixelRect(nrect, extent: extent)
      guard pixelRect.width > 0, pixelRect.height > 0 else { continue }
      // A white tile clipped to this face rect, composited over the mask.
      let whiteTile = CIImage(color: CIColor.white).cropped(to: pixelRect)
      mask = whiteTile.composited(over: mask)
    }
    return mask
  }

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
