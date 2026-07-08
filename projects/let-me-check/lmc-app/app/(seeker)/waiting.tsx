import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Alert, AppState, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { getCheck, cancelCheck, type CheckRow } from '../lib/checks';
import { subscribeToCheck } from '../lib/realtime';
import { getUserCoords } from '../state/location';
import { colors } from '../lib/theme';
import { BlurView } from 'expo-blur';

// Small circle (polygon ring) around a point, in metres — for the live-zone ring.
function makeRing([lon, lat]: [number, number], meters: number, points = 64): number[][] {
  const coords: number[][] = [];
  const earth = 6378137;
  const dLat = (meters / earth) * (180 / Math.PI);
  const dLon = dLat / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return coords;
}

// Scatter warm "streetlight / car light" points across the area around the
// venue — the same city-lights language as the globe, at street level.
function streetLights([lon, lat]: [number, number]) {
  const N = 8;
  const spread = 0.016;
  const features: { type: 'Feature'; geometry: { type: 'Point'; coordinates: number[] }; properties: Record<string, never> }[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const jx = (((i * 7 + j * 3) % 5) - 2) * 0.0009;
      const jy = (((i * 3 + j * 5) % 5) - 2) * 0.0009;
      features.push({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [lon - spread / 2 + (i / (N - 1)) * spread + jx, lat - spread / 2 + (j / (N - 1)) * spread + jy],
        },
        properties: {},
      });
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

function PulsingMarker({ coordinate }: { coordinate: [number, number] }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 3.4] });
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
    <Mapbox.MarkerView id="venue-pin" coordinate={coordinate} allowOverlap anchor={{ x: 0.5, y: 1 }}>
      <View style={venuePinStyles.wrap}>
        <View style={venuePinStyles.label}>
          <Text style={venuePinStyles.labelText} numberOfLines={1}>{label}</Text>
        </View>
        <View style={venuePinStyles.stem} />
        <View style={venuePinStyles.dot} />
      </View>
    </Mapbox.MarkerView>
  );
}

export default function WaitingScreen() {
  const router = useRouter();
  const { checkId, venue = 'Komodo', city = 'Miami', tier = 'standard', lat, lon } = useLocalSearchParams<{
    checkId: string;
    venue: string;
    city: string;
    tier: string;
    time: string;
    lat: string;
    lon: string;
  }>();

  const [check, setCheck] = useState<CheckRow | null>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const flownIn = useRef(false);

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
  // Prefer the real check row; fall back to coords passed through navigation
  // (so the map lands on the venue even before/without the backend row).
  const paramLng = lon != null && lon !== '' ? parseFloat(lon) : NaN;
  const paramLat = lat != null && lat !== '' ? parseFloat(lat) : NaN;
  const venueLng = check?.requested_lng ?? (Number.isNaN(paramLng) ? null : paramLng);
  const venueLat = check?.requested_lat ?? (Number.isNaN(paramLat) ? null : paramLat);
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

  // Camera: focus on the VENUE (where the Scout is filming) — that's the live
  // action. The Seeker may be anywhere; centering on a far-away midpoint would
  // zoom the map out to nothing. Fall back to the user only if we have no venue.
  const cameraCenter: [number, number] | null = venueCoord ?? userCoord ?? null;

  // Cinematic globe → venue dive (Snap Map style): the map opens on the globe,
  // then sweeps down and lands on the check location. Runs once, when we first
  // have a coordinate to fly to.
  useEffect(() => {
    if (!cameraCenter || flownIn.current) return;
    flownIn.current = true;
    const t = setTimeout(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: cameraCenter,
        zoomLevel: 15.5,
        pitch: 50,
        animationDuration: 3800,
        animationMode: 'flyTo',
      });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraCenter ? cameraCenter[0] : null, cameraCenter ? cameraCenter[1] : null]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Edge-to-edge Mapbox light canvas */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/dark-v11"
        projection="globe"
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
              zoomLevel: 2.4,
              pitch: 0,
            }}
          />
        )}

        {/* Space atmosphere — matches the Home globe exactly */}
        <Mapbox.Atmosphere
          style={{
            color: 'rgb(58, 118, 235)',
            highColor: 'rgb(200, 224, 255)',
            horizonBlend: 0.032,
            spaceColor: 'rgb(0, 0, 0)',
            starIntensity: 1.0,
          }}
        />

        {/* White place labels — matches Home so the map reads crisply */}
        <Mapbox.SymbolLayer id="continent-label" existing style={{ textColor: 'rgba(255,255,255,0.82)', textHaloColor: 'rgba(0,0,0,0.5)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="country-label" existing style={{ textColor: '#ffffff', textHaloColor: 'rgba(0,0,0,0.5)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="state-label" existing style={{ textColor: 'rgba(255,255,255,0.88)', textHaloColor: 'rgba(0,0,0,0.5)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="settlement-major-label" existing style={{ textColor: '#ffffff', textHaloColor: 'rgba(0,0,0,0.55)', textHaloWidth: 1.1 }} />
        <Mapbox.SymbolLayer id="settlement-minor-label" existing style={{ textColor: 'rgba(255,255,255,0.86)', textHaloColor: 'rgba(0,0,0,0.55)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="settlement-subdivision-label" existing style={{ textColor: 'rgba(255,255,255,0.8)' }} />
        <Mapbox.SymbolLayer id="road-label" existing style={{ textColor: '#ffffff', textHaloColor: 'rgba(0,0,0,0.85)', textHaloWidth: 1.5 }} />
        <Mapbox.SymbolLayer id="poi-label" existing style={{ textColor: 'rgba(255,255,255,0.72)', textHaloColor: 'rgba(0,0,0,0.6)', textHaloWidth: 1 }} />

        {/* 3D buildings — the tilted, zoomed-in venue view gets real depth */}
        <Mapbox.FillExtrusionLayer
          id="buildings-3d"
          sourceID="composite"
          sourceLayerID="building"
          minZoomLevel={14}
          style={{
            fillExtrusionColor: '#2b2f3d',
            fillExtrusionHeight: ['get', 'height'],
            fillExtrusionBase: ['get', 'min_height'],
            fillExtrusionOpacity: 0.85,
          }}
        />

        {/* Subtle warm street lighting — the roads glow softly, like a night
            aerial view where the streets and highways are lit up. */}
        <Mapbox.LineLayer id="road-motorway-trunk" existing style={{ lineColor: 'rgba(255,206,130,0.85)', lineBlur: 1.4, lineWidth: 2 }} />
        <Mapbox.LineLayer id="road-primary" existing style={{ lineColor: 'rgba(255,212,150,0.7)', lineBlur: 1.2 }} />
        <Mapbox.LineLayer id="road-secondary-tertiary" existing style={{ lineColor: 'rgba(250,218,165,0.55)', lineBlur: 1 }} />
        <Mapbox.LineLayer id="road-street" existing style={{ lineColor: 'rgba(240,222,180,0.38)', lineBlur: 0.8 }} />

        {/* Warm street/car lights scattered across the area — the city-lights look */}
        {venueCoord && (
          <Mapbox.ShapeSource id="street-lights-src" shape={streetLights(venueCoord)}>
            <Mapbox.CircleLayer id="street-lights-glow" style={{ circleColor: 'rgb(255,206,120)', circleRadius: 9, circleOpacity: 0.35, circleBlur: 1 }} />
            <Mapbox.CircleLayer id="street-lights-core" style={{ circleColor: 'rgb(255,234,180)', circleRadius: 2.6, circleOpacity: 0.95, circleBlur: 0.4 }} />
          </Mapbox.ShapeSource>
        )}

        {/* Illuminated hotspot + blue live-zone ring around the venue (matches Home) */}
        {venueCoord && (
          <>
            <Mapbox.ShapeSource
              id="w-pin-glow-src"
              shape={{
                type: 'FeatureCollection' as const,
                features: [
                  { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: venueCoord }, properties: { mag: 1 } },
                ],
              }}
            >
              <Mapbox.HeatmapLayer
                id="w-pin-glow"
                style={{
                  heatmapWeight: 1,
                  heatmapIntensity: 1,
                  heatmapRadius: 100,
                  heatmapOpacity: 0.85,
                  heatmapColor: [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.15, 'rgba(255,201,120,0.22)',
                    0.45, 'rgba(255,220,150,0.42)',
                    0.75, 'rgba(255,236,185,0.62)',
                    1, 'rgba(255,248,225,0.82)',
                  ],
                }}
              />
            </Mapbox.ShapeSource>
            <Mapbox.ShapeSource
              id="w-geofence-src"
              shape={{
                type: 'FeatureCollection' as const,
                features: [
                  { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [makeRing(venueCoord, 50, 64)] }, properties: {} },
                ],
              }}
            >
              <Mapbox.FillLayer id="w-geofence-fill" style={{ fillColor: '#3BA9FF', fillOpacity: 0.12 }} />
              <Mapbox.LineLayer id="w-geofence-line" style={{ lineColor: '#3BA9FF', lineWidth: 1.5, lineOpacity: 0.8 }} />
            </Mapbox.ShapeSource>
          </>
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
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
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
          <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Text style={styles.iconChevron}>‹</Text>
        </TouchableOpacity>

        <View style={styles.statusPill}>
          <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
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
        <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.sheetHandle} />

        {/* Venue name — the check being done, the hero/anchor of this screen */}
        <Text style={styles.venueTitle} numberOfLines={2}>{venue}</Text>

        {/* Live status, directly under the venue */}
        <Text style={styles.etaLabel}>
          {isFilming ? 'YOUR SCOUT IS FILMING' : 'YOUR SCOUT IS ON SITE'}
        </Text>
        {/* Real countdown to the delivery deadline (the hero moment). */}
        {mmss ? (
          <Text style={styles.statusClock}>{mmss}</Text>
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

        {/* Progress steps — driven by the real status */}
        <View style={styles.stepsRow}>
          <Step label="Paid" state="done" />
          <Step label="Assigned" state="done" />
          <Step label="Recording" state={isFilming ? 'active' : 'pending'} />
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
    state === 'pending' ? 'rgba(255,255,255,0.35)' : colors.white;
  const labelColor =
    state === 'pending' ? 'rgba(255,255,255,0.55)' : colors.white;
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
    state === 'pending' ? 'rgba(255,255,255,0.35)' : colors.white;
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
    backgroundColor: colors.red,
  },
  core: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOpacity: 0.7,
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
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  youText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onRed,
    letterSpacing: 1.2,
  },
});

const pulseStyles = StyleSheet.create({
  wrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  ring: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
  },
  core: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.red,
  },
  recBadge: {
    position: 'absolute',
    top: 24,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(6,7,10,0.66)',
  },
  recDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: colors.danger,
  },
  recText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.white,
    letterSpacing: 1,
  },
});

const venuePinStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  label: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(6,7,10,0.66)',
    marginBottom: 2,
  },
  labelText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.white,
    letterSpacing: 1.2,
  },
  stem: {
    width: 1.5,
    height: 6,
    backgroundColor: colors.red,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.white,
    shadowColor: colors.red,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
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
    color: colors.red,
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
  container: { flex: 1, backgroundColor: colors.bg },
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
    backgroundColor: 'rgba(16,17,24,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  iconChevron: {
    fontFamily: 'Inter_500Medium',
    fontSize: 24,
    color: colors.white,
    marginTop: -2,
    marginLeft: -2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,17,24,0.42)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.verified },
  pillLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    color: colors.white,
    letterSpacing: 2,
  },

  recenterBtn: {
    position: 'absolute',
    right: 14,
    bottom: 320,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16,17,24,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  recenterGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.white,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(48,78,152,0.5)',
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignSelf: 'center',
    marginBottom: 10,
  },

  // Brand mark
  brandMonogram: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 18,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Venue title — the check being done: top of the sheet + most prominent
  venueTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.4,
    lineHeight: 27,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 6,
  },

  // Status hero
  etaLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  statusHero: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.white,
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 30,
    marginTop: 2,
  },
  statusClock: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 62,
    color: colors.white,
    letterSpacing: -1.5,
    textAlign: 'center',
    lineHeight: 66,
    marginTop: 4,
    marginBottom: 2,
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
    color: colors.white,
    letterSpacing: 0.3,
  },
  metaStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.3,
  },
  metaDot: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: colors.red,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tierBadgeStandard: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignSelf: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  tierBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    color: colors.white,
    letterSpacing: 2,
  },

  cancelLink: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  cancelLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
});
