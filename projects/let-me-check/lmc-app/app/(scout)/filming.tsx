// TODO(phase-7): extract the HUD/steps/trouble UI out of filming.tsx — file is >500 lines; refactor BEFORE any further Phase-7 edits.
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
import { markFilming, getCheck } from '../lib/checks';
import { reportTrouble } from '../lib/payments';
import { useClipUpload } from '../lib/clips';
import { collectFraudSignals, FraudSignals } from '../lib/fraud-signals';
import { CameraViewfinder } from './_filming-viewfinder';
// Phase 6 (D-01, D-07): on-device face-blur overlay — DORMANT until flag is on.
import { BLUR_NATIVE_ENABLED } from '../lib/blur-config';
import { BlurViewfinder } from './_filming-blur-overlay';
import { styles } from './_filming-styles';
// ---- DEV-ONLY (08-03 Step-3 device gate) — REMOVE in Plan 05/06 wiring. ----
// Lets Troy run the post-record blur on the just-recorded clip and play the
// BLURRED output in-app, to confirm faces are obscured BEFORE the upload flow is
// wired. Gated by __DEV__ so it never ships. See <dev-trigger> in 08-03 SUMMARY.
import { VideoView, useVideoPlayer } from 'expo-video';
import { blurFaces } from '../lib/blur-native';
import type { BlurResult, BlurMode } from '../lib/blur-native';
// ---------------------------------------------------------------------------

const TROUBLE_REASONS = [
  'Line is gone / venue empty',
  'Hostile staff or bouncer',
  "Can’t safely enter the area",
  'Venue closed / not operating',
];

// Pre-flight film-fence (metres). Matches the server film_fence_max_m (30m). The
// Scout can't start recording until their live GPS is within this of the venue —
// so they never waste a take filming off-location. The server verify-clip gate
// remains the authoritative reject (defence in depth vs spoofing — Phase 6).
const FILM_FENCE_M = 30;

// Haversine distance in metres between two lat/lng points (client pre-flight only).
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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
  // set by onRecordingFinished; the GPS stamp (incl. accuracy) is forwarded to
  // mux-upload-url so verify-clip has real distance + accuracy data (VER-01).
  const [capturedPath, setCapturedPath] = useState<string | null>(null);
  const capturedGps = useRef<{ lat: number; lng: number; accuracyM?: number } | null>(null);
  // Phase 6 (FRAUD-03): fraud signal bag collected at GPS-stamp time (Record press).
  // Best-effort: null if GPS or collectFraudSignals fails — fraud-eval degrades gracefully.
  const capturedFraud = useRef<FraudSignals | null>(null);

  // Real camera (vision-camera). Audio is never opened (audio={false} in the
  // viewfinder, VID-02). Back device, permission requested on mount. The camera
  // can be absent on a simulator — the screen degrades gracefully.
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  useEffect(() => {
    if (!hasPermission) requestPermission().catch(() => {});
  }, [hasPermission, requestPermission]);

  // Pre-flight proximity gate: the venue location (from the check) + the Scout's
  // LIVE distance to it. Recording is blocked until distance <= FILM_FENCE_M.
  const [venuePt, setVenuePt] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  // Fetch the venue location + seed the deadline countdown from the real deadline_at.
  // deadline_at is typed in database.types.ts after Phase 7 / 0015 type regen (Plan 04).
  // Falls back to totalSeconds if the field is absent (legacy row pre-Phase-7).
  useEffect(() => {
    if (!checkId) return;
    getCheck(checkId)
      .then((c) => {
        if (c?.requested_lat != null && c?.requested_lng != null) {
          setVenuePt({ lat: c.requested_lat, lng: c.requested_lng });
        }
        // Seed the countdown from the real server deadline so it resumes correctly
        // after an app reopen (D-01). If deadline_at is absent (legacy row), fall
        // back to the tier-derived totalSeconds constant.
        // deadline_at is now typed in database.types.ts (Phase 7 / 0015)
        const deadlineAt = c?.deadline_at;
        if (deadlineAt) {
          const remaining = Math.max(0, Math.round((new Date(deadlineAt).getTime() - Date.now()) / 1000));
          setSecondsLeft(remaining);
        }
      })
      .catch(() => {});
  }, [checkId]);

  // Watch the Scout's live position and compute distance to the venue.
  useEffect(() => {
    if (!venuePt) return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          setDistanceM(
            distanceMeters(pos.coords.latitude, pos.coords.longitude, venuePt.lat, venuePt.lng),
          );
        },
      );
    })().catch(() => {});
    return () => sub?.remove();
  }, [venuePt]);

  // In range when we have no venue/fix yet (don't block on missing data) OR the
  // live distance is within the fence. Only a known, too-far distance blocks.
  const outOfRange = venuePt != null && distanceM != null && distanceM > FILM_FENCE_M;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [troubleOpen, setTroubleOpen] = useState(false);
  const [troubleReason, setTroubleReason] = useState<string | null>(null);
  const [troubleBusy, setTroubleBusy] = useState(false);
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

  // GPS stamp at record time. Phase 5: uses Accuracy.Highest (Pitfall 3 — maximize
  // fix quality so the 30 m film-fence check in verify-clip has the best possible
  // coordinate) and captures accuracyM alongside lat/lng so verify-clip can
  // distinguish a genuine on-site fix from a low-accuracy reading. Best-effort:
  // never blocks recording on a GPS failure.
  const stampGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      capturedGps.current = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy ?? undefined,
      };
      // Phase 6 (FRAUD-03): collect the fraud signal bag at the same GPS-stamp
      // instant. Best-effort: never blocks recording if this throws.
      capturedFraud.current = collectFraudSignals(pos.coords.accuracy ?? undefined);
    } catch {
      // best-effort — never block recording on GPS failure
    }
  };

  // Toggle record. On the FIRST capture start, move the check 'assigned ->
  // filming' (drives the Seeker's "filming" step). Fires once via filmingMarked.
  const handleToggleRecord = () => {
    // Pre-flight gate: can't start a take while out of range (the Seeker's
    // guarantee is on-location footage). Server verify-clip is the backstop.
    if (!recording && outOfRange) return;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok = await clipUpload.submit(checkId, capturedPath, capturedGps.current, capturedFraud.current as any ?? undefined);
    if (ok) {
      router.replace({
        pathname: '/(scout)/submitted',
        params: { checkId: String(checkId), tier: String(tier) },
      });
    }
  };

  // ---- DEV-ONLY (08-03 Step-3 device gate) — REMOVE in Plan 05/06. ----------
  // Runs blurFaces on the captured clip and plays the BLURRED output so Troy can
  // confirm the face is obscured. NOT part of the real upload flow.
  const [devBlurBusy, setDevBlurBusy] = useState(false);
  const [devBlurResult, setDevBlurResult] = useState<BlurResult | null>(null);
  const devPlayer = useVideoPlayer(devBlurResult?.outputPath ?? null, (p) => {
    p.loop = true;
    p.play();
  });

  const runDevBlur = async (mode: BlurMode) => {
    if (!capturedPath) {
      Alert.alert('No clip', 'Record a clip first, then run the blur test.');
      return;
    }
    setDevBlurBusy(true);
    setDevBlurResult(null);
    try {
      const res = await blurFaces(capturedPath, { mode });
      console.log(
        `[LMC-BLUR DEV] mode=${mode} status=${res.status} faces=${res.facesBlurred} out=${res.outputPath}`,
      );
      setDevBlurResult(res);
      Alert.alert(
        `Blur: ${res.status}`,
        `mode: ${mode}\nfaces: ${res.facesBlurred}\n${res.status === 'blurred' ? 'Playing the blurred clip below — check your face is hidden.' : res.status === 'no_faces' ? 'No faces found; original returned untouched.' : 'FAILED — fallback would run in the real flow.'}`,
      );
    } catch (e) {
      console.error('[LMC-BLUR DEV] threw', e);
      Alert.alert('Blur test threw', String(e));
    } finally {
      setDevBlurBusy(false);
    }
  };
  // ---------------------------------------------------------------------------

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

          {/* Pre-flight proximity banner — prominent, live amber→green. Shows the
              Scout how far they are and counts down as they approach; flips green
              and unlocks the record button when they're within the film-fence. */}
          {venuePt != null && distanceM != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: outOfRange ? 'rgba(255,203,71,0.16)' : 'rgba(0,255,127,0.14)',
                borderColor: outOfRange ? '#FFCB47' : '#00FF7F',
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 14,
                marginTop: 16,
              }}
            >
              <Ionicons
                name={outOfRange ? 'walk' : 'checkmark-circle'}
                size={22}
                color={outOfRange ? '#FFCB47' : '#00FF7F'}
              />
              <Text style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 19 }}>
                {outOfRange
                  ? `Outside filming range — you’re ~${Math.round(distanceM)} m from the venue. Move within ${FILM_FENCE_M} m to start recording.`
                  : `In filming range — tap the record button to film.`}
              </Text>
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

              {/* DEV-ONLY (08-03 Step-3 gate) — REMOVE in Plan 05/06.
                  Runs the post-record face blur on this clip and plays the
                  BLURRED output so Troy can confirm faces are obscured. */}
              {__DEV__ && (
                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#1e1e1e', paddingTop: 12 }}>
                  <Text style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>
                    DEV: on-device blur test (not part of upload)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#0d1a0d', borderColor: '#22c55e', borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: devBlurBusy ? 0.5 : 1 }}
                      activeOpacity={0.85}
                      disabled={devBlurBusy}
                      onPress={() => runDevBlur('gaussian')}
                    >
                      <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700' }}>
                        {devBlurBusy ? 'BLURRING…' : 'BLUR (GAUSSIAN)'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#1a160d', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: devBlurBusy ? 0.5 : 1 }}
                      activeOpacity={0.85}
                      disabled={devBlurBusy}
                      onPress={() => runDevBlur('pixelate')}
                    >
                      <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '700' }}>
                        {devBlurBusy ? 'BLURRING…' : 'BLUR (PIXELATE)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {devBlurResult && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>
                        status: {devBlurResult.status} · faces: {devBlurResult.facesBlurred}
                      </Text>
                      {devBlurResult.status === 'blurred' && (
                        <VideoView
                          player={devPlayer}
                          style={{ width: '100%', aspectRatio: 9 / 16, borderRadius: 12, backgroundColor: '#000' }}
                          contentFit="contain"
                          nativeControls
                        />
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.recordWrap}>
              <TouchableOpacity
                style={[styles.recordBtn, outOfRange && { opacity: 0.35 }]}
                onPress={handleToggleRecord}
                activeOpacity={0.85}
                disabled={outOfRange}
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
              <Text style={[styles.recordHint, outOfRange && { color: '#FFCB47' }]}>
                {recording
                  ? `Recording… ${recordSecs}s of 15s`
                  : outOfRange
                  ? 'Record unlocks inside filming range'
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

          {/* Trouble Here — secondary fallback, moved below the primary record
              flow so it never competes with the proximity / record instruction. */}
          {troubleReason ? (
            <View style={[styles.troubleBase, styles.troubleReported]}>
              <Ionicons name="checkmark-circle" size={18} color="#00FF7F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.troubleTitle}>REPORTED, SEEKER REFUNDED, YOU’RE COVERED</Text>
                <Text style={styles.troubleSub}>
                  {troubleReason}. You’ll still be paid for travel.
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
                  style={[styles.troubleReasonRow, troubleBusy && { opacity: 0.4 }]}
                  activeOpacity={0.7}
                  disabled={troubleBusy}
                  onPress={async () => {
                    if (!checkId || troubleBusy) return;
                    setTroubleBusy(true);
                    try {
                      await reportTrouble(String(checkId), r);
                      // Server confirmed: check is now no_scout, Seeker refunded,
                      // Scout no-fault fee queued. Show the confirmed state then
                      // route the Scout back to their dashboard.
                      setTroubleReason(r);
                      setTroubleOpen(false);
                      setTimeout(() => router.replace('/(scout)/dashboard'), 2000);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
                      Alert.alert('Could not report trouble', msg);
                    } finally {
                      setTroubleBusy(false);
                    }
                  }}
                >
                  <Text style={styles.troubleReasonText}>
                    {troubleBusy ? 'Reporting...' : r}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* LIVE CAMERA VIEWFINDER — opens when recording, auto-closes at 15s.
          Phase 6 (D-01): when BLUR_NATIVE_ENABLED is true, BlurViewfinder adds
          an MLKit face-detector frame processor + Skia Canvas blur overlay.
          With the flag false (default), CameraViewfinder runs byte-for-byte
          unchanged — no native blur code path activates. */}
      {BLUR_NATIVE_ENABLED ? (
        <BlurViewfinder
          visible={recording || captureFlash}
          recordSecs={recordSecs}
          captured={captureFlash}
          onStop={() => {
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
      ) : (
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
      )}
    </View>
  );
}
