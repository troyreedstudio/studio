import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Animated, Easing, TextInput, Keyboard } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  MARKETS,
  DEFAULT_MARKET_ID,
  getMarketById,
  getVenuesForMarket,
  searchInMarket,
  isPartnerVenue,
  type Market,
  type Venue,
} from '../data/markets';
import { useSavedPlaces } from '../state/saved';

// Mapbox uses [longitude, latitude] order
const MIAMI_CENTER: [number, number] = [-80.1918, 25.7617];
const MIAMI_ZOOM = 14.5;

// The Seeker (current user) — distinct from Scouts
const USER_COORD: [number, number] = [-80.1918, 25.7617];

// Static Scout locations scattered around Miami (visual supply density)
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

// Only 2 "live" Scouts actively filming — keep visual noise low
const LIVE_SCOUTS: [number, number][] = [
  [-80.193, 25.770],
  [-80.175, 25.755],
];

// Branded hot venues — recognizable landmarks for the map
const HOT_VENUES: { name: string; coord: [number, number] }[] = [
  { name: 'LIV', coord: [-80.1228, 25.8186] },
  { name: 'E11EVEN', coord: [-80.1962, 25.7831] },
  { name: 'Story', coord: [-80.1290, 25.7790] },
  { name: 'Mr Jones', coord: [-80.1330, 25.7860] },
];

const RECENTS = [
  { id: 'r1', name: 'JFK Terminal 4', sub: 'Queens, New York · 4 min ago' },
  { id: 'r2', name: 'Equinox Hudson Yards', sub: '33 Hudson Yards, NYC · Yesterday' },
];


const scoutsGeoJSON = {
  type: 'FeatureCollection' as const,
  features: SCOUTS.map((coords, i) => ({
    type: 'Feature' as const,
    id: i,
    geometry: { type: 'Point' as const, coordinates: coords },
    properties: {},
  })),
};

// Stable pseudo-random bearings per scout (vision cone direction)
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
  const marketId = params.marketId || DEFAULT_MARKET_ID;
  const market: Market = getMarketById(marketId) || getMarketById(DEFAULT_MARKET_ID)!;
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [scoutShape, setScoutShape] = useState(scoutsGeoJSON);
  const [liveCoords, setLiveCoords] = useState<[number, number][]>(LIVE_SCOUTS);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(MIAMI_CENTER);
  const [currentZoom, setCurrentZoom] = useState<number>(MIAMI_ZOOM);
  const [droppedPin, setDroppedPin] = useState<[number, number] | null>(null);
  const [pinName, setPinName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const saved = useSavedPlaces();

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

  const searchResults = searchInMarket(marketId, searchQuery);

  const handlePickVenue = (venue: Venue) => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setSearchQuery('');
    setDroppedPin(venue.coord);
    setPinName(venue.name);
    cameraRef.current?.setCamera({
      centerCoordinate: venue.coord,
      zoomLevel: 17,
      pitch: 55,
      animationDuration: 1200,
    });
  };

  const handlePickCity = (target: Market) => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setSearchQuery('');
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

  const handlePickNeighborhood = (name: string) => {
    setSearchQuery(name);
    searchInputRef.current?.focus();
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

  useEffect(() => {
    const interval = setInterval(() => {
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
      setLiveCoords(
        LIVE_SCOUTS.map(
          (coords) =>
            [
              coords[0] + (Math.random() - 0.5) * 0.0008,
              coords[1] + (Math.random() - 0.5) * 0.0008,
            ] as [number, number]
        )
      );
    }, 2800);
    return () => clearInterval(interval);
  }, []);

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
            centerCoordinate: MIAMI_CENTER,
            zoomLevel: MIAMI_ZOOM,
            pitch: 50,
          }}
        />

        {market.id === 'mia' && (
          <>
            <UserPin coordinate={USER_COORD} />
            {HOT_VENUES.map((v) => (
              <VenuePin key={v.name} name={v.name} coordinate={v.coord} />
            ))}
          </>
        )}

        {market.id === 'mia' && (
          <>
            {/* Scout vision cones — HUD field-of-view */}
            <Mapbox.ShapeSource id="cones-src" shape={conesGeoJSON}>
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
            style={styles.iconBtn}
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.iconChevron}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locPill}
            onPress={() => router.push('/onboarding/city')}
            activeOpacity={0.85}
          >
            <Text style={styles.locPin}>📍</Text>
            <Text style={styles.locCity}>{market.name}</Text>
            <View style={styles.scoutDot} />
            <Text style={styles.locScouts}>
              {market.status === 'live'
                ? `${market.scouts} Scouts`
                : market.status === 'soon'
                ? 'Launching soon'
                : 'Waitlist'}
            </Text>
            <Text style={styles.locChevron}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(seeker)/profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.profileInitials}>TR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom sheet — translucent over satellite */}
      <View style={styles.sheet}>
        <View style={styles.sheetTint} pointerEvents="none" />
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>Where do you need eyes?</Text>
        <Text style={styles.sheetHint}>Search below, or tap any spot on the map.</Text>

        {/* Inline search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => {
              searchInputRef.current?.blur();
              router.push('/(seeker)/search');
            }}
            placeholder="Any place. Any address."
            placeholderTextColor="rgba(0,0,0,0.4)"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                searchInputRef.current?.blur();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.length === 0 ? (
          <>
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

            {/* Quick affordances */}
            <View style={styles.quickRow}>
              <TouchableOpacity style={styles.quickChip} activeOpacity={0.7}>
                <Text style={styles.quickIcon}>🎤</Text>
                <Text style={styles.quickLabel}>Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickChip} activeOpacity={0.7}>
                <Text style={styles.quickIcon}>📍</Text>
                <Text style={styles.quickLabel}>Current location</Text>
              </TouchableOpacity>
            </View>

            {/* Recent — max 2, kept minimal */}
            <Text style={styles.recentLabel}>RECENT</Text>
            {RECENTS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.recentRow}
                activeOpacity={0.7}
                onPress={() => {
                  const match = getVenuesForMarket(marketId).find((p) => p.name === r.name);
                  if (match) handlePickVenue(match);
                }}
              >
                <View style={styles.recentIconWrap}>
                  <Text style={styles.recentIcon}>🕐</Text>
                </View>
                <View style={styles.recentText}>
                  <Text style={styles.recentName}>{r.name}</Text>
                  <Text style={styles.recentSub}>{r.sub}</Text>
                </View>
                <Text style={styles.recentArrow}>›</Text>
              </TouchableOpacity>
            ))}

            {/* Refined Scout invitation — supply-side recruit moment */}
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
          </>
        ) : (
          <>
            {searchResults.cities.length > 0 && (
              <>
                <Text style={styles.recentLabel}>CITIES</Text>
                {searchResults.cities.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.recentRow}
                    activeOpacity={0.7}
                    onPress={() => handlePickCity(c)}
                  >
                    <View style={[styles.recentIconWrap, styles.cityIconWrap]}>
                      <Text style={styles.cityMono}>{c.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.recentText}>
                      <Text style={styles.recentName}>{c.name}</Text>
                      <Text style={styles.recentSub}>
                        {c.region}
                        {c.status === 'live' ? ` · ${c.scouts} Scouts` : c.status === 'soon' ? ' · Launching soon' : ' · Waitlist'}
                      </Text>
                    </View>
                    <Text style={styles.recentArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {searchResults.neighborhoods.length > 0 && (
              <>
                <Text style={styles.recentLabel}>NEIGHBORHOODS IN {market.name.toUpperCase()}</Text>
                {searchResults.neighborhoods.map((n) => (
                  <TouchableOpacity
                    key={n.name}
                    style={styles.recentRow}
                    activeOpacity={0.7}
                    onPress={() => handlePickNeighborhood(n.name)}
                  >
                    <View style={styles.recentIconWrap}>
                      <Text style={styles.recentIcon}>🗺️</Text>
                    </View>
                    <View style={styles.recentText}>
                      <Text style={styles.recentName}>{n.name}</Text>
                      <Text style={styles.recentSub}>{market.name} · neighborhood</Text>
                    </View>
                    <Text style={styles.recentArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {searchResults.venues.length > 0 && (
              <>
                <Text style={styles.recentLabel}>VENUES IN {market.name.toUpperCase()}</Text>
                {searchResults.venues.map((v) => (
                  <TouchableOpacity
                    key={v.name}
                    style={styles.recentRow}
                    activeOpacity={0.7}
                    onPress={() => handlePickVenue(v)}
                  >
                    <View style={styles.recentIconWrap}>
                      <Text style={styles.recentIcon}>📍</Text>
                    </View>
                    <View style={styles.recentText}>
                      <View style={styles.recentNameRow}>
                        <Text style={styles.recentName} numberOfLines={1}>{v.name}</Text>
                        {v.partner && (
                          <View style={styles.partnerChip}>
                            <Text style={styles.partnerChipGlyph}>✦</Text>
                            <Text style={styles.partnerChipText}>PARTNER</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.recentSub}>
                        {v.address} · {v.category}
                      </Text>
                    </View>
                    <Text style={styles.recentArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {searchResults.cities.length === 0 &&
              searchResults.neighborhoods.length === 0 &&
              searchResults.venues.length === 0 && (
                <>
                  <Text style={styles.recentLabel}>NO MATCHES</Text>
                  <Text style={styles.recentSub}>
                    Try a city, neighborhood, or venue name.
                  </Text>
                </>
              )}
          </>
        )}
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 5,
  },
  cardConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#143782',
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
    color: '#88B4FF',
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

  // Search bar — the hero CTA
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
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#000000',
    letterSpacing: 0.2,
    padding: 0,
  },
  searchClear: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.55)',
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 4,
  },

  // Quick affordances
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 8,
  },
  quickIcon: { fontSize: 14 },
  quickLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#fff',
    letterSpacing: 0.3,
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
