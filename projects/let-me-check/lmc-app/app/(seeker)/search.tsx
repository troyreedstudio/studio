import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Keyboard,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

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

const ALL_PLACES = [
  // Nightlife
  { id: 'p1', name: 'Komodo', address: 'Brickell, Miami', category: 'Nightlife', scouts: 14 },
  { id: 'p2', name: 'LIV Nightclub', address: 'Fontainebleau, Miami', category: 'Nightlife', scouts: 18 },
  { id: 'p3', name: 'Marquee New York', address: 'Chelsea, NYC', category: 'Nightlife', scouts: 10 },
  { id: 'p4', name: '1 OAK', address: 'Chelsea, New York', category: 'Nightlife', scouts: 9 },
  { id: 'p5', name: 'TAO Downtown', address: 'Chelsea, New York', category: 'Nightlife', scouts: 11 },
  { id: 'p6', name: "Harriet's Rooftop", address: 'West Hollywood, LA', category: 'Nightlife', scouts: 8 },
  // Hotels / Members Clubs
  { id: 'p7', name: 'Soho House New York', address: 'Meatpacking, New York', category: 'Hotels', scouts: 12 },
  { id: 'p8', name: 'Soho House Miami Beach', address: 'South Beach, Miami', category: 'Hotels', scouts: 9 },
  { id: 'p9', name: 'Soho House West Hollywood', address: 'West Hollywood, LA', category: 'Hotels', scouts: 7 },
  { id: 'p10', name: 'The Standard Hotel', address: 'Belle Isle, Miami', category: 'Hotels', scouts: 8 },
  { id: 'p11', name: 'The Edition New York', address: 'Times Square, NYC', category: 'Hotels', scouts: 6 },
  { id: 'p12', name: 'Faena Miami Beach', address: 'Mid Beach, Miami', category: 'Hotels', scouts: 10 },
  // Airports
  { id: 'p13', name: 'JFK Terminal 4', address: 'Queens, New York', category: 'Airports', scouts: 8 },
  { id: 'p14', name: 'JFK Terminal 1', address: 'Queens, New York', category: 'Airports', scouts: 6 },
  { id: 'p15', name: 'LaGuardia Terminal B', address: 'Queens, New York', category: 'Airports', scouts: 5 },
  { id: 'p16', name: 'LAX Terminal 7', address: 'Los Angeles Airport', category: 'Airports', scouts: 16 },
  { id: 'p17', name: 'MIA Terminal D', address: 'Miami International', category: 'Airports', scouts: 11 },
  // Gyms
  { id: 'p18', name: 'Equinox Hudson Yards', address: '33 Hudson Yards, NYC', category: 'Gyms', scouts: 11 },
  { id: 'p19', name: 'Equinox Brickell', address: 'Miami Avenue, Miami', category: 'Gyms', scouts: 6 },
  { id: 'p20', name: 'Equinox SoHo', address: 'Greene St, New York', category: 'Gyms', scouts: 9 },
  { id: 'p21', name: 'Barrys Tribeca', address: 'Tribeca, New York', category: 'Gyms', scouts: 7 },
  // DMV / Gov
  { id: 'p22', name: 'DMV - Miami Beach', address: '101 5th St, Miami Beach', category: 'DMV / Gov', scouts: 5 },
  { id: 'p23', name: 'DMV - Hialeah', address: '5060 W 12 Ave, Hialeah', category: 'DMV / Gov', scouts: 3 },
  { id: 'p24', name: 'DMV - Manhattan', address: '11 Greenwich St, NYC', category: 'DMV / Gov', scouts: 4 },
  // Retail
  { id: 'p25', name: 'Apple Store Aventura', address: 'Aventura Mall, FL', category: 'Retail', scouts: 7 },
  { id: 'p26', name: 'Apple Fifth Avenue', address: '767 5th Ave, NYC', category: 'Retail', scouts: 9 },
  { id: 'p27', name: 'Whole Foods Lincoln Rd', address: 'Lincoln Rd, Miami Beach', category: 'Retail', scouts: 4 },
  { id: 'p28', name: 'Bal Harbour Shops', address: 'Bal Harbour, Miami', category: 'Retail', scouts: 8 },
  // Beach Clubs
  { id: 'p29', name: 'Nikki Beach Miami', address: 'Ocean Dr, Miami Beach', category: 'Beach Clubs', scouts: 12 },
  { id: 'p30', name: 'White Dubai', address: 'Meydan, Dubai', category: 'Beach Clubs', scouts: 9 },
  // Events / Venues
  { id: 'p31', name: 'Coachella Festival', address: 'Indio, California', category: 'Events', scouts: 22 },
  { id: 'p32', name: 'Miami Heat Arena', address: 'Kaseya Center, Miami', category: 'Events', scouts: 13 },
  { id: 'p33', name: 'Madison Square Garden', address: 'Penn Plaza, New York', category: 'Events', scouts: 15 },
  { id: 'p34', name: 'Hollywood Bowl', address: 'Hollywood, Los Angeles', category: 'Events', scouts: 11 },
  { id: 'p35', name: 'SoFi Stadium', address: 'Inglewood, California', category: 'Events', scouts: 9 },
  // More Cities — Santa Monica / Venice / Beverly Hills
  { id: 'p36', name: 'Santa Monica Pier', address: 'Santa Monica, California', category: 'Events', scouts: 7 },
  { id: 'p37', name: 'Santa Monica Place', address: 'Santa Monica, California', category: 'Retail', scouts: 5 },
  { id: 'p38', name: 'Erewhon Santa Monica', address: 'Santa Monica, California', category: 'Retail', scouts: 4 },
  { id: 'p39', name: 'The Abbey', address: 'West Hollywood, California', category: 'Nightlife', scouts: 8 },
  { id: 'p40', name: 'Beverly Hills DMV', address: 'Beverly Hills, California', category: 'DMV / Gov', scouts: 3 },
  // Big-box retail (chain stores)
  { id: 'p41', name: 'Walmart Supercenter', address: 'Hialeah, Miami', category: 'Retail', scouts: 6 },
  { id: 'p42', name: 'Target Westchester', address: 'Bronx, New York', category: 'Retail', scouts: 5 },
  { id: 'p43', name: 'Costco Miami Beach', address: 'Miami Beach, FL', category: 'Retail', scouts: 7 },
  { id: 'p44', name: 'Best Buy Times Square', address: 'Times Square, NYC', category: 'Retail', scouts: 5 },
  { id: 'p45', name: 'Trader Joes Union Square', address: 'Union Square, NYC', category: 'Retail', scouts: 6 },
  // Chain gyms
  { id: 'p46', name: 'Planet Fitness Miami', address: 'Brickell, Miami', category: 'Gyms', scouts: 4 },
  { id: 'p47', name: 'SoulCycle Tribeca', address: 'Tribeca, New York', category: 'Gyms', scouts: 5 },
  { id: 'p48', name: 'Crunch Fitness Brickell', address: 'Brickell, Miami', category: 'Gyms', scouts: 3 },
  // Restaurants (very common search)
  { id: 'p49', name: 'Carbone', address: 'Greenwich Village, NYC', category: 'Restaurants', scouts: 14 },
  { id: 'p50', name: "Joe's Stone Crab", address: 'South Beach, Miami', category: 'Restaurants', scouts: 12 },
  { id: 'p51', name: 'Nobu Malibu', address: 'Malibu, California', category: 'Restaurants', scouts: 10 },
  { id: 'p52', name: 'Catch Steak NYC', address: 'Meatpacking, NYC', category: 'Restaurants', scouts: 9 },
  { id: 'p53', name: 'Carbone Miami', address: 'South Beach, Miami', category: 'Restaurants', scouts: 11 },
  { id: 'p54', name: 'In-N-Out Burger', address: 'Hollywood, California', category: 'Restaurants', scouts: 8 },
  // Movie theaters
  { id: 'p55', name: 'AMC Aventura 24', address: 'Aventura, Miami', category: 'Movie Theaters', scouts: 5 },
  { id: 'p56', name: 'AMC Lincoln Square 13', address: 'Upper West Side, NYC', category: 'Movie Theaters', scouts: 7 },
  { id: 'p57', name: 'Alamo Drafthouse Brooklyn', address: 'Downtown Brooklyn, NY', category: 'Movie Theaters', scouts: 4 },
  // More Airports
  { id: 'p58', name: 'SFO Terminal 2', address: 'San Francisco Airport', category: 'Airports', scouts: 9 },
  { id: 'p59', name: 'ORD Terminal 3', address: 'Chicago O\'Hare', category: 'Airports', scouts: 7 },
  { id: 'p60', name: 'ATL Concourse F', address: 'Atlanta International', category: 'Airports', scouts: 6 },
  // More Hotels (chain)
  { id: 'p61', name: 'Marriott Marquis Times Square', address: 'Times Square, NYC', category: 'Hotels', scouts: 8 },
  { id: 'p62', name: 'Four Seasons Beverly Hills', address: 'Beverly Hills, CA', category: 'Hotels', scouts: 7 },
  { id: 'p63', name: 'W South Beach', address: 'South Beach, Miami', category: 'Hotels', scouts: 9 },
  // Real Estate (open houses common)
  { id: 'p64', name: 'Open House — Wynwood Loft', address: 'Wynwood, Miami', category: 'Real Estate', scouts: 4 },
  { id: 'p65', name: 'Open House — SoHo Penthouse', address: 'SoHo, New York', category: 'Real Estate', scouts: 5 },
  // London
  { id: 'p66', name: 'Fabric', address: 'Farringdon, London', category: 'Nightlife', scouts: 8 },
  { id: 'p67', name: "Annabel's Mayfair", address: 'Mayfair, London', category: 'Nightlife', scouts: 6 },
  { id: 'p68', name: 'Heathrow Terminal 5', address: 'London Heathrow Airport', category: 'Airports', scouts: 13 },
  { id: 'p69', name: 'Heathrow Terminal 2', address: 'London Heathrow Airport', category: 'Airports', scouts: 9 },
  { id: 'p70', name: 'The Dorchester', address: 'Park Lane, London', category: 'Hotels', scouts: 7 },
  { id: 'p71', name: 'The Shard', address: 'London Bridge, London', category: 'Events', scouts: 8 },
  { id: 'p72', name: 'Selfridges Oxford Street', address: 'Oxford St, London', category: 'Retail', scouts: 9 },
  { id: 'p73', name: 'Harrods', address: 'Knightsbridge, London', category: 'Retail', scouts: 11 },
  { id: 'p74', name: "Equinox St James's", address: "St James's, London", category: 'Gyms', scouts: 5 },
  { id: 'p75', name: 'Soho House White City', address: 'White City, London', category: 'Hotels', scouts: 6 },
  // Dubai
  { id: 'p76', name: 'DXB Terminal 3', address: 'Dubai International Airport', category: 'Airports', scouts: 14 },
  { id: 'p77', name: 'Burj Al Arab', address: 'Jumeirah, Dubai', category: 'Hotels', scouts: 10 },
  { id: 'p78', name: 'Atlantis The Palm', address: 'Palm Jumeirah, Dubai', category: 'Hotels', scouts: 9 },
  { id: 'p79', name: 'Mall of the Emirates', address: 'Al Barsha, Dubai', category: 'Retail', scouts: 12 },
  { id: 'p80', name: 'The Dubai Mall', address: 'Downtown Dubai', category: 'Retail', scouts: 15 },
  { id: 'p81', name: 'Coya Dubai', address: 'DIFC, Dubai', category: 'Restaurants', scouts: 7 },
  { id: 'p82', name: 'Zuma Dubai', address: 'DIFC, Dubai', category: 'Restaurants', scouts: 9 },
  { id: 'p83', name: 'Soul Beach Dubai', address: 'JBR, Dubai', category: 'Beach Clubs', scouts: 8 },
];

const RECENTS = [
  { id: 'r1', name: 'Komodo', address: 'Brickell, Miami', when: '2 days ago' },
  { id: 'r2', name: 'DMV - Miami Beach', address: '101 5th St, Miami Beach', when: 'Last week' },
  { id: 'r3', name: 'JFK Terminal 4', address: 'Queens, New York', when: 'Last month' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceDots, setVoiceDots] = useState('');
  const [hintIdx, setHintIdx] = useState(0);

  // Rotate AI-style placeholder hints every 3.5s when input empty
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

  // Mock voice capture: after 2.5 sec, fill input with a random mock query
  useEffect(() => {
    if (!voiceListening) return;
    const t = setTimeout(() => {
      const mock = VOICE_MOCKS[Math.floor(Math.random() * VOICE_MOCKS.length)];
      setQuery(mock);
      setVoiceListening(false);
    }, 2500);
    return () => clearTimeout(t);
  }, [voiceListening]);

  const tokens = query.toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
  const results = tokens.length > 0
    ? ALL_PLACES.filter((p) => {
        const haystack = `${p.name} ${p.address} ${p.category}`.toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      }).slice(0, 8)
    : [];

  const handleSelect = (place: { name: string; address: string }) => {
    Keyboard.dismiss();
    router.push({
      pathname: '/(seeker)/venue',
      params: { name: place.name, city: place.address },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a queue to check</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchInputWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={PLACEHOLDER_HINTS[hintIdx]}
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            const trimmed = query.trim();
            if (!trimmed) return;
            // If a pre-loaded match exists, pick the top one. Otherwise use the literal typed query.
            const target = results.length > 0 ? results[0] : { name: trimmed, address: 'Search this location' };
            handleSelect(target);
          }}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setVoiceListening(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.micIcon}>🎤</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Use Current Location */}
      <TouchableOpacity style={styles.locButton} activeOpacity={0.7}>
        <Text style={styles.locIcon}>📍</Text>
        <View style={styles.locTextWrap}>
          <Text style={styles.locTitle}>Use my current location</Text>
          <Text style={styles.locSub}>📍 Miami · 142 Scouts active here</Text>
        </View>
        <Text style={styles.locArrow}>›</Text>
      </TouchableOpacity>


      {/* Results / Recents / Saved */}
      <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {query.length > 0 ? (
          /* Live autocomplete — Google Maps pattern: typed query is the first suggestion */
          <>
            <Text style={styles.sectionLabel}>SUGGESTIONS</Text>

            {/* Top row: user's literal typed query, always actionable */}
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => handleSelect({ name: query.trim(), address: 'Search this location' })}
              activeOpacity={0.7}
            >
              <View style={[styles.resultIconWrap, styles.resultIconWrapOrange]}>
                <Text style={styles.resultPin}>🔍</Text>
              </View>
              <View style={styles.resultTextWrap}>
                <Text style={styles.resultName}>{query.trim()}</Text>
                <Text style={styles.resultAddress}>Search this location</Text>
                <Text style={styles.priceChip}>$15 · ~10 min</Text>
              </View>
              <Text style={styles.resultArrow}>›</Text>
            </TouchableOpacity>

            {/* Pre-loaded autocomplete matches below */}
            {results.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.resultRow}
                onPress={() => handleSelect(r)}
                activeOpacity={0.7}
              >
                <View style={styles.resultIconWrap}>
                  <Text style={styles.resultPin}>📍</Text>
                </View>
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultName}>{r.name}</Text>
                  <Text style={styles.resultAddress}>{r.address}</Text>
                  <View style={styles.resultMeta}>
                    <Text style={styles.priceChip}>$15 · ~10 min</Text>
                    <Text style={styles.resultDot}>·</Text>
                    <View style={styles.scoutDot} />
                    <Text style={styles.resultScouts}>{r.scouts} ready</Text>
                  </View>
                </View>
                <Text style={styles.resultArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          /* Recents + Saved */
          <>
            <Text style={styles.sectionLabel}>RECENT</Text>
            {RECENTS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.resultRow}
                onPress={() => handleSelect(r)}
                activeOpacity={0.7}
              >
                <View style={styles.resultIconWrap}>
                  <Text style={styles.resultPin}>🕐</Text>
                </View>
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultName}>{r.name}</Text>
                  <Text style={styles.resultAddress}>{r.address}</Text>
                  <Text style={styles.resultRecentWhen}>{r.when}</Text>
                </View>
                <Text style={styles.resultArrow}>›</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>SAVED PLACES</Text>
            <View style={styles.emptySaved}>
              <Text style={styles.emptySavedTitle}>No saved places yet</Text>
              <Text style={styles.emptySavedSub}>
                Tap the bookmark on any place after checking to save it here.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Voice Listening Modal */}
      <Modal visible={voiceListening} transparent animationType="fade" onRequestClose={() => setVoiceListening(false)}>
        <View style={styles.voiceOverlay}>
          <View style={styles.voiceCard}>
            <Text style={styles.voiceMic}>🎤</Text>
            <Text style={styles.voiceListeningText}>Listening{voiceDots}</Text>
            <Text style={styles.voiceHint}>Speak the place you want to check</Text>
            <View style={styles.voicePulseRow}>
              <View style={[styles.voicePulse, { height: 18 }]} />
              <View style={[styles.voicePulse, { height: 28 }]} />
              <View style={[styles.voicePulse, { height: 14 }]} />
              <View style={[styles.voicePulse, { height: 22 }]} />
              <View style={[styles.voicePulse, { height: 16 }]} />
            </View>
            <TouchableOpacity style={styles.voiceCancel} onPress={() => setVoiceListening(false)} activeOpacity={0.7}>
              <Text style={styles.voiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  cancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FF8533',
  },
  headerTitle: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.4,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 12,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#fff',
  },
  clearIcon: {
    fontSize: 16,
    color: '#888',
  },
  micIcon: {
    fontSize: 18,
  },
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCard: {
    width: '85%',
    backgroundColor: '#0d0d0d',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8533',
  },
  voiceMic: {
    fontSize: 44,
    marginBottom: 14,
  },
  voiceListeningText: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  voiceHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#FF8533',
    borderRadius: 2,
  },
  voiceCancel: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  voiceCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FF8533',
    letterSpacing: 1,
  },
  priceChip: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 0.4,
  },
  locButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FF8533',
    gap: 14,
  },
  locIcon: { fontSize: 18 },
  locTextWrap: { flex: 1 },
  locTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  locSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#22c55e',
    letterSpacing: 0.3,
  },
  locArrow: {
    fontSize: 22,
    color: '#FF8533',
    fontWeight: '500',
  },
  resultsScroll: {
    flex: 1,
    marginTop: 24,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
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
    borderBottomColor: '#0d0d0d',
  },
  resultIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIconWrapOrange: {
    borderColor: '#FF8533',
  },
  searchAnywhereRow: {
    backgroundColor: 'rgba(255,133,51,0.06)',
  },
  resultPin: { fontSize: 16 },
  resultTextWrap: { flex: 1 },
  resultName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  resultAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FF8533',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  resultDot: {
    fontSize: 10,
    color: '#666',
  },
  scoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  resultScouts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#22c55e',
    letterSpacing: 0.3,
  },
  resultRecentWhen: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#666',
    letterSpacing: 0.3,
  },
  resultArrow: {
    fontSize: 22,
    color: '#FF8533',
    fontWeight: '500',
  },
  noResults: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 12,
    lineHeight: 19,
  },
  emptySaved: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderStyle: 'dashed',
  },
  emptySavedTitle: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  emptySavedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
  },
});
