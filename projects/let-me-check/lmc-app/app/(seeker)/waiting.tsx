import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';

// Mapbox uses [longitude, latitude]
const VENUE: [number, number] = [-80.1917, 25.7634];
const SCOUT_BASE: [number, number] = [-80.1923, 25.7640]; // Scout is AT the venue (~50m offset, just steps away)
const USER_COORD: [number, number] = [-80.1850, 25.7680]; // Seeker's GPS — east of route, clearly in viewport

// Ambient supply layer — other scouts in Miami (same set as home map)
const SCOUTS: [number, number][] = [
  [-80.193, 25.760],
  [-80.188, 25.785],
  [-80.130, 25.785],
  [-80.130, 25.770],
  [-80.220, 25.745],
  [-80.196, 25.737],
  [-80.175, 25.795],
  [-80.143, 25.760],
  [-80.205, 25.770],
  [-80.155, 25.740],
  [-80.165, 25.810],
  [-80.215, 25.795],
  [-80.118, 25.750],
  [-80.180, 25.755],
  [-80.225, 25.760],
  [-80.150, 25.795],
  [-80.200, 25.745],
  [-80.135, 25.745],
  [-80.170, 25.730],
  [-80.190, 25.800],
];

const SCOUT_BEARINGS = SCOUTS.map((_, i) => (i * 47) % 360);

function makeCone(
  center: [number, number],
  bearingDeg: number,
  lengthMeters: number,
  spreadDeg: number
): [number, number][] {
  const [lon, lat] = center;
  const lonScale = Math.cos((lat * Math.PI) / 180);
  const degPerMeter = 1 / 111320;
  const lengthDeg = lengthMeters * degPerMeter;
  const half = spreadDeg / 2;
  const segs = 8;
  const points: [number, number][] = [center];
  for (let k = 0; k <= segs; k++) {
    const angle = ((bearingDeg - half + (k * spreadDeg) / segs) * Math.PI) / 180;
    points.push([
      lon + (Math.sin(angle) * lengthDeg) / lonScale,
      lat + Math.cos(angle) * lengthDeg,
    ]);
  }
  points.push(center);
  return points;
}

const conesGeoJSON = {
  type: 'FeatureCollection' as const,
  features: SCOUTS.map((coords, i) => ({
    type: 'Feature' as const,
    id: i,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [makeCone(coords, SCOUT_BEARINGS[i], 180, 55)],
    },
    properties: {},
  })),
};

const scoutsGeoJSON = {
  type: 'FeatureCollection' as const,
  features: SCOUTS.map((coords, i) => ({
    type: 'Feature' as const,
    id: i,
    geometry: { type: 'Point' as const, coordinates: coords },
    properties: {},
  })),
};

function PulsingMarker({ coordinate }: { coordinate: [number, number] }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 3.0] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <Mapbox.MarkerView id={`scout-${coordinate.join('_')}`} coordinate={coordinate} allowOverlap anchor={{ x: 0.5, y: 0.5 }}>
      <View style={pulseStyles.wrap}>
        <Animated.View
          style={[pulseStyles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
        />
        <View style={pulseStyles.core} />
        <View style={pulseStyles.recBadge}>
          <View style={pulseStyles.recDot} />
          <Text style={pulseStyles.recText}>LIVE</Text>
        </View>
      </View>
    </Mapbox.MarkerView>
  );
}

function UserPin({ coordinate }: { coordinate: [number, number] }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 4.2] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Mapbox.MarkerView id="user-pin" coordinate={coordinate} allowOverlap anchor={{ x: 0.5, y: 0.5 }}>
      <View style={userStyles.wrap}>
        <Animated.View
          style={[userStyles.scanRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
        />
        <View style={userStyles.core} />
        <View style={userStyles.youBadge}>
          <Text style={userStyles.youText}>YOU</Text>
        </View>
      </View>
    </Mapbox.MarkerView>
  );
}

function VenuePin({ coordinate, label }: { coordinate: [number, number]; label: string }) {
  return (
    <Mapbox.MarkerView id="venue-pin" coordinate={coordinate} allowOverlap anchor={{ x: 0.5, y: 0.5 }}>
      <View style={venuePinStyles.wrap}>
        <View style={venuePinStyles.core} />
        <View style={venuePinStyles.badge}>
          <Text style={venuePinStyles.text} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    </Mapbox.MarkerView>
  );
}

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
  const [scoutShape, setScoutShape] = useState(scoutsGeoJSON);
  const cameraRef = useRef<Mapbox.Camera>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    const t = setTimeout(() => {
      router.replace({
        pathname: '/(seeker)/delivery',
        params: { venue: String(venue), city: String(city) },
      });
    }, 600);
    return () => clearTimeout(t);
  }, [secondsLeft, router, venue, city]);

  useEffect(() => {
    const t = setInterval(() => {
      setScoutShape({
        type: 'FeatureCollection' as const,
        features: SCOUTS.map((coords, i) => ({
          type: 'Feature' as const,
          id: i,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              coords[0] + (Math.random() - 0.5) * 0.0008,
              coords[1] + (Math.random() - 0.5) * 0.0008,
            ] as [number, number],
          },
          properties: {},
        })),
      });
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  // Scout is AT the venue — jitter position every 2s to feel alive
  const [scoutPos, setScoutPos] = useState<[number, number]>(SCOUT_BASE);

  useEffect(() => {
    const interval = setInterval(() => {
      setScoutPos([
        SCOUT_BASE[0] + (Math.random() - 0.5) * 0.0006,
        SCOUT_BASE[1] + (Math.random() - 0.5) * 0.0006,
      ]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Scout is on-site — minimal distance from venue
  const arriving = true;

  // Camera centers between scout, venue, and user — all three on screen
  const cameraCenter: [number, number] = [
    (scoutPos[0] + VENUE[0] + USER_COORD[0]) / 3,
    (scoutPos[1] + VENUE[1] + USER_COORD[1]) / 3,
  ];

  return (
    <View style={styles.container}>
      {/* Edge-to-edge Mapbox light canvas */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/satellite-streets-v12"
        compassEnabled={false}
        scaleBarEnabled={false}
        logoEnabled
        attributionEnabled
        attributionPosition={{ bottom: 8, left: 8 }}
        logoPosition={{ bottom: 8, left: 8 }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: cameraCenter,
            zoomLevel: 14,
            pitch: 45,
          }}
        />

        {/* Ambient Scout vision cones — supply layer */}
        <Mapbox.ShapeSource id="cones-src" shape={conesGeoJSON}>
          <Mapbox.FillLayer
            id="cones-fill"
            style={{ fillColor: '#00FF7F', fillOpacity: 0.18 }}
          />
        </Mapbox.ShapeSource>

        {/* Ambient Scout dots — proof of supply density */}
        <Mapbox.ShapeSource id="scouts-src" shape={scoutShape}>
          <Mapbox.CircleLayer
            id="scouts-glow"
            style={{
              circleColor: '#00FF7F',
              circleRadius: 9,
              circleOpacity: 0.22,
              circleBlur: 0.9,
            }}
          />
          <Mapbox.CircleLayer
            id="scouts-core"
            style={{
              circleColor: '#00FF7F',
              circleRadius: 3,
              circleStrokeColor: '#ffffff',
              circleStrokeWidth: 1,
            }}
          />
        </Mapbox.ShapeSource>

        {/* Seeker — YOU marker */}
        <UserPin coordinate={USER_COORD} />

        {/* Venue (destination) pin */}
        <VenuePin coordinate={VENUE} label={String(venue).toUpperCase()} />

        {/* Live Scout — pulsing green core, orange radar ring */}
        <PulsingMarker coordinate={scoutPos} />
      </Mapbox.MapView>

      {/* Top gradient for floating bar */}
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0)']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Floating top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.replace('/(seeker)/home')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.iconChevron}>‹</Text>
        </TouchableOpacity>

        <View style={styles.statusPill}>
          <View style={styles.pillDot} />
          <Text style={styles.pillLabel}>SCOUT ON SITE</Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Recenter button — snap back to fit Scout + Venue + YOU */}
      <TouchableOpacity
        style={styles.recenterBtn}
        activeOpacity={0.75}
        onPress={() =>
          cameraRef.current?.setCamera({
            centerCoordinate: cameraCenter,
            zoomLevel: 14,
            pitch: 45,
            animationDuration: 600,
          })
        }
      >
        <Text style={styles.recenterGlyph}>◎</Text>
      </TouchableOpacity>

      {/* Bottom sheet — countdown is the hero moment */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        {/* LMC mini brand mark — centered hero above the countdown */}
        <Text style={styles.brandMonogram}>LMC</Text>

        {/* Big orange countdown — the attention moment */}
        <Text style={styles.etaLabel}>YOUR CHECK ARRIVES IN</Text>
        <Text style={styles.countdown}>
          {pad(mins)}<Text style={styles.countdownColon}>:</Text>{pad(secs)}
        </Text>

        {/* Venue + Scout meta */}
        <View style={styles.metaRow}>
          <Text style={styles.metaPrimary}>{venue}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaPrimary}>{city}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaStatus}>Scout on-site</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaStatus}>filming</Text>
        </View>

        {/* Progress steps — green (done) + orange (active) */}
        <View style={styles.stepsRow}>
          <Step label="Paid" state="done" />
          <StepLine state="done" />
          <Step label="Assigned" state="done" />
          <StepLine state="active" />
          <Step label="Recording" state="active" />
          <StepLine state="pending" />
          <Step label="Delivered" state="pending" />
        </View>

        {/* Tier badge — Priority gets orange, Standard gets green */}
        {tier === 'priority' ? (
          <View style={styles.tierBadgePriority}>
            <Text style={styles.tierBadgeText}>PRIORITY RUSH · $20 · 7 MIN</Text>
          </View>
        ) : (
          <View style={styles.tierBadgeStandard}>
            <Text style={styles.tierBadgeText}>STANDARD · $15 · 10 MIN</Text>
          </View>
        )}

        {/* Cancel link — subtle */}
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => {
            const isPriority = tier === 'priority';
            const baseTotal = isPriority ? 22 : 16.5;
            const cancellationFee = 5;
            const refund = (baseTotal - cancellationFee).toFixed(2);
            Alert.alert(
              'Cancel your check?',
              `Your Scout is on-site. A $5 cancellation fee covers their dispatch time. You'll be refunded $${refund} to your card.`,
              [
                { text: 'Keep waiting', style: 'cancel' },
                {
                  text: `Cancel · Refund $${refund}`,
                  style: 'destructive',
                  onPress: () =>
                    router.replace({
                      pathname: '/(seeker)/cancelled',
                      params: {
                        venue: String(venue),
                        fee: cancellationFee.toFixed(2),
                        refund,
                        total: baseTotal.toFixed(2),
                      },
                    }),
                },
              ]
            );
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.cancelLinkText}>Cancel request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipAheadLink}
          onPress={() =>
            router.replace({
              pathname: '/(seeker)/delivery',
              params: { venue: String(venue), city: String(city) },
            })
          }
          activeOpacity={0.6}
        >
          <Text style={styles.skipAheadText}>Skip ahead · prototype</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Step({ label, state }: { label: string; state: 'done' | 'active' | 'pending' }) {
  const dotColor =
    state === 'done' ? '#00FF7F' : state === 'active' ? '#FF6B00' : 'rgba(255,255,255,0.35)';
  const labelColor =
    state === 'pending' ? 'rgba(255,255,255,0.6)' : '#fff';
  return (
    <View style={stepStyles.col}>
      <View style={[stepStyles.dot, { backgroundColor: dotColor }]}>
        {state === 'done' && <Text style={stepStyles.check}>✓</Text>}
      </View>
      <Text style={[stepStyles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function StepLine({ state }: { state: 'done' | 'active' | 'pending' }) {
  const color =
    state === 'done' ? '#00FF7F' : state === 'active' ? '#FF6B00' : 'rgba(255,255,255,0.25)';
  return <View style={[stepStyles.line, { backgroundColor: color }]} />;
}

const userStyles = StyleSheet.create({
  wrap: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
  },
  core: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  youBadge: {
    position: 'absolute',
    top: -10,
    left: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  youText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1.2,
  },
});

const pulseStyles = StyleSheet.create({
  wrap: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  ring: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00FF7F',
  },
  core: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00FF7F',
    shadowColor: '#00FF7F',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  recBadge: {
    position: 'absolute',
    top: -10,
    left: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#000000',
    shadowColor: '#00FF7F',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  recDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF3B30',
  },
  recText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1.2,
  },
});

const venuePinStyles = StyleSheet.create({
  wrap: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  core: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    position: 'absolute',
    top: -6,
    left: 28,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  text: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 1,
  },
});

const stepStyles = StyleSheet.create({
  col: { alignItems: 'center', width: 56 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  check: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#000',
  },
  label: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  line: { flex: 1, height: 1.5, marginTop: -16, marginHorizontal: -2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconChevron: {
    fontFamily: 'Inter_500Medium',
    fontSize: 24,
    color: '#fff',
    marginTop: -2,
    marginLeft: -2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  pillLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 2,
  },

  recenterBtn: {
    position: 'absolute',
    right: 14,
    bottom: 320,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(20,55,130,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#143782',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  recenterGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(60,110,200,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 10,
  },

  // Brand mark
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  brandMonogram: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Big orange countdown
  etaLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 2.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  countdown: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 56,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 60,
  },
  countdownColon: {
    color: 'rgba(255,255,255,0.45)',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  metaPrimary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  metaStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.3,
  },
  metaDot: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 14,
  },

  // Steps
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 10,
    alignSelf: 'center',
    width: '88%',
  },

  // Tier badges
  tierBadgePriority: {
    backgroundColor: '#FFCB47',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: '#FFCB47',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tierBadgeStandard: {
    backgroundColor: '#ffffff',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: '#ffffff',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tierBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    color: '#000000',
    letterSpacing: 2,
  },

  cancelLink: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  cancelLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  skipAheadLink: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  skipAheadText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
