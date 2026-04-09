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
        <Text style={styles.subtitle}>Your check has been sent to the user</Text>

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
            <Text style={styles.statValue}>60s</Text>
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
          <Text style={styles.ratingLabel}>User rated your clip</Text>
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
            onPress={() => router.push('/(checker)/dashboard')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>KEEP EARNING</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(checker)/earnings')}
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
  checkMark: { fontSize: 44, color: '#22c55e', fontWeight: '900' },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 28 },
  earningsGroup: {
    backgroundColor: '#0d1a0d',
    borderRadius: 18,
    width: '100%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    marginBottom: 16,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  earningLabel: { fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 1.5 },
  earningValue: { fontSize: 24, fontWeight: '900', color: '#22c55e' },
  balanceValue: { fontSize: 24, fontWeight: '900', color: '#fff' },
  earningDivider: { height: 1, backgroundColor: '#1a2e1a' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 14,
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#555', fontWeight: '600' },
  statDivider: { width: 1, height: 30, backgroundColor: '#1e1e1e' },
  ratingCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    width: '100%',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 24,
  },
  ratingLabel: { color: '#888', fontSize: 12, marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  star: { fontSize: 24, color: '#222' },
  starActive: { color: '#f59e0b' },
  ratingNote: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  buttonsGroup: { width: '100%', gap: 10, marginTop: 'auto' },
  primaryBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 1 },
});
