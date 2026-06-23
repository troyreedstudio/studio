import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Animated, Easing } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_MARKET_ID,
  getMarketById,
  isPartnerVenue,
  nearestLiveMarket,
  type Market,
} from '../data/markets';
import { useSavedPlaces } from '../state/saved';
import { getUserCoords, getUserCity, useUserLocation, requestUserLocation } from '../state/location';
import { useRecents, relativeTime } from '../state/recents';
import { getProfile } from '../lib/api';

// Mapbox uses [longitude, latitude] order
const MIAMI_CENTER: [number, number] = [-80.1918, 25.7617];
const MIAMI_ZOOM = 14.5;

// Per-market demo supply. Miami + New York are the two "rich" demo cities — each
// gets scattered Scouts, live (pulsing) Scouts, vision cones, and venue pins.
// Add an entry here to make any market demo-rich; cities without one show a clean
// map (real supply comes from the backend).
type DemoMarket = {
  user: [number, number];
  scouts: [number, number][];
  liveScouts: [number, number][];
  venues: { name: string; coord: [number, number] }[];
};

const MIAMI_DEMO: DemoMarket = {
  user: [-80.1918, 25.7617],
  scouts: [
    [-80.193, 25.760], [-80.188, 25.785], [-80.130, 25.785], [-80.130, 25.770],
    [-80.220, 25.745], [-80.196, 25.737], [-80.175, 25.795], [-80.143, 25.760],
    [-80.205, 25.770], [-80.155, 25.740], [-80.165, 25.810], [-80.215, 25.795],
    [-80.118, 25.750], [-80.180, 25.755], [-80.225, 25.760], [-80.150, 25.795],
    [-80.200, 25.745], [-80.135, 25.745], [-80.170, 25.730], [-80.190, 25.800],
  ],
  liveScouts: [[-80.193, 25.770], [-80.175, 25.755]],
  venues: [
    { name: 'LIV', coord: [-80.1228, 25.8186] },
    { name: 'E11EVEN', coord: [-80.1962, 25.7831] },
    { name: 'Story', coord: [-80.1290, 25.7790] },
    { name: 'Mr Jones', coord: [-80.1330, 25.7860] },
  ],
};

const NYC_DEMO: DemoMarket = {
  user: [-74.006, 40.7128],
  scouts: [
    [-74.006, 40.713], [-74.013, 40.719], [-73.997, 40.723], [-74.004, 40.707],
    [-73.990, 40.727], [-74.017, 40.711], [-73.994, 40.716], [-74.009, 40.731],
    [-73.987, 40.720], [-74.001, 40.734], [-74.019, 40.725], [-73.992, 40.709],
    [-74.007, 40.737], [-73.985, 40.724], [-74.014, 40.704], [-73.998, 40.729],
    [-74.003, 40.706], [-73.991, 40.734], [-74.016, 40.717], [-74.000, 40.721],
  ],
  liveScouts: [[-74.006, 40.715], [-73.998, 40.722]],
  venues: [
    { name: 'The Box', coord: [-73.9918, 40.7212] },
    { name: 'PHD Downtown', coord: [-74.0090, 40.7250] },
    { name: 'Pier 17', coord: [-74.0011, 40.7063] },
    { name: 'Le Bain', coord: [-74.0079, 40.7396] },
  ],
};

const DEMO_BY_MARKET: Record<string, DemoMarket> = {
  mia: MIAMI_DEMO,
  nyc: NYC_DEMO,
};



function scoutsToGeoJSON(scouts: [number, number][]) {
  return {
    type: 'FeatureCollection' as const,
    features: scouts.map((coords, i) => ({
      type: 'Feature' as const,
      id: i,
      geometry: { type: 'Point' as const, coordinates: coords },
      properties: {},
    })),
  };
}

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

function makeRing(
  center: [number, number],
  radiusMeters: number,
  segs = 64
): [number, number][] {
  const [lon, lat] = center;
  const lonScale = Math.cos((lat * Math.PI) / 180);
  const degPerMeter = 1 / 111320;
  const r = radiusMeters * degPerMeter;
  const pts: [number, number][] = [];
  for (let k = 0; k <= segs; k++) {
    const angle = (k / segs) * Math.PI * 2;
    pts.push([
      lon + (Math.sin(angle) * r) / lonScale,
      lat + Math.cos(angle) * r,
    ]);
  }
  return pts;
}

function conesToGeoJSON(scouts: [number, number][]) {
  return {
  type: 'FeatureCollection' as const,
  features: scouts.map((coords, i) => ({
    type: 'Feature' as const,
    id: i,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [makeCone(coords, (i * 47) % 360, 180, 55)],
    },
    properties: {},
  })),
  };
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
    <Mapbox.MarkerView
      id="user-pin"
      coordinate={coordinate}
      allowOverlap
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={userStyles.wrap}>
        <Animated.View
          style={[
            userStyles.scanRing,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
        <View style={userStyles.core} />
        <View style={userStyles.youBadge}>
          <Text style={userStyles.youText}>YOU</Text>
        </View>
      </View>
    </Mapbox.MarkerView>
  );
}

function VenuePin({ name, coordinate }: { name: string; coordinate: [number, number] }) {
  return (
    <Mapbox.MarkerView
      id={`venue-${name}`}
      coordinate={coordinate}
      allowOverlap
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={venueStyles.wrap}>
        <View style={venueStyles.label}>
          <Text style={venueStyles.labelText}>{name}</Text>
        </View>
        <View style={venueStyles.stem} />
        <View style={venueStyles.dot} />
      </View>
    </Mapbox.MarkerView>
  );
}

function PulsingScout({ coordinate }: { coordinate: [number, number] }) {
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
    <Mapbox.MarkerView
      id={`live-${coordinate.join('_')}`}
      coordinate={coordinate}
      allowOverlap
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={pulseStyles.wrap}>
        <Animated.View
          style={[
            pulseStyles.ring,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
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

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pinLat?: string;
    pinLon?: string;
    pinName?: string;
    pinAddress?: string;
    marketId?: string;
  }>();

  // Subscribe to location state changes so the pill re-renders when GPS/IP
  // resolves after mount (the hook triggers a re-render via a setState inside it).
  useUserLocation();

  // Derive the effective marketId from:
  //   1. An explicit param (city picker returned here with a selection)
  //   2. The user's real GPS/IP location → nearest live market
  //   3. Neutral placeholder (no location yet — never auto-Miami)
  const userCoords = getUserCoords();
  const coverage = userCoords ? nearestLiveMarket(userCoords) : null;
  const resolvedMarketId: string | null = params.marketId
    ? params.marketId
    : coverage?.inMarket
    ? coverage.market.id
    : null;

  // Only fall back to DEFAULT_MARKET_ID for venue/search data when we
  // legitimately have a live market to show — otherwise hold neutral.
  const marketId = resolvedMarketId ?? DEFAULT_MARKET_ID;
  const market: Market = getMarketById(marketId) || getMarketById(DEFAULT_MARKET_ID)!;

  // Profile initials — derived from the real display_name once loaded.
  // No fallback to a hardcoded name; show a neutral placeholder until resolved.
  const [profileInitials, setProfileInitials] = useState<string>('?');
  useEffect(() => {
    getProfile()
      .then((profile) => {
        const name = profile?.display_name?.trim();
        if (!name) return;
        const parts = name.split(/\s+/);
        const initials = parts
          .map((w) => (w[0] ?? '').toUpperCase())
          .slice(0, 2)
          .join('');
        if (initials) setProfileInitials(initials);
      })
      .catch(() => {
        // Not signed in or network error — keep neutral placeholder.
      });
  }, []);

  // Demo supply for the active market (Miami / New York). null = clean map.
  const demo = DEMO_BY_MARKET[market.id] ?? null;
  const conesShape = conesToGeoJSON(demo?.scouts ?? []);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [scoutShape, setScoutShape] = useState(() => scoutsToGeoJSON(demo?.scouts ?? []));
  const [liveCoords, setLiveCoords] = useState<[number, number][]>(demo?.liveScouts ?? []);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(MIAMI_CENTER);
  const [currentZoom, setCurrentZoom] = useState<number>(MIAMI_ZOOM);
  const [droppedPin, setDroppedPin] = useState<[number, number] | null>(null);
  const [pinName, setPinName] = useState<string | null>(null);
  const saved = useSavedPlaces();
  const recents = useRecents();

  const currentPinSavedId = droppedPin && pinName ? `${pinName}-${droppedPin[0].toFixed(4)}` : null;
  const isCurrentPinSaved = currentPinSavedId ? saved.isSaved(currentPinSavedId) : false;

  const handleToggleSave = () => {
    if (!droppedPin || !pinName || !currentPinSavedId) return;
    saved.toggle({
      id: currentPinSavedId,
      name: pinName,
      coord: droppedPin,
      marketId,
    });
  };

  const handlePickCity = (target: Market) => {
    setDroppedPin(null);
    setPinName(null);
    if (target.id === marketId) {
      cameraRef.current?.setCamera({
        centerCoordinate: target.center,
        zoomLevel: 13.5,
        pitch: 50,
        animationDuration: 1200,
      });
    } else {
      router.replace({
        pathname: '/(seeker)/home',
        params: { marketId: target.id },
      });
    }
  };

  // When marketId changes → fly camera to that market's center
  useEffect(() => {
    if (!params.pinLat && !params.pinLon) {
      cameraRef.current?.setCamera({
        centerCoordinate: market.center,
        zoomLevel: 13.5,
        pitch: 50,
        animationDuration: 1200,
      });
    }
  }, [marketId]);

  // When a place is selected from search → fly camera + auto-drop pin
  useEffect(() => {
    if (params.pinLat && params.pinLon) {
      const lat = parseFloat(params.pinLat);
      const lon = parseFloat(params.pinLon);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        const coord: [number, number] = [lon, lat];
        setDroppedPin(coord);
        setPinName(params.pinName || null);
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: 17,
          pitch: 55,
          animationDuration: 1200,
        });
      }
    }
  }, [params.pinLat, params.pinLon, params.pinName]);

  const handleMapPress = (e: any) => {
    const coords = e?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      setDroppedPin([coords[0], coords[1]]);
    }
  };

  const handleCameraChanged = (e: any) => {
    const center = e?.properties?.center;
    const zoom = e?.properties?.zoom;
    if (Array.isArray(center) && center.length === 2) {
      setCurrentCenter([center[0], center[1]]);
    }
    if (typeof zoom === 'number') {
      setCurrentZoom(zoom);
    }
  };

  // On first load, centre the map on the user's REAL location (captured at the
  // permission step — GPS, or IP-approximated, or manually chosen). We ALWAYS
  // show their actual place; we never fall back to a default city. When they're
  // outside a live market they still see where they are, plus a waitlist banner.
  // Skips when arriving via an explicit pin/search so we don't override it.
  useEffect(() => {
    if (params.pinLat || params.marketId) return;
    const coords = getUserCoords();
    if (!coords) return;
    setCurrentCenter(coords);
    cameraRef.current?.setCamera({
      centerCoordinate: coords,
      zoomLevel: 14.5,
      animationDuration: 900,
    });
  }, [params.pinLat, params.marketId]);

  // If no coords are resolved yet when home mounts, request location now so
  // the pill shows the user's real city instead of "Set your location".
  // This handles the case where onboarding was skipped or state was cleared.
  useEffect(() => {
    if (params.pinLat || params.marketId) return;
    if (getUserCoords()) return; // already resolved — nothing to do
    requestUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Is the user outside every live market? Drives the honest "not live yet" banner.
  // userCoords + coverage are computed at the top of the component (before marketId
  // derivation) — no re-declaration here.
  const usingRealLocation = !params.marketId && !params.pinLat && !!userCoords;
  const outOfCoverage = usingRealLocation && !!coverage && !coverage.inMarket;
  const inLiveMarket = usingRealLocation && !!coverage && coverage.inMarket;
  const userCityLabel = getUserCity() || 'your area';

  // The location pill must reflect the user's REAL place.
  //   - Explicit marketId param (city picker choice) → use that market's name
  //   - User is in a live market → use that live market's name
  //   - User is out of coverage → show their real city name + waitlist state
  //   - No location resolved yet → neutral "Set your location" (never Miami)
  const displayCity = params.marketId
    ? market.name
    : outOfCoverage
    ? userCityLabel
    : inLiveMarket
    ? coverage!.market.name
    : userCoords
    ? userCityLabel
    : 'Set your location';
  // TODO: real supply count — wire to a scouts_online_in_market RPC when built.
  // Do NOT show market.scouts (static demo number) — it is fabricated, not live data.
  const displayStatusText = outOfCoverage
    ? 'Not live yet'
    : inLiveMarket
    ? 'Live'
    : market.status === 'live'
    ? 'Live'
    : market.status === 'soon'
    ? 'Launching soon'
    : 'Waitlist';

  useEffect(() => {
    // Reset to the active market's supply, then keep it gently alive.
    setScoutShape(scoutsToGeoJSON(demo?.scouts ?? []));
    setLiveCoords(demo?.liveScouts ?? []);
    if (!demo) return;
    const baseScouts = demo.scouts;
    const baseLive = demo.liveScouts;
    const interval = setInterval(() => {
      setScoutShape({
        type: 'FeatureCollection' as const,
        features: baseScouts.map((coords, i) => ({
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
      setLiveCoords(
        baseLive.map(
          (coords) =>
            [
              coords[0] + (Math.random() - 0.5) * 0.0008,
              coords[1] + (Math.random() - 0.5) * 0.0008,
            ] as [number, number]
        )
      );
    }, 2800);
    return () => clearInterval(interval);
  }, [market.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Edge-to-edge map — the canvas (Mapbox dark, Uber/Grab quality) */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/satellite-streets-v12"
        compassEnabled={false}
        scaleBarEnabled={false}
        logoEnabled
        attributionEnabled
        attributionPosition={{ bottom: 8, left: 8 }}
        logoPosition={{ bottom: 8, left: 8 }}
        onPress={handleMapPress}
        onCameraChanged={handleCameraChanged}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            // Start on the right spot so a freshly-loaded map opens correctly —
            // a selected venue (pin) wins, then the user's live coords, then the market.
            centerCoordinate:
              params.pinLat && params.pinLon
                ? [parseFloat(params.pinLon), parseFloat(params.pinLat)]
                : usingRealLocation && userCoords
                ? userCoords
                : market.center,
            zoomLevel: params.pinLat ? 16.5 : MIAMI_ZOOM,
            pitch: 50,
          }}
        />

        {/* User location pin — real GPS, not the demo market centre */}
        {usingRealLocation && userCoords && <UserPin coordinate={userCoords} />}
        {demo && (
          <>
            {demo.venues.map((v) => (
              <VenuePin key={v.name} name={v.name} coordinate={v.coord} />
            ))}
          </>
        )}

        {demo && (
          <>
            {/* Scout vision cones — HUD field-of-view */}
            <Mapbox.ShapeSource id="cones-src" shape={conesShape}>
              <Mapbox.FillLayer
                id="cones-fill"
                style={{
                  fillColor: '#00FF7F',
                  fillOpacity: 0.28,
                }}
              />
            </Mapbox.ShapeSource>

            {/* Static Scout dots — visual proof of supply */}
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

            {/* Live (pulsing) Scouts */}
            {liveCoords.map((coord, i) => (
              <PulsingScout key={`live-${i}`} coordinate={coord} />
            ))}
          </>
        )}

        {/* Geofence ring around dropped pin — 50m radius */}
        {droppedPin && (
          <Mapbox.ShapeSource
            id="geofence-src"
            shape={{
              type: 'FeatureCollection' as const,
              features: [
                {
                  type: 'Feature' as const,
                  geometry: {
                    type: 'Polygon' as const,
                    coordinates: [makeRing(droppedPin, 50, 64)],
                  },
                  properties: {},
                },
              ],
            }}
          >
            <Mapbox.FillLayer
              id="geofence-fill"
              style={{ fillColor: '#143782', fillOpacity: 0.22 }}
            />
            <Mapbox.LineLayer
              id="geofence-line"
              style={{
                lineColor: '#ffffff',
                lineWidth: 1.5,
                lineOpacity: 0.8,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Dropped pin — user-selected exact spot */}
        {droppedPin && (
          <Mapbox.MarkerView
            id="dropped-pin"
            coordinate={droppedPin}
            allowOverlap
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={pinStyles.wrap}>
              <View style={pinStyles.card}>
                <Text style={pinStyles.cardLabel}>IS THIS YOUR SPOT?</Text>
                {pinName && <Text style={pinStyles.cardVenue}>{pinName}</Text>}
                {isPartnerVenue(pinName) && (
                  <View style={pinStyles.partnerBadge}>
                    <Text style={pinStyles.partnerGlyph}>✦</Text>
                    <Text style={pinStyles.partnerText}>PARTNER · INTERIOR AVAILABLE</Text>
                  </View>
                )}
                <View style={pinStyles.cardActions}>
                  <TouchableOpacity
                    style={pinStyles.cardConfirm}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: '/(seeker)/venue',
                        params: {
                          ...(pinName ? { name: pinName } : {}),
                          marketId,
                          city: market.name,
                        },
                      })
                    }
                  >
                    <Text style={pinStyles.cardConfirmText}>YES</Text>
                  </TouchableOpacity>
                  {pinName && (
                    <TouchableOpacity
                      style={[
                        pinStyles.cardHeart,
                        isCurrentPinSaved && pinStyles.cardHeartActive,
                      ]}
                      activeOpacity={0.7}
                      onPress={handleToggleSave}
                    >
                      <Text style={pinStyles.cardHeartGlyph}>
                        {isCurrentPinSaved ? '♥' : '♡'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={pinStyles.cardCancel}
                    activeOpacity={0.7}
                    onPress={() => {
                      setDroppedPin(null);
                      setPinName(null);
                    }}
                  >
                    <Text style={pinStyles.cardCancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={pinStyles.stem} />
              <View style={pinStyles.dot} />
            </View>
          </Mapbox.MarkerView>
        )}
      </Mapbox.MapView>

      {/* Top gradient overlay — dark fade for satellite contrast */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']}
        locations={[0, 0.5, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />


      {/* Top overlay — floating glass elements */}
      <SafeAreaView style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.locPill}
            onPress={() => {
              if (displayCity === 'Set your location') {
                // No location yet — request it directly; city picker as fallback
                requestUserLocation().then(({ status }) => {
                  if (status === 'denied') {
                    router.push({ pathname: '/onboarding/city', params: { from: 'home' } });
                  }
                });
              } else {
                router.push({ pathname: '/onboarding/city', params: { from: 'home' } });
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.locPin}>📍</Text>
            <Text style={styles.locCity}>{displayCity}</Text>
            <View style={[styles.scoutDot, outOfCoverage && styles.scoutDotOff]} />
            <Text style={styles.locScouts}>{displayStatusText}</Text>
            <Text style={styles.locChevron}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(seeker)/profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.profileInitials}>{profileInitials}</Text>
          </TouchableOpacity>
        </View>

        {/* Honest out-of-coverage banner — never pretend we serve a city we don't */}
        {outOfCoverage && (
          <View style={styles.waitlistBanner}>
            <Text style={styles.waitlistPin}>📍</Text>
            <Text style={styles.waitlistText}>
              We&apos;re not live in {userCityLabel} yet.
            </Text>
            <TouchableOpacity
              style={styles.waitlistBtn}
              onPress={() => router.push({ pathname: '/onboarding/city', params: { from: 'home' } })}
              activeOpacity={0.85}
            >
              <Text style={styles.waitlistBtnText}>JOIN WAITLIST</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Bottom sheet — translucent over satellite */}
      <View style={styles.sheet}>
        <View style={styles.sheetTint} pointerEvents="none" />
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>Where do you need eyes?</Text>
        <Text style={styles.sheetHint}>Search below, or tap any spot on the map.</Text>

        {/* Search bar — tap to open the real Google Places search screen */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/(seeker)/search',
              params: { marketId },
            })
          }
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Any place. Any address.</Text>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() =>
              router.push({
                pathname: '/(seeker)/search',
                params: { marketId, voice: '1' },
              })
            }
          >
            <Text style={styles.searchMic}>🎤</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Saved chips */}
        {saved.list.length > 0 && (
          <>
            <View style={styles.savedRow}>
              <Text style={styles.recentLabel}>SAVED · {saved.list.length}</Text>
              <TouchableOpacity
                onPress={() => router.push('/(seeker)/saved')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.savedSeeAll}>SEE ALL ›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.savedChipsRow}>
              {saved.list.slice(0, 4).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.savedChip}
                  activeOpacity={0.85}
                  onPress={() => {
                    setDroppedPin(p.coord);
                    setPinName(p.name);
                    cameraRef.current?.setCamera({
                      centerCoordinate: p.coord,
                      zoomLevel: 17,
                      pitch: 55,
                      animationDuration: 1200,
                    });
                  }}
                >
                  <Text style={styles.savedChipGlyph}>♥</Text>
                  <Text style={styles.savedChipText} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recent — the user's last 2 confirmed checks, newest first */}
        {recents.length > 0 && (
          <>
            <Text style={styles.recentLabel}>RECENT</Text>
            {recents.slice(0, 2).map((r) => (
              <TouchableOpacity
                key={r.name}
                style={styles.recentRow}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/(seeker)/search',
                    params: { marketId },
                  })
                }
              >
                <View style={styles.recentIconWrap}>
                  <Text style={styles.recentIcon}>🕐</Text>
                </View>
                <View style={styles.recentText}>
                  <Text style={styles.recentName}>{r.name}</Text>
                  <Text style={styles.recentSub}>{r.city} · {relativeTime(r.ts)}</Text>
                </View>
                <Text style={styles.recentArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Scout invitation */}
        <TouchableOpacity
          style={scoutInviteStyles.card}
          activeOpacity={0.85}
          onPress={() => router.push('/scout/become')}
        >
          <View style={scoutInviteStyles.left}>
            <View style={scoutInviteStyles.iconWrap}>
              <View style={scoutInviteStyles.iconDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={scoutInviteStyles.label}>BECOME A SCOUT</Text>
              <Text style={scoutInviteStyles.title}>Be the eyes for your city</Text>
            </View>
          </View>
          <Text style={scoutInviteStyles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pinStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  card: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 3,
    minWidth: 130,
    alignItems: 'center',
  },
  cardLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  cardVenue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(255,138,168,0.18)',
    borderWidth: 1,
    borderColor: '#FF8AA8',
    marginBottom: 8,
  },
  partnerGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#ffffff',
  },
  partnerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 1.3,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardConfirm: {
    backgroundColor: '#00FF7F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 5,
  },
  cardConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#000000',
    letterSpacing: 1.2,
  },
  cardCancel: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeart: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeartActive: {
    backgroundColor: '#E8A0B0',
  },
  cardHeartGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#ffffff',
    lineHeight: 14,
  },
  cardCancelText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#ffffff',
  },
  stem: {
    width: 1.5,
    height: 8,
    backgroundColor: '#ffffff',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#143782',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#143782',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

const hudStyles = StyleSheet.create({
  telemetryWrap: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.35)',
  },
  telemetryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00FF7F',
  },
  telemetryText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.6,
  },
  reticleWrap: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  reticleCrossH: {
    position: 'absolute',
    width: 14,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  reticleCrossV: {
    position: 'absolute',
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  reticleCenter: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#00FF7F',
  },
  recenterBtn: {
    position: 'absolute',
    right: 14,
    bottom: 340,
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
  hintWrap: {
    position: 'absolute',
    top: '46%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(20,55,130,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  hintGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  hintText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
});

const userStyles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B00',
  },
  core: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  youBadge: {
    position: 'absolute',
    top: -6,
    left: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  youText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: '#ffffff',
    letterSpacing: 1,
  },
});

const venueStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  label: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(15,15,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,160,176,0.55)',
    marginBottom: 2,
  },
  labelText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#E8A0B0',
    letterSpacing: 1.2,
  },
  stem: {
    width: 1.5,
    height: 6,
    backgroundColor: '#E8A0B0',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8A0B0',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#E8A0B0',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});

const pulseStyles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00FF7F',
  },
  core: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF7F',
  },
  recBadge: {
    position: 'absolute',
    top: -8,
    left: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  recDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#FF3B30',
  },
  recText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 1,
  },
});

const scoutInviteStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.5)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 14,
    marginBottom: 6,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF7F',
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#00FF7F',
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  arrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 22,
    color: 'rgba(255,255,255,0.55)',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },

  // Top overlay
  topSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
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
  locPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    justifyContent: 'center',
  },
  locPin: { fontSize: 13 },
  locCity: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.3,
  },
  scoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF7F',
    marginHorizontal: 2,
  },
  scoutDotOff: {
    backgroundColor: '#FFCB47',
  },
  waitlistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.4)',
  },
  waitlistPin: { fontSize: 13 },
  waitlistText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  waitlistBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFCB47',
  },
  waitlistBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#000000',
    letterSpacing: 1,
  },
  locScouts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#00FF7F',
    letterSpacing: 0.3,
  },
  locChevron: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 2,
  },
  cityIconWrap: {
    backgroundColor: '#143782',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cityMono: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Bottom sheet — frosted glass
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  sheetTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,55,130,0.5)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetEyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 5,
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  sheetHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
    marginBottom: 14,
  },

  // Search bar — tap target that opens the real Google Places search screen
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(0,0,0,0.4)',
    letterSpacing: 0.2,
  },
  searchMic: {
    fontSize: 16,
    paddingHorizontal: 4,
    opacity: 0.55,
  },

  // Saved
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savedSeeAll: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#E8A0B0',
    letterSpacing: 1.6,
  },
  savedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(232,160,176,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,160,176,0.35)',
    maxWidth: '48%',
  },
  savedChipGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#E8A0B0',
  },
  savedChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  // Recent
  recentLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  recentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentIcon: { fontSize: 13 },
  recentText: { flex: 1 },
  recentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  recentName: {
    flexShrink: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,138,168,0.16)',
    borderWidth: 1,
    borderColor: '#FF8AA8',
  },
  partnerChipGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#ffffff',
  },
  partnerChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 1.3,
  },
  recentSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#888',
    letterSpacing: 0.2,
  },
  recentArrow: {
    fontSize: 20,
    color: '#555',
    fontFamily: 'Inter_500Medium',
  },
});
