import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

const LIVE_FEED = [
  'Just verified: Komodo · Brickell · 2 min ago',
  'Just verified: JFK Terminal 4 · 4 min ago',
  'Just verified: Soho House New York · 6 min ago',
  'Just verified: DMV - Miami Beach · 8 min ago',
  'Just verified: Equinox Hudson Yards · 11 min ago',
  'Just verified: Heathrow Terminal 5 · 13 min ago',
  'Just verified: Apple Fifth Avenue · 16 min ago',
  'Just verified: Nikki Beach Miami · 18 min ago',
  'Just verified: Burj Al Arab · 21 min ago',
];

const FEATURED = [
  {
    id: 'f1',
    name: 'Nightlife',
    city: 'Tonight',
    vibe: 'Doors · Lines · Crowd',
    image: require('../../assets/splash-assets/featured-1.jpg'),
  },
  {
    id: 'f2',
    name: 'Airports',
    city: 'Worldwide',
    vibe: 'Terminal Lines · Traffic',
    image: require('../../assets/splash-assets/featured-2.jpg'),
  },
  {
    id: 'f3',
    name: 'Events',
    city: 'Live',
    vibe: 'Doors · Pit · Stage',
    image: require('../../assets/splash-assets/featured-3.jpg'),
  },
  {
    id: 'f4',
    name: 'Retail',
    city: 'In-store',
    vibe: 'Queues · Drops · Sales',
    image: require('../../assets/splash-assets/featured-4.jpg'),
  },
];

const CITIES = ['All', 'Miami', 'New York', 'Los Angeles', 'London', 'Dubai'];

const VENUES = [
  { id: '1', name: 'Komodo', city: 'Miami', vibe: 'Rooftop Bar' },
  { id: '2', name: '1 OAK', city: 'New York', vibe: 'Nightclub' },
  { id: '3', name: 'The Nice Guy', city: 'Los Angeles', vibe: 'Restaurant & Bar' },
  { id: '4', name: 'Catch LA', city: 'Los Angeles', vibe: 'Rooftop' },
  { id: '5', name: 'Fabric', city: 'London', vibe: 'Underground Club' },
  { id: '6', name: 'White Dubai', city: 'Dubai', vibe: 'Beach Club' },
  { id: '7', name: 'Swan Miami', city: 'Miami', vibe: 'Restaurant & Bar' },
];

const POPULAR = [
  { label: 'Restaurants' },
  { label: 'Gyms' },
  { label: 'DMV / Gov' },
  { label: 'Real Estate' },
  { label: 'Movie Theaters' },
  { label: 'Hotels' },
  { label: 'Beach Clubs' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState('All');
  const [feedIdx, setFeedIdx] = useState(0);

  // Rotate live activity feed every 4 seconds
  useEffect(() => {
    const t = setInterval(() => {
      setFeedIdx((i) => (i + 1) % LIVE_FEED.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const filteredVenues =
    selectedCity === 'All'
      ? VENUES
      : VENUES.filter((v) => v.city === selectedCity);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Know Before You Go</Text>
            <View style={styles.greetingRule} />
          </View>
          <TouchableOpacity
            style={styles.profilePill}
            onPress={() => router.push('/(seeker)/profile')}
          >
            <Text style={styles.profileInitials}>TR</Text>
          </TouchableOpacity>
        </View>

        {/* City Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cityScroll}
          contentContainerStyle={styles.cityRow}
        >
          {CITIES.map((city) => {
            const isActive = city === selectedCity;
            return (
              <TouchableOpacity
                key={city}
                style={[styles.cityPill, isActive && styles.cityPillActive]}
                onPress={() => setSelectedCity(city)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cityPillText, isActive && styles.cityPillTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>FEATURED QUEUES</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredRow}
        >
          {FEATURED.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.featuredCard}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: '/(seeker)/venue',
                  params: { name: item.name, city: item.city },
                })
              }
            >
              <ImageBackground source={item.image} style={styles.featuredImage} imageStyle={{ borderRadius: 14 }}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.9)']}
                  locations={[0.3, 1]}
                  style={styles.featuredGradient}
                />
                <View style={styles.featuredContent}>
                  <View style={styles.featuredTextBlock}>
                    <Text style={styles.featuredName}>{item.name}</Text>
                    <Text style={styles.featuredVibe}>{item.vibe}</Text>
                  </View>
                  <View style={styles.featuredCta}>
                    <Text style={styles.featuredCtaText}>CHECK</Text>
                    <Text style={styles.featuredCtaArrow}>›</Text>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Big CTA: Where do you need eyes? — opens search */}
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.85}
          onPress={() => router.push('/(seeker)/search')}
        >
          <Text style={styles.ctaIcon}>🔍</Text>
          <View style={styles.ctaTextWrap}>
            <Text style={styles.ctaTitle}>Where do you need eyes?</Text>
            <Text style={styles.ctaSubtitle}>TAP TO SEARCH ANY LOCATION</Text>
          </View>
          <Text style={styles.ctaArrow}>›</Text>
        </TouchableOpacity>

        {/* Plain-English value prop + live network signal under CTA */}
        <Text style={styles.trustItem}>Get a 30-second video in 7-10 min · from $15</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>142 Scouts ready near you</Text>
        </View>

        {/* Live activity ticker — rotates through recent verifications */}
        <View style={styles.tickerRow}>
          <Text style={styles.tickerCheck}>✓</Text>
          <Text style={styles.tickerText} numberOfLines={1}>{LIVE_FEED[feedIdx]}</Text>
        </View>

        {/* POPULAR */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>POPULAR QUEUES TO CHECK</Text>
        </View>
        <View style={styles.popularList}>
          {POPULAR.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.popularRowCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(seeker)/venue',
                  params: { name: item.label, city: 'Nearby' },
                })
              }
            >
              <Text style={styles.popularItemLabel}>{item.label}</Text>
              <Text style={styles.popularArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nav Footer */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(seeker)/history')}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navLabel}>Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(seeker)/profile')}>
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontFamily: 'BodoniModa_700Bold', fontSize: 28, color: '#fff', letterSpacing: 0.3 },
  greetingRule: { height: 2, width: 36, backgroundColor: '#FF8533', marginTop: 8 },
  profilePill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 13, letterSpacing: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', color: '#fff', fontSize: 14, letterSpacing: 0.3 },
  cityScroll: { marginBottom: 4 },
  cityRow: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  cityPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
  },
  cityPillActive: { backgroundColor: '#fff', borderColor: '#fff' },
  cityPillText: { fontFamily: 'Inter_500Medium', color: '#dddddd', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  cityPillTextActive: { color: '#000' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 3,
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBlip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F47B20',
  },
  liveLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#F47B20', letterSpacing: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderRadius: 50,
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 22,
    paddingVertical: 18,
    paddingHorizontal: 22,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaIcon: {
    fontSize: 18,
  },
  ctaTextWrap: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 19,
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },
  ctaSubtitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    color: '#FF6B1A',
    letterSpacing: 2.2,
    marginTop: 4,
  },
  ctaArrow: {
    fontSize: 22,
    color: '#FF6B1A',
    fontWeight: '500',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FF8533',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -6,
    marginBottom: 22,
    gap: 8,
    flexWrap: 'wrap',
  },
  trustItem: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#cccccc',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 6,
    paddingHorizontal: 24,
  },
  trustDot: {
    fontSize: 10,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    color: '#22c55e',
    letterSpacing: 1.6,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 6,
    marginBottom: 22,
    gap: 6,
  },
  tickerCheck: {
    fontSize: 10,
    color: '#22c55e',
    fontWeight: '700',
  },
  tickerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: '#888',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  savedEmpty: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderStyle: 'dashed',
  },
  savedEmptyTitle: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  savedEmptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  savedScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
    marginBottom: 24,
  },
  savedCard: {
    width: 200,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  savedCardName: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 18,
    color: '#fff',
    marginBottom: 2,
  },
  savedCardCity: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  savedCardLast: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#666',
    marginBottom: 10,
  },
  savedCardCta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF6B1A',
    letterSpacing: 2,
  },
  popularList: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 8,
  },
  popularRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  popularEmoji: { fontSize: 22 },
  popularItemLabel: {
    flex: 1,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 0.3,
  },
  popularArrow: {
    fontSize: 22,
    color: '#FF6B1A',
    fontWeight: '500',
  },
  featuredTagSmall: { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#666', letterSpacing: 2 },
  featuredRow: { paddingHorizontal: 20, gap: 12, flexDirection: 'row', paddingBottom: 4 },
  featuredCard: {
    width: 280,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  featuredImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  featuredContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  featuredTextBlock: {
    flex: 1,
    marginRight: 10,
  },
  featuredName: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featuredVibe: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: '#ffffff',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  featuredCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: '#FF8533',
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 6,
    gap: 4,
  },
  featuredCtaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FF8533',
    letterSpacing: 1.5,
  },
  featuredCtaArrow: {
    fontSize: 13,
    color: '#FF8533',
    fontWeight: '600',
    marginTop: -1,
  },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  venuePhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  venuePhotoText: { fontFamily: 'GFSDidot_400Regular', fontSize: 26, color: '#666', letterSpacing: 1 },
  venueInfo: { flex: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  orangeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F47B20' },
  liveText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#F47B20', letterSpacing: 2 },
  venueName: { fontFamily: 'GFSDidot_400Regular', fontSize: 22, color: '#fff', marginBottom: 4, letterSpacing: 0.5 },
  venueCity: { fontFamily: 'Inter_300Light', fontSize: 12, color: '#888', letterSpacing: 0.5 },
  venueArrow: { paddingLeft: 8 },
  arrowText: { fontSize: 22, color: '#444' },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'Inter_500Medium',
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  emptyStateSub: {
    fontFamily: 'Inter_300Light',
    color: '#555',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingBottom: 24,
    paddingTop: 12,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navIcon: { fontSize: 20 },
  navLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' },
  navLabelActive: { color: '#fff' },
});
