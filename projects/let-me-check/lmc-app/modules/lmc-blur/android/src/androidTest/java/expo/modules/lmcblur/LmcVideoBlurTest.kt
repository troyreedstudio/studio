package expo.modules.lmcblur

import android.content.ContentValues
import android.provider.MediaStore
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Emulator validation of the full blur pipeline (we can't device-debug, so this runs
 * the native code on the emulator against a bundled sample clip with a real face).
 *
 * Reads androidTest/assets/sample.mp4 -> detect -> blur -> writes blurred.mp4 to the
 * app's external files dir so it can be pulled off the device and eyeballed:
 *   adb pull /sdcard/Android/data/<testpkg>/files/lmc_blurred.mp4
 */
@RunWith(AndroidJUnit4::class)
class LmcVideoBlurTest {

  private val TAG = "LMCBLURTEST"

  @Test
  fun blursSampleVideoEndToEnd() {
    val instr = InstrumentationRegistry.getInstrumentation()
    val targetCtx = instr.targetContext

    // Copy the bundled test asset into the app cache (the module reads a real file path).
    val input = File(targetCtx.cacheDir, "lmc_sample.mp4")
    instr.context.assets.open("sample.mp4").use { ins ->
      input.outputStream().use { outs -> ins.copyTo(outs) }
    }
    Log.e(TAG, "input=${input.absolutePath} size=${input.length()}")

    // 1) detect
    val det = LmcFaceDetect.detect(input.absolutePath)
    Log.e(TAG, "DETECT faceCount=${det.faceCount} framesSampled=${det.framesSampled}")
    assertTrue("expected at least one face in the sample clip", det.faceCount > 0)

    // 2) blur + re-encode
    val out = File(targetCtx.cacheDir, "lmc_blurred.mp4")
    val faces = LmcVideoBlur.blur(input.absolutePath, out.absolutePath, det, "gaussian")
    Log.e(TAG, "BLUR facesBlurred=$faces outExists=${out.exists()} outSize=${out.length()}")
    assertTrue("output file should exist and be non-trivial", out.exists() && out.length() > 10_000)

    // 3) write the result to public Downloads (survives the test-APK uninstall, and
    // /sdcard/Download is pullable by adb — unlike the app's scoped dirs).
    val resolver = targetCtx.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Downloads.DISPLAY_NAME, "lmc_blurred.mp4")
      put(MediaStore.Downloads.MIME_TYPE, "video/mp4")
    }
    // remove any prior copy so the name isn't suffixed (lmc_blurred (1).mp4)
    resolver.delete(
      MediaStore.Downloads.EXTERNAL_CONTENT_URI,
      "${MediaStore.Downloads.DISPLAY_NAME}=?",
      arrayOf("lmc_blurred.mp4"),
    )
    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
    if (uri != null) {
      resolver.openOutputStream(uri).use { os -> out.inputStream().use { it.copyTo(os!!) } }
      Log.e(TAG, "WROTE_DOWNLOADS lmc_blurred.mp4 ($uri)")
    }
  }
}
