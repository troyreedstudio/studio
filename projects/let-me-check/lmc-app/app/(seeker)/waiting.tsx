import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';

const STEPS = [
  { id: 0, label: 'Paid', done: true },
  { id: 1, label: 'Scout Assigned', done: true },
  { id: 2, label: 'Recording', done: false, active: true },
  { id: 3, label: 'Delivered', done: false },
];

export default function WaitingScreen() {
  const router = useRouter();
  const { venue = 'Komodo', city = 'Miami', tier = 'standard', time = '10' } = useLocalSearchParams<{
    venue: string;
    city: string;
    tier: string;
    time: string;
  }>();

  const minutes = parseInt(time.replace(/\D/g, ''), 10) || 10;
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Pulsing Ring */}
        <View style={styles.pulseOuter}>
          <View style={styles.pulseInner}>
            <Text style={styles.pulseEmoji}>🎥</Text>
          </View>
        </View>

        <Text style={styles.title}>YOUR SCOUT{'\n'}IS ON THE WAY</Text>
        <Text style={styles.venueName}>{venue} · {city}</Text>

        {/* Countdown */}
        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>ESTIMATED ARRIVAL</Text>
          <Text style={styles.countdown}>{pad(mins)}:{pad(secs)}</Text>
          <Text style={styles.countdownSub}>
            {tier === 'priority' ? 'Priority Rush' : 'Standard Delivery'}
          </Text>
        </View>

        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          {STEPS.map((step, i) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View
                  style={[
                    styles.stepDot,
                    step.done && styles.stepDotDone,
                    step.active && styles.stepDotActive,
                  ]}
                >
                  {step.done && <Text style={styles.stepCheck}>✓</Text>}
                  {step.active && <View style={styles.stepPulse} />}
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  step.done && styles.stepLabelDone,
                  step.active && styles.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.simulateBtn}
          onPress={() =>
            router.replace({
              pathname: '/(seeker)/delivery',
              params: { venue, city, tier },
            })
          }
        >
          <Text style={styles.simulateBtnText}>Simulate Delivery →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 32 },
  pulseOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0d1a0d',
    borderWidth: 2,
    borderColor: '#22c55e33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1a2e1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseEmoji: { fontSize: 36 },
  title: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 26,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 32,
    marginBottom: 10,
  },
  venueName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 18,
    color: '#cccccc',
    letterSpacing: 0.4,
    marginBottom: 30,
  },
  countdownBox: {
    backgroundColor: '#0d0d0d',
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 32,
  },
  countdownLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  countdown: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 60,
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 6,
  },
  countdownSub: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#22c55e',
    letterSpacing: 1.2,
  },
  stepsContainer: { width: '100%', paddingLeft: 16, marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  stepLeft: { alignItems: 'center', width: 32, marginRight: 14 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: { backgroundColor: '#14532d', borderColor: '#22c55e' },
  stepDotActive: { backgroundColor: '#1a2e1a', borderColor: '#22c55e' },
  stepCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#22c55e',
  },
  stepPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  stepLine: {
    width: 2,
    height: 36,
    backgroundColor: '#1a1a1a',
    marginTop: 2,
  },
  stepLineDone: { backgroundColor: '#22c55e' },
  stepLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#666',
    paddingTop: 4,
    paddingBottom: 32,
    letterSpacing: 0.2,
  },
  stepLabelDone: { color: '#888' },
  stepLabelActive: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  simulateBtn: {
    marginTop: 'auto',
    paddingBottom: 16,
  },
  simulateBtnText: {
    fontFamily: 'Inter_500Medium',
    color: '#444',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
