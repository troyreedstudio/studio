package expo.modules.lmcblur

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * CPU face blur for a single upright frame. Mirrors the iOS LmcFaceBlur intent:
 * blur ONLY the detected face rects (expanded ~20% padding), with per-face strength
 * PROPORTIONAL to face size, so a close-up and a distant face in the same frame are
 * both properly obscured (no "flat white box" on small faces, no under-blur on large).
 *
 * Technique = downscale → upscale of each padded face crop:
 *   - pixelate: scale down then back up with NO filtering → hard mosaic blocks.
 *   - gaussian: scale down then back up WITH bilinear filtering (twice) → smooth blur.
 * Strong, cheap, and visually unmistakable — privacy is the hard requirement, so the
 * floors err toward MORE obscuring.
 *
 * Operates in place on a mutable ARGB_8888 bitmap. Returns the number of faces drawn.
 */
object LmcFaceBlurCpu {

  private const val PADDING = 0.20f

  // Proportional-blur tuning (mirrors iOS fractions / clamps, in px).
  private const val PIXELATE_FRACTION = 0.18
  private const val PIXELATE_MIN_BLOCK = 8.0
  private const val PIXELATE_MAX_BLOCK = 120.0
  private const val GAUSS_FRACTION = 0.14   // fraction of face width → downscale target divisor strength
  private const val GAUSS_MIN_TARGET = 3
  private const val GAUSS_MAX_TARGET = 28

  fun blur(bitmap: Bitmap, rects: List<FaceRectN>, mode: String): Int {
    if (rects.isEmpty()) return 0
    val w = bitmap.width
    val h = bitmap.height
    val canvas = Canvas(bitmap)
    val smoothPaint = Paint(Paint.FILTER_BITMAP_FLAG)
    val hardPaint = Paint() // no FILTER_BITMAP_FLAG → nearest-neighbour (mosaic)
    var drawn = 0

    for (r in rects) {
      val rect = paddedPixelRect(r, w, h) ?: continue
      val fw = rect.width()
      val fh = rect.height()
      if (fw < 2 || fh < 2) continue

      val src = try {
        Bitmap.createBitmap(bitmap, rect.left, rect.top, fw, fh)
      } catch (_: Exception) {
        continue
      }

      val pixelate = mode == "pixelate"
      val (downW, downH) = if (pixelate) {
        val block = clampD(fw * PIXELATE_FRACTION, PIXELATE_MIN_BLOCK, PIXELATE_MAX_BLOCK)
        Pair(max(2, (fw / block).roundToInt()), max(2, (fh / block).roundToInt()))
      } else {
        // gaussian: downscale to a small target (proportional, clamped), smooth upscale.
        val target = clampI((fw * GAUSS_FRACTION).roundToInt(), GAUSS_MIN_TARGET, GAUSS_MAX_TARGET)
        val ratio = fh.toFloat() / fw.toFloat()
        Pair(target, max(2, (target * ratio).roundToInt()))
      }

      val filter = !pixelate
      val down = Bitmap.createScaledBitmap(src, downW, downH, filter)
      val up = Bitmap.createScaledBitmap(down, fw, fh, filter)
      canvas.drawBitmap(up, rect.left.toFloat(), rect.top.toFloat(), if (pixelate) hardPaint else smoothPaint)

      if (src != down) down.recycle()
      up.recycle()
      src.recycle()
      drawn++
    }
    return drawn
  }

  /** Normalized (top-left) rect → padded pixel Rect, clamped to the bitmap. */
  private fun paddedPixelRect(r: FaceRectN, w: Int, h: Int): Rect? {
    var left = r.x * w
    var top = r.y * h
    var right = (r.x + r.w) * w
    var bottom = (r.y + r.h) * h
    val padX = (right - left) * PADDING
    val padY = (bottom - top) * PADDING
    left -= padX; right += padX; top -= padY; bottom += padY
    val l = clampI(left.roundToInt(), 0, w - 1)
    val t = clampI(top.roundToInt(), 0, h - 1)
    val rr = clampI(right.roundToInt(), l + 1, w)
    val bb = clampI(bottom.roundToInt(), t + 1, h)
    if (rr - l < 2 || bb - t < 2) return null
    return Rect(l, t, rr, bb)
  }

  private fun clampD(v: Double, lo: Double, hi: Double) = min(hi, max(lo, v))
  private fun clampI(v: Int, lo: Int, hi: Int) = min(hi, max(lo, v))
}
