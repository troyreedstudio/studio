import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Animated, Easing, TextInput, ActivityIndicator, Keyboard, Modal, FlatList, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';
import { BottomNav } from '../components/BottomNav';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  DEFAULT_MARKET_ID,
  getMarketById,
  isPartnerVenue,
  nearestLiveMarket,
  type Market,
} from '../data/markets';
import { useSavedPlaces } from '../state/saved';
import { getUserCoords, getUserCity, useUserLocation, requestUserLocation } from '../state/location';
import { useRecents, addRecent, relativeTime } from '../state/recents';
import { getProfile } from '../lib/api';
import { switchRole } from '../lib/auth';
import { searchPlaces, getPlaceCoords, placeToAppCoord, type PlaceSuggestion } from '../lib/places';
import { colors } from '../lib/theme';

// ── SearchState ───────────────────────────────────────────────────────────────
// Used by SearchOverlay below.
type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; suggestions: PlaceSuggestion[] }
  | { kind: 'no-results' }
  | { kind: 'unavailable' };

// ── PLACEHOLDER_HINTS — rotate in the overlay ────────────────────────────────
const PLACEHOLDER_HINTS = [
  'Any place. Any address.',
  'Try: "JFK Terminal 4"',
  'Try: "Equinox Hudson Yards"',
  'Try: "DMV Miami Beach"',
  'Try: "Whole Foods Brooklyn"',
];

// Mapbox uses [longitude, latitude] order
const MIAMI_CENTER: [number, number] = [-80.1918, 25.7617];
const MIAMI_ZOOM = 14.5;
// The globe teaser opens on the transatlantic corridor: New York + Miami sit
// prominent on the west, London + Paris on the east (the location pill still shows
// the user's real city).
const LAUNCH_CENTER: [number, number] = [-52, 37];

// Decorative "activity" hotspots for the globe-teaser heatmap — a lit-up globe
// like the Snap Map reference (no real check-volume data yet; roughly world metros).
const GLOBE_HOTSPOTS: [number, number, number][] = [
  [-80.19, 25.76, 1.35], [-74.0, 40.71, 1.35],                          // Miami, NYC (hottest)
  [-118.24, 34.05, 1.0], [-87.63, 41.88, 0.9], [-122.42, 37.77, 0.9],  // LA, Chicago, SF
  [-95.37, 29.76, 0.8], [-84.39, 33.75, 0.85], [-77.04, 38.9, 0.75],   // Houston, Atlanta, DC
  [-115.14, 36.17, 0.78], [-71.06, 42.36, 0.72], [-81.38, 28.54, 0.72],// Vegas, Boston, Orlando
  [-0.12, 51.5, 0.95], [2.35, 48.85, 0.85], [55.27, 25.2, 0.9],        // London, Paris, Dubai
  [139.69, 35.68, 0.9], [103.8, 1.35, 0.7], [151.2, -33.87, 0.6],      // Tokyo, Singapore, Sydney
  [-46.63, -23.55, 0.7], [-99.13, 19.43, 0.7], [-58.38, -34.6, 0.6],   // São Paulo, Mexico City, BA
  [77.2, 28.6, 0.8], [116.4, 39.9, 0.78], [28.98, 41.0, 0.65],         // Delhi, Beijing, Istanbul
];
const HOTSPOTS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: GLOBE_HOTSPOTS.map(([lon, lat, intensity]) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lon, lat] },
    properties: { intensity },
  })),
};

// Soft city lights across the globe — the "small lights within the globe" detail
// (Apple-map night-lights feel). Denser than the heatmap so the DARK regions
// (South America, Africa, Asia) get the road/city-light glow, not just the US.
const CITY_LIGHTS: [number, number][] = [
  // North America
  [-74, 40.7], [-118.2, 34], [-87.6, 41.9], [-80.2, 25.8], [-122.4, 37.8], [-95.4, 29.8], [-84.4, 33.7], [-96.8, 32.8], [-75.2, 40], [-77, 38.9], [-79.4, 43.7], [-73.6, 45.5], [-123.1, 49.3], [-99.1, 19.4], [-103.3, 20.7], [-100.3, 25.7], [-90.5, 14.6],
  // South America (Troy's focus — Venezuela, Colombia, Ecuador, Peru, Chile)
  [-74, 4.7], [-66.9, 10.5], [-77, -12], [-78.5, -0.2], [-70.6, -33.4], [-75.5, 6.2], [-76.5, 3.4], [-79.9, -2.2], [-56.2, -34.9], [-58.4, -34.6], [-47.9, -15.8], [-46.6, -23.5], [-43.2, -22.9], [-68.1, -16.5], [-51.2, -30], [-63.2, -17.8], [-57.6, -25.3], [-71.5, -16.4],
  // Europe
  [-0.12, 51.5], [2.35, 48.85], [-3.7, 40.4], [12.5, 41.9], [13.4, 52.5], [4.9, 52.4], [2.17, 41.4], [-9.1, 38.7], [23.7, 37.98], [16.4, 48.2], [21, 52.2], [30.5, 50.45], [37.6, 55.75], [28.98, 41], [24.9, 60.2], [18.06, 59.3], [12.57, 55.68],
  // Africa
  [3.4, 6.5], [31.2, 30], [28, -26.2], [36.8, -1.3], [-7.6, 33.6], [-0.2, 5.6], [38.7, 9], [32.6, 0.3], [15.3, -4.3], [18.4, -33.9],
  // Middle East / Asia
  [55.3, 25.2], [46.7, 24.7], [51.4, 35.7], [44.4, 33.3], [34.8, 32.1], [77.2, 28.6], [72.9, 19], [77.6, 12.97], [67, 24.9], [90.4, 23.8], [100.5, 13.75], [106.8, -6.2], [121, 14.6], [103.8, 1.35], [101.7, 3.15], [106.7, 10.8], [114.1, 22.3], [121.5, 31.2], [116.4, 39.9], [126.98, 37.57], [139.7, 35.7], [135.5, 34.7], [121.5, 25],
  // Oceania
  [151.2, -33.9], [144.96, -37.8], [174.76, -36.85],
];
// Densify each anchor city into a small cluster so the globe reads like the
// NASA "earth at night" glow (clusters of light, not lone dots).
const CITY_CLUSTER_OFFSETS: [number, number][] = [
  [0, 0], [0.45, 0.3], [-0.4, 0.35], [0.3, -0.45], [-0.45, -0.3],
];
const CITY_LIGHTS_DENSE: [number, number][] = CITY_LIGHTS.flatMap(([lon, lat]) =>
  CITY_CLUSTER_OFFSETS.map(([dx, dy]) => [lon + dx, lat + dy] as [number, number]),
);
const CITY_LIGHTS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: CITY_LIGHTS_DENSE.map(([lon, lat]) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lon, lat] },
    properties: {},
  })),
};

// Great-circle arc between two [lon,lat] points, as a smooth line on the sphere —
// powers the glowing "global live network" arcs across the globe.
function greatCircleArc(a: [number, number], b: [number, number], n = 54): number[][] {
  const R = Math.PI / 180, D = 180 / Math.PI;
  const lat1 = a[1] * R, lon1 = a[0] * R, lat2 = b[1] * R, lon2 = b[0] * R;
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
  ));
  if (d === 0) return [a, b];
  const pts: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push([Math.atan2(y, x) * D, Math.atan2(z, Math.sqrt(x * x + y * y)) * D]);
  }
  return pts;
}
const ARC_PAIRS: [[number, number], [number, number]][] = [
  [[-74, 40.7], [-0.12, 51.5]],    // NYC ↔ London
  [[-80.2, 25.8], [-118.2, 34]],   // Miami ↔ LA
  [[-74, 40.7], [-80.2, 25.8]],    // NYC ↔ Miami
  [[-0.12, 51.5], [55.3, 25.2]],   // London ↔ Dubai
  [[55.3, 25.2], [103.8, 1.35]],   // Dubai ↔ Singapore
  [[103.8, 1.35], [139.7, 35.7]],  // Singapore ↔ Tokyo
  [[-118.2, 34], [139.7, 35.7]],   // LA ↔ Tokyo
  [[2.35, 48.85], [-74, 40.7]],    // Paris ↔ NYC
  [[151.2, -33.9], [103.8, 1.35]], // Sydney ↔ Singapore
  [[-46.6, -23.5], [-0.12, 51.5]], // São Paulo ↔ London
  [[-80.2, 25.8], [-74, 4.7]],     // Miami ↔ Bogotá
];
const ARCS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: ARC_PAIRS.map(([a, b]) => ({
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: greatCircleArc(a, b) },
    properties: {},
  })),
};

// ── Live globe FX + city chips (ported from the globe demo) ────────────────────
// Great-circle distance in degrees — tells if a city is on the visible hemisphere.
function angularDistanceDeg(a: [number, number], b: [number, number]): number {
  const R = Math.PI / 180;
  const lat1 = a[1] * R, lat2 = b[1] * R, dlon = (a[0] - b[0]) * R;
  const c = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dlon);
  return Math.acos(Math.max(-1, Math.min(1, c))) / R;
}
const ARCS_PTS = ARC_PAIRS.map(([a, b]) => greatCircleArc(a, b, 64));
const PING_CITIES: [number, number][] = [
  [-80.19, 25.76], [-74.0, 40.71], [-118.24, 34.05], [-0.12, 51.5],
  [2.35, 48.85], [55.27, 25.2], [139.69, 35.68], [-46.63, -23.55], [103.8, 1.35],
];
// The world's most check-worthy cities — chips that pop up as each rotates into view.
const CHIP_CITIES: { id: string; coord: [number, number]; label: string; dx?: number; dy?: number }[] = [
  { id: 'mia', coord: [-80.19, 25.76], label: 'Miami' },
  { id: 'nyc', coord: [-74.0, 40.71], label: 'New York' },
  { id: 'lax', coord: [-118.24, 34.05], label: 'Los Angeles', dy: -20 },
  { id: 'las', coord: [-115.14, 36.17], label: 'Las Vegas', dy: 12 },
  { id: 'lon', coord: [-0.12, 51.5], label: 'London', dy: -20 },
  { id: 'par', coord: [2.35, 48.85], label: 'Paris', dy: 12 },
  { id: 'dxb', coord: [55.27, 25.2], label: 'Dubai' },
  { id: 'tok', coord: [139.69, 35.68], label: 'Tokyo' },
  { id: 'sin', coord: [103.8, 1.35], label: 'Singapore' },
  { id: 'hkg', coord: [114.17, 22.32], label: 'Hong Kong' },
  { id: 'syd', coord: [151.2, -33.87], label: 'Sydney' },
  { id: 'rio', coord: [-43.2, -22.91], label: 'Rio de Janeiro' },
];

// Isolated animation host — pings ripple + dots travel the arcs. Kept as its own
// component so its 90ms state updates DON'T re-render the heavy home screen.
function LiveGlobeFx() {
  const [pings, setPings] = useState<any>({ type: 'FeatureCollection', features: [] });
  const [travelers, setTravelers] = useState<any>({ type: 'FeatureCollection', features: [] });
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setPings({
        type: 'FeatureCollection',
        features: PING_CITIES.map(([lon, lat], i) => {
          const phase = ((tick * 0.02) + i / PING_CITIES.length) % 1;
          return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { r: 3 + phase * 24, o: Math.max(0, 0.75 * (1 - phase)) } };
        }),
      });
      setTravelers({
        type: 'FeatureCollection',
        features: ARCS_PTS.map((pts, i) => {
          const p = ((tick * 0.014) + i * 0.13) % 1;
          const idx = Math.floor(p * (pts.length - 1));
          return { type: 'Feature', geometry: { type: 'Point', coordinates: pts[idx] }, properties: {} };
        }),
      });
    }, 90);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <Mapbox.ShapeSource id="live-travelers" shape={travelers}>
        <Mapbox.CircleLayer id="live-traveler-glow" style={{ circleColor: 'rgba(120,210,255,0.55)', circleRadius: 7, circleBlur: 1 }} />
        <Mapbox.CircleLayer id="live-traveler-core" style={{ circleColor: 'rgb(230,248,255)', circleRadius: 2.4, circleBlur: 0.1 }} />
      </Mapbox.ShapeSource>
      <Mapbox.ShapeSource id="live-pings" shape={pings}>
        <Mapbox.CircleLayer id="live-ping-ring" style={{ circleColor: 'rgba(0,0,0,0)', circleRadius: ['get', 'r'], circleStrokeColor: 'rgb(255,120,90)', circleStrokeWidth: 1.6, circleStrokeOpacity: ['get', 'o'] }} />
      </Mapbox.ShapeSource>
    </>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(12,12,14,0.9)', borderWidth: 1, borderColor: 'rgba(218,37,29,0.6)', paddingLeft: 6, paddingRight: 4, paddingVertical: 3.5, borderRadius: 11 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#DA251D' },
  text: { color: '#fff', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.1 },
  stem: { width: 1, height: 7, backgroundColor: 'rgba(255,255,255,0.45)' },
  pin: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#DA251D', borderWidth: 1, borderColor: '#fff' },
});

// Live stats ticker (checks + scouts) — own component so its ticker doesn't
// re-render the heavy home screen. Sits just above the bottom sheet.
function LiveStatsHud({ top }: { top: number }) {
  const [checks, setChecks] = useState(12480);
  const [scouts, setScouts] = useState(847);
  useEffect(() => {
    const id = setInterval(() => {
      setChecks((c) => c + 1 + Math.floor(Math.random() * 3));
      setScouts((s) => Math.max(780, Math.min(999, s + (Math.floor(Math.random() * 7) - 3))));
    }, 900);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={[liveHudStyles.row, { top }]} pointerEvents="none">
      <View style={liveHudStyles.chip}>
        <View style={liveHudStyles.dot} />
        <Text style={liveHudStyles.num}>{checks.toLocaleString()}</Text>
        <Text style={liveHudStyles.label}>CHECKS TODAY</Text>
      </View>
      <View style={liveHudStyles.chip}>
        <View style={[liveHudStyles.dot, { backgroundColor: '#16A34A' }]} />
        <Text style={liveHudStyles.num}>{scouts}</Text>
        <Text style={liveHudStyles.label}>SCOUTS ONLINE</Text>
      </View>
    </View>
  );
}
const liveHudStyles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DA251D' },
  num: { color: '#fff', fontSize: 13, fontFamily: 'JetBrainsMono_700Bold', letterSpacing: 0.4 },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: 8.5, letterSpacing: 1.1, fontWeight: '700' },
});

// Rough continental-US outline — we tint our home market in a faint brand red so
// America glows warmer than the rest of the world (the "this is where we are" cue).
const US_HIGHLIGHT_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [{
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [-124.5, 48.4], [-124, 40.5], [-120, 34.5], [-117, 32.6], [-111, 31.3], [-106, 31.8],
        [-103, 29], [-99, 27], [-97, 26], [-93.5, 29.7], [-89, 29], [-84.5, 30], [-81, 25.2],
        [-80.2, 26.5], [-80.5, 32], [-75.5, 35], [-73.9, 40.7], [-70, 43], [-67, 45], [-71, 45],
        [-77, 44], [-83, 45.5], [-88, 47.5], [-95, 49], [-104, 49], [-117, 49], [-123, 48.5], [-124.5, 48.4],
      ]],
    },
  }],
};

// Decorative bright stars scattered in the black space around the globe — the
// Mapbox atmosphere stars are maxed at intensity 1, so these add the extra pop.
const STARS: { x: string; y: string; s: number; o: number }[] = [
  { x: '6%', y: '4%', s: 2.2, o: 0.95 }, { x: '18%', y: '9%', s: 1.4, o: 0.7 },
  { x: '30%', y: '3%', s: 1.7, o: 0.85 }, { x: '44%', y: '6%', s: 1.2, o: 0.6 },
  { x: '58%', y: '4%', s: 2.2, o: 0.95 }, { x: '72%', y: '8%', s: 1.5, o: 0.75 },
  { x: '86%', y: '5%', s: 2, o: 0.9 }, { x: '94%', y: '11%', s: 1.4, o: 0.7 },
  { x: '4%', y: '17%', s: 1.7, o: 0.85 }, { x: '11%', y: '25%', s: 2.4, o: 0.95 },
  { x: '92%', y: '18%', s: 2.2, o: 0.95 }, { x: '88%', y: '28%', s: 1.4, o: 0.7 },
  { x: '3%', y: '31%', s: 1.6, o: 0.8 }, { x: '96%', y: '35%', s: 1.8, o: 0.85 },
  { x: '9%', y: '39%', s: 1.4, o: 0.65 }, { x: '90%', y: '44%', s: 1.6, o: 0.75 },
  { x: '50%', y: '2%', s: 1.5, o: 0.75 }, { x: '38%', y: '10%', s: 1.2, o: 0.55 },
  { x: '66%', y: '11%', s: 1.4, o: 0.65 }, { x: '80%', y: '15%', s: 1.7, o: 0.85 },
  { x: '24%', y: '14%', s: 1.3, o: 0.6 }, { x: '6%', y: '47%', s: 1.7, o: 0.8 },
  { x: '95%', y: '50%', s: 1.4, o: 0.65 }, { x: '15%', y: '6%', s: 1.2, o: 0.55 },
];
function StarField() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((st, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: st.x as unknown as number,
            top: st.y as unknown as number,
            width: st.s,
            height: st.s,
            borderRadius: st.s / 2,
            backgroundColor: '#fff',
            opacity: st.o,
            shadowColor: '#fff',
            shadowOpacity: 0.9,
            shadowRadius: 2.5,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ))}
    </View>
  );
}

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

// Scatter warm "streetlight / car light" points around a spot — the city-lights
// look at street level, shown when a location is dived into.
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

// ── SearchOverlay ─────────────────────────────────────────────────────────────
// Slide-up Modal: search bar pinned at top, results fill the space above the
// keyboard, no black void, no flicker. Results persist through debounce — only
// a small spinner in the bar indicates a fetch is in-flight. The list only
// replaces when new data arrives.

type SearchOverlayProps = {
  visible: boolean;
  marketCenter: [number, number];
  recents: { name: string; city: string; ts: number }[];
  saved: { id: string; name: string; coord: [number, number]; marketId: string }[];
  onClose: () => void;
  onSelect: (coord: [number, number], name: string) => void;
};

function SearchOverlay({
  visible,
  marketCenter,
  recents,
  saved,
  onClose,
  onSelect,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  // Stable list: never cleared to empty during a debounce cycle — only replaced
  // when new results arrive. This is what prevents the flicker.
  const [stableResults, setStableResults] = useState<PlaceSuggestion[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'no-results' | 'unavailable'>('idle');
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  // ── Voice search state ────────────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const micPulse = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  // Beep sound — loaded once when SearchOverlay mounts, played before each recognition session
  const beepPlayer = useAudioPlayer(require('../../assets/sounds/voice-start.wav'));

  // Pulse animation — plays while listening
  useEffect(() => {
    if (listening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(micPulse, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      micPulse.setValue(0);
    }
  }, [listening, micPulse]);

  // ── expo-speech-recognition event wiring ─────────────────────────────────
  // Partial results — feed live transcript into query so Places search streams in
  useSpeechRecognitionEvent('result', (ev) => {
    const transcript = ev.results?.[0]?.transcript ?? '';
    if (transcript) {
      setVoiceTranscript(transcript);
      setQuery(transcript);
    }
    // isFinal: true means the user finished speaking a complete phrase.
    // Stop recognition now so continuous mode doesn't keep waiting indefinitely.
    if (ev.isFinal) {
      ExpoSpeechRecognitionModule.stop();
      setListening(false);
      setVoiceTranscript('');
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setVoiceTranscript('');
  });

  useSpeechRecognitionEvent('error', (ev) => {
    setListening(false);
    setVoiceTranscript('');
    // 'no-speech' is benign (user didn't speak); suppress the alert for it
    if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
      Alert.alert('Voice search error', 'Could not understand. Please try again.');
    }
  });

  // Start voice recognition — voicemail style: haptic + beep FIRST, then record
  const handleMicPress = async () => {
    if (listening) {
      // Tap mic again while listening → stop immediately
      ExpoSpeechRecognitionModule.stop();
      setListening(false);
      setVoiceTranscript('');
      return;
    }

    const { granted, canAskAgain } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      if (!canAskAgain) {
        Alert.alert(
          'Microphone permission required',
          'Voice search needs microphone access. Go to Settings > Let Me Check > Microphone and turn it on.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    // Dismiss keyboard so the listening UI has space
    Keyboard.dismiss();
    setVoiceTranscript('');
    setQuery('');

    // 1. Haptic — immediate tactile "go" signal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // 2. Beep — audible "speak now" cue (voicemail style)
    try {
      beepPlayer.seekTo(0);
      beepPlayer.play();
    } catch {
      // If playback fails (silent mode, simulator, etc.) just continue
    }

    // 3. Tiny delay — just the chime's attack plays before the mic opens; the quiet
    //    tail rings out while listening (a musical tone isn't transcribed as speech).
    await new Promise<void>((resolve) => setTimeout(resolve, 70));

    // 4. Now arm the microphone — user hears beep, then speaks
    setListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,    // partial results stream into query while speaking
      maxAlternatives: 1,
      continuous: false,       // auto-stop when the user stops talking — no manual tap
      // Force Apple's SERVER recognition instead of the on-device engine — markedly
      // more accurate for place/proper nouns like "Soho House" (on-device was
      // mis-hearing them and taking many tries).
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,  // clean search text, no trailing punctuation
    });
  };

  // Reset state each time the overlay opens; stop any in-progress recognition on close
  useEffect(() => {
    if (visible) {
      setQuery('');
      setStableResults([]);
      setSearchStatus('idle');
      setResolving(false);
      setLocating(false);
      setListening(false);
      setVoiceTranscript('');
    } else {
      // Overlay closing — stop recognition if still running
      if (listening) {
        ExpoSpeechRecognitionModule.abort();
        setListening(false);
        setVoiceTranscript('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Rotate placeholder hints when idle
  useEffect(() => {
    if (query.length > 0) return;
    const t = setInterval(() => {
      setHintIdx((i) => (i + 1) % PLACEHOLDER_HINTS.length);
    }, 3500);
    return () => clearInterval(t);
  }, [query]);

  // Debounced autocomplete — no-flicker: keep stableResults visible while fetching
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      // Query cleared — go back to idle, keep stableResults to avoid flash
      setSearchStatus('idle');
      setStableResults([]);
      return;
    }

    // Mark loading but DO NOT clear stableResults — prior list stays visible
    setSearchStatus('loading');

    debounceRef.current = setTimeout(async () => {
      const biasCoord = (getUserCoords() ?? marketCenter) as [number, number];
      const outcome = await searchPlaces(trimmed, { locationBias: biasCoord });

      if (outcome.unavailable) {
        setSearchStatus('unavailable');
        // Keep stableResults as-is so the user sees something
        return;
      }
      if (outcome.results.length === 0) {
        setSearchStatus('no-results');
        setStableResults([]);
        return;
      }
      // New results arrived — replace the stable list now
      setStableResults(outcome.results);
      setSearchStatus('idle');
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, marketCenter]);

  const handleSelect = useCallback(async (suggestion: PlaceSuggestion) => {
    Keyboard.dismiss();
    setResolving(true);
    try {
      const coords = await getPlaceCoords(suggestion.placeId);
      const name = suggestion.primaryText;
      let appCoord: [number, number];
      if (coords) {
        appCoord = placeToAppCoord(coords);
      } else {
        appCoord = marketCenter;
      }
      const resolved = nearestLiveMarket(appCoord);
      addRecent({ name, city: resolved.market.name });
      onClose();
      onSelect(appCoord, name);
    } finally {
      setResolving(false);
    }
  }, [marketCenter, onClose, onSelect]);

  const handleSelectSaved = useCallback((item: { name: string; coord: [number, number]; marketId: string }) => {
    Keyboard.dismiss();
    const resolved = nearestLiveMarket(item.coord);
    addRecent({ name: item.name, city: resolved.market.name });
    onClose();
    onSelect(item.coord, item.name);
  }, [onClose, onSelect]);

  // "Check where I am right now" — request GPS, resolve to real coords, close + pin
  const handleCheckHere = useCallback(async () => {
    setLocating(true);
    try {
      const { coords } = await requestUserLocation();
      if (coords) {
        const resolved = nearestLiveMarket(coords);
        addRecent({ name: 'My current location', city: resolved.market.name });
        onClose();
        onSelect(coords, 'My current location');
      }
    } finally {
      setLocating(false);
    }
  }, [onClose, onSelect]);

  const handleUnavailableFallback = useCallback(() => {
    const name = query.trim();
    if (!name) return;
    addRecent({ name, city: '' });
    onClose();
    onSelect(marketCenter, name);
  }, [query, marketCenter, onClose, onSelect]);

  const showIdle = query.trim().length === 0;
  const isLoading = searchStatus === 'loading' || resolving;

  // FlatList data: results when we have them, recents/saved when idle
  type ListItem =
    | { type: 'check-here' }
    | { type: 'suggestion'; data: PlaceSuggestion }
    | { type: 'recent'; data: { name: string; city: string; ts: number } }
    | { type: 'saved'; data: { id: string; name: string; coord: [number, number]; marketId: string } }
    | { type: 'section'; label: string }
    | { type: 'empty-saved' }
    | { type: 'no-results'; query: string }
    | { type: 'unavailable'; query: string }
    | { type: 'prompt' };

  const listItems: ListItem[] = (() => {
    if (showIdle) {
      const items: ListItem[] = [{ type: 'check-here' }];
      if (recents.length > 0) {
        items.push({ type: 'section', label: 'RECENT' });
        recents.slice(0, 5).forEach((r) => items.push({ type: 'recent', data: r }));
      }
      items.push({ type: 'section', label: 'SAVED PLACES' });
      if (saved.length > 0) {
        saved.forEach((s) => items.push({ type: 'saved', data: s }));
      } else {
        items.push({ type: 'empty-saved' });
      }
      return items;
    }

    if (searchStatus === 'no-results') {
      return [{ type: 'no-results', query: query.trim() }];
    }

    if (searchStatus === 'unavailable') {
      return [{ type: 'unavailable', query: query.trim() }];
    }

    // results or loading — show stableResults (no flicker)
    if (stableResults.length > 0) {
      const items: ListItem[] = [{ type: 'section', label: 'SUGGESTIONS' }];
      stableResults.forEach((s) => items.push({ type: 'suggestion', data: s }));
      return items;
    }

    // loading with no prior results yet — show prompt
    return [{ type: 'prompt' }];
  })();

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'check-here') {
      return (
        <TouchableOpacity
          style={overlayStyles.checkHereRow}
          activeOpacity={0.78}
          onPress={handleCheckHere}
          disabled={locating}
        >
          <View style={overlayStyles.checkHereIconWrap}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.onRed} />
            ) : (
              <Ionicons name="location-outline" size={18} color={colors.onRed} />
            )}
          </View>
          <View style={overlayStyles.checkHereTextWrap}>
            <Text style={overlayStyles.checkHereName}>Check where I am right now</Text>
            <Text style={overlayStyles.checkHereSub}>Use my current location</Text>
          </View>
          <Text style={overlayStyles.checkHereArrow}>›</Text>
        </TouchableOpacity>
      );
    }
    if (item.type === 'prompt') {
      return (
        <View style={overlayStyles.promptWrap}>
          <Text style={overlayStyles.promptText}>Search any place, any address</Text>
          <Text style={overlayStyles.promptSub}>DMV lines, airports, restaurants, venues, hotels</Text>
        </View>
      );
    }
    if (item.type === 'section') {
      return <Text style={overlayStyles.sectionLabel}>{item.label}</Text>;
    }
    if (item.type === 'suggestion') {
      const s = item.data;
      return (
        <TouchableOpacity
          style={overlayStyles.resultRow}
          activeOpacity={0.75}
          onPress={() => handleSelect(s)}
        >
          <View style={[overlayStyles.resultIconWrap, overlayStyles.resultIconWrapRed]}>
            <Ionicons name="location-outline" size={16} color={colors.red} />
          </View>
          <View style={overlayStyles.resultTextWrap}>
            <Text style={overlayStyles.resultName} numberOfLines={1}>{s.primaryText}</Text>
            <Text style={overlayStyles.resultAddress} numberOfLines={1}>{s.secondaryText}</Text>
            <Text style={overlayStyles.priceChip}>$15 · ~10 min</Text>
          </View>
          <Text style={overlayStyles.resultArrow}>›</Text>
        </TouchableOpacity>
      );
    }
    if (item.type === 'recent') {
      const r = item.data;
      return (
        <TouchableOpacity
          style={overlayStyles.resultRow}
          activeOpacity={0.75}
          onPress={async () => {
            // Recents have no stored coord — try to re-resolve via Places API;
            // fall back to market center if unavailable (no key or network error).
            Keyboard.dismiss();
            setResolving(true);
            try {
              const outcome = await searchPlaces(r.name, {
                locationBias: (getUserCoords() ?? marketCenter) as [number, number],
              });
              if (!outcome.unavailable && outcome.results.length > 0) {
                const coords = await getPlaceCoords(outcome.results[0].placeId);
                const appCoord = coords ? placeToAppCoord(coords) : marketCenter;
                addRecent({ name: r.name, city: r.city });
                onClose();
                onSelect(appCoord as [number, number], r.name);
              } else {
                // No Places key or zero results — fall back to market center
                addRecent({ name: r.name, city: r.city });
                onClose();
                onSelect(marketCenter, r.name);
              }
            } finally {
              setResolving(false);
            }
          }}
        >
          <View style={[overlayStyles.resultIconWrap, overlayStyles.resultIconWrapRed]}>
            <Ionicons name="time-outline" size={16} color={colors.red} />
          </View>
          <View style={overlayStyles.resultTextWrap}>
            <Text style={overlayStyles.resultName}>{r.name}</Text>
            <Text style={overlayStyles.resultAddress}>{r.city} · {relativeTime(r.ts)}</Text>
          </View>
          <Text style={overlayStyles.resultArrow}>›</Text>
        </TouchableOpacity>
      );
    }
    if (item.type === 'saved') {
      const p = item.data;
      return (
        <TouchableOpacity
          style={overlayStyles.resultRow}
          activeOpacity={0.75}
          onPress={() => handleSelectSaved(p)}
        >
          <View style={[overlayStyles.resultIconWrap, overlayStyles.resultIconWrapRed]}>
            <Ionicons name="bookmark-outline" size={16} color={colors.red} />
          </View>
          <View style={overlayStyles.resultTextWrap}>
            <Text style={overlayStyles.resultName}>{p.name}</Text>
          </View>
          <Text style={overlayStyles.resultArrow}>›</Text>
        </TouchableOpacity>
      );
    }
    if (item.type === 'empty-saved') {
      return (
        <View style={overlayStyles.emptySaved}>
          <Text style={overlayStyles.emptySavedTitle}>No saved places yet</Text>
          <Text style={overlayStyles.emptySavedSub}>
            Search any place above, or tap the bookmark after a check to save it here.
          </Text>
        </View>
      );
    }
    if (item.type === 'no-results') {
      return (
        <View style={overlayStyles.feedbackWrap}>
          <Text style={overlayStyles.feedbackSub}>
            No places found for "{item.query}". Try a different name or address.
          </Text>
        </View>
      );
    }
    if (item.type === 'unavailable') {
      return (
        <View style={overlayStyles.feedbackWrap}>
          <Text style={overlayStyles.feedbackTitle}>Search not available</Text>
          <Text style={overlayStyles.feedbackSub}>
            Live place search needs a Google Places key. Tap below to check any location by name.
          </Text>
          <TouchableOpacity
            style={overlayStyles.resultRow}
            activeOpacity={0.75}
            onPress={handleUnavailableFallback}
          >
            <View style={[overlayStyles.resultIconWrap, overlayStyles.resultIconWrapRed]}>
              <Ionicons name="search" size={16} color={colors.red} />
            </View>
            <View style={overlayStyles.resultTextWrap}>
              <Text style={overlayStyles.resultName}>{item.query}</Text>
              <Text style={overlayStyles.resultAddress}>Check this location</Text>
            </View>
            <Text style={overlayStyles.resultArrow}>›</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={overlayStyles.container}>
        <SafeAreaView style={overlayStyles.safeArea}>
          {/* Top bar: Cancel + search input */}
          <View style={overlayStyles.topBar}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={overlayStyles.cancelBtn}
            >
              <Text style={overlayStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={overlayStyles.inputWrap}>
              <Ionicons name="search" size={15} color={colors.textTertiary} />
              <TextInput
                ref={inputRef}
                style={overlayStyles.input}
                placeholder={PLACEHOLDER_HINTS[hintIdx]}
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {isLoading && !listening ? (
                <ActivityIndicator size="small" color={colors.red} style={overlayStyles.spinner} />
              ) : query.length > 0 && !listening ? (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={overlayStyles.clearIcon}>✕</Text>
                </TouchableOpacity>
              ) : null}
              {/* Mic button — always visible when not loading or when listening */}
              {(!isLoading || listening) && (
                <TouchableOpacity
                  onPress={handleMicPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[overlayStyles.micBtn, listening && overlayStyles.micBtnActive]}
                >
                  <Animated.View style={listening ? { opacity: micPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) } : undefined}>
                    <Ionicons
                      name={listening ? 'stop' : 'mic-outline'}
                      size={15}
                      color={listening ? colors.red : colors.red}
                    />
                  </Animated.View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Listening banner — live transcript below the search bar */}
          {listening && (
            <View style={overlayStyles.listeningBanner}>
              <Animated.View
                style={[
                  overlayStyles.listeningDot,
                  { opacity: micPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                ]}
              />
              <Text style={overlayStyles.listeningText} numberOfLines={1}>
                {voiceTranscript ? voiceTranscript : 'Speak now'}
              </Text>
              <TouchableOpacity
                onPress={handleMicPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={overlayStyles.listeningStop}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Results list — sits between bar and keyboard, never hidden */}
          <FlatList
            data={listItems}
            keyExtractor={(item, index) => {
              if (item.type === 'suggestion') return `s-${item.data.placeId}`;
              if (item.type === 'recent') return `r-${item.data.name}-${item.data.ts}`;
              if (item.type === 'saved') return `sv-${item.data.id}`;
              return `${item.type}-${index}`;
            }}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={overlayStyles.listContent}
            style={overlayStyles.list}
          />
        </SafeAreaView>

      </View>
    </Modal>
  );
}

// ── overlayStyles ─────────────────────────────────────────────────────────────
const overlayStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelBtn: {
    paddingVertical: 4,
  },
  cancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.red,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  inputIcon: { /* replaced by Ionicons search */ },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  spinner: { marginHorizontal: 2 },
  clearIcon: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  micBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnActive: {
    backgroundColor: 'rgba(218,37,29,0.10)',
    borderWidth: 1,
    borderColor: colors.red,
  },
  micIcon: { /* replaced by Ionicons mic-outline/stop */ },
  micIconActive: { /* replaced by Ionicons */ },
  // Listening banner — shown below search bar while STT is active
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'rgba(218,37,29,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(218,37,29,0.15)',
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    flexShrink: 0,
  },
  listeningText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  listeningStop: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.red,
    paddingHorizontal: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 3,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    textTransform: 'uppercase',
  },
  promptWrap: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  promptText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  promptSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIconWrapRed: {
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderColor: 'rgba(218,37,29,0.15)',
  },
  resultPin: { /* replaced by Ionicons */ },
  resultTextWrap: { flex: 1 },
  resultName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  resultAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  priceChip: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.red,
    letterSpacing: 0.4,
  },
  resultArrow: {
    fontSize: 22,
    color: colors.red,
    fontFamily: 'Inter_500Medium',
  },
  feedbackWrap: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  feedbackTitle: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  feedbackSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  emptySaved: {
    marginHorizontal: 20,
    marginTop: 4,
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptySavedTitle: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  emptySavedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  // "Check where I am right now" — primary shortcut row at top of idle state
  checkHereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.red,
    gap: 14,
  },
  checkHereIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkHerePin: { /* replaced by Ionicons location-outline */ },
  checkHereTextWrap: { flex: 1 },
  checkHereName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.onRed,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  checkHereSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  checkHereArrow: {
    fontSize: 22,
    color: colors.onRed,
    fontFamily: 'Inter_500Medium',
  },
});

// ── RequestSheet ──────────────────────────────────────────────────────────────
// Shown in the bottom sheet when a pin is dropped. Replaces the old two-step
// "IS THIS YOUR SPOT? YES → venue screen" with a single inline sheet.

type RequestSheetProps = {
  pinName: string | null;
  market: Market;
  isPartner: boolean;
  onCancel: () => void;
  onRequest: (params: {
    venue: string;
    city: string;
    tier: 'standard' | 'priority';
    price: string;
    time: string;
    interior: string;
  }) => void;
};

function RequestSheet({ pinName, market, isPartner, onCancel, onRequest }: RequestSheetProps) {
  const [selectedTier, setSelectedTier] = useState<'standard' | 'priority'>('standard');
  const [interior, setInterior] = useState(false);

  const displayName = pinName || 'This location';
  const basePrice = selectedTier === 'standard' ? 15 : 20;
  const interiorAdd = interior && isPartner ? 5 : 0;
  const totalPrice = basePrice + interiorAdd;
  const priceStr = `$${totalPrice}`;
  const timeStr = selectedTier === 'standard' ? '10 min' : '7 min';

  const handleRequest = () => {
    onRequest({
      venue: displayName,
      city: market.name,
      tier: selectedTier,
      price: priceStr,
      time: timeStr,
      interior: interior && isPartner ? '1' : '0',
    });
  };

  return (
    <View style={reqStyles.container}>
      {/* Place name + cancel */}
      <View style={reqStyles.header}>
        <View style={reqStyles.headerLeft}>
          <Text style={reqStyles.placeName} numberOfLines={1}>{displayName}</Text>
          <Text style={reqStyles.placeCity}>{market.name}</Text>
        </View>
        <TouchableOpacity
          style={reqStyles.cancelBtn}
          onPress={onCancel}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={reqStyles.cancelGlyph}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Tier selector */}
      <Text style={reqStyles.sectionLabel}>SELECT TIER</Text>
      <View style={reqStyles.tierRow}>
        {/* Standard */}
        <TouchableOpacity
          style={[reqStyles.tierCard, selectedTier === 'standard' && reqStyles.tierCardActive]}
          onPress={() => setSelectedTier('standard')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#A2A6B1', '#70737D', '#44464E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
          />
          <Text style={reqStyles.tierLabel}>Standard</Text>
          <Text style={reqStyles.tierPrice}>$15</Text>
          <Text style={reqStyles.tierTime}>~10 min</Text>
          {selectedTier === 'standard' && (
            <View style={reqStyles.selectedBadge}>
              <Text style={reqStyles.selectedBadgeText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Priority */}
        <TouchableOpacity
          style={[reqStyles.tierCard, selectedTier === 'priority' && reqStyles.tierCardPriorityActive]}
          onPress={() => setSelectedTier('priority')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#A2A6B1', '#70737D', '#44464E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
          />
          <View style={reqStyles.priorityBadge}>
            <Text style={reqStyles.priorityBadgeText}>PRIORITY</Text>
          </View>
          <Text style={reqStyles.tierLabel}>Priority</Text>
          <Text style={reqStyles.tierPrice}>$20</Text>
          <Text style={reqStyles.tierTime}>~7 min</Text>
          {selectedTier === 'priority' && (
            <View style={[reqStyles.selectedBadge, reqStyles.selectedBadgeAmber]}>
              <Text style={reqStyles.selectedBadgeText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Interior add-on — always shown so the sheet is identical on every spot. */}
      <TouchableOpacity
        style={[reqStyles.interiorCard, interior && reqStyles.interiorCardActive]}
        activeOpacity={0.85}
        onPress={() => setInterior(!interior)}
      >
        <LinearGradient
          colors={['#A2A6B1', '#70737D', '#44464E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
        />
        <View style={[reqStyles.interiorCheck, interior && reqStyles.interiorCheckActive]}>
          {interior && <Text style={reqStyles.interiorCheckGlyph}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={reqStyles.interiorEyebrow}>PARTNER VENUE</Text>
          <View style={reqStyles.interiorTitleRow}>
            <Text style={reqStyles.interiorTitle}>Include interior</Text>
            <Text style={reqStyles.interiorBadge}>+$5</Text>
          </View>
          <Text style={reqStyles.interiorSub}>30-sec video inside the venue</Text>
        </View>
      </TouchableOpacity>

      {/* Request check CTA */}
      <TouchableOpacity
        style={reqStyles.ctaBtn}
        onPress={handleRequest}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F1F1F4', '#DEDEE3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
        />
        <Text style={reqStyles.ctaBtnText}>{`REQUEST CHECK · ${priceStr}`}</Text>
      </TouchableOpacity>
    </View>
  );
}

const reqStyles = StyleSheet.create({
  container: {
    // Sits inside the light sheet — no extra background needed
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  headerLeft: { flex: 1 },
  placeName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  placeCity: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  cancelGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#44464E',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    minHeight: 84,
    // Keep the gradient corners clean, but don't clip the lift shadow.
    // Soft lift so the cards read as raised glass, not flat dark patches.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  tierCardActive: {
    borderColor: colors.white,
    borderWidth: 1.5,
  },
  tierCardPriorityActive: {
    borderColor: colors.red,
    borderWidth: 1.5,
  },
  priorityBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  priorityBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: colors.white,
    letterSpacing: 1,
  },
  tierLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.white,
    marginBottom: 4,
  },
  tierPrice: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 2,
  },
  tierTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeAmber: { backgroundColor: colors.red },
  selectedBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.bg,
  },
  interiorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#44464E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    // Same lift as the tier cards so all three cards share one material.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  interiorCardActive: {
    borderColor: colors.white,
    borderWidth: 1.5,
  },
  interiorCardMuted: {
    opacity: 0.55,
  },
  interiorCheck: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  interiorCheckActive: { backgroundColor: colors.red, borderColor: colors.red },
  interiorCheckGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onRed,
  },
  interiorEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 3,
  },
  interiorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  interiorTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.white,
  },
  interiorBadge: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: colors.white,
  },
  interiorSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  ctaBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  ctaBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#141414',
    letterSpacing: 1.5,
  },
});

// ── HomeScreen ────────────────────────────────────────────────────────────────

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
  // Auto-rotation state: spinCenter tracks the globe's current [lon,lat]; while the
  // user is actively dragging (interactingRef) the spin pauses so manual spin works.
  const spinCenter = useRef<[number, number] | null>(null);
  const interactingRef = useRef(false);
  const interactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive globe: it sits centered in the clear band ABOVE the bottom sheet.
  // We MEASURE the sheet's real height (it grows with recent/saved rows) and the
  // top chrome, then size + center the globe in whatever space is left — so on
  // ANY iPhone, with ANY amount of content in the sheet, the globe is centered
  // and never covered by the panel.
  const { height: winH } = useWindowDimensions();
  const [sheetH, setSheetH] = useState(0);
  const topInset = Math.round(winH * 0.12); // status bar + top pills + banner room
  // +44 clears the globe's OUTER GLOW (the atmosphere halo extends past the sphere),
  // not just the sphere edge — otherwise the glow bleeds onto the sheet.
  const bottomInset = sheetH > 0 ? sheetH + 44 : Math.round(winH * 0.38);
  const band = Math.max(180, winH - topInset - bottomInset);
  // Divisor > band keeps the sphere comfortably inside the band so the glow has
  // room; the low min lets it shrink enough when the sheet is tall (many recents).
  const globeZoom = Math.min(0.92, Math.max(0.5, band / 540));
  const globePad = {
    paddingTop: topInset,
    paddingBottom: bottomInset,
    paddingLeft: 0,
    paddingRight: 0,
  };

  const [scoutShape, setScoutShape] = useState(() => scoutsToGeoJSON(demo?.scouts ?? []));
  const [liveCoords, setLiveCoords] = useState<[number, number][]>(demo?.liveScouts ?? []);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(MIAMI_CENTER);
  const [currentZoom, setCurrentZoom] = useState<number>(MIAMI_ZOOM);
  const [droppedPin, setDroppedPin] = useState<[number, number] | null>(null);
  const [pinName, setPinName] = useState<string | null>(null);
  const saved = useSavedPlaces();
  const recents = useRecents();

  // ── Search overlay state ──────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  // Live city chips visible on the front-facing hemisphere of the teaser globe.
  // Opens on the NY/Miami launch view — show the Atlantic-facing chips right away.
  const [visibleChips, setVisibleChips] = useState<string[]>(['mia', 'nyc', 'lax', 'las', 'lon', 'par']);
  const visibleChipsRef = useRef<string[]>(['mia', 'nyc', 'lax', 'las', 'lon', 'par']);

  // When marketId changes → re-orient the globe teaser to that market (stay on
  // the full globe at the same centered position; never dive into a city here).
  useEffect(() => {
    if (!params.pinLat && !params.pinLon) {
      cameraRef.current?.setCamera({
        centerCoordinate: market.center,
        zoomLevel: globeZoom,
        pitch: 0,
        padding: globePad,
        animationDuration: 1200,
        animationMode: 'flyTo',
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
          padding: globePad,
          animationDuration: 2200,
          animationMode: 'flyTo',
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
      // Keep the auto-spin origin synced to wherever the map is now, so a manual
      // drag/spin is never fought and the rotation resumes from the new position.
      spinCenter.current = [center[0], center[1]];
      // Show only the city chips on the visible front hemisphere.
      const vis = CHIP_CITIES.filter((ct) => angularDistanceDeg(ct.coord, [center[0], center[1]]) < 62).map((ct) => ct.id);
      if (vis.join(',') !== visibleChipsRef.current.join(',')) {
        visibleChipsRef.current = vis;
        setVisibleChips(vis);
      }
    }
    if (typeof zoom === 'number') {
      setCurrentZoom(zoom);
    }
    // Pause the auto-rotation while the user is actively gesturing (drag to spin).
    if (e?.gestures?.isGestureActive) {
      interactingRef.current = true;
      if (interactTimer.current) clearTimeout(interactTimer.current);
      interactTimer.current = setTimeout(() => { interactingRef.current = false; }, 1200);
    }
  };

  // On first load, centre the map on the user's REAL location (captured at the
  // permission step — GPS, or IP-approximated, or manually chosen). We ALWAYS
  // show their actual place; we never fall back to a default city. When they're
  // outside a live market they still see where they are, plus a waitlist banner.
  // Skips when arriving via an explicit pin/search so we don't override it.
  useEffect(() => {
    if (params.pinLat || params.marketId) return;
    // Always open the globe oriented on the NY/Miami launch market (the hero shot).
    setCurrentCenter(LAUNCH_CENTER);
    cameraRef.current?.setCamera({
      centerCoordinate: LAUNCH_CENTER,
      zoomLevel: globeZoom,
      pitch: 0,
      padding: globePad,
      animationDuration: 1200,
      animationMode: 'flyTo',
    });
  }, [params.pinLat, params.marketId, userCoords]);

  // Re-center the globe whenever the sheet's measured height or the screen size
  // changes, so it always sits centered in the clear band above the sheet.
  useEffect(() => {
    // A dropped pin (tier sheet) has priority: re-center the zoomed-in venue in
    // the band ABOVE its box once the box measures, so the pin isn't hidden.
    if (droppedPin) {
      cameraRef.current?.setCamera({
        centerCoordinate: droppedPin,
        zoomLevel: 17,
        pitch: 55,
        padding: globePad,
        animationDuration: 400,
        animationMode: 'flyTo',
      });
      return;
    }
    if (params.pinLat || params.marketId) return;
    cameraRef.current?.setCamera({
      centerCoordinate: LAUNCH_CENTER,
      zoomLevel: globeZoom,
      pitch: 0,
      padding: globePad,
      animationDuration: 500,
      animationMode: 'flyTo',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetH, winH]);

  // Slow, cinematic auto-rotation of the teaser globe — the "wow" moment. Gently
  // spins east while resting on the full globe; stops the instant a location is
  // chosen (droppedPin) so the dive-in and tier sheet are never disturbed.
  useEffect(() => {
    if (droppedPin || params.pinLat || params.marketId) return;
    if (spinCenter.current === null) {
      spinCenter.current = [LAUNCH_CENTER[0], LAUNCH_CENTER[1]];
    }
    const id = setInterval(() => {
      // Paused while the user is dragging the globe (manual spin wins).
      if (interactingRef.current || spinCenter.current === null) return;
      let lon = spinCenter.current[0] + 0.26; // another notch faster (~4°/sec)
      if (lon > 180) lon -= 360;
      spinCenter.current = [lon, spinCenter.current[1]];
      cameraRef.current?.setCamera({
        centerCoordinate: spinCenter.current,
        zoomLevel: globeZoom,
        pitch: 0,
        padding: globePad,
        animationDuration: 100,
        animationMode: 'linear',
      });
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedPin, params.pinLat, params.marketId, sheetH, winH]);

  // If no coords are resolved yet when home mounts, request location now so
  // the pill shows the user's real city instead of "Set your location".
  // This handles the case where onboarding was skipped or state was cleared.
  useEffect(() => {
    if (params.pinLat || params.marketId) return;
    if (getUserCoords()) return; // already resolved — nothing to do
    requestUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Callback from SearchOverlay: close overlay, drop pin, then run a cinematic
  // two-step camera move — the globe SPINS to bring the location to centre
  // (staying zoomed out), then DIVES down into the exact spot (Snap Map style).
  const handleOverlaySelect = useCallback((appCoord: [number, number], name: string) => {
    const [lon, lat] = appCoord;
    setDroppedPin([lon, lat]);
    setPinName(name);
    // Haptic "whoosh" ramp as the globe dives in (felt on a real device).
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 1600);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 3600);
    // Step 1 — spin the globe so the target rotates to the middle.
    cameraRef.current?.setCamera({
      centerCoordinate: [lon, lat],
      zoomLevel: 2.6,
      pitch: 0,
      animationDuration: 1600,
      animationMode: 'flyTo',
    });
    // Step 2 — dive down into the location once the spin lands.
    setTimeout(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: [lon, lat],
        zoomLevel: 17,
        pitch: 55,
        padding: globePad,
        animationDuration: 2200,
        animationMode: 'flyTo',
      });
    }, 1550);
  }, []);

  // Is the user outside every live market? Drives the honest "not live yet" banner.
  // userCoords + coverage are computed at the top of the component (before marketId
  // derivation) — no re-declaration here.
  const usingRealLocation = !params.marketId && !params.pinLat && !!userCoords;
  // Teaser globe = zoomed all the way out (no dropped pin). Demo market pins
  // (venue labels, scout dots, YOU/LIVE) only make sense once you've zoomed
  // into a spot, so hide them while resting on the full globe.
  const zoomedIn = !!params.pinLat;
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

      {/* Edge-to-edge map — REAL satellite Earth globe (photo-real land + ocean) */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/satellite-streets-v12"
        projection="globe"
        compassEnabled={false}
        scaleBarEnabled={false}
        logoEnabled
        attributionEnabled
        attributionPosition={{ bottom: 92, left: 8 }}
        logoPosition={{ bottom: 92, left: 8 }}
        onPress={handleMapPress}
        onCameraChanged={handleCameraChanged}
      >
        <Mapbox.Camera
          ref={cameraRef}
          // Cap at the sharpest satellite level so a deep zoom never blurs.
          maxZoomLevel={18.5}
          defaultSettings={{
            // Start on the right spot: a selected venue (pin) wins, otherwise the
            // globe always opens on the NY/Miami launch market (the hero shot).
            centerCoordinate:
              params.pinLat && params.pinLon
                ? [parseFloat(params.pinLon), parseFloat(params.pinLat)]
                : LAUNCH_CENTER,
            // Cold-load rests on the FULL globe (the teaser — a small round ball
            // in space); a selected pin skips straight to the place. The user
            // dives into their area by searching or tapping.
            zoomLevel: params.pinLat ? 16.5 : globeZoom,
            pitch: params.pinLat ? 50 : 0,
            // Center the globe in the clear band between the top pills and the sheet.
            padding: params.pinLat
              ? undefined
              : globePad,
          }}
        />

        {/* Space atmosphere — the glowing halo around the globe (the Snap Map look) */}
        <Mapbox.Atmosphere
          style={{
            color: 'rgb(80, 150, 255)',
            highColor: 'rgb(170, 210, 255)',
            horizonBlend: 0.10,
            spaceColor: 'rgb(0, 0, 0)',
            starIntensity: 1.0,
          }}
        />

        {/* Illuminated activity hotspots on the real Earth (glowing nodes). */}
        <Mapbox.ShapeSource id="globe-hotspots" shape={HOTSPOTS_GEOJSON}>
          {/* No heatmap — clean red/orange glowing nodes only (matches the demo). */}
          {/* Red-biased glow halo around each node. */}
          <Mapbox.CircleLayer
            id="globe-hotspots-glow"
            style={{
              circleColor: ['interpolate', ['linear'], ['get', 'intensity'],
                0.5, 'rgba(255,180,60,0.55)', 0.85, 'rgba(255,110,40,0.7)', 1, 'rgba(218,37,29,0.85)'],
              circleRadius: ['interpolate', ['linear'], ['zoom'],
                1, ['interpolate', ['linear'], ['get', 'intensity'], 0.5, 6, 1.35, 13],
                4, ['interpolate', ['linear'], ['get', 'intensity'], 0.5, 12, 1.35, 24]],
              circleBlur: 0.6,
              circleOpacity: 0.6,
            }}
          />
          {/* Sharp, warm core — the crisp, authentic hotspot point. */}
          <Mapbox.CircleLayer
            id="globe-hotspots-core"
            style={{
              circleColor: ['interpolate', ['linear'], ['get', 'intensity'],
                0.5, 'rgb(255,225,180)', 0.85, 'rgb(255,180,120)', 1, 'rgb(255,120,90)'],
              circleRadius: ['interpolate', ['linear'], ['zoom'],
                1, ['interpolate', ['linear'], ['get', 'intensity'], 0.5, 1.4, 1.35, 3],
                4, ['interpolate', ['linear'], ['get', 'intensity'], 0.5, 3, 1.35, 6]],
              circleBlur: 0.05,
              circleOpacity: 1,
            }}
          />
        </Mapbox.ShapeSource>

        {/* Soft warm city lights across the globe (the "small lights" / road-light
            detail) — glows in the dark regions the heatmap doesn't cover. */}
        <Mapbox.ShapeSource id="city-lights-src" shape={CITY_LIGHTS_GEOJSON}>
          {/* Soft outer halo — the warm glow bleeding off each cluster. */}
          <Mapbox.CircleLayer
            id="city-lights-glow"
            style={{
              circleColor: 'rgb(255, 205, 110)',
              circleRadius: ['interpolate', ['linear'], ['zoom'], 1, 4.5, 4, 11],
              circleOpacity: 0.3,
              circleBlur: 0.9,
            }}
          />
          {/* Bright warm core — a crisp, sharp point (minimal blur) so the lights
              read clean and defined, not soft/blurry. */}
          <Mapbox.CircleLayer
            id="city-lights-core"
            style={{
              circleColor: 'rgb(255, 244, 205)',
              circleRadius: ['interpolate', ['linear'], ['zoom'], 1, 1.3, 4, 2.4],
              circleOpacity: 1,
              circleBlur: 0.08,
            }}
          />
        </Mapbox.ShapeSource>

        {/* Glowing "global live network" arcs across the globe — the eyes-everywhere,
            all-connected story, and a futuristic HUD feel. Cyan complements the rim. */}
        <Mapbox.ShapeSource id="net-arcs-src" shape={ARCS_GEOJSON}>
          <Mapbox.LineLayer
            id="net-arcs-glow"
            style={{
              lineColor: 'rgba(90, 195, 255, 0.26)',
              lineWidth: ['interpolate', ['linear'], ['zoom'], 0.5, 2.6, 3, 4.5],
              lineBlur: 2.2,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Mapbox.LineLayer
            id="net-arcs-core"
            style={{
              lineColor: 'rgba(190, 232, 255, 0.6)',
              lineWidth: ['interpolate', ['linear'], ['zoom'], 0.5, 0.6, 3, 1.3],
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>

        {/* Live pings + traveling arc dots — isolated so home doesn't re-render. */}
        <LiveGlobeFx />

        {/* Brighten the stock place labels to white so cities/countries read crisply
            over the satellite imagery. (No land/water recolour — the real photo is the land.) */}
        <Mapbox.SymbolLayer id="continent-label" existing style={{ textColor: 'rgba(255,255,255,0.82)', textHaloColor: 'rgba(0,0,0,0.5)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="country-label" existing style={{ textColor: '#ffffff', textHaloColor: 'rgba(0,0,0,0.5)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="state-label" existing style={{ textColor: 'rgba(255,255,255,0.88)', textHaloColor: 'rgba(0,0,0,0.5)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="settlement-major-label" existing style={{ textColor: '#ffffff', textHaloColor: 'rgba(0,0,0,0.55)', textHaloWidth: 1.1 }} />
        <Mapbox.SymbolLayer id="settlement-minor-label" existing style={{ textColor: 'rgba(255,255,255,0.86)', textHaloColor: 'rgba(0,0,0,0.55)', textHaloWidth: 1 }} />
        <Mapbox.SymbolLayer id="settlement-subdivision-label" existing style={{ textColor: 'rgba(255,255,255,0.8)' }} />
        {/* Street-name labels — brighten to white so the zoomed-in location view
            is legible (SE 12th St, etc.) instead of the dim dark default. */}
        <Mapbox.SymbolLayer id="road-label" existing style={{ textColor: '#ffffff', textHaloColor: 'rgba(0,0,0,0.85)', textHaloWidth: 1.5 }} />
        <Mapbox.SymbolLayer id="poi-label" existing style={{ textColor: 'rgba(255,255,255,0.72)', textHaloColor: 'rgba(0,0,0,0.6)', textHaloWidth: 1 }} />

        {/* Hide the base satellite style's own building footprints/extrusions — those
            grey shapes were the "silhouettes" over the real rooftops on zoom-in. */}
        <Mapbox.FillLayer id="building" existing style={{ fillOpacity: 0 }} />
        <Mapbox.FillExtrusionLayer id="building-extrusion" existing style={{ visibility: 'none' }} />

        {/* No 3D building overlay — flat boxes hide the real rooftops. We keep the
            raw satellite photo (real rooftops) plus the real 3D terrain below. */}
        <Mapbox.RasterDemSource id="terrain-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1">
          <Mapbox.Terrain style={{ exaggeration: 1.3 }} />
        </Mapbox.RasterDemSource>

        {/* User location pin — real GPS, not the demo market centre */}
        {zoomedIn && usingRealLocation && userCoords && <UserPin coordinate={userCoords} />}
        {demo && droppedPin && (
          <>
            {demo.venues.map((v) => (
              <VenuePin key={v.name} name={v.name} coordinate={v.coord} />
            ))}
          </>
        )}

        {demo && droppedPin && (
          <>
            {/* Scout vision cones — HUD field-of-view */}
            <Mapbox.ShapeSource id="cones-src" shape={conesShape}>
              <Mapbox.FillLayer
                id="cones-fill"
                style={{
                  fillColor: colors.red,
                  fillOpacity: 0.12,
                }}
              />
            </Mapbox.ShapeSource>

            {/* Static Scout dots — visual proof of supply */}
            <Mapbox.ShapeSource id="scouts-src" shape={scoutShape}>
              <Mapbox.CircleLayer
                id="scouts-glow"
                style={{
                  circleColor: colors.red,
                  circleRadius: 9,
                  circleOpacity: 0.18,
                  circleBlur: 0.9,
                }}
              />
              <Mapbox.CircleLayer
                id="scouts-core"
                style={{
                  circleColor: colors.red,
                  circleRadius: 3,
                  circleStrokeColor: colors.white,
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

        {/* Warm street/car lights scattered around the dived-in location */}
        {droppedPin && (
          <Mapbox.ShapeSource id="street-lights-src" shape={streetLights(droppedPin)}>
            <Mapbox.CircleLayer id="street-lights-glow" style={{ circleColor: 'rgb(255,206,120)', circleRadius: 9, circleOpacity: 0.35, circleBlur: 1 }} />
            <Mapbox.CircleLayer id="street-lights-core" style={{ circleColor: 'rgb(255,234,180)', circleRadius: 2.6, circleOpacity: 0.95, circleBlur: 0.4 }} />
          </Mapbox.ShapeSource>
        )}

        {/* Illuminated hotspot — a warm glow radiating from the checked spot so the
            dark map lights up around the location (same glow language as the globe). */}
        {droppedPin && (
          <Mapbox.ShapeSource
            id="pin-glow-src"
            shape={{
              type: 'FeatureCollection' as const,
              features: [
                {
                  type: 'Feature' as const,
                  geometry: { type: 'Point' as const, coordinates: droppedPin },
                  properties: { mag: 1 },
                },
              ],
            }}
          >
            <Mapbox.HeatmapLayer
              id="pin-glow"
              style={{
                heatmapWeight: 1,
                heatmapIntensity: 1,
                heatmapRadius: 100,
                heatmapOpacity: 0.85,
                heatmapColor: [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(0,0,0,0)',
                  0.15, 'rgba(255,201,120,0.22)',
                  0.45, 'rgba(255,220,150,0.42)',
                  0.75, 'rgba(255,236,185,0.62)',
                  1, 'rgba(255,248,225,0.82)',
                ],
              }}
            />
          </Mapbox.ShapeSource>
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
              style={{ fillColor: '#3BA9FF', fillOpacity: 0.12 }}
            />
            <Mapbox.LineLayer
              id="geofence-line"
              style={{
                lineColor: '#3BA9FF',
                lineWidth: 1.5,
                lineOpacity: 0.8,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Dropped pin — user-selected exact spot (stem + dot only; sheet handles confirm) */}
        {droppedPin && (
          <Mapbox.MarkerView
            id="dropped-pin"
            coordinate={droppedPin}
            allowOverlap
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={pinStyles.wrap}>
              <View style={pinStyles.stem} />
              <View style={pinStyles.dot} />
            </View>
          </Mapbox.MarkerView>
        )}

        {/* Iconic city chips on the teaser globe — tap to dive straight in. Hidden
            once a location is selected. */}
        {!droppedPin && !zoomedIn && CHIP_CITIES.filter((c) => visibleChips.includes(c.id)).map((c) => (
          <Mapbox.MarkerView key={c.id} id={`chip-${c.id}`} coordinate={c.coord} anchor={{ x: 0.5, y: 1.15 }} allowOverlap>
            <View style={[chipStyles.wrap, (c.dx || c.dy) ? { transform: [{ translateX: c.dx || 0 }, { translateY: c.dy || 0 }] } : null]}>
              <TouchableOpacity style={chipStyles.chip} activeOpacity={0.85} onPress={() => handleOverlaySelect(c.coord, c.label)}>
                <View style={chipStyles.dot} />
                <Text style={chipStyles.text}>{c.label}</Text>
                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.65)" />
              </TouchableOpacity>
              <View style={chipStyles.stem} />
              <View style={chipStyles.pin} />
            </View>
          </Mapbox.MarkerView>
        ))}
      </Mapbox.MapView>

      {/* Bright decorative stars in the black space around the globe */}
      <StarField />

      {/* Live stats ticker on the teaser globe (checks + scouts) — hidden once you dive in.
          Sits low over the globe, clear of the top pills/banner and above the sheet. */}
      {!droppedPin && !zoomedIn && <LiveStatsHud top={Math.round(winH * 0.60)} />}

      {/* Top gradient overlay — dark fade so the white pills pop on the dark globe */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0)']}
        locations={[0, 0.45, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />


      {/* Top overlay — floating pill + profile */}
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
            <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Ionicons name="location-outline" size={13} color={colors.red} />
            <Text style={styles.locCity}>{displayCity}</Text>
            <View style={[styles.scoutDot, outOfCoverage && styles.scoutDotOff]} />
            <Text style={[styles.locScouts, outOfCoverage && styles.locScoutsOff]}>{displayStatusText}</Text>
            <Text style={styles.locChevron}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scoutSwitch}
            onPress={() => { void switchRole('scout').catch(() => {}); router.replace('/(scout)/dashboard'); }}
            activeOpacity={0.8}
          >
            <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Ionicons name="swap-horizontal" size={14} color={colors.white} />
            <Text style={styles.scoutSwitchText}>SCOUT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(seeker)/profile')}
            activeOpacity={0.85}
          >
            <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Text style={styles.profileInitials}>{profileInitials}</Text>
          </TouchableOpacity>
        </View>

        {/* Honest out-of-coverage banner — never pretend we serve a city we don't */}
        {outOfCoverage && (
          <View style={styles.waitlistBanner}>
            <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Ionicons name="location-outline" size={13} color={colors.red} />
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

      {/* Bottom sheet — frosted glass floating over the globe */}
      <View
        style={styles.sheet}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && Math.abs(h - sheetH) > 2) setSheetH(h);
        }}
      >
        <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.sheetHandle} />

        {droppedPin ? (
          /* ── Request check sheet — appears when a pin is dropped ── */
          <RequestSheet
            pinName={pinName}
            market={market}
            isPartner={isPartnerVenue(pinName)}
            onCancel={() => {
              setDroppedPin(null);
              setPinName(null);
              // Fly back out to the round globe (the teaser rests fully zoomed out).
              const c = getUserCoords() ?? market.center;
              cameraRef.current?.setCamera({
                centerCoordinate: c as [number, number],
                zoomLevel: globeZoom,
                pitch: 0,
                padding: globePad,
                animationMode: 'flyTo',
                animationDuration: 2200,
              });
            }}
            onRequest={({ venue, city, tier, price, time, interior }) => {
              router.push({
                pathname: '/(seeker)/payment',
                params: {
                  venue, city, tier, price, time, interior,
                  // Carry the chosen spot's coords so the check is created WITH a
                  // location (dispatch + the finding/waiting map need this).
                  ...(droppedPin ? { lat: String(droppedPin[1]), lon: String(droppedPin[0]) } : {}),
                },
              });
            }}
          />
        ) : (
          <>
            <Text style={styles.sheetTitle}>Where do you need eyes?</Text>
            <Text style={styles.sheetHint}>Search below, or tap any spot on the map.</Text>

            {/* Search tap-target — opens the slide-up SearchOverlay */}
            <TouchableOpacity
              style={styles.searchTapTarget}
              activeOpacity={0.85}
              onPress={() => setSearchOpen(true)}
            >
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <Text style={styles.searchPlaceholder}>Any place. Any address.</Text>
            </TouchableOpacity>

            {/* Search overlay — slide-up Modal with keyboard-safe layout */}
            <SearchOverlay
              visible={searchOpen}
              marketCenter={market.center as [number, number]}
              recents={recents}
              saved={saved.list}
              onClose={() => setSearchOpen(false)}
              onSelect={handleOverlaySelect}
            />

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
                          padding: globePad,
                          animationDuration: 1200,
                        });
                      }}
                    >
                      <Ionicons name="heart" size={11} color={colors.red} />
                      <Text style={styles.savedChipText} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Recent — the user's most recent check (kept to one row so the
                panel stays compact and the globe keeps its clear band above it). */}
            {recents.length > 0 && (
              <>
                <Text style={styles.recentLabel}>RECENT</Text>
                {recents.slice(0, 1).map((r) => (
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
                      <Ionicons name="time-outline" size={13} color={colors.red} />
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
          </>
        )}
      </View>

      {/* Persistent tab bar — pinned at bottom over the map */}
      <View style={styles.navWrap} pointerEvents="box-none">
        <BottomNav
          variant="seeker"
          active="home"
          floating
          onActivePress={() => {
            // Tap Home while already home → reset to the globe teaser: clear pin,
            // close search, and fly all the way back out to the round globe.
            setDroppedPin(null);
            setPinName(null);
            setSearchOpen(false);
            const coords = getUserCoords() ?? market.center;
            cameraRef.current?.setCamera({
              centerCoordinate: coords as [number, number],
              zoomLevel: globeZoom,
              pitch: 0,
              padding: globePad,
              animationMode: 'flyTo',
              animationDuration: 1800,
            });
          }}
        />
      </View>
    </View>
  );
}

const pinStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  stem: {
    width: 1.5,
    height: 8,
    backgroundColor: colors.red,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.red,
    shadowOpacity: 0.6,
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
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  telemetryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.red,
  },
  telemetryText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: colors.textPrimary,
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
    borderColor: 'rgba(10,10,10,0.35)',
  },
  reticleCrossH: {
    position: 'absolute',
    width: 14,
    height: 1,
    backgroundColor: 'rgba(10,10,10,0.45)',
  },
  reticleCrossV: {
    position: 'absolute',
    width: 1,
    height: 14,
    backgroundColor: 'rgba(10,10,10,0.45)',
  },
  reticleCenter: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.red,
  },
  recenterBtn: {
    position: 'absolute',
    right: 14,
    bottom: 340,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  recenterGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
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
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  hintText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textPrimary,
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
    backgroundColor: colors.red,
  },
  core: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOpacity: 0.7,
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
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  youText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: colors.onRed,
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

const scoutInviteStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Light inset — matches the search input; the sheet behind is already frosted,
    // so a second dark blur here would double-darken and break consistency.
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 10,
    marginBottom: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.white,
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.2,
  },
  arrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 22,
    color: 'rgba(255,255,255,0.6)',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  navWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },

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
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconChevron: {
    fontFamily: 'Inter_500Medium',
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: -2,
    marginLeft: -2,
  },
  locPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,17,24,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  locPin: { /* replaced by Ionicons location-outline */ },
  locCity: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.3,
  },
  scoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.verified,
    marginHorizontal: 2,
  },
  scoutDotOff: {
    backgroundColor: colors.textTertiary,
  },
  locScouts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.verified,
    letterSpacing: 0.3,
  },
  locScoutsOff: {
    color: colors.textSecondary,
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
    backgroundColor: 'rgba(16,17,24,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  waitlistPin: { /* replaced by Ionicons location-outline */ },
  waitlistText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.2,
  },
  waitlistBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.red,
  },
  waitlistBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onRed,
    letterSpacing: 1,
  },
  locChevron: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 2,
  },
  cityIconWrap: {
    backgroundColor: colors.red,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cityMono: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 14,
    color: colors.onRed,
    letterSpacing: 1,
  },
  scoutSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16,17,24,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginRight: 10,
    overflow: 'hidden',
  },
  scoutSwitchText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.white,
    letterSpacing: 1,
  },
  profileBtn: {
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
  profileInitials: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Bottom sheet — white card
  sheet: {
    position: 'absolute',
    bottom: 84,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(48,78,152,0.5)',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetEyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 5,
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  sheetHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    letterSpacing: 0.2,
    marginBottom: 10,
  },

  // Search tap-target — opens the slide-up overlay on tap
  searchTapTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  searchIcon: { /* replaced by Ionicons search */ },
  searchPlaceholder: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
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
    color: colors.red,
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
    backgroundColor: 'rgba(218,37,29,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.22)',
    maxWidth: '48%',
  },
  savedChipGlyph: { /* replaced by Ionicons heart */ },
  savedChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.white,
    letterSpacing: 0.2,
  },

  // Recent
  recentLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  recentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentIcon: { /* replaced by Ionicons time-outline */ },
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
    color: colors.white,
    letterSpacing: 0.2,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: colors.red,
  },
  partnerChipGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.red,
  },
  partnerChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.red,
    letterSpacing: 1.3,
  },
  recentSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  recentArrow: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_500Medium',
  },
});
