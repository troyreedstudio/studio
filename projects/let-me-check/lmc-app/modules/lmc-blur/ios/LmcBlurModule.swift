import ExpoModulesCore

// STEP 1 (08-01): NO-OP face-blur module.
//
// This deliberately does NO image work — no AVFoundation, no Vision, no Core Image.
// Its only job is to prove the local Expo module links under New Architecture and
// the app boots (the Step-1 device gate). Real blur arrives in Plans 02-04.
//
// blurFaces is a plain AsyncFunction (Promise-backed) — there is NO frame-processor
// or worklet/JSI camera-thread bridge here, so the worklets-core SIGSEGV class
// (06-RESEARCH-BLUR-V2 Part 1) structurally cannot fire.
public class LmcBlurModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LmcBlur")

    // No-op: resolve immediately with the input path and status "no_faces".
    // status is "no_faces" (NOT "blurred") so no later code can mistake a
    // passthrough for a real blur — honors Pitfall 5 from day one.
    AsyncFunction("blurFaces") { (inputPath: String, options: [String: Any]?, promise: Promise) in
      promise.resolve([
        "outputPath": inputPath,
        "facesBlurred": 0,
        "status": "no_faces",
      ])
    }
  }
}
