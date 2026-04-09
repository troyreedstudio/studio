import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

const BAR_DATA = [
  { day: 'Mon', value: 45, amount: '$45' },
  { day: 'Tue', value: 80, amount: '$80' },
  { day: 'Wed', value: 60, amount: '$60' },
  { day: 'Thu', value: 95, amount: '$95' },
  { day: 'Fri', value: 100, amount: '$127' },
  { day: 'Sat', value: 30, amount: '$30' },
  { day: 'Sun', value: 10, amount: '$10' },
];

const MAX_BAR_HEIGHT = 100;

const PAYOUTS = [
  { id: '1', date: 'Mar 27, 2026', clips: 12, amount: '$127.00', status: 'Pending' },
  { id: '2', date: 'Mar 20, 2026', clips: 9, amount: '$94.50', status: 'Paid' },
  { id: '3', date: 'Mar 13, 2026', clips: 11, amount: '$115.50', status: 'Paid' },
  { id: '4', date: 'Mar 6, 2026', clips: 8, amount: '$84.00', status: 'Paid' },
];

export default function EarningsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>EARNINGS</Text>
        </View>

        {/* Big Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>THIS MONTH</Text>
          <Text style={styles.totalValue}>$347.00</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalSub}>+$127 today</Text>
            <View style={styles.upBadge}>
              <Text style={styles.upText}>↑ 23%</Text>
            </View>
          </View>
        </View>

        {/* Bar Chart */}
        <Text style={styles.sectionLabel}>THIS WEEK</Text>
        <View style={styles.chartCard}>
          <View style={styles.barsRow}>
            {BAR_DATA.map((bar) => (
              <View key={bar.day} style={styles.barColumn}>
                <Text style={styles.barAmount}>{bar.value === 100 ? bar.amount : ''}</Text>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: (bar.value / 100) * MAX_BAR_HEIGHT,
                        backgroundColor: bar.value === 100 ? '#22c55e' : '#1a2e1a',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barDay, bar.value === 100 && styles.barDayActive]}>
                  {bar.day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>28</Text>
            <Text style={styles.statLabel}>Clips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>$12</Text>
            <Text style={styles.statLabel}>Avg/Clip</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Delivery</Text>
          </View>
        </View>

        {/* Recent Payouts */}
        <Text style={styles.sectionLabel}>RECENT PAYOUTS</Text>
        {PAYOUTS.map((payout) => (
          <View key={payout.id} style={styles.payoutRow}>
            <View style={styles.payoutLeft}>
              <Text style={styles.payoutDate}>{payout.date}</Text>
              <Text style={styles.payoutClips}>{payout.clips} clips delivered</Text>
            </View>
            <View style={styles.payoutRight}>
              <Text style={styles.payoutAmount}>{payout.amount}</Text>
              <View style={[styles.statusBadge, payout.status === 'Paid' && styles.statusBadgePaid]}>
                <Text style={[styles.statusText, payout.status === 'Paid' && styles.statusTextPaid]}>
                  {payout.status}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Available to withdraw</Text>
            <Text style={styles.balanceValue}>$137.00</Text>
          </View>
          <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.85}>
            <Text style={styles.withdrawBtnText}>WITHDRAW TO BANK</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backText: { color: '#888', fontSize: 16, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  totalCard: {
    backgroundColor: '#0d1a0d',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    marginBottom: 20,
  },
  totalLabel: { fontSize: 11, color: '#22c55e', fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  totalValue: { fontSize: 52, fontWeight: '900', color: '#fff', marginBottom: 8 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalSub: { fontSize: 14, color: '#22c55e', fontWeight: '600' },
  upBadge: {
    backgroundColor: '#14532d',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  upText: { color: '#22c55e', fontSize: 12, fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#555',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 16,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
  },
  barColumn: { flex: 1, alignItems: 'center' },
  barAmount: { fontSize: 8, color: '#22c55e', fontWeight: '700', marginBottom: 2, height: 14 },
  barWrapper: {
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
    width: '70%',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
    width: '100%',
  },
  barDay: { fontSize: 10, color: '#555', marginTop: 6, fontWeight: '600' },
  barDayActive: { color: '#22c55e' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 20,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#555', fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: '#1e1e1e' },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  payoutLeft: {},
  payoutDate: { fontSize: 14, color: '#fff', fontWeight: '600', marginBottom: 2 },
  payoutClips: { fontSize: 12, color: '#555' },
  payoutRight: { alignItems: 'flex-end', gap: 6 },
  payoutAmount: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statusBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgePaid: { backgroundColor: '#14532d' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#555' },
  statusTextPaid: { color: '#22c55e' },
  ctaContainer: {
    backgroundColor: '#111',
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  balanceLabel: { fontSize: 14, color: '#888' },
  balanceValue: { fontSize: 22, fontWeight: '900', color: '#fff' },
  withdrawBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  withdrawBtnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
