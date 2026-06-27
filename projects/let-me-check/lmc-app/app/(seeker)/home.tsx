import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Animated, Easing, TextInput, ActivityIndicator, Keyboard, Modal, FlatList, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';
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
      continuous: true,        // keep listening patiently — no early 2-3s cutoff
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

      {/* Partner interior add-on (only for known partner venues) */}
      {isPartner && (
        <TouchableOpacity
          style={[reqStyles.interiorCard, interior && reqStyles.interiorCardActive]}
          activeOpacity={0.85}
          onPress={() => setInterior(!interior)}
        >
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
      )}

      {/* Request check CTA */}
      <TouchableOpacity
        style={[reqStyles.ctaBtn, ctaGlowShadow]}
        onPress={handleRequest}
        activeOpacity={0.85}
      >
        <CtaGlow radius={14} />
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
    marginBottom: 14,
    gap: 12,
  },
  headerLeft: { flex: 1 },
  placeName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  placeCity: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  cancelGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 10,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 110,
  },
  tierCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  tierCardPriorityActive: {
    borderColor: colors.red,
    backgroundColor: 'rgba(218,37,29,0.04)',
  },
  priorityBadge: {
    backgroundColor: 'rgba(218,37,29,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  priorityBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: colors.red,
    letterSpacing: 1,
  },
  tierLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tierPrice: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tierTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },
  interiorCardActive: {
    borderColor: colors.red,
    backgroundColor: 'rgba(218,37,29,0.04)',
  },
  interiorCheck: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
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
    color: colors.red,
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
    color: colors.textPrimary,
  },
  interiorBadge: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: colors.red,
  },
  interiorSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
  },
  ctaBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.onRed,
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

  // Callback from SearchOverlay: close overlay, drop pin, fly camera, show YES card
  const handleOverlaySelect = useCallback((appCoord: [number, number], name: string) => {
    const [lon, lat] = appCoord;
    setDroppedPin([lon, lat]);
    setPinName(name);
    cameraRef.current?.setCamera({
      centerCoordinate: [lon, lat],
      zoomLevel: 17,
      pitch: 55,
      animationDuration: 1200,
    });
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

      {/* Edge-to-edge map — the canvas (Mapbox light, Uber/Apple quality) */}
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/light-v11"
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
              style={{ fillColor: colors.red, fillOpacity: 0.10 }}
            />
            <Mapbox.LineLayer
              id="geofence-line"
              style={{
                lineColor: colors.red,
                lineWidth: 1.5,
                lineOpacity: 0.6,
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
      </Mapbox.MapView>

      {/* Top gradient overlay — subtle fade for light map readability */}
      <LinearGradient
        colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
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
            <Ionicons name="location-outline" size={13} color={colors.red} />
            <Text style={styles.locCity}>{displayCity}</Text>
            <View style={[styles.scoutDot, outOfCoverage && styles.scoutDotOff]} />
            <Text style={[styles.locScouts, outOfCoverage && styles.locScoutsOff]}>{displayStatusText}</Text>
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

      {/* Bottom sheet — white card over light map */}
      <View style={styles.sheet}>
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
            }}
            onRequest={({ venue, city, tier, price, time, interior }) => {
              router.push({
                pathname: '/(seeker)/payment',
                params: { venue, city, tier, price, time, interior },
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
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.35)',
    marginBottom: 2,
  },
  labelText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.red,
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
    top: -8,
    left: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
    letterSpacing: 1,
  },
});

const scoutInviteStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: 'rgba(218,37,29,0.08)',
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
    color: colors.red,
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  arrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 22,
    color: colors.textTertiary,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  locPin: { /* replaced by Ionicons location-outline */ },
  locCity: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.5,
    borderColor: colors.red, // outlined in red (was amber)
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  waitlistPin: { /* replaced by Ionicons location-outline */ },
  waitlistText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: colors.textPrimary,
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
    color: colors.textTertiary,
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
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  profileInitials: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },

  // Bottom sheet — white card
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
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetEyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 5,
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sheetHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 14,
  },

  // Search tap-target — opens the slide-up overlay on tap
  searchTapTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { /* replaced by Ionicons search */ },
  searchPlaceholder: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.textTertiary,
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
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },

  // Recent
  recentLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  recentArrow: {
    fontSize: 20,
    color: colors.textTertiary,
    fontFamily: 'Inter_500Medium',
  },
});
