package expo.modules.lmcblur

import android.graphics.Bitmap
import android.graphics.RectF
import android.media.MediaMetadataRetriever
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

/** Per-sampled-frame face rectangles (pixel coords) + the max faces seen in any frame. */
data class FaceFrame(val timeUs: Long, val rects: List<RectF>)
data class DetectResult(val faceCount: Int, val framesSampled: Int, val frames: List<FaceFrame>)

/**
 * PHASE 2: on-device face DETECTION via ML Kit (bundled model, no network).
 * Samples the clip every ~400ms and reports the face rects per sampled frame +
 * the max face count. The blur/re-encode (Phase 3) consumes `frames`.
 *
 * Runs synchronously (Tasks.await) — call only from the module's async thread.
 */
object LmcFaceDetect {
  private const val STEP_MS = 400L

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
        val bmp: Bitmap? = retriever.getFrameAtTime(t * 1000, MediaMetadataRetriever.OPTION_CLOSEST)
        if (bmp != null) {
          val faces = Tasks.await(detector.process(InputImage.fromBitmap(bmp, 0)))
          if (faces.size > maxFaces) maxFaces = faces.size
          frames.add(FaceFrame(t * 1000, faces.map { RectF(it.boundingBox) }))
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
}
