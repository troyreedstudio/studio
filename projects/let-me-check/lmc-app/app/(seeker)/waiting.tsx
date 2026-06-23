import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Alert, AppState } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { getCheck, cancelCheck, type CheckRow } from '../lib/checks';
import { subscribeToCheck } from '../lib/realtime';
import { getUserCoords } from '../state/location';

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
  const { checkId, venue = 'Komodo', city = 'Miami', tier = 'standard' } = useLocalSearchParams<{
    checkId: string;
    venue: string;
    city: string;
    tier: string;
    time: string;
  }>();

  const [check, setCheck] = useState<CheckRow | null>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  // Live status off the real row (DISP-04). Initial getCheck() then subscribe;
  // onError re-fetches to reconcile a transition missed while disconnected.
  useEffect(() => {
    if (!checkId) return;
    const refetch = () => getCheck(checkId).then(setCheck).catch(() => {});
    refetch();
    const unsub = subscribeToCheck(checkId, setCheck, refetch);
    return unsub;
  }, [checkId]);

  // Re-fetch on foreground — the row is source-of-truth, so reconcile any
  // transition that landed while the app was backgrounded (Pitfall 4).
  useEffect(() => {
    if (!checkId) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') getCheck(checkId).then(setCheck).catch(() => {});
    });
    return () => sub.remove();
  }, [checkId]);

  // Route off the REAL status — no faked countdown.
  useEffect(() => {
    if (!check) return;
    switch (check.status) {
      case 'delivered':
      case 'rated':
        router.replace({ pathname: '/(seeker)/delivery', params: { checkId: check.id } });
        break;
      case 'cancelled':
        router.replace({ pathname: '/(seeker)/cancelled', params: { venue: String(venue) } });
        break;
      case 'no_scout':
      case 'expired':
        router.replace({ pathname: '/(seeker)/error', params: { type: 'no-scouts', reason: check.status } });
        break;
    }
  }, [check, router, venue]);

  // Map the real status to the visible phase. 'assigned' = Scout accepted and
  // is on-site; 'filming' = recording in progress.
  const status = check?.status ?? 'assigned';
  const isFilming = status === 'filming';

  // REAL countdown to the server-owned delivery deadline (deadline_at, set when a
  // Scout accepts — Phase 7). Ticks every second; null until a deadline exists.
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    // deadline_at is on the row after a Scout accepts; cast (types may lag).
    const dlRaw = (check as { deadline_at?: string | null } | null)?.deadline_at ?? null;
    const dl = dlRaw ? new Date(dlRaw).getTime() : null;
    if (!dl || Number.isNaN(dl)) { setRemainingMs(null); return; }
    const tick = () => setRemainingMs(Math.max(0, dl - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [check]);
  const mmss = remainingMs == null
    ? null
    : `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')}`;

  // Real venue coords from the check row. Only available once the check loads.
  // Mapbox uses [longitude, latitude].
  const venueLng = check?.requested_lng ?? null;
  const venueLat = check?.requested_lat ?? null;
  const venueCoord: [number, number] | null =
    venueLng !== null && venueLat !== null ? [venueLng, venueLat] : null;

  // User's real GPS coords (captured at the location permission step).
  const userCoord = getUserCoords();

  // Scout position: we do not have a real scout GPS feed yet. Place the pulsing
  // marker at the venue coord once we have it — honest proximity without fabricating
  // a separate offset. When the venue coord isn't available yet, skip the marker.
  const [scoutCoord, setScoutCoord] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!venueCoord) return;
    setScoutCoord(venueCoord);
    // Subtle jitter so the marker feels alive, not frozen.
    const interval = setInterval(() => {
      setScoutCoord([
        venueCoord[0] + (Math.random() - 0.5) * 0.0004,
        venueCoord[1] + (Math.random() - 0.5) * 0.0004,
      ]);
    }, 2000);
    return () => clearInterval(interval);
  }, [venueCoord ? venueCoord[0] : null, venueCoord ? venueCoord[1] : null]);

  // Camera: center between venue and user when we have both; fall back to venue
  // alone, or user alone. Never hardcoded to a city.
  const cameraCenter: [number, number] | null =
    venueCoord && userCoord
      ? [(venueCoord[0] + userCoord[0]) / 2, (venueCoord[1] + userCoord[1]) / 2]
      : venueCoord ?? userCoord ?? null;

  return (
    <View style={styles.container}>
      {/* Edge-to-edge Mapbox satellite canvas */}
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
        {cameraCenter && (
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: cameraCenter,
              zoomLevel: 14,
              pitch: 45,
            }}
          />
        )}

        {/* User location — real GPS */}
        {userCoord && <UserPin coordinate={userCoord} />}

        {/* Venue destination pin — real check coords */}
        {venueCoord && <VenuePin coordinate={venueCoord} label={String(venue).toUpperCase()} />}

        {/* Scout on-site marker — at venue position until real scout GPS lands */}
        {scoutCoord && <PulsingMarker coordinate={scoutCoord} />}
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
      {cameraCenter && (
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
      )}

      {/* Bottom sheet — countdown is the hero moment */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        {/* Brand mark — full wordmark, not the LMC shorthand */}
        <Text style={styles.brandMonogram}>Let Me Check</Text>

        {/* Live status hero */}
        <Text style={styles.etaLabel}>
          {isFilming ? 'YOUR SCOUT IS FILMING' : 'YOUR SCOUT IS ON SITE'}
        </Text>
        {/* Real countdown to the delivery deadline (the hero moment). */}
        {mmss ? (
          <Text style={styles.statusHero}>{mmss}</Text>
        ) : (
          <Text style={styles.statusHero}>
            {isFilming ? 'Recording your video…' : 'Getting into position…'}
          </Text>
        )}
        {mmss ? (
          <Text style={styles.etaLabel}>
            {isFilming ? 'Recording your video' : 'estimated time to delivery'}
          </Text>
        ) : null}

        {/* Venue + Scout meta */}
        <View style={styles.metaRow}>
          <Text style={styles.metaPrimary}>{venue}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaPrimary}>{city}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaStatus}>{isFilming ? 'filming' : 'Scout on-site'}</Text>
        </View>

        {/* Progress steps — driven by the real status */}
        <View style={styles.stepsRow}>
          <Step label="Paid" state="done" />
          <StepLine state="done" />
          <Step label="Assigned" state="done" />
          <StepLine state={isFilming ? 'done' : 'active'} />
          <Step label="Recording" state={isFilming ? 'active' : 'pending'} />
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
                  onPress: async () => {
                    if (checkId) await cancelCheck(checkId).catch(() => {});
                    router.replace({
                      pathname: '/(seeker)/cancelled',
                      params: {
                        venue: String(venue),
                        fee: cancellationFee.toFixed(2),
                        refund,
                        total: baseTotal.toFixed(2),
                      },
                    });
                  },
                },
              ]
            );
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.cancelLinkText}>Cancel request</Text>
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
  brandMonogram: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Status hero
  etaLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 2.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  statusHero: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 30,
    marginTop: 2,
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
});
