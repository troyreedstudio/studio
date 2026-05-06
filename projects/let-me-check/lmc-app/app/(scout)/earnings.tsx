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
  totalCard: {
    backgroundColor: '#0d1a0d',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1a3a1a',
    marginBottom: 22,
  },
  totalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#22c55e',
    letterSpacing: 3,
    marginBottom: 8,
  },
  totalValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 56,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalSub: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#22c55e',
  },
  upBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  upText: {
    fontFamily: 'Inter_700Bold',
    color: '#22c55e',
    fontSize: 11,
    letterSpacing: 0.5,
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
  chartCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 18,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
  },
  barColumn: { flex: 1, alignItems: 'center' },
  barAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#22c55e',
    marginBottom: 4,
    height: 14,
    letterSpacing: 0.3,
  },
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
  barDay: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#666',
    marginTop: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  barDayActive: { color: '#22c55e' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 22,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 19,
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statDivider: { width: 1, height: 28, backgroundColor: '#1e1e1e' },
  payoutRow: {
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
  payoutLeft: {},
  payoutDate: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  payoutClips: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.3,
  },
  payoutRight: { alignItems: 'flex-end', gap: 6 },
  payoutAmount: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.3,
  },
  statusBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgePaid: { backgroundColor: 'rgba(34,197,94,0.15)' },
  statusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#888',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusTextPaid: { color: '#22c55e' },
  ctaContainer: {
    backgroundColor: '#0d0d0d',
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  balanceLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.3,
  },
  balanceValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.4,
  },
  withdrawBtn: {
    backgroundColor: '#FAF6F0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  withdrawBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
});
