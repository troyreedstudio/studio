package expo.modules.lmcblur

import android.graphics.Bitmap
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.EGLContext
import android.opengl.EGLDisplay
import android.opengl.EGLExt
import android.opengl.EGLSurface
import android.opengl.GLES20
import android.opengl.GLUtils
import android.view.Surface
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * Minimal EGL + GLES20 helper that draws a 2D RGBA Bitmap onto a MediaCodec encoder
 * input Surface. The blur is already applied to the bitmap on the CPU
 * (LmcFaceBlurCpu), so this is a plain textured-quad blit — no external OES texture,
 * no SurfaceTexture transform, no rotation math (the source bitmaps come from
 * MediaMetadataRetriever already upright). That keeps the GL surface area tiny and
 * robust, which matters because we can't device-debug it.
 *
 * Usage: create with the encoder's input Surface, then per frame:
 *   drawBitmap(bmp); setPresentationTime(ptsNs); swapBuffers()
 */
class GlBlit(surface: Surface) {

  private var eglDisplay: EGLDisplay = EGL14.EGL_NO_DISPLAY
  private var eglContext: EGLContext = EGL14.EGL_NO_CONTEXT
  private var eglSurface: EGLSurface = EGL14.EGL_NO_SURFACE

  private val program: Int
  private val aPosLoc: Int
  private val aTexLoc: Int
  private val uTexLoc: Int
  private val texId: Int

  // Full-screen quad (triangle strip): clip-space positions + texcoords.
  // Texcoord Y is flipped (1 at the bottom row) so the top-left-origin bitmap
  // renders UPRIGHT in the output frame.
  private val vertices: FloatBuffer = floatBuf(
    floatArrayOf(
      // x,   y,     u,   v
      -1f, -1f, 0f, 1f,
      1f, -1f, 1f, 1f,
      -1f, 1f, 0f, 0f,
      1f, 1f, 1f, 0f,
    )
  )

  init {
    eglDisplay = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
    val version = IntArray(2)
    EGL14.eglInitialize(eglDisplay, version, 0, version, 1)
    val attrib = intArrayOf(
      EGL14.EGL_RED_SIZE, 8,
      EGL14.EGL_GREEN_SIZE, 8,
      EGL14.EGL_BLUE_SIZE, 8,
      EGL14.EGL_ALPHA_SIZE, 8,
      EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
      0x3142 /* EGL_RECORDABLE_ANDROID */, 1,
      EGL14.EGL_NONE,
    )
    val configs = arrayOfNulls<EGLConfig>(1)
    val numConfig = IntArray(1)
    EGL14.eglChooseConfig(eglDisplay, attrib, 0, configs, 0, 1, numConfig, 0)
    val ctxAttrib = intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE)
    eglContext = EGL14.eglCreateContext(eglDisplay, configs[0], EGL14.EGL_NO_CONTEXT, ctxAttrib, 0)
    val surfAttrib = intArrayOf(EGL14.EGL_NONE)
    eglSurface = EGL14.eglCreateWindowSurface(eglDisplay, configs[0], surface, surfAttrib, 0)
    EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)

    program = buildProgram(VERTEX_SHADER, FRAGMENT_SHADER)
    aPosLoc = GLES20.glGetAttribLocation(program, "aPosition")
    aTexLoc = GLES20.glGetAttribLocation(program, "aTexCoord")
    uTexLoc = GLES20.glGetUniformLocation(program, "uTexture")

    val tex = IntArray(1)
    GLES20.glGenTextures(1, tex, 0)
    texId = tex[0]
    GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, texId)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
  }

  /** Upload the (already-blurred) bitmap and draw it full-screen to the encoder surface. */
  fun drawBitmap(bitmap: Bitmap) {
    GLES20.glClearColor(0f, 0f, 0f, 1f)
    GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
    GLES20.glUseProgram(program)

    GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, texId)
    GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bitmap, 0)
    GLES20.glUniform1i(uTexLoc, 0)

    vertices.position(0)
    GLES20.glVertexAttribPointer(aPosLoc, 2, GLES20.GL_FLOAT, false, 16, vertices)
    GLES20.glEnableVertexAttribArray(aPosLoc)
    vertices.position(2)
    GLES20.glVertexAttribPointer(aTexLoc, 2, GLES20.GL_FLOAT, false, 16, vertices)
    GLES20.glEnableVertexAttribArray(aTexLoc)

    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
  }

  fun setPresentationTime(nsecs: Long) {
    EGLExt.eglPresentationTimeANDROID(eglDisplay, eglSurface, nsecs)
  }

  fun swapBuffers(): Boolean = EGL14.eglSwapBuffers(eglDisplay, eglSurface)

  fun release() {
    if (eglDisplay != EGL14.EGL_NO_DISPLAY) {
      EGL14.eglMakeCurrent(eglDisplay, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
      EGL14.eglDestroySurface(eglDisplay, eglSurface)
      EGL14.eglDestroyContext(eglDisplay, eglContext)
      EGL14.eglReleaseThread()
      EGL14.eglTerminate(eglDisplay)
    }
    eglDisplay = EGL14.EGL_NO_DISPLAY
    eglContext = EGL14.EGL_NO_CONTEXT
    eglSurface = EGL14.EGL_NO_SURFACE
  }

  private fun buildProgram(vs: String, fs: String): Int {
    val v = compile(GLES20.GL_VERTEX_SHADER, vs)
    val f = compile(GLES20.GL_FRAGMENT_SHADER, fs)
    val p = GLES20.glCreateProgram()
    GLES20.glAttachShader(p, v)
    GLES20.glAttachShader(p, f)
    GLES20.glLinkProgram(p)
    val status = IntArray(1)
    GLES20.glGetProgramiv(p, GLES20.GL_LINK_STATUS, status, 0)
    check(status[0] == GLES20.GL_TRUE) { "program link failed: " + GLES20.glGetProgramInfoLog(p) }
    return p
  }

  private fun compile(type: Int, src: String): Int {
    val s = GLES20.glCreateShader(type)
    GLES20.glShaderSource(s, src)
    GLES20.glCompileShader(s)
    val status = IntArray(1)
    GLES20.glGetShaderiv(s, GLES20.GL_COMPILE_STATUS, status, 0)
    check(status[0] == GLES20.GL_TRUE) { "shader compile failed: " + GLES20.glGetShaderInfoLog(s) }
    return s
  }

  private fun floatBuf(data: FloatArray): FloatBuffer {
    val bb = ByteBuffer.allocateDirect(data.size * 4).order(ByteOrder.nativeOrder())
    val fb = bb.asFloatBuffer()
    fb.put(data)
    fb.position(0)
    return fb
  }

  companion object {
    private const val VERTEX_SHADER = """
      attribute vec4 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vTexCoord;
      void main() {
        gl_Position = aPosition;
        vTexCoord = aTexCoord;
      }
    """

    private const val FRAGMENT_SHADER = """
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      void main() {
        gl_FragColor = texture2D(uTexture, vTexCoord);
      }
    """
  }
}
