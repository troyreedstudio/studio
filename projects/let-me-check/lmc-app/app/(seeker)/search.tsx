import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Keyboard,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { getMarketById, DEFAULT_MARKET_ID, nearestLiveMarket } from '../data/markets';
import { requestUserLocation } from '../state/location';
import { useSavedPlaces } from '../state/saved';
import { useRecents, addRecent, relativeTime } from '../state/recents';
import { searchPlaces, getPlaceCoords, placeToAppCoord, type PlaceSuggestion } from '../lib/places';
import { colors } from '../lib/theme';

const VOICE_MOCKS = [
  'Soho House New York',
  'JFK Terminal 4',
  'DMV Miami Beach',
  'Whole Foods Brooklyn',
  'Equinox Hudson Yards',
];

// Rotating placeholder — intent-based examples (the place you want verified)
const PLACEHOLDER_HINTS = [
  'Try: "Soho House New York"',
  'Try: "JFK Terminal 4"',
  'Try: "Komodo Miami"',
  'Try: "DMV Miami Beach"',
  'Try: "Equinox Hudson Yards"',
  'Try: "Apple Store Fifth Avenue"',
  'Try: "Heathrow Terminal 5"',
];

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; suggestions: PlaceSuggestion[]; unavailable: false }
  | { kind: 'no-results' }
  | { kind: 'unavailable' };

export default function SearchScreen() {
  const router = useRouter();
  const { marketId: marketIdParam, voice, mode } = useLocalSearchParams<{
    marketId?: string;
    voice?: string;
    mode?: string;
  }>();
  const isRecurring = mode === 'recurring';
  const activeMarket = getMarketById(marketIdParam || DEFAULT_MARKET_ID) || getMarketById(DEFAULT_MARKET_ID)!;

  const [query, setQuery] = useState('');
  const [voiceListening, setVoiceListening] = useState(voice === '1');
  const [voiceDots, setVoiceDots] = useState('');
  const [hintIdx, setHintIdx] = useState(0);
  const [searchState, setSearchState] = useState<SearchState>({ kind: 'idle' });
  const [resolving, setResolving] = useState(false);

  // Real saved places + recents from Supabase-backed state
  const { list: savedList } = useSavedPlaces();
  const recents = useRecents();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotate placeholder hints every 3.5 s when input is empty
  useEffect(() => {
    if (query.length > 0) return;
    const t = setInterval(() => {
      setHintIdx((i) => (i + 1) % PLACEHOLDER_HINTS.length);
    }, 3500);
    return () => clearInterval(t);
  }, [query]);

  // Animate "Listening..." dots
  useEffect(() => {
    if (!voiceListening) return;
    const t = setInterval(() => {
      setVoiceDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 350);
    return () => clearInterval(t);
  }, [voiceListening]);

  // Mock voice capture in dev only — fills input after 2.5 s
  useEffect(() => {
    if (!__DEV__) return;
    if (!voiceListening) return;
    const t = setTimeout(() => {
      const mock = VOICE_MOCKS[Math.floor(Math.random() * VOICE_MOCKS.length)];
      setQuery(mock);
      setVoiceListening(false);
    }, 2500);
    return () => clearTimeout(t);
  }, [voiceListening]);

  // Debounced autocomplete — fires 300 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setSearchState({ kind: 'idle' });
      return;
    }

    setSearchState({ kind: 'loading' });

    debounceRef.current = setTimeout(async () => {
      const biasCoord = activeMarket.center as [number, number];
      const outcome = await searchPlaces(trimmed, { locationBias: biasCoord });

      if (outcome.unavailable) {
        setSearchState({ kind: 'unavailable' });
        return;
      }

      if (outcome.results.length === 0) {
        setSearchState({ kind: 'no-results' });
        return;
      }

      setSearchState({ kind: 'results', suggestions: outcome.results, unavailable: false });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeMarket.center]);

  /**
   * Resolve a tapped suggestion to real coords, record it as a recent,
   * then navigate to the destination screen.
   */
  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    Keyboard.dismiss();
    setResolving(true);

    try {
      const coords = await getPlaceCoords(suggestion.placeId);
      const name = suggestion.primaryText;
      const address = suggestion.secondaryText || suggestion.primaryText;

      let appCoord: [number, number];
      if (coords) {
        appCoord = placeToAppCoord(coords);
      } else {
        // Place Details failed — fall back to active market centre so we never crash.
        appCoord = activeMarket.center as [number, number];
      }

      const [lon, lat] = appCoord;
      const resolved = nearestLiveMarket(appCoord);
      const marketId = resolved.inMarket ? resolved.market.id : marketIdParam || activeMarket.id;

      // Record in recents (persisted to Supabase in background)
      addRecent({ name, city: resolved.market.name });

      if (isRecurring) {
        router.replace({
          pathname: '/(seeker)/recurring-setup',
          params: { pinLat: String(lat), pinLon: String(lon), pinName: name, pinAddress: address, marketId },
        });
        return;
      }

      router.replace({
        pathname: '/(seeker)/home',
        params: { pinLat: String(lat), pinLon: String(lon), pinName: name, pinAddress: address, marketId },
      });
    } finally {
      setResolving(false);
    }
  };

  /**
   * Handle a tap on a saved place or recent — these already have coords.
   */
  const handleSelectSaved = (item: { name: string; address?: string; coord: [number, number]; marketId: string }) => {
    Keyboard.dismiss();
    const [lon, lat] = item.coord;
    const resolved = nearestLiveMarket(item.coord);
    const marketId = resolved.inMarket ? resolved.market.id : item.marketId || activeMarket.id;

    addRecent({ name: item.name, city: resolved.market.name });

    if (isRecurring) {
      router.replace({
        pathname: '/(seeker)/recurring-setup',
        params: { pinLat: String(lat), pinLon: String(lon), pinName: item.name, pinAddress: item.address ?? '', marketId },
      });
      return;
    }
    router.replace({
      pathname: '/(seeker)/home',
      params: { pinLat: String(lat), pinLon: String(lon), pinName: item.name, pinAddress: item.address ?? '', marketId },
    });
  };

  /**
   * Handle a tap on a recent check (no stored coord — use market centre fallback).
   */
  const handleSelectRecent = (item: { name: string; city: string }) => {
    Keyboard.dismiss();
    // Recents store only name + city — we don't have coords. Use active market
    // centre as a best-effort so the home map opens near the right city.
    const appCoord = activeMarket.center as [number, number];
    const [lon, lat] = appCoord;
    const marketId = marketIdParam || activeMarket.id;

    if (isRecurring) {
      router.replace({
        pathname: '/(seeker)/recurring-setup',
        params: { pinLat: String(lat), pinLon: String(lon), pinName: item.name, pinAddress: item.city, marketId },
      });
      return;
    }
    router.replace({
      pathname: '/(seeker)/home',
      params: { pinLat: String(lat), pinLon: String(lon), pinName: item.name, pinAddress: item.city, marketId },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const showIdle = query.trim().length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isRecurring ? 'Pick a place to repeat' : 'Search any place'}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchInputWrap}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={PLACEHOLDER_HINTS[hintIdx]}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {resolving || searchState.kind === 'loading' ? (
          <ActivityIndicator size="small" color={colors.red} />
        ) : query.length > 0 ? (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : __DEV__ ? (
          <TouchableOpacity
            onPress={() => setVoiceListening(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="mic-outline" size={18} color={colors.red} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Use Current Location */}
      <TouchableOpacity
        style={styles.locButton}
        activeOpacity={0.7}
        onPress={async () => {
          const { status, coords } = await requestUserLocation();
          if (status === 'granted' && coords) {
            router.replace({ pathname: '/(seeker)/home' });
          }
        }}
      >
        <Ionicons name="location-outline" size={18} color={colors.onRed} />
        <View style={styles.locTextWrap}>
          <Text style={styles.locTitle}>Use my current location</Text>
          <Text style={styles.locSub}>
            {activeMarket.name} ·{' '}
            {activeMarket.status === 'live'
              ? `${activeMarket.scouts} Scouts active here`
              : 'Launching soon'}
          </Text>
        </View>
        <Text style={styles.locArrow}>›</Text>
      </TouchableOpacity>

      {/* Results / Recents / Saved */}
      <ScrollView
        style={styles.resultsScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showIdle ? (
          /* ── Empty state: show saved places + recents ── */
          <>
            {recents.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>RECENT</Text>
                {recents.slice(0, 5).map((r, idx) => (
                  <TouchableOpacity
                    key={`recent-${idx}`}
                    style={styles.resultRow}
                    onPress={() => handleSelectRecent(r)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.resultIconWrap, styles.resultIconWrapRed]}>
                      <Ionicons name="time-outline" size={16} color={colors.red} />
                    </View>
                    <View style={styles.resultTextWrap}>
                      <Text style={styles.resultName}>{r.name}</Text>
                      <Text style={styles.resultAddress}>{r.city}</Text>
                      <Text style={styles.resultRecentWhen}>{relativeTime(r.ts)}</Text>
                    </View>
                    <Text style={styles.resultArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={[styles.sectionLabel, recents.length > 0 ? { marginTop: 28 } : undefined]}>
              SAVED PLACES
            </Text>
            {savedList.length > 0 ? (
              savedList.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.resultRow}
                  onPress={() => handleSelectSaved(p)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.resultIconWrap, styles.resultIconWrapRed]}>
                    <Ionicons name="bookmark-outline" size={16} color={colors.red} />
                  </View>
                  <View style={styles.resultTextWrap}>
                    <Text style={styles.resultName}>{p.name}</Text>
                    {p.address ? (
                      <Text style={styles.resultAddress}>{p.address}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.resultArrow}>›</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptySaved}>
                <Text style={styles.emptySavedTitle}>No saved places yet</Text>
                <Text style={styles.emptySavedSub}>
                  Tap the bookmark on any place after checking to save it here.
                </Text>
              </View>
            )}
          </>
        ) : searchState.kind === 'unavailable' ? (
          /* ── No API key configured ── */
          <View style={styles.feedbackWrap}>
            <Text style={styles.feedbackTitle}>Search not available yet</Text>
            <Text style={styles.feedbackSub}>
              Live place search will be active when the team adds a Google Places key. Type the name above and tap Go to check any location.
            </Text>
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => handleSelectRecent({ name: query.trim(), city: 'Typed location' })}
              activeOpacity={0.7}
            >
              <View style={[styles.resultIconWrap, styles.resultIconWrapRed]}>
                <Ionicons name="search" size={16} color={colors.red} />
              </View>
              <View style={styles.resultTextWrap}>
                <Text style={styles.resultName}>{query.trim()}</Text>
                <Text style={styles.resultAddress}>Check this location</Text>
                <Text style={styles.priceChip}>$15 · ~10 min</Text>
              </View>
              <Text style={styles.resultArrow}>›</Text>
            </TouchableOpacity>
          </View>
        ) : searchState.kind === 'no-results' ? (
          /* ── Zero results ── */
          <View style={styles.feedbackWrap}>
            <Text style={styles.feedbackSub}>
              No places found for "{query.trim()}". Try a different name or address.
            </Text>
          </View>
        ) : searchState.kind === 'results' ? (
          /* ── Live autocomplete results ── */
          <>
            <Text style={styles.sectionLabel}>SUGGESTIONS</Text>
            {searchState.suggestions.map((s) => (
              <TouchableOpacity
                key={s.placeId}
                style={styles.resultRow}
                onPress={() => handleSelectSuggestion(s)}
                activeOpacity={0.7}
              >
                <View style={[styles.resultIconWrap, styles.resultIconWrapRed]}>
                  <Ionicons name="location-outline" size={16} color={colors.red} />
                </View>
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultName}>{s.primaryText}</Text>
                  <Text style={styles.resultAddress}>{s.secondaryText}</Text>
                  <Text style={styles.priceChip}>$15 · ~10 min</Text>
                </View>
                <Text style={styles.resultArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null /* loading state — spinner is shown in the input bar */ }
      </ScrollView>

      {/* Voice Listening Modal */}
      <Modal
        visible={voiceListening}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceListening(false)}
      >
        <View style={styles.voiceOverlay}>
          <View style={styles.voiceCard}>
            <Ionicons name="mic-outline" size={44} color={colors.red} style={{ marginBottom: 14 }} />
            <Text style={styles.voiceListeningText}>Listening{voiceDots}</Text>
            <Text style={styles.voiceHint}>Speak the place you want to check</Text>
            <View style={styles.voicePulseRow}>
              <View style={[styles.voicePulse, { height: 18 }]} />
              <View style={[styles.voicePulse, { height: 28 }]} />
              <View style={[styles.voicePulse, { height: 14 }]} />
              <View style={[styles.voicePulse, { height: 22 }]} />
              <View style={[styles.voicePulse, { height: 16 }]} />
            </View>
            <TouchableOpacity
              style={styles.voiceCancel}
              onPress={() => setVoiceListening(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.voiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.red,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  searchIcon: { /* replaced by Ionicons search */ },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  micIcon: { /* replaced by Ionicons mic-outline */ },
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCard: {
    width: '85%',
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  voiceMic: { /* replaced by Ionicons mic-outline */ },
  voiceListeningText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  voiceHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  voicePulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 24,
    height: 30,
  },
  voicePulse: {
    width: 4,
    backgroundColor: colors.red,
    borderRadius: 2,
  },
  voiceCancel: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  voiceCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.red,
    letterSpacing: 1,
  },
  priceChip: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.red,
    letterSpacing: 0.4,
  },
  locButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  locIcon: { /* replaced by Ionicons location-outline */ },
  locTextWrap: { flex: 1 },
  locTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onRed,
    marginBottom: 2,
  },
  locSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.3,
  },
  locArrow: {
    fontSize: 22,
    color: colors.onRed,
    fontFamily: 'Inter_500Medium',
  },
  resultsScroll: {
    flex: 1,
    marginTop: 24,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
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
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  resultAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  resultRecentWhen: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  resultArrow: {
    fontSize: 22,
    color: colors.red,
    fontFamily: 'Inter_500Medium',
  },
  feedbackWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  feedbackTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
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
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptySavedTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  emptySavedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
});
