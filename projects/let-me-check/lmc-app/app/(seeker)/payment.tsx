import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

export default function PaymentScreen() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const {
    venue = 'Komodo',
    city = 'Miami',
    tier = 'standard',
    price = '$15',
    time = '10 min',
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
          style={[styles.ctaButton, processing && styles.ctaButtonProcessing]}
          disabled={processing}
          onPress={() => {
            setProcessing(true);
            setTimeout(() => {
              setProcessing(false);
              router.push({
                pathname: '/(seeker)/waiting',
                params: { venue, city, tier, time },
              });
            }, 1800);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {processing ? 'PROCESSING PAYMENT...' : `CONFIRM & PAY ${total}`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          {processing ? 'Securing your payment with Stripe...' : 'Secure payment · No refunds after scout departs'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  header: { paddingTop: 12, paddingBottom: 22 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: '#FF8533',
    fontSize: 14,
    marginBottom: 18,
  },
  title: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 26,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.3,
  },
  rowValue: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  totalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.4,
  },
  divider: { height: 1, backgroundColor: '#1a1a1a' },
  tierBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierBadgePriority: { backgroundColor: 'rgba(245,158,11,0.15)' },
  tierBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#fff',
    letterSpacing: 1.5,
  },
  tierBadgeTextPriority: { color: '#f59e0b' },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1a0d',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a3a1a',
    marginBottom: 12,
    gap: 12,
  },
  deliveryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a3a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryEmoji: { fontSize: 18 },
  deliveryTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#22c55e',
    letterSpacing: 2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  deliveryTime: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 20,
    color: '#22c55e',
    letterSpacing: 0.3,
  },
  liveBlipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  liveBlip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  liveLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#22c55e',
    letterSpacing: 1.5,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 24,
  },
  paymentMethodLabel: {
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    fontSize: 13.5,
    letterSpacing: 0.3,
  },
  changeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF8533',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  ctaContainer: { marginTop: 'auto', paddingBottom: 8 },
  ctaButton: {
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonProcessing: {
    backgroundColor: '#cccccc',
    opacity: 0.85,
  },
  ctaButtonText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    color: '#666',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
