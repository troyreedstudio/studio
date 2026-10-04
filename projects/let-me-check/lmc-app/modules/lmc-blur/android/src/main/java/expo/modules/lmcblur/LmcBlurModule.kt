package expo.modules.lmcblur

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

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
 * PHASE 2 (current): real on-device face DETECTION via ML Kit (LmcFaceDetect).
 *  - No faces found  -> 'no_faces'  (safe to deliver the original, matches iOS).
 *  - Faces found     -> 'failed'    (FAIL-SAFE: on-device blur/re-encode isn't
 *                                    built yet, so NEVER deliver an unblurred clip
 *                                    — blur-native.ts routes 'failed' to the hold).
 *
 * PHASE 3+: blur + re-encode the detected rects (MediaCodec/OpenGL at 720p), then
 * return 'blurred'. See docs/ANDROID-BLUR-BUILD-PLAN.md.
 */
class LmcBlurModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LmcBlur")

    AsyncFunction("blurFaces") { inputPath: String, _options: BlurOptions?, promise: Promise ->
      try {
        val det = LmcFaceDetect.detect(inputPath)
        val status = if (det.faceCount == 0) "no_faces" else "failed" // Phase 3 -> "blurred"
        promise.resolve(
          mapOf(
            "outputPath" to inputPath,
            "facesBlurred" to 0,
            "status" to status,
          ),
        )
      } catch (e: Exception) {
        // Any detection failure -> fail-safe 'failed' (never deliver unblurred).
        promise.resolve(
          mapOf("outputPath" to inputPath, "facesBlurred" to 0, "status" to "failed"),
        )
      }
    }
  }
}
