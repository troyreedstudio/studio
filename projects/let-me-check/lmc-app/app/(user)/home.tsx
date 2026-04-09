import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

const CITIES = ['Miami', 'New York', 'London', 'Dubai'];

const VENUES = [
  { id: '1', name: 'Komodo', city: 'Miami', vibe: 'Rooftop Bar' },
  { id: '2', name: '1 OAK', city: 'New York', vibe: 'Nightclub' },
  { id: '3', name: 'Fabric', city: 'London', vibe: 'Underground Club' },
  { id: '4', name: 'White Dubai', city: 'Dubai', vibe: 'Beach Club' },
  { id: '5', name: 'Swan Miami', city: 'Miami', vibe: 'Restaurant & Bar' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening 👋</Text>
            <Text style={styles.subGreeting}>Where are you headed tonight?</Text>
          </View>
          <TouchableOpacity
            style={styles.profilePill}
            onPress={() => router.push('/(user)/profile')}
          >
            <Text style={styles.profileInitials}>TR</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search venues..."
            placeholderTextColor="#555"
            returnKeyType="search"
          />
        </View>

        {/* City Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cityScroll}
          contentContainerStyle={styles.cityRow}
        >
          {CITIES.map((city, i) => (
            <TouchableOpacity
              key={city}
              style={[styles.cityPill, i === 0 && styles.cityPillActive]}
            >
              <Text style={[styles.cityPillText, i === 0 && styles.cityPillTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trending Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRENDING TONIGHT</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveBlip} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        </View>

        {/* Venue Cards */}
        {VENUES.map((venue) => (
          <TouchableOpacity
            key={venue.id}
            style={styles.venueCard}
            onPress={() =>
              router.push({
                pathname: '/(user)/venue',
                params: { name: venue.name, city: venue.city },
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.venuePhotoPlaceholder}>
              <Text style={styles.venuePhotoText}>{venue.name[0]}</Text>
            </View>
            <View style={styles.venueInfo}>
              <View style={styles.liveRow}>
                <View style={styles.greenDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.venueName}>{venue.name}</Text>
              <Text style={styles.venueCity}>{venue.city} · {venue.vibe}</Text>
            </View>
            <View style={styles.venueArrow}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Nav Footer */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(user)/history')}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(user)/profile')}>
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
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff' },
  subGreeting: { fontSize: 14, color: '#888', marginTop: 2 },
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
  profileInitials: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
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
  cityPillText: { color: '#888', fontSize: 13, fontWeight: '600' },
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
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBlip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  liveLabel: { fontSize: 11, color: '#22c55e', fontWeight: '700', letterSpacing: 1 },
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
  venuePhotoText: { fontSize: 22, fontWeight: '700', color: '#444' },
  venueInfo: { flex: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveText: { fontSize: 10, color: '#22c55e', fontWeight: '700', letterSpacing: 1 },
  venueName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  venueCity: { fontSize: 12, color: '#888' },
  venueArrow: { paddingLeft: 8 },
  arrowText: { fontSize: 22, color: '#444' },
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
  navLabel: { fontSize: 10, color: '#555', fontWeight: '600' },
  navLabelActive: { color: '#fff' },
});
