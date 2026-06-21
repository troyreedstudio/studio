import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import * as Location from 'expo-location';
import { markFilming } from '../lib/checks';
import { useClipUpload } from '../lib/clips';
import { CameraViewfinder } from './_filming-viewfinder';
import { styles } from './_filming-styles';

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
  // True between the Scout tapping Record and the camera reporting it's ready —
  // startRecording() only fires once the camera is initialized (onInitialized).
  const pendingStart = useRef(false);
  // The ONLY clip source is the live recorder's path (fresh-capture, VID-01),
  // set by onRecordingFinished; the GPS stamp rides along (not verified, Ph 5).
  const [capturedPath, setCapturedPath] = useState<string | null>(null);
  const capturedGps = useRef<{ lat: number; lng: number } | null>(null);

  // Real camera (vision-camera). Audio is never opened (audio={false} in the
  // viewfinder, VID-02). Back device, permission requested on mount. The camera
  // can be absent on a simulator — the screen degrades gracefully.
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  useEffect(() => {
    if (!hasPermission) requestPermission().catch(() => {});
  }, [hasPermission, requestPermission]);

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [troubleOpen, setTroubleOpen] = useState(false);
  const [troubleReason, setTroubleReason] = useState<string | null>(null);
  const [takesCount, setTakesCount] = useState(0);
  const MAX_TAKES = 3;
  // Real upload orchestration (extracted to lib/clips). Drives the progress UI
  // from progress/status; never marks the check delivered — webhook owns that.
  const clipUpload = useClipUpload();
  const uploading = clipUpload.status === 'uploading' || clipUpload.status === 'processing';
  const uploadPct = Math.round(clipUpload.progress * 100);
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

  // Recording timer: count to the 15s cap, then stop the REAL recorder
  // (onRecordingFinished sets the live clip path, VID-01).
  useEffect(() => {
    if (!recording) return;
    if (recordSecs >= 15) {
      setCaptureFlash(true);
      // Enforce the 15s cap on the live recorder. onRecordingFinished sets the
      // path; the catch keeps the UI flowing on a simulator (no real recorder).
      camera.current?.stopRecording().catch(() => {});
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
    setCapturedPath(null);
  };

  // Begin a live recording on the back camera. The ONLY clip source is
  // onRecordingFinished's path — there is no gallery/import path (VID-01).
  const startRecording = () => {
    console.log(`[LMC-CAM] startRecording called, camera.current=${!!camera.current}`);
    camera.current?.startRecording({
      onRecordingFinished: (v) => {
        console.log(`[LMC-CAM] onRecordingFinished path=${v.path} dur=${v.duration}`);
        setCapturedPath(v.path);
      },
      onRecordingError: (e) => {
        console.error(`[LMC-CAM] onRecordingError ${e?.message ?? e}`);
        setRecording(false);
        setCapturedPath(null);
      },
    });
  };

  // GPS stamp at record time (provenance only — not verified, that's Phase 5).
  const stampGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      capturedGps.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // best-effort
    }
  };

  // Toggle record. On the FIRST capture start, move the check 'assigned ->
  // filming' (drives the Seeker's "filming" step). Fires once via filmingMarked.
  const handleToggleRecord = () => {
    const starting = !recording;
    if (starting) {
      stampGps();
      // Defer the actual recorder start until the camera reports it is active and
      // ready (handleCameraInitialized). Calling startRecording() before the
      // camera is awake produced no file — the silent-Submit bug.
      pendingStart.current = true;
    } else {
      // Manual stop before the 15s cap — stop the real recorder too.
      camera.current?.stopRecording().catch(() => {});
    }
    if (starting && checkId && !filmingMarked.current) {
      filmingMarked.current = true;
      markFilming(checkId).catch(() => {
        // Allow a retry if the transition didn't land (e.g. transient network).
        filmingMarked.current = false;
      });
    }
    setRecording(starting);
  };

  // Fired by the Camera once it is active and ready. This is the ONLY place
  // startRecording() runs, so the recorder is guaranteed awake before we record.
  const handleCameraInitialized = () => {
    console.log(`[LMC-CAM] onInitialized (pendingStart=${pendingStart.current})`);
    if (pendingStart.current) {
      pendingStart.current = false;
      startRecording();
    }
  };

  // SUBMIT: run the REAL upload through the lib helper. The client never marks
  // delivered — the Mux webhook owns it (VID-03). On success (upload PUT landed,
  // check "processing") route to the success screen; the Seeker's Realtime watch
  // flips to delivered when the webhook fires. On failure, stay so the Scout can
  // retry.
  const handleSubmit = async () => {
    if (!checkId) return;
    if (!capturedPath) {
      // No file was captured (e.g. the recorder never produced one). Tell the
      // Scout instead of silently doing nothing, and let them retake.
      console.error('[LMC-CAM] submit blocked: capturedPath is null');
      Alert.alert('No clip captured', 'That take didn’t record. Please film the clip again.');
      return;
    }
    const ok = await clipUpload.submit(checkId, capturedPath, capturedGps.current);
    if (ok) {
      router.replace({
        pathname: '/(scout)/submitted',
        params: { checkId: String(checkId), tier: String(tier) },
      });
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeLeft = `${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)}`;

  // Step state
  const stepState = (i: number) => {
    if (i === 0) return 'done'; // arrived
    if (i === 1) return recordSecs >= 15 ? 'done' : 'active'; // film
    if (i === 2)
      return clipUpload.status === 'processing'
        ? 'done'
        : uploading
        ? 'active'
        : recordSecs >= 15
        ? 'active'
        : 'pending';
    return 'pending';
  };

  const STEPS = [
    { label: 'Arrived at venue' },
    { label: recording ? `Filming ${recordSecs}s / 15s` : recordSecs >= 15 ? 'Captured 15s clip' : 'Capture 15s clip' },
    {
      label: uploading
        ? clipUpload.status === 'processing'
          ? 'Processing'
          : 'Uploading'
        : 'Submit + upload',
    },
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
                  {clipUpload.status === 'processing'
                    ? 'PROCESSING'
                    : 'UPLOADING CLIP'}
                </Text>
                <Text style={styles.uploadPct}>{uploadPct}%</Text>
              </View>
              <View style={styles.uploadTrack}>
                <View style={[styles.uploadFill, { width: `${uploadPct}%` }]} />
              </View>
              <Text style={styles.uploadSub}>
                {clipUpload.status === 'processing'
                  ? 'Upload complete. We’re finishing your clip — the Seeker gets it when it’s ready.'
                  : 'Encrypted upload in progress. Don’t close the app.'}
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

      {/* LIVE CAMERA VIEWFINDER — opens when recording, auto-closes at 15s */}
      <CameraViewfinder
        visible={recording || captureFlash}
        recordSecs={recordSecs}
        captured={captureFlash}
        onStop={() => {
          // STOP mid-recording = abort + discard the take. Stop the real
          // recorder, reset recordSecs so the next tap starts fresh, and DON'T
          // increment takesCount (a botched take doesn't burn a retake).
          camera.current?.stopRecording().catch(() => {});
          setRecordSecs(0);
          setRecording(false);
          setCapturedPath(null);
        }}
        venue={String(venue)}
        cameraRef={camera}
        device={device}
        hasPermission={hasPermission}
        onCameraInitialized={handleCameraInitialized}
      />
    </View>
  );
}
