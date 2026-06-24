import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { addRecurring } from '../state/recurring';
import { usePaymentMethod } from '../state/payment-method';
import { createPaymentHold, recordHold } from '../lib/payments';
import { createCheck } from '../lib/checks';
import { colors } from '../lib/theme';

export default function PaymentScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [processing, setProcessing] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurringTime, setRecurringTime] = useState('08:00');
  const payment = usePaymentMethod();
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

  // Opens the Stripe PaymentSheet, authorizes a hold, then creates the check.
  // A declined / cancelled card blocks the booking (D-02, Uber-style).
  const handleConfirm = async () => {
    setProcessing(true);

    if (recurring) {
      addRecurring({
        id: `${venue}-${Date.now()}`,
        venueName: String(venue),
        address: String(city),
        freq: recurringFreq,
        time: recurringTime,
        marketId: 'mia',
        coord: [-80.1932, 25.7651],
      });
    }

    try {
      // Step 1: Authorize a hold server-side (D-01). Throws on card/network error.
      const hold = await createPaymentHold(tier === 'priority' ? 'priority' : 'standard');

      // Step 2: Init the Stripe PaymentSheet with the hold's client secret.
      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'Let Me Check',
        paymentIntentClientSecret: hold.clientSecret,
        customerId: hold.customerId,
        customerEphemeralKeySecret: hold.ephemeralKey,
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
        allowsDelayedPaymentMethods: false,
      });

      if (initErr) {
        setProcessing(false);
        Alert.alert("Couldn't set up payment", initErr.message ?? 'Please try again.');
        return;
      }

      // Step 3: Present the real Stripe PaymentSheet (Apple Pay / Google Pay / card).
      const { error: payErr } = await presentPaymentSheet();

      if (payErr) {
        // Card declined, cancelled, or invalid — block the booking (D-02).
        setProcessing(false);
        if (payErr.code !== 'Canceled') {
          Alert.alert(
            "Card couldn't be authorized",
            payErr.message ?? 'Please update your payment method and try again.',
            [{ text: 'Try Again', style: 'default' }],
          );
        }
        return;
      }

      // Step 4: Hold succeeded — now create the check (D-01 order enforced).
      // Pass the hold's PaymentIntent id so the check is LINKED to the hold —
      // capture-on-delivery needs it (without this the hold is orphaned).
      const checkId = await createCheck({
        tier: tier === 'priority' ? 'priority' : 'standard',
        locationLabel: String(venue),
        paymentIntentId: hold.paymentIntentId,
      });

      // Step 5: Write the payments row that links this check to its Stripe hold.
      // stripe-capture / stripe-refund / trouble-report all read payments by
      // check_id — without this row they return 404 and money cannot move.
      // Non-fatal if it fails: the check + hold exist and a backfill can repair.
      // Idempotent on the server (ON CONFLICT DO NOTHING).
      try {
        await recordHold(checkId);
      } catch (recordErr) {
        // Log but do NOT block navigation — Seeker's booking is already live.
        console.warn('[payment] recordHold failed (non-fatal):', recordErr);
      }

      setProcessing(false);
      router.replace({
        pathname: '/(seeker)/finding',
        params: {
          checkId,
          venue: String(venue),
          city: String(city),
          tier: String(tier),
          time: String(time),
        },
      });
    } catch (e) {
      setProcessing(false);
      Alert.alert(
        "Couldn't start your check",
        e instanceof Error ? e.message : 'Please try again in a moment.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
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

      {/* Recurring */}
      <TouchableOpacity
        style={[styles.shareCard, recurring && styles.shareCardActive]}
        activeOpacity={0.85}
        onPress={() => setRecurring(!recurring)}
      >
        <View style={[styles.shareCheck, recurring && styles.shareCheckActive]}>
          {recurring && <Text style={styles.shareCheckGlyph}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.shareTitleRow}>
            <Text style={styles.shareTitle}>Auto-check this location</Text>
            <Text style={styles.recBadge}>PLUS · PRO</Text>
          </View>
          <Text style={styles.shareSub}>
            {recurring
              ? `Auto-dispatch ${recurringFreq} at ${recurringTime}. Cancel anytime.`
              : 'Schedule a Scout to check this location automatically. Daily, weekly, or monthly.'}
          </Text>
          {recurring && (
            <View style={styles.recControls}>
              {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.recChip, recurringFreq === f && styles.recChipActive]}
                  onPress={() => setRecurringFreq(f)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.recChipText,
                      recurringFreq === f && styles.recChipTextActive,
                    ]}
                  >
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.recTimePill}>
                <Text style={styles.recTimeText}>{recurringTime}</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>

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

      {/* Payment Method — tapping opens Stripe PaymentSheet directly */}
      <TouchableOpacity
        style={styles.paymentMethod}
        activeOpacity={0.85}
        onPress={handleConfirm}
        disabled={processing}
      >
        {payment.card ? (
          <>
            <Text style={styles.paymentMethodLabel}>
              {payment.card.brand === 'ApplePay' ? ' ' : '💳  '}
              {payment.card.brand === 'ApplePay'
                ? 'Apple Pay'
                : `${payment.card.brand} •••• ${payment.card.last4}`}
            </Text>
            <Text style={styles.changeText}>Change</Text>
          </>
        ) : (
          <>
            <Text style={styles.paymentMethodLabel}>+ Add payment method</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </>
        )}
      </TouchableOpacity>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            processing && styles.ctaButtonProcessing,
          ]}
          disabled={processing}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {processing ? 'AUTHORIZING…' : 'CONFIRM & FIND MY SCOUT'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          {processing
            ? 'Authorizing with Stripe…'
            : 'Your card is held now and only charged once your video is delivered.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  header: { paddingTop: 12, paddingBottom: 22 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 15,
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
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
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  rowValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  totalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  divider: { height: 1, backgroundColor: colors.border },
  tierBadge: {
    backgroundColor: colors.border,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierBadgePriority: { backgroundColor: 'rgba(255,203,71,0.18)' },
  tierBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  tierBadgeTextPriority: { color: colors.amber },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  shareCardActive: {
    backgroundColor: 'rgba(218,37,29,0.04)',
    borderColor: colors.red,
  },
  shareCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  shareCheckActive: { backgroundColor: colors.red, borderColor: colors.red },
  shareCheckGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.onRed,
  },
  shareTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shareTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  shareSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  recBadge: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: colors.verified,
    letterSpacing: 1.2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.3)',
    overflow: 'hidden',
  },
  recControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  recChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  recChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  recChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  recChipTextActive: { color: colors.onRed },
  recTimePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recTimeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  deliveryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryEmoji: { fontSize: 18 },
  deliveryTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  deliveryTime: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  liveBlipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  liveBlip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.verified },
  liveLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.verified,
    letterSpacing: 1.5,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  paymentMethodLabel: {
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
    fontSize: 13.5,
    letterSpacing: 0.3,
  },
  changeText: {
    fontFamily: 'Inter_700Bold',
    color: colors.red,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  ctaContainer: { marginTop: 'auto', paddingBottom: 8 },
  ctaButton: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonProcessing: {
    backgroundColor: colors.borderStrong,
    opacity: 0.85,
  },
  ctaButtonText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 2.5,
  },
  disclaimer: {
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
