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
 * PHASE 1 (scaffold): the module now exists on Android, so the JS side resolves
 * the native module instead of hitting the optional-null path. blurFaces is a
 * FAIL-SAFE stub: it returns status 'failed' so the caller's fallback
 * (blur-native.ts blurFacesWithFallback) NEVER delivers an unblurred clip.
 * Android Scout delivery stays blocked BY DESIGN until the real pipeline ships.
 *
 * PHASE 2+: real on-device blur — ML Kit Face Detection + MediaCodec/OpenGL
 * decode→blur→encode at 720p (see docs/ANDROID-BLUR-BUILD-PLAN.md).
 */
class LmcBlurModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LmcBlur")

    AsyncFunction("blurFaces") { inputPath: String, _options: BlurOptions?, promise: Promise ->
      // Fail-safe until the real pipeline (Phase 2+) is implemented.
      promise.resolve(
        mapOf(
          "outputPath" to inputPath,
          "facesBlurred" to 0,
          "status" to "failed",
        ),
      )
    }
  }
}
