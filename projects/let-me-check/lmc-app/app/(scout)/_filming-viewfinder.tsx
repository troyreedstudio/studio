// Filming viewfinder — the full-screen capture modal extracted out of
// filming.tsx to keep that screen a thin orchestration presenter (<500 lines,
// CLAUDE.md). Task 1a moved it verbatim (simulated feed); Task 1b swaps the
// simulated placeholder for a real <Camera audio={false}> preview underneath
// the same REC / GPS / 15s-ring chrome.

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
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Camera, type CameraDevice, type CameraFormat } from 'react-native-vision-camera';

export function CameraViewfinder({
  visible,
  recordSecs,
  captured,
  onStop,
  venue,
  cameraRef,
  device,
  format,
  hasPermission,
  onCameraInitialized,
}: {
  visible: boolean;
  recordSecs: number;
  captured: boolean;
  onStop: () => void;
  venue: string;
  cameraRef: React.RefObject<Camera | null>;
  device: CameraDevice | undefined;
  format?: CameraFormat;
  hasPermission: boolean;
  onCameraInitialized?: () => void;
}) {
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.25, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, blink]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const elapsed = `${pad(Math.floor(recordSecs / 60))}:${pad(recordSecs % 60)}`;
  const remaining = `${pad(Math.floor((15 - recordSecs) / 60))}:${pad(Math.max(0, 15 - recordSecs) % 60)}`;
  const progressPct = (recordSecs / 15) * 100;

  // The ONLY clip source is this live recorder (fresh-capture, VID-01). There is
  // no gallery/import affordance anywhere. Audio is never opened (audio={false},
  // VID-02). The camera renders only while the modal is visible.
  const cameraReady = visible && hasPermission && !!device;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onStop}>
      <View style={camStyles.bg}>
        {/* Real camera preview — audio off (VID-02), back device, no mic. */}
        {cameraReady ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device!}
            format={format}
            isActive={visible}
            video={true}
            audio={false}
            onInitialized={onCameraInitialized}
          />
        ) : (
          // No camera available (e.g. simulator) — keep the dark chrome usable.
          <View style={camStyles.feedTint} />
        )}
        <View style={camStyles.vignetteTop} />
        <View style={camStyles.vignetteBottom} />

        {/* Rule of thirds guides */}
        <View style={[camStyles.guide, camStyles.guideVert1]} />
        <View style={[camStyles.guide, camStyles.guideVert2]} />
        <View style={[camStyles.guide, camStyles.guideHorz1]} />
        <View style={[camStyles.guide, camStyles.guideHorz2]} />

        {/* CAPTURED flash — fades in for 700ms before modal closes */}
        {captured && (
          <View style={camStyles.capturedOverlay}>
            <View style={camStyles.capturedRing}>
              <View style={camStyles.capturedInner}>
                <Ionicons name="checkmark" size={28} color="#000" />
              </View>
            </View>
            <Text style={camStyles.capturedLabel}>CAPTURED</Text>
          </View>
        )}

        <SafeAreaView style={camStyles.safe}>
          {/* Top status bar */}
          <View style={camStyles.topBar}>
            <View style={camStyles.statusPills}>
              <View style={camStyles.statusPill}>
                <Ionicons name="location" size={10} color="#16A34A" />
                <Text style={camStyles.statusPillText}>GPS</Text>
              </View>
              <View style={camStyles.statusPill}>
                <Ionicons name="mic-off" size={10} color="rgba(255,255,255,0.85)" />
                <Text style={camStyles.statusPillText}>MIC OFF</Text>
              </View>
            </View>
            <Animated.View style={[camStyles.recPill, { opacity: blink }]}>
              <View style={camStyles.recDot} />
              <Text style={camStyles.recText}>REC</Text>
            </Animated.View>
          </View>

          {/* Center venue label */}
          <View style={camStyles.center}>
            <Text style={camStyles.venueLabel}>FILMING</Text>
            <Text style={camStyles.venueName}>{venue}</Text>
          </View>

          {/* Bottom: timer + progress + stop */}
          <View style={camStyles.bottomBar}>
            <View style={camStyles.timerRow}>
              <Text style={camStyles.timerElapsed}>{elapsed}</Text>
              <Text style={camStyles.timerRemaining}>−{remaining}</Text>
            </View>
            <View style={camStyles.progressTrack}>
              <View style={[camStyles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={camStyles.helper}>
              {recordSecs === 0
                ? 'Starting…'
                : recordSecs < 15
                ? 'Hold steady · wide shots only · no faces'
                : 'Captured — closing…'}
            </Text>

            <TouchableOpacity
              style={camStyles.stopBtn}
              activeOpacity={0.85}
              onPress={onStop}
            >
              <View style={camStyles.stopOuter}>
                <View style={camStyles.stopInner} />
              </View>
              <View style={camStyles.stopLabelRow}>
                <Ionicons name="refresh" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={camStyles.stopLabel}>STOP & RETAKE</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const camStyles = StyleSheet.create({
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
    backgroundColor: 'rgba(22,163,74,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(22,163,74,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  capturedInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#16A34A',
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
  statusPillText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 10,
    letterSpacing: 1.2,
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
