package expo.modules.lmcblur

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

/**
 * A single detected face as a NORMALIZED rect (0..1), TOP-LEFT origin — the same
 * space Android bitmaps / ML Kit boundingBox use (before normalization). Storing
 * normalized rects makes them resolution-independent: the blur pipeline can map
 * them straight onto the (possibly downscaled to 720p) export frame.
 */
data class FaceRectN(val x: Float, val y: Float, val w: Float, val h: Float)

/** Per-sampled-frame face rectangles (normalized) at a presentation time. */
data class FaceFrame(val timeUs: Long, val rects: List<FaceRectN>)

/** maxFaces = most faces seen in any single sampled frame (the people-in-shot count). */
data class DetectResult(val faceCount: Int, val framesSampled: Int, val frames: List<FaceFrame>)

/**
 * On-device face DETECTION via ML Kit (bundled model, no network). Samples the clip
 * every ~STEP_MS and reports, per sampled frame, the face rects as normalized 0..1
 * top-left-origin boxes + the max face count. The blur/encode pass (LmcVideoBlur)
 * consumes `frames` and applies the nearest sample's rects to each export frame.
 *
 * Runs synchronously (Tasks.await) — call only from the module's async thread.
 */
object LmcFaceDetect {
  private const val STEP_MS = 300L

  fun detect(inputPath: String): DetectResult {
    val path = inputPath.removePrefix("file://")
    val retriever = MediaMetadataRetriever()
    val options = FaceDetectorOptions.Builder()
      .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
      .setMinFaceSize(0.08f) // catch smaller / background faces (fail-safe bias)
      .build()
    val detector = FaceDetection.getClient(options)
    var maxFaces = 0
    var sampled = 0
    val frames = ArrayList<FaceFrame>()
    try {
      retriever.setDataSource(path)
      val durationMs =
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
      var t = 0L
      while (t <= durationMs) {
        // getFrameAtTime returns an UPRIGHT (display-oriented) bitmap, so the
        // normalized rects are in display space — the export pass renders upright
        // too, so they line up.
        val bmp: Bitmap? = retriever.getFrameAtTime(t * 1000, MediaMetadataRetriever.OPTION_CLOSEST)
        if (bmp != null) {
          val w = bmp.width.toFloat().coerceAtLeast(1f)
          val h = bmp.height.toFloat().coerceAtLeast(1f)
          val faces = Tasks.await(detector.process(InputImage.fromBitmap(bmp, 0)))
          if (faces.size > maxFaces) maxFaces = faces.size
          val rects = faces.map {
            val b = it.boundingBox
            FaceRectN(
              x = (b.left / w).coerceIn(0f, 1f),
              y = (b.top / h).coerceIn(0f, 1f),
              w = (b.width() / w).coerceIn(0f, 1f),
              h = (b.height() / h).coerceIn(0f, 1f),
            )
          }
          frames.add(FaceFrame(t * 1000, rects))
          sampled++
          bmp.recycle()
        }
        t += STEP_MS
      }
    } finally {
      try { retriever.release() } catch (_: Exception) {}
      detector.close()
    }
    return DetectResult(maxFaces, sampled, frames)
  }

  /** Rects that apply to a given presentation time: the nearest sampled frame. */
  fun rectsAt(result: DetectResult, timeUs: Long): List<FaceRectN> {
    if (result.frames.isEmpty()) return emptyList()
    var best = result.frames[0]
    var bestDelta = Long.MAX_VALUE
    for (f in result.frames) {
      val d = kotlin.math.abs(f.timeUs - timeUs)
      if (d < bestDelta) { bestDelta = d; best = f }
    }
    return best.rects
  }
}
