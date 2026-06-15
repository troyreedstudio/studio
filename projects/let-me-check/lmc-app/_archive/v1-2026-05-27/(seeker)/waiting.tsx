import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

const STEPS = [
  { id: 0, label: 'Paid', done: true },
  { id: 1, label: 'Scout Assigned', done: true },
  { id: 2, label: 'Recording', done: false, active: true },
  { id: 3, label: 'Delivered', done: false },
];

// Mock geo: Komodo Miami (Brickell). Scout starts ~0.6mi NW and walks toward it.
const VENUE = { latitude: 25.7634, longitude: -80.1917 };
const SCOUT_START = { latitude: 25.7710, longitude: -80.2000 };

// Dark map style — matches LMC editorial dark aesthetic
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e1e1e' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#666' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#252525' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#555' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
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

  // Linear interpolation: Scout walks from start → venue as timer counts down
  const totalSeconds = minutes * 60;
  const progress = 1 - secondsLeft / totalSeconds; // 0 → 1
  const scoutLat = SCOUT_START.latitude + (VENUE.latitude - SCOUT_START.latitude) * progress;
  const scoutLng = SCOUT_START.longitude + (VENUE.longitude - SCOUT_START.longitude) * progress;
  const scoutPos = { latitude: scoutLat, longitude: scoutLng };

  // Distance estimate (rough — straight line, miles per degree at Miami latitude ≈ 53)
  const dLat = VENUE.latitude - scoutLat;
  const dLng = VENUE.longitude - scoutLng;
  const distMiles = Math.sqrt(dLat * dLat * 69 * 69 + dLng * dLng * 53 * 53);
  const distLabel = distMiles < 0.1 ? 'Arriving now' : `${distMiles.toFixed(1)} mi · ${mins} min away`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Cancel header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.replace('/(seeker)/home')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Live map — Scout pin approaches venue as timer counts down */}
        <View style={styles.mapWrap}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
              latitude: (VENUE.latitude + SCOUT_START.latitude) / 2,
              longitude: (VENUE.longitude + SCOUT_START.longitude) / 2,
              latitudeDelta: 0.018,
              longitudeDelta: 0.018,
            }}
            mapType="mutedStandard"
            customMapStyle={DARK_MAP_STYLE}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {/* Route line connecting Scout to Venue */}
            <Polyline
              coordinates={[scoutPos, VENUE]}
              strokeColor="#FF8533"
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
            {/* Venue marker */}
            <Marker coordinate={VENUE} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.venuePin}>
                <Text style={styles.venuePinIcon}>🎥</Text>
              </View>
            </Marker>
            {/* Scout marker (animated) */}
            <Marker coordinate={scoutPos} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.scoutPinHalo}>
                <View style={styles.scoutPin} />
              </View>
            </Marker>
          </MapView>

          {/* Distance + ETA overlay */}
          <View style={styles.mapOverlay}>
            <View style={styles.mapStatusDot} />
            <Text style={styles.mapStatusText}>{distLabel}</Text>
          </View>

          {/* AI badge */}
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✦ AI ROUTING</Text>
          </View>
        </View>

        <Text style={styles.title}>Scout en route</Text>
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
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 12 },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingBottom: 18,
  },
  cancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
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
  mapWrap: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 22,
    position: 'relative',
  },
  map: { ...StyleSheet.absoluteFillObject },
  scoutPinHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.5)',
  },
  scoutPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  venuePin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF8533',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  venuePinIcon: { fontSize: 16 },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  mapStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  mapStatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,133,51,0.5)',
  },
  aiBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FF8533',
    letterSpacing: 1.2,
  },
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
