import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

const CHECKS = [
  { id: '1', venue: 'Komodo', city: 'Miami', date: 'Mar 27, 2026', tier: 'PRIORITY', rating: 5, price: '$22' },
  { id: '2', venue: 'White Dubai', city: 'Dubai', date: 'Mar 20, 2026', tier: 'STANDARD', rating: 4, price: '$16.50' },
  { id: '3', venue: '1 OAK', city: 'New York', date: 'Mar 15, 2026', tier: 'STANDARD', rating: 5, price: '$16.50' },
  { id: '4', venue: 'Fabric', city: 'London', date: 'Mar 8, 2026', tier: 'PRIORITY', rating: 4, price: '$22' },
  { id: '5', venue: 'Swan Miami', city: 'Miami', date: 'Feb 28, 2026', tier: 'STANDARD', rating: 3, price: '$16.50' },
];

export default function HistoryScreen() {
  const router = useRouter();

  const totalSpent = CHECKS.reduce((sum, c) => {
    const val = parseFloat(c.price.replace('$', ''));
    return sum + val;
  }, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Activity</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{CHECKS.length}</Text>
            <Text style={styles.statLabel}>Total Checks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.2★</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['All', 'This Month', 'Priority', 'Standard'].map((f, i) => (
            <TouchableOpacity key={f} style={[styles.filter, i === 0 && styles.filterActive]}>
              <Text style={[styles.filterText, i === 0 && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Checks List */}
        <Text style={styles.sectionLabel}>RECENT CHECKS</Text>
        {CHECKS.map((check) => (
          <TouchableOpacity key={check.id} style={styles.checkCard} activeOpacity={0.8}>
            <View style={styles.checkLeft}>
              <View style={styles.venueAvatar}>
                <Text style={styles.venueAvatarText}>{check.venue[0]}</Text>
              </View>
              <View style={styles.checkInfo}>
                <Text style={styles.checkVenue}>{check.venue}</Text>
                <Text style={styles.checkCity}>{check.city} · {check.date}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Text
                      key={s}
                      style={[styles.star, s <= check.rating && styles.starActive]}
                    >
                      ★
                    </Text>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.checkRight}>
              <View style={[styles.tierPill, check.tier === 'PRIORITY' && styles.tierPillPriority]}>
                <Text style={[styles.tierPillText, check.tier === 'PRIORITY' && styles.tierPillTextPriority]}>
                  {check.tier}
                </Text>
              </View>
              <Text style={styles.checkPrice}>{check.price}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: '#FF8533',
    fontSize: 14,
    marginBottom: 14,
  },
  title: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 30,
    color: '#fff',
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statDivider: { width: 1, height: 36, backgroundColor: '#1e1e1e' },
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 18 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    backgroundColor: '#0d0d0d',
  },
  filterActive: { backgroundColor: '#fff', borderColor: '#fff' },
  filterText: {
    fontFamily: 'Inter_700Bold',
    color: '#888',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  filterTextActive: { color: '#000' },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  checkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  checkLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  venueAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  venueAvatarText: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 22,
    color: '#666',
    letterSpacing: 0.3,
  },
  checkInfo: { flex: 1 },
  checkVenue: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  checkCity: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  starsRow: { flexDirection: 'row' },
  star: { fontSize: 12, color: '#222' },
  starActive: { color: '#f59e0b' },
  checkRight: { alignItems: 'flex-end', gap: 6 },
  tierPill: {
    backgroundColor: '#1a1a1a',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tierPillPriority: { backgroundColor: 'rgba(245,158,11,0.15)' },
  tierPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#888',
    letterSpacing: 1.5,
  },
  tierPillTextPriority: { color: '#f59e0b' },
  checkPrice: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
