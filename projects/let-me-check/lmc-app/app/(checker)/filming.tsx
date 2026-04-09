import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

const STEPS = [
  { id: 0, label: 'Walk to venue', done: true, active: false },
  { id: 1, label: 'Film 60 seconds', done: false, active: true },
  { id: 2, label: 'Submit clip', done: false, active: false },
];

export default function FilmingScreen() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(420); // 7 min priority
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!recording) return;
    if (recordSecs >= 60) {
      setRecording(false);
      return;
    }
    const t = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording, recordSecs]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeLeft = `${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Accepted Header */}
        <View style={styles.acceptedBadge}>
          <Text style={styles.acceptedText}>✓ REQUEST ACCEPTED</Text>
        </View>

        <Text style={styles.venueName}>Komodo Miami</Text>
        <Text style={styles.venueAddress}>900 S Miami Ave · 0.3 mi</Text>

        {/* Delivery Countdown */}
        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>DELIVERY DEADLINE</Text>
          <Text style={styles.countdown}>{timeLeft}</Text>
          <Text style={styles.countdownSub}>Priority Rush — 7 min window</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsBox}>
          {STEPS.map((step, i) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={[
                  styles.stepDot,
                  step.done && styles.stepDotDone,
                  step.active && styles.stepDotActive,
                ]}>
                  {step.done && <Text style={styles.stepCheck}>✓</Text>}
                  {step.active && <View style={styles.stepPulse} />}
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                step.done && styles.stepLabelDone,
                step.active && styles.stepLabelActive,
              ]}>
                {step.label}
                {step.active && recording && (
                  <Text style={styles.recordProgress}> — {recordSecs}s / 60s</Text>
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* GPS Badge */}
        <View style={styles.gpsBadge}>
          <Text style={styles.gpsText}>📍 GPS Verified — You're at the right place</Text>
        </View>

        {/* Record Button */}
        <TouchableOpacity
          style={[styles.recordBtn, recording && styles.recordBtnActive]}
          onPress={() => {
            if (recordSecs >= 60) {
              router.push('/(checker)/submitted');
            } else {
              setRecording(!recording);
            }
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.recordInner, recording && styles.recordInnerActive]}>
            {recording ? (
              <View style={styles.stopSquare} />
            ) : recordSecs > 0 ? (
              <Text style={styles.recordLabel}>▶</Text>
            ) : (
              <View style={styles.recordCircle} />
            )}
          </View>
          <Text style={styles.recordHint}>
            {recordSecs >= 60
              ? 'Tap to submit clip →'
              : recording
              ? `Recording... ${recordSecs}s`
              : recordSecs > 0
              ? 'Tap to resume'
              : 'Tap to start recording'}
          </Text>
        </TouchableOpacity>

        {/* Earning Note */}
        <Text style={styles.earningNote}>You will earn $10 upon delivery</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  acceptedBadge: {
    backgroundColor: '#14532d',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  acceptedText: { color: '#22c55e', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  venueName: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4 },
  venueAddress: { fontSize: 13, color: '#888', marginBottom: 20 },
  countdownBox: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 24,
  },
  countdownLabel: { fontSize: 10, color: '#555', fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  countdown: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 4 },
  countdownSub: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  stepsBox: { width: '100%', paddingLeft: 8, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepLeft: { alignItems: 'center', width: 32, marginRight: 12 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: { backgroundColor: '#14532d', borderColor: '#22c55e' },
  stepDotActive: { backgroundColor: '#1a1a1a', borderColor: '#22c55e' },
  stepCheck: { fontSize: 11, color: '#22c55e', fontWeight: '800' },
  stepPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  stepLine: { width: 2, height: 32, backgroundColor: '#1a1a1a', marginTop: 2 },
  stepLineDone: { backgroundColor: '#22c55e' },
  stepLabel: { fontSize: 14, color: '#444', paddingTop: 3, paddingBottom: 28 },
  stepLabelDone: { color: '#666' },
  stepLabelActive: { color: '#fff', fontWeight: '700' },
  recordProgress: { color: '#22c55e' },
  gpsBadge: {
    backgroundColor: '#0d1a0d',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1a2e1a',
  },
  gpsText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  recordBtn: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recordBtnActive: {},
  recordInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1a0000',
    borderWidth: 4,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordInnerActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ff6666',
  },
  recordCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
  },
  stopSquare: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  recordLabel: { fontSize: 28, color: '#ef4444' },
  recordHint: { fontSize: 13, color: '#888' },
  earningNote: { fontSize: 13, color: '#555', position: 'absolute', bottom: 32 },
});
