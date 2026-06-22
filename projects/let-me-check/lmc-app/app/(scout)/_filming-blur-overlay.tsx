// Phase 6 (D-01, D-07): On-device face-blur overlay for the filming viewfinder.
//
// SCAFFOLD — only active when BLUR_NATIVE_ENABLED = true in app/lib/blur-config.ts.
// With the flag off (the current default), this file is never imported or executed.
//
// Architecture (Category B — device-build-verifiable only):
//   - react-native-vision-camera-face-detector v1.10.2 (MLKit, v4.7.x compat)
//     runs as a frame processor worklet, returning face bounding boxes per frame.
//   - @shopify/react-native-skia Canvas is positioned absolutely over the camera
//     preview, drawing a BlurMask + Fill rect over each detected face region.
//   - react-native-vision-camera-skia (SkiaCamera bridge) has NO v4-compatible
//     version (all published versions target v5.x — RESEARCH Assumption A3 FALSE).
//     We fall back to a plain Skia <Canvas> overlay, which achieves the same
//     visual result without the bridge.
//   - react-native-worklets-core v1.6.3 provides the 'worklet' runtime and
//     useRunOnJS so the frame processor can pass face bounds to the JS thread.
//
// New-Arch risk (RESEARCH A1-A3):
//   - react-native-worklets-core: ASSUMED New-Arch compatible on RN 0.83.2 (A1)
//   - react-native-vision-camera-face-detector: ASSUMED v4 + New-Arch compatible (A2)
//   - @shopify/react-native-skia: ASSUMED works as plain Canvas (no SkiaCamera) (A3)
//   Prior bites: createUploadTask (Phase 5), google-signin (Phase 4).
//   The EAS dev build is the ONLY gate — correctness is not verifiable offline.
//
// Babel note: react-native-worklets-core requires its Babel plugin in babel.config.js:
//   { plugins: [["react-native-worklets-core/plugin"]] }
//   This MUST be added before BLUR_NATIVE_ENABLED is flipped true, or the 'worklet'
//   directive will not be compiled and the frame processor will throw at runtime.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Camera, useFrameProcessor, type CameraDevice } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { Canvas, Rect, BlurMask, Fill, Paint } from '@shopify/react-native-skia';
import { useFaceDetector, type Bounds } from 'react-native-vision-camera-face-detector';
import { BLUR_PIXEL_RADIUS } from '../lib/blur-config';

// ViewfinderProps mirrors the CameraViewfinder prop surface exactly so
// BlurViewfinder is a drop-in replacement gated by BLUR_NATIVE_ENABLED.
// Any change to CameraViewfinder's props MUST be mirrored here.
export interface ViewfinderProps {
  visible: boolean;
  recordSecs: number;
  captured: boolean;
  onStop: () => void;
  venue: string;
  cameraRef: React.RefObject<Camera | null>;
  device: CameraDevice | undefined;
  hasPermission: boolean;
  onCameraInitialized?: () => void;
}

/**
 * BlurViewfinder — drop-in replacement for CameraViewfinder when
 * BLUR_NATIVE_ENABLED is true. Adds a Skia Canvas overlay that draws a
 * blur rect over each MLKit-detected face bounding box, per frame.
 *
 * INVARIANTS preserved (same as CameraViewfinder):
 *   - audio={false}  — mic NEVER opened (VID-02)
 *   - video={true}   — live capture only (VID-01, fresh-capture)
 *   - 15s cap enforced by filming.tsx (unchanged; this component has no cap logic)
 *   - cameraRef / device / onCameraInitialized wiring unchanged
 */
export function BlurViewfinder({
  visible,
  recordSecs,
  captured,
  onStop,
  venue,
  cameraRef,
  device,
  hasPermission,
  onCameraInitialized,
}: ViewfinderProps): React.JSX.Element {
  const blink = useRef(new Animated.Value(1)).current;

  // Face bounding boxes from the frame processor, bridged to the JS thread
  // via useRunOnJS so the Skia Canvas can read them during render.
  const [faceBounds, setFaceBounds] = useState<Bounds[]>([]);

  // [Canvas layout] We need the actual pixel dimensions of the camera preview
  // to map face bounding boxes (which are in camera pixel space) to the canvas.
  // useRunOnJS is the bridge from the worklet frame processor back to JS state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateFaces = useRunOnJS(
    (bounds: Bounds[]) => {
      setFaceBounds(bounds);
    },
    [],
  );

  // Frame processor: runs on every camera frame (worklet thread).
  // Detects faces via MLKit and pushes bounding boxes to the JS thread.
  // 'worklet' directive requires react-native-worklets-core Babel plugin in babel.config.js.
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    // autoMode=false: bounding boxes are in raw camera pixel coords, not auto-scaled.
    // We handle scaling ourselves when mapping to canvas coords.
    autoMode: false,
    cameraFacing: 'back',
  });

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const faces = detectFaces(frame);
      const bounds = faces.map((f) => f.bounds);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      updateFaces(bounds);
    },
    [detectFaces, updateFaces],
  );

  // REC blink animation (same as CameraViewfinder)
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, {
          toValue: 0.25,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blink, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, blink]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const elapsed = `${pad(Math.floor(recordSecs / 60))}:${pad(recordSecs % 60)}`;
  const remaining = `${pad(Math.floor((15 - recordSecs) / 60))}:${pad(Math.max(0, 15 - recordSecs) % 60)}`;
  const progressPct = (recordSecs / 15) * 100;

  // Camera is ready to render when modal is visible + permission granted + device present.
  const cameraReady = visible && hasPermission && !!device;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onStop}>
      <View style={blurStyles.bg}>
        {/* Real camera preview — audio off (VID-02), back device, no mic. */}
        {cameraReady ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device!}
            isActive={visible}
            video={true}
            audio={false}
            pixelFormat="yuv"
            onInitialized={onCameraInitialized}
            frameProcessor={frameProcessor}
          />
        ) : (
          // No camera available (e.g. simulator) — dark chrome remains usable.
          <View style={blurStyles.feedTint} />
        )}

        {/* Skia Canvas: face-blur overlay. Positioned absolutely over the full
            camera preview. Draws a BlurMask + opaque Fill rect over each face
            bounding box returned by the MLKit frame processor.
            NOTE: bounding box coordinates are in camera pixel space (raw frame
            dimensions). Mapping to screen pixels requires scaling by
            screenWidth/frameWidth and screenHeight/frameHeight. This scaffold
            passes the raw coords — visual accuracy is verified on device (Cat C). */}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {faceBounds.map((b, i) => (
            <Rect key={i} x={b.x} y={b.y} width={b.width} height={b.height}>
              <BlurMask blur={BLUR_PIXEL_RADIUS} style="normal" respectCTM={false} />
              {/* Solid fill with a blur mask produces a visible blurred region
                  over the face. The fill colour is close to skin tone to avoid
                  a hard black rect when blur sigma is low. */}
              <Paint color="rgba(200,160,140,0.85)" />
            </Rect>
          ))}
        </Canvas>

        <View style={blurStyles.vignetteTop} />
        <View style={blurStyles.vignetteBottom} />

        {/* Rule-of-thirds guides */}
        <View style={[blurStyles.guide, blurStyles.guideVert1]} />
        <View style={[blurStyles.guide, blurStyles.guideVert2]} />
        <View style={[blurStyles.guide, blurStyles.guideHorz1]} />
        <View style={[blurStyles.guide, blurStyles.guideHorz2]} />

        {/* CAPTURED flash */}
        {captured && (
          <View style={blurStyles.capturedOverlay}>
            <View style={blurStyles.capturedRing}>
              <View style={blurStyles.capturedInner}>
                <Ionicons name="checkmark" size={28} color="#000" />
              </View>
            </View>
            <Text style={blurStyles.capturedLabel}>CAPTURED</Text>
          </View>
        )}

        <SafeAreaView style={blurStyles.safe}>
          {/* Top status bar */}
          <View style={blurStyles.topBar}>
            <View style={blurStyles.statusPills}>
              <View style={blurStyles.statusPill}>
                <Ionicons name="location" size={10} color="#00FF7F" />
                <Text style={blurStyles.statusPillText}>GPS</Text>
              </View>
              <View style={blurStyles.statusPill}>
                <Ionicons name="mic-off" size={10} color="rgba(255,255,255,0.85)" />
                <Text style={blurStyles.statusPillText}>MIC OFF</Text>
              </View>
              {/* Face-blur indicator — visible when BLUR_NATIVE_ENABLED is on */}
              <View style={[blurStyles.statusPill, blurStyles.blurPill]}>
                <Ionicons name="eye-off" size={10} color="#22c55e" />
                <Text style={[blurStyles.statusPillText, blurStyles.blurPillText]}>BLUR ON</Text>
              </View>
            </View>
            <Animated.View style={[blurStyles.recPill, { opacity: blink }]}>
              <View style={blurStyles.recDot} />
              <Text style={blurStyles.recText}>REC</Text>
            </Animated.View>
          </View>

          {/* Center venue label */}
          <View style={blurStyles.center}>
            <Text style={blurStyles.venueLabel}>FILMING</Text>
            <Text style={blurStyles.venueName}>{venue}</Text>
          </View>

          {/* Bottom: timer + progress + stop */}
          <View style={blurStyles.bottomBar}>
            <View style={blurStyles.timerRow}>
              <Text style={blurStyles.timerElapsed}>{elapsed}</Text>
              <Text style={blurStyles.timerRemaining}>−{remaining}</Text>
            </View>
            <View style={blurStyles.progressTrack}>
              <View style={[blurStyles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={blurStyles.helper}>
              {recordSecs === 0
                ? 'Starting…'
                : recordSecs < 15
                ? 'Hold steady · wide shots only · faces blurred'
                : 'Captured — closing…'}
            </Text>

            <TouchableOpacity
              style={blurStyles.stopBtn}
              activeOpacity={0.85}
              onPress={onStop}
            >
              <View style={blurStyles.stopOuter}>
                <View style={blurStyles.stopInner} />
              </View>
              <View style={blurStyles.stopLabelRow}>
                <Ionicons name="refresh" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={blurStyles.stopLabel}>STOP & RETAKE</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const blurStyles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0a0a0a' },
  feedTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  guide: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  guideVert1: { left: '33.33%', top: 0, bottom: 0, width: 1 },
  guideVert2: { left: '66.66%', top: 0, bottom: 0, width: 1 },
  guideHorz1: { top: '33.33%', left: 0, right: 0, height: 1 },
  guideHorz2: { top: '66.66%', left: 0, right: 0, height: 1 },

  capturedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  capturedRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,255,127,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,127,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  capturedInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#00FF7F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturedLabel: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 4,
  },

  safe: { flex: 1, justifyContent: 'space-between' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  statusPills: { flexDirection: 'row', gap: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  blurPill: {
    borderColor: 'rgba(34,197,94,0.4)',
  },
  statusPillText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  blurPillText: {
    color: '#22c55e',
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FF3B30',
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  recText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 10,
    letterSpacing: 1.4,
  },

  center: { alignItems: 'center', paddingBottom: 60 },
  venueLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  venueName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },

  bottomBar: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    paddingTop: 14,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  timerElapsed: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 1,
  },
  timerRemaining: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  helper: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    marginBottom: 18,
  },

  stopBtn: { alignItems: 'center', gap: 12 },
  stopOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInner: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  stopLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
    letterSpacing: 3,
  },
});
