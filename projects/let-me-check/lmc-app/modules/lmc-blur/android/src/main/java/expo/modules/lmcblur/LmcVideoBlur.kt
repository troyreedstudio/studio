package expo.modules.lmcblur

import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * PHASE 3 — the real on-device blur + re-encode.
 *
 * Reliable frame-by-frame pipeline (chosen over the streaming codec→GL path because
 * we can't device-debug, and this is verifiable on the emulator with a pushed clip):
 *   MediaMetadataRetriever -> upright RGBA frame (per fps step)
 *     -> LmcFaceBlurCpu blurs the detected face rects on the frame
 *     -> GlBlit draws the frame onto the H.264 encoder input Surface
 *     -> MediaMuxer writes the video; the original AUDIO track is copied through.
 *
 * Output capped at 720p long-edge to bound memory (same cap as iOS,
 * [[project_lmc_blur_memory_crash]]). One frame is in flight at a time.
 *
 * Returns faces blurred (max in any frame). Throws on failure → LmcBlurModule maps a
 * throw to the fail-safe 'failed' status (never deliver an unblurred clip).
 */
object LmcVideoBlur {

  private const val MAX_LONG_EDGE = 720
  private const val I_FRAME_INTERVAL = 1
  private const val TIMEOUT_US = 10_000L
  private const val DEFAULT_FPS = 30

  fun blur(inputPath: String, outputPath: String, detection: DetectResult, mode: String): Int {
    val inPath = inputPath.removePrefix("file://")
    val outPath = outputPath.removePrefix("file://")

    val retriever = MediaMetadataRetriever()
    retriever.setDataSource(inPath)

    val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
      ?.toLongOrNull() ?: 0L
    require(durationMs > 0) { "zero-length video" }
    val durationUs = durationMs * 1000L

    val srcW = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 0
    val srcH = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 0
    val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
    // Display dims (MMR returns frames already upright/rotated).
    val dispW = if (rotation == 90 || rotation == 270) srcH else srcW
    val dispH = if (rotation == 90 || rotation == 270) srcW else srcH
    val (outW, outH) = cap720(if (dispW > 0) dispW else 720, if (dispH > 0) dispH else 1280)

    val fps = run {
      val fc = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)?.toIntOrNull()
      if (fc != null && fc > 1) (fc / (durationMs / 1000.0)).roundToInt().coerceIn(15, 60) else DEFAULT_FPS
    }
    val stepUs = 1_000_000L / fps
    val bitRate = (outW * outH * 4.0).toInt().coerceAtLeast(2_000_000)

    // --- Encoder (surface input) ---
    val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, outW, outH).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
      setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
      setInteger(MediaFormat.KEY_FRAME_RATE, fps)
      setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, I_FRAME_INTERVAL)
    }
    val encoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    val inputSurface = encoder.createInputSurface()
    val gl = GlBlit(inputSurface)
    encoder.start()

    val muxer = MediaMuxer(outPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    val info = MediaCodec.BufferInfo()
    var videoTrack = -1
    var audioTrack = -1
    var muxerStarted = false

    // Audio track format (added before muxer.start(); samples copied after video).
    val audioFormat = readAudioFormat(inPath)

    fun drainEncoder(endOfStream: Boolean) {
      while (true) {
        val idx = encoder.dequeueOutputBuffer(info, if (endOfStream) TIMEOUT_US else 0)
        if (idx == MediaCodec.INFO_TRY_AGAIN_LATER) {
          if (!endOfStream) return // no output ready yet
          continue // draining: keep waiting for EOS
        }
        if (idx == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          check(!muxerStarted) { "format changed twice" }
          videoTrack = muxer.addTrack(encoder.outputFormat)
          if (audioFormat != null) audioTrack = muxer.addTrack(audioFormat)
          muxer.start()
          muxerStarted = true
          continue
        }
        if (idx < 0) continue
        val buf: ByteBuffer? = encoder.getOutputBuffer(idx)
        if (buf == null) {
          encoder.releaseOutputBuffer(idx, false)
          continue
        }
        if (info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) info.size = 0
        if (info.size > 0 && muxerStarted) {
          buf.position(info.offset)
          buf.limit(info.offset + info.size)
          muxer.writeSampleData(videoTrack, buf, info)
        }
        val eos = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
        encoder.releaseOutputBuffer(idx, false)
        if (eos) return
      }
    }

    try {
      var t = 0L
      while (t < durationUs) {
        val raw = retriever.getFrameAtTime(t, MediaMetadataRetriever.OPTION_CLOSEST)
        if (raw != null) {
          val scaled = if (raw.width != outW || raw.height != outH)
            Bitmap.createScaledBitmap(raw, outW, outH, true) else raw
          val frame = scaled.copy(Bitmap.Config.ARGB_8888, true)
          LmcFaceBlurCpu.blur(frame, LmcFaceDetect.rectsAt(detection, t), mode)
          gl.drawBitmap(frame)
          gl.setPresentationTime(t * 1000L)
          gl.swapBuffers()
          frame.recycle()
          if (scaled != raw) scaled.recycle()
          raw.recycle()
          drainEncoder(false)
        }
        t += stepUs
      }
      // flush encoder
      encoder.signalEndOfInputStream()
      drainEncoder(true)

      // copy the original audio through (best-effort)
      if (muxerStarted && audioTrack >= 0) copyAudio(inPath, muxer, audioTrack)
    } finally {
      try { muxer.stop() } catch (_: Exception) {}
      try { muxer.release() } catch (_: Exception) {}
      try { encoder.stop() } catch (_: Exception) {}
      try { encoder.release() } catch (_: Exception) {}
      gl.release()
      try { retriever.release() } catch (_: Exception) {}
    }

    return detection.faceCount
  }

  private fun readAudioFormat(inPath: String): MediaFormat? {
    val ex = MediaExtractor()
    return try {
      ex.setDataSource(inPath)
      val t = selectTrack(ex, "audio/")
      if (t >= 0) ex.getTrackFormat(t) else null
    } catch (_: Exception) {
      null
    } finally {
      ex.release()
    }
  }

  private fun copyAudio(inPath: String, muxer: MediaMuxer, audioTrack: Int) {
    val ex = MediaExtractor()
    try {
      ex.setDataSource(inPath)
      val t = selectTrack(ex, "audio/")
      if (t < 0) return
      ex.selectTrack(t)
      val buf = ByteBuffer.allocate(256 * 1024)
      val info = MediaCodec.BufferInfo()
      while (true) {
        val sz = ex.readSampleData(buf, 0)
        if (sz < 0) break
        info.offset = 0
        info.size = sz
        info.presentationTimeUs = ex.sampleTime
        info.flags = if (ex.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0)
          MediaCodec.BUFFER_FLAG_KEY_FRAME else 0
        muxer.writeSampleData(audioTrack, buf, info)
        ex.advance()
      }
    } catch (_: Exception) {
      // best-effort: a muted clip is acceptable; a leaked face is not
    } finally {
      ex.release()
    }
  }

  private fun selectTrack(ex: MediaExtractor, prefix: String): Int {
    for (i in 0 until ex.trackCount) {
      val mime = ex.getTrackFormat(i).getString(MediaFormat.KEY_MIME) ?: continue
      if (mime.startsWith(prefix)) return i
    }
    return -1
  }

  private fun cap720(w: Int, h: Int): Pair<Int, Int> {
    val longEdge = max(w, h)
    val scale = if (longEdge <= MAX_LONG_EDGE) 1f else MAX_LONG_EDGE.toFloat() / longEdge
    return Pair((w * scale).toInt() and 1.inv(), (h * scale).toInt() and 1.inv())
  }
}
