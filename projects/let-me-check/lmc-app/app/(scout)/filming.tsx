import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { markFilming, markDelivered } from '../lib/checks';

const TROUBLE_REASONS = [
  'Line is gone / venue empty',
  'Hostile staff or bouncer',
  "Can’t safely enter the area",
  'Venue closed / not operating',
];

export default function FilmingScreen() {
  const router = useRouter();
  const { checkId, venue = 'Komodo', payout = '10', tier = 'priority' } = useLocalSearchParams<{
    checkId?: string;
    venue?: string;
    payout?: string;
    tier?: string;
  }>();
  const isPriority = tier === 'priority';
  const totalSeconds = isPriority ? 420 : 600;
  // Guard so 'assigned -> filming' fires exactly once (the first capture start).
  const filmingMarked = useRef(false);

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [troubleOpen, setTroubleOpen] = useState(false);
  const [troubleReason, setTroubleReason] = useState<string | null>(null);
  const [takesCount, setTakesCount] = useState(0);
  const MAX_TAKES = 3;
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadStage, setUploadStage] = useState<'uploading' | 'verifying' | 'done'>(
    'uploading',
  );
  const haloPulse = useRef(new Animated.Value(1)).current;

  // Breathing halo on the idle record button — subtle futuristic pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1.18, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [haloPulse]);

  // Delivery countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const [captureFlash, setCaptureFlash] = useState(false);

  // Recording timer (auto-stop at 15s with brief "CAPTURED" flash before modal close)
  useEffect(() => {
    if (!recording) return;
    if (recordSecs >= 15) {
      setCaptureFlash(true);
      const flashT = setTimeout(() => {
        setRecording(false);
        setCaptureFlash(false);
        setTakesCount((n) => n + 1);
      }, 700);
      return () => clearTimeout(flashT);
    }
    const t = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording, recordSecs]);

  const handleRetake = () => {
    if (takesCount >= MAX_TAKES) return;
    setRecordSecs(0);
    setRecording(false);
  };

  // Toggle the record button. On the FIRST capture start, move the check
  // 'assigned -> filming' (required before the stub-clip insert per RLS 0009,
  // and it drives the Seeker's "filming" step). Fires once via filmingMarked.
  const handleToggleRecord = () => {
    const starting = !recording;
    if (starting && checkId && !filmingMarked.current) {
      filmingMarked.current = true;
      markFilming(checkId).catch(() => {
        // Allow a retry if the transition didn't land (e.g. transient network).
        filmingMarked.current = false;
      });
    }
    setRecording(starting);
  };

  // SUBMIT: mark the check delivered with a STUB clip (no real camera/Mux this
  // phase) and route to the success screen with the real checkId.
  // TODO(phase-3): replace the stub clip with a real Mux capture/upload.
  const handleSubmit = () => {
    if (!checkId) {
      setUploading(true);
      return;
    }
    setUploading(true);
    markDelivered(checkId, new Date().toISOString()).catch(() => {
      // Delivery failed — drop out of the upload animation so the Scout can retry.
      setUploading(false);
    });
  };

  // Upload progression — runs when uploading flips true.
  // Stage tracked locally to avoid the effect retriggering on stage change.
  useEffect(() => {
    if (!uploading) return;
    setUploadStage('uploading');
    setUploadPct(0);
    let pct = 0;
    let localStage: 'uploading' | 'verifying' | 'done' = 'uploading';
    const tick = setInterval(() => {
      pct += pct < 80 ? 8 : 3;
      if (pct >= 80 && localStage === 'uploading') {
        localStage = 'verifying';
        setUploadStage('verifying');
      }
      if (pct >= 100) {
        pct = 100;
        localStage = 'done';
        setUploadPct(100);
        setUploadStage('done');
        clearInterval(tick);
        setTimeout(
          () =>
            router.replace({
              pathname: '/(scout)/submitted',
              params: { checkId: String(checkId ?? ''), tier: String(tier) },
            }),
          700,
        );
        return;
      }
      setUploadPct(pct);
    }, 220);
    return () => clearInterval(tick);
  }, [uploading, router, checkId, tier]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeLeft = `${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)}`;

  // Step state
  const stepState = (i: number) => {
    if (i === 0) return 'done'; // arrived
    if (i === 1) return recordSecs >= 15 ? 'done' : 'active'; // film
    if (i === 2) return uploading || uploadPct === 100 ? (uploadPct === 100 ? 'done' : 'active') : recordSecs >= 15 ? 'active' : 'pending';
    return 'pending';
  };

  const STEPS = [
    { label: 'Arrived at venue' },
    { label: recording ? `Filming ${recordSecs}s / 15s` : recordSecs >= 15 ? 'Captured 15s clip' : 'Capture 15s clip' },
    { label: uploading ? `${uploadStage === 'uploading' ? 'Uploading' : uploadStage === 'verifying' ? 'Verifying' : 'Delivered'}` : 'Submit + verify' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.replace('/(scout)/dashboard')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backText}>‹ Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.wireframeBadge}
              onPress={() => router.push('/flow-map')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={styles.wireframeBadgeText}>WF</Text>
            </TouchableOpacity>
          </View>

          {/* Accepted pill */}
          <View style={styles.acceptedRow}>
            <View style={styles.acceptedPill}>
              <Ionicons name="checkmark-circle" size={12} color="#00FF7F" />
              <Text style={styles.acceptedText}>REQUEST ACCEPTED</Text>
            </View>
            {isPriority && (
              <View style={styles.priorityPill}>
                <Ionicons name="flash" size={9} color="#1a1a1a" />
                <Text style={styles.priorityPillText}>PRIORITY</Text>
              </View>
            )}
          </View>

          {/* Venue */}
          <Text style={styles.venueName}>{venue}</Text>
          <View style={styles.venueMetaRow}>
            <Ionicons name="location" size={11} color="rgba(255,255,255,0.6)" />
            <Text style={styles.venueAddress}>Brickell · Miami · 0.3 mi</Text>
          </View>

          {/* Trouble Here */}
          {troubleReason ? (
            <View style={[styles.troubleBase, styles.troubleReported]}>
              <Ionicons name="checkmark-circle" size={18} color="#00FF7F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.troubleTitle}>REPORTED · SEEKER REFUNDED</Text>
                <Text style={styles.troubleSub}>
                  {troubleReason} · You’ll still be paid for travel.
                </Text>
              </View>
            </View>
          ) : !troubleOpen ? (
            <TouchableOpacity
              style={[styles.troubleBase, styles.troubleClosed]}
              activeOpacity={0.85}
              onPress={() => setTroubleOpen(true)}
            >
              <Ionicons name="warning" size={16} color="#FFCB47" />
              <View style={{ flex: 1 }}>
                <Text style={styles.troubleTitle}>TROUBLE HERE — REPORT VENUE</Text>
                <Text style={styles.troubleSub}>
                  Tap if you can’t safely complete this check. Seeker auto-refunded.
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.troubleBase, styles.troubleExpanded]}>
              <View style={styles.troubleHeader}>
                <Text style={styles.troubleHeaderLabel}>WHAT’S THE ISSUE?</Text>
                <TouchableOpacity
                  onPress={() => setTroubleOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
              {TROUBLE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.troubleReasonRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTroubleReason(r);
                    setTroubleOpen(false);
                  }}
                >
                  <Text style={styles.troubleReasonText}>{r}</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Delivery countdown */}
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>DELIVERY DEADLINE</Text>
            <Text style={styles.countdown}>{timeLeft}</Text>
            <Text style={styles.countdownSub}>
              {isPriority ? 'Priority window · 7 minutes' : 'Standard window · 10 minutes'}
            </Text>
          </View>

          {/* Steps */}
          <View style={styles.stepsCard}>
            {STEPS.map((step, i) => {
              const state = stepState(i);
              return (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View
                      style={[
                        styles.stepDot,
                        state === 'done' && styles.stepDotDone,
                        state === 'active' && styles.stepDotActive,
                      ]}
                    >
                      {state === 'done' && (
                        <Ionicons name="checkmark" size={11} color="#000" />
                      )}
                      {state === 'active' && <View style={styles.stepDotPulse} />}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          state === 'done' && styles.stepLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      state === 'done' && styles.stepLabelDone,
                      state === 'active' && styles.stepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* GPS */}
          <View style={styles.gpsPill}>
            <Ionicons name="location" size={11} color="#00FF7F" />
            <Text style={styles.gpsText}>GPS Verified — you’re at the right place</Text>
          </View>

          {/* Record button OR Upload progress */}
          {uploading ? (
            <View style={styles.uploadWrap}>
              <View style={styles.uploadHeader}>
                <Text style={styles.uploadStageLabel}>
                  {uploadStage === 'uploading'
                    ? 'UPLOADING TO LMC'
                    : uploadStage === 'verifying'
                    ? 'VERIFYING GPS + SIGNAGE'
                    : 'CLIP DELIVERED'}
                </Text>
                <Text style={styles.uploadPct}>{uploadPct}%</Text>
              </View>
              <View style={styles.uploadTrack}>
                <View style={[styles.uploadFill, { width: `${uploadPct}%` }]} />
              </View>
              <Text style={styles.uploadSub}>
                {uploadStage === 'uploading'
                  ? 'Encrypted upload to LMC. Don’t close the app.'
                  : uploadStage === 'verifying'
                  ? 'Server-side checks running. Almost done.'
                  : 'Routing you to the success screen…'}
              </Text>
            </View>
          ) : recordSecs >= 15 ? (
            // Decision card — Retake (if takes left) or Submit
            <View style={styles.decisionCard}>
              <View style={styles.decisionTopRow}>
                <Text style={styles.decisionTakeLabel}>
                  TAKE {takesCount} OF {MAX_TAKES}
                </Text>
                {takesCount >= MAX_TAKES ? (
                  <View style={styles.lastTakeBadge}>
                    <Text style={styles.lastTakeBadgeText}>FINAL</Text>
                  </View>
                ) : (
                  <Text style={styles.takesRemaining}>
                    {MAX_TAKES - takesCount} retake{MAX_TAKES - takesCount === 1 ? '' : 's'} left
                  </Text>
                )}
              </View>
              <Text style={styles.decisionTitle}>15s captured. Looks good?</Text>
              <Text style={styles.decisionSub}>
                {takesCount >= MAX_TAKES
                  ? 'This is your final take. Submit when ready.'
                  : 'Submit to send, or retake if it didn’t come out right.'}
              </Text>

              <View style={styles.decisionButtonRow}>
                {takesCount < MAX_TAKES && (
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    activeOpacity={0.85}
                    onPress={handleRetake}
                  >
                    <Ionicons name="refresh" size={14} color="#ffffff" />
                    <Text style={styles.retakeBtnText}>RETAKE</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    takesCount >= MAX_TAKES && styles.submitBtnFull,
                  ]}
                  activeOpacity={0.9}
                  onPress={handleSubmit}
                >
                  <Ionicons name="arrow-up" size={14} color="#000" />
                  <Text style={styles.submitBtnText}>SUBMIT CLIP</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.recordWrap}>
              <TouchableOpacity
                style={styles.recordBtn}
                onPress={handleToggleRecord}
                activeOpacity={0.85}
              >
                {!recording && (
                  <Animated.View
                    style={[styles.recordHalo, { transform: [{ scale: haloPulse }] }]}
                  />
                )}
                <View
                  style={[styles.recordOuter, recording && styles.recordOuterActive]}
                >
                  <View
                    style={[
                      styles.recordInner,
                      recording && styles.recordInnerActive,
                    ]}
                  >
                    {recording ? (
                      <View style={styles.stopSquare} />
                    ) : (
                      <View style={styles.recordCircle} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.recordHint}>
                {recording
                  ? `Recording… ${recordSecs}s of 15s`
                  : takesCount > 0
                  ? `Tap to start take ${takesCount + 1} of ${MAX_TAKES}`
                  : 'Tap to start filming'}
              </Text>
            </View>
          )}

          {/* Earnings note */}
          <Text style={styles.earnNote}>
            You’ll earn ${payout} on delivery once the video is accepted
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* SIMULATED CAMERA VIEWFINDER — opens when recording, auto-closes at 15s */}
      <CameraViewfinder
        visible={recording || captureFlash}
        recordSecs={recordSecs}
        captured={captureFlash}
        onStop={() => {
          // STOP mid-recording = abort + discard the take.
          // recordSecs resets to 0 so the next tap starts fresh, and takesCount
          // is NOT incremented (you don't burn a retake for a botched take).
          setRecordSecs(0);
          setRecording(false);
        }}
        venue={String(venue)}
      />
    </View>
  );
}

// ===============================
// Simulated camera viewfinder
// ===============================
function CameraViewfinder({
  visible,
  recordSecs,
  captured,
  onStop,
  venue,
}: {
  visible: boolean;
  recordSecs: number;
  captured: boolean;
  onStop: () => void;
  venue: string;
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

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onStop}>
      <View style={camStyles.bg}>
        {/* Camera feed placeholder — dark with subtle vignette */}
        <View style={camStyles.feedTint} />
        <View style={camStyles.vignetteTop} />
        <View style={camStyles.vignetteBottom} />

        {/* Rule of thirds guides */}
        <View style={[camStyles.guide, camStyles.guideVert1]} />
        <View style={[camStyles.guide, camStyles.guideVert2]} />
        <View style={[camStyles.guide, camStyles.guideHorz1]} />
        <View style={[camStyles.guide, camStyles.guideHorz2]} />

        {/* SIMULATED watermark */}
        <View style={camStyles.simWatermark}>
          <Text style={camStyles.simWatermarkText}>SIMULATED VIEW</Text>
        </View>

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
                <Ionicons name="location" size={10} color="#00FF7F" />
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
  simWatermark: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  simWatermarkText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
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
  stopHint: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingBottom: 40, alignItems: 'center' },

  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 14,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  wireframeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,107,0,0.18)',
  },
  wireframeBadgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF6B00',
    fontSize: 9,
    letterSpacing: 1.4,
  },

  acceptedRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  acceptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.4)',
  },
  acceptedText: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 10,
    letterSpacing: 1.6,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFCB47',
    borderWidth: 1,
    borderColor: '#C99A1F',
  },
  priorityPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#1a1a1a',
    letterSpacing: 1.4,
  },

  venueName: {
    width: '100%',
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  venueMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  venueAddress: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
  },

  troubleBase: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  troubleClosed: {
    backgroundColor: 'rgba(255,203,71,0.08)',
    borderColor: 'rgba(255,203,71,0.4)',
  },
  troubleReported: {
    backgroundColor: 'rgba(0,255,127,0.08)',
    borderColor: 'rgba(0,255,127,0.4)',
    alignItems: 'center',
  },
  troubleExpanded: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 0,
    backgroundColor: 'rgba(255,203,71,0.06)',
    borderColor: 'rgba(255,203,71,0.4)',
    paddingTop: 12,
    paddingBottom: 4,
  },
  troubleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  troubleHeaderLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FFCB47',
    letterSpacing: 1.4,
  },
  troubleTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  troubleSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  troubleReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  troubleReasonText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  countdownCard: {
    width: '100%',
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.55)',
    marginBottom: 22,
  },
  countdownLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  countdown: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 48,
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 4,
  },
  countdownSub: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FFCB47',
    letterSpacing: 1.2,
  },

  stepsCard: {
    width: '100%',
    paddingLeft: 4,
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    backgroundColor: '#00FF7F',
    borderColor: '#00FF7F',
  },
  stepDotActive: {
    backgroundColor: 'rgba(0,255,127,0.15)',
    borderColor: '#00FF7F',
  },
  stepDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00FF7F',
  },
  stepLine: {
    width: 1.5,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 2,
  },
  stepLineDone: { backgroundColor: '#00FF7F' },
  stepLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    paddingTop: 2,
    paddingBottom: 18,
    letterSpacing: 0.2,
  },
  stepLabelDone: { color: 'rgba(255,255,255,0.7)' },
  stepLabelActive: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
  },

  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,255,127,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.3)',
  },
  gpsText: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 10.5,
    letterSpacing: 0.6,
  },

  recordWrap: { alignItems: 'center', width: '100%', marginBottom: 14 },
  recordBtn: { alignItems: 'center', marginBottom: 12, padding: 8 },
  recordHalo: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  recordOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordOuterActive: {
    borderColor: 'rgba(255,255,255,0.7)',
  },
  recordInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInnerActive: {},
  recordCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FF3B30',
  },
  stopSquare: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  recordHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },

  decisionCard: {
    width: '100%',
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.55)',
    marginBottom: 14,
  },
  decisionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  decisionTakeLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#00FF7F',
    letterSpacing: 2,
  },
  takesRemaining: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  lastTakeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFCB47',
    borderWidth: 1,
    borderColor: '#C99A1F',
  },
  lastTakeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#1a1a1a',
    letterSpacing: 1.4,
  },
  decisionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  decisionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 14,
  },
  decisionButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  retakeBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 12,
    letterSpacing: 1.8,
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00FF7F',
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnFull: { flex: 1 },
  submitBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 12,
    letterSpacing: 1.8,
  },
  uploadWrap: {
    width: '100%',
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.55)',
    marginBottom: 14,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadStageLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#00FF7F',
    letterSpacing: 2,
  },
  uploadPct: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  uploadTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  uploadFill: {
    height: '100%',
    backgroundColor: '#00FF7F',
    borderRadius: 3,
  },
  uploadSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 17,
    letterSpacing: 0.2,
  },

  earnNote: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#00FF7F',
    letterSpacing: 0.6,
    marginTop: 10,
  },
});
