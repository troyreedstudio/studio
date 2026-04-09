import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PaymentScreen() {
  const router = useRouter();
  const {
    venue = 'Komodo',
    city = 'Miami',
    tier = 'standard',
    price = '$15',
    time = '15 min',
  } = useLocalSearchParams<{
    venue: string;
    city: string;
    tier: string;
    price: string;
    time: string;
  }>();

  const isPriority = tier === 'priority';
  const fee = isPriority ? '$2.00' : '$1.50';
  const total = isPriority ? '$22.00' : '$16.50';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CONFIRM YOUR CHECK</Text>
        <Text style={styles.subtitle}>Review before you pay</Text>
      </View>

      {/* Order Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ORDER SUMMARY</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Venue</Text>
          <Text style={styles.rowValue}>{venue}, {city}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Check Type</Text>
          <View style={[styles.tierBadge, isPriority && styles.tierBadgePriority]}>
            <Text style={[styles.tierBadgeText, isPriority && styles.tierBadgeTextPriority]}>
              {isPriority ? 'PRIORITY' : 'STANDARD'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Check Fee</Text>
          <Text style={styles.rowValue}>{price}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Platform Fee</Text>
          <Text style={styles.rowValue}>{fee}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>
      </View>

      {/* Delivery Time */}
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryIcon}>
          <Text style={styles.deliveryEmoji}>⚡</Text>
        </View>
        <View>
          <Text style={styles.deliveryTitle}>Estimated Delivery</Text>
          <Text style={styles.deliveryTime}>~{time}</Text>
        </View>
        <View style={styles.liveBlipContainer}>
          <View style={styles.liveBlip} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.paymentMethod}>
        <Text style={styles.paymentMethodLabel}>💳  Visa •••• 4242</Text>
        <TouchableOpacity>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() =>
            router.push({
              pathname: '/(user)/waiting',
              params: { venue, city, tier, time },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>CONFIRM & PAY {total}</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Secure payment · No refunds after checker departs</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  header: { paddingTop: 12, paddingBottom: 20 },
  backText: { color: '#888', fontSize: 16, marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: { fontSize: 13, color: '#888' },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#555',
    letterSpacing: 2,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 14, color: '#888' },
  rowValue: { fontSize: 14, color: '#fff', fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#fff' },
  divider: { height: 1, backgroundColor: '#1a1a1a' },
  tierBadge: {
    backgroundColor: '#222',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierBadgePriority: { backgroundColor: '#2a1f00' },
  tierBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  tierBadgeTextPriority: { color: '#f59e0b' },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1a0d',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    marginBottom: 12,
    gap: 12,
  },
  deliveryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a2e1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryEmoji: { fontSize: 18 },
  deliveryTitle: { fontSize: 12, color: '#888', marginBottom: 2 },
  deliveryTime: { fontSize: 18, fontWeight: '800', color: '#22c55e' },
  liveBlipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  liveBlip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  liveLabel: { fontSize: 11, color: '#22c55e', fontWeight: '700' },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 24,
  },
  paymentMethodLabel: { color: '#fff', fontSize: 14 },
  changeText: { color: '#888', fontSize: 13 },
  ctaContainer: { marginTop: 'auto', paddingBottom: 8 },
  ctaButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaButtonText: { color: '#000', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  disclaimer: { textAlign: 'center', color: '#444', fontSize: 11 },
});
