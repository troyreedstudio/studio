import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function SubmittedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Success Animation area */}
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.title}>CLIP DELIVERED!</Text>
        <Text style={styles.subtitle}>Your check has been sent to the Seeker</Text>

        {/* Earnings Cards */}
        <View style={styles.earningsGroup}>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>EARNED THIS CLIP</Text>
            <Text style={styles.earningValue}>$10.00</Text>
          </View>
          <View style={styles.earningDivider} />
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>TOTAL BALANCE</Text>
            <Text style={styles.balanceValue}>$137.00</Text>
          </View>
        </View>

        {/* Clip Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>30s</Text>
            <Text style={styles.statLabel}>Clip Length</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>HD</Text>
            <Text style={styles.statLabel}>Quality</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4m 32s</Text>
            <Text style={styles.statLabel}>Delivery Time</Text>
          </View>
        </View>

        {/* Rating from user */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>Seeker rated your clip</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Text key={s} style={[styles.star, s <= 5 && styles.starActive]}>★</Text>
            ))}
          </View>
          <Text style={styles.ratingNote}>"Great clip, exactly what I needed!"</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsGroup}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(scout)/dashboard')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>KEEP EARNING</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(scout)/earnings')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>WITHDRAW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#14532d',
    borderWidth: 3,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkMark: {
    fontFamily: 'Inter_700Bold',
    fontSize: 44,
    color: '#22c55e',
  },
  title: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 30,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    marginBottom: 30,
    letterSpacing: 0.3,
  },
  earningsGroup: {
    backgroundColor: '#0d1a0d',
    borderRadius: 18,
    width: '100%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a3a1a',
    marginBottom: 14,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  earningLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    color: '#22c55e',
    letterSpacing: 2.5,
  },
  earningValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 26,
    color: '#22c55e',
    letterSpacing: 0.3,
  },
  balanceValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 26,
    color: '#fff',
    letterSpacing: 0.3,
  },
  earningDivider: { height: 1, backgroundColor: '#1a3a1a' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 14,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 19,
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
  statDivider: { width: 1, height: 30, backgroundColor: '#1e1e1e' },
  ratingCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    width: '100%',
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 24,
  },
  ratingLabel: {
    fontFamily: 'Inter_500Medium',
    color: '#888',
    fontSize: 11.5,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  starsRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  star: { fontSize: 24, color: '#222' },
  starActive: { color: '#f59e0b' },
  ratingNote: {
    fontFamily: 'CormorantGaramond_400Regular',
    color: '#cccccc',
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  buttonsGroup: { width: '100%', gap: 10, marginTop: 'auto' },
  primaryBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    fontSize: 13,
    letterSpacing: 2.5,
  },
});
