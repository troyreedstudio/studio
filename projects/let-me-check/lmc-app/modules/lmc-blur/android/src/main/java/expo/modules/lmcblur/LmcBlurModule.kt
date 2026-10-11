package expo.modules.lmcblur

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File

/** Mirrors the JS BlurOptions ({ radius?, mode? }). Ignored by the Phase 1 stub. */
class BlurOptions : Record {
  @Field var radius: Double? = null
  @Field var mode: String? = null
}

/**
 * Android face-blur native module — registered as `LmcBlur`, mirroring the iOS
 * module's `blurFaces(inputPath, options)` → BlurResult contract
 * (see ../../src/LmcBlur.types.ts — the LOCKED contract).
 *
 * PHASE 3 (current): full on-device DETECT + BLUR + re-encode.
 *  - No faces found  -> 'no_faces'  (original returned; safe to deliver, matches iOS).
 *  - Faces found     -> LmcVideoBlur blurs every face rect + re-encodes at 720p
 *                       -> 'blurred' with the new outputPath + facesBlurred count.
 *  - Any failure     -> 'failed'    (FAIL-SAFE: never deliver an unblurred clip —
 *                       blur-native.ts routes 'failed' to gaussian→pixelate retry,
 *                       then the server-side hold).
 *
 * See docs/ANDROID-BLUR-BUILD-PLAN.md.
 */
class LmcBlurModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LmcBlur")

    AsyncFunction("blurFaces") { inputPath: String, options: BlurOptions?, promise: Promise ->
      try {
        val det = LmcFaceDetect.detect(inputPath)
        if (det.faceCount == 0) {
          // No faces — the original is safe to deliver (matches iOS 'no_faces').
          promise.resolve(
            mapOf("outputPath" to inputPath, "facesBlurred" to 0, "status" to "no_faces"),
          )
          return@AsyncFunction
        }
        val mode = options?.mode ?: "gaussian"
        val ctx = appContext.reactContext
          ?: throw IllegalStateException("lmc-blur: no app context for cache dir")
        val outFile = File(ctx.cacheDir, "lmc-blur-${System.nanoTime()}.mp4")
        val faces = LmcVideoBlur.blur(inputPath, outFile.absolutePath, det, mode)
        promise.resolve(
          mapOf(
            "outputPath" to "file://${outFile.absolutePath}",
            "facesBlurred" to faces,
            "status" to "blurred",
          ),
        )
      } catch (e: Exception) {
        // Any detection/blur/encode failure -> fail-safe 'failed' (never deliver unblurred).
        promise.resolve(
          mapOf("outputPath" to inputPath, "facesBlurred" to 0, "status" to "failed"),
        )
      }
    }
  }
}
