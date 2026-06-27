import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { requestPayout } from '../lib/payments';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

export default function WithdrawScreen() {
  const router = useRouter();
  // available + payoutSpeed come from earnings.tsx via router.push params (D-06).
  // Fall back to 0 / 'standard' if navigated to directly.
  const { available: availableParam, payoutSpeed: speedParam } = useLocalSearchParams<{
    available?: string;
    payoutSpeed?: string;
  }>();

  const AVAILABLE = parseFloat(availableParam ?? '0') || 0;
  const speed = (speedParam === 'instant' ? 'instant' : 'standard') as 'instant' | 'standard';

  // Build quick-amount presets dynamically from the real available balance.
  const QUICK_AMOUNTS = ['$25', '$50', '$100', `All ($${AVAILABLE.toFixed(2)})`];

  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const handleQuick = (preset: string) => {
    if (preset.startsWith('All')) {
      setAmount(AVAILABLE.toFixed(2));
    } else {
      setAmount(preset.replace('$', ''));
    }
  };

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    setProcessing(true);
    try {
      const amountCents = Math.round(numAmount * 100);
      await requestPayout(amountCents, speed);
      setPaidAmount(numAmount);
      setSuccess(true);
      // Route back to earnings after a short success moment.
      setTimeout(() => router.replace('/(scout)/earnings'), 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Withdrawal failed', msg);
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Withdrawal Sent</Text>
          <Text style={styles.successAmount}>${paidAmount.toFixed(2)}</Text>
          <Text style={styles.successSub}>
            {speed === 'instant'
              ? 'Funds arrive in your bank in ~30 minutes.'
              : 'Funds will arrive in your bank account in 1 to 2 business days.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const validAmount = numAmount > 0 && numAmount <= AVAILABLE;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Withdraw</Text>
          <Text style={styles.subtitle}>Cash out your earnings to your bank</Text>
        </View>

        {/* Available balance — real value from route params */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE TO WITHDRAW</Text>
          <Text style={styles.balanceValue}>${AVAILABLE.toFixed(2)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.statusDot} />
            <Text style={styles.balanceStatus}>Cleared and ready. No pending holds.</Text>
          </View>
        </View>

        {/* Amount input */}
        <Text style={styles.sectionLabel}>AMOUNT</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Quick presets */}
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.quickChip}
              onPress={() => handleQuick(q)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bank destination */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>DEPOSITS TO</Text>
        <View style={styles.bankCard}>
          <View style={[styles.bankIcon, styles.bankIconRed]}>
            <Ionicons name="business-outline" size={20} color={colors.red} />
          </View>
          <View style={styles.bankInfo}>
            <Text style={styles.bankName}>Chase Checking</Text>
            <Text style={styles.bankNumber}>···· ···· ···· 6193, Troy R.</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(scout)/payout-method' as never)}>
            <Text style={styles.changeText}>CHANGE</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />

        {/* Withdraw button — calls real requestPayout, no setTimeout */}
        <TouchableOpacity
          style={[
            styles.withdrawBtn,
            (!validAmount || processing) && styles.withdrawBtnDisabled,
            validAmount && !processing && ctaGlowShadow,
          ]}
          disabled={!validAmount || processing}
          onPress={handleWithdraw}
          activeOpacity={0.85}
        >
          {validAmount && !processing && <CtaGlow radius={14} />}
          <Text style={styles.withdrawBtnText}>
            {processing
              ? 'PROCESSING...'
              : numAmount > 0
              ? `WITHDRAW $${numAmount.toFixed(2)}`
              : 'WITHDRAW'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          {processing
            ? 'Securely transferring via Stripe Connect...'
            : speed === 'instant'
            ? 'Powered by Stripe Connect, ~30 min, 1.5% fee'
            : 'Powered by Stripe Connect, 1 to 2 business days, no fees'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 15,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 27,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  balanceCard: {
    backgroundColor: 'rgba(22,163,74,0.06)',
    borderRadius: 18,
    marginHorizontal: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    marginBottom: 26,
  },
  balanceLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.verified,
    letterSpacing: 3,
    marginBottom: 8,
  },
  balanceValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 44,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.verified,
  },
  balanceStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.verified,
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  dollarSign: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 32,
    color: colors.textTertiary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 36,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    padding: 0,
  },
  quickRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, flexWrap: 'wrap' },
  quickChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankIconRed: {
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderColor: 'rgba(218,37,29,0.20)',
  },
  bankInfo: { flex: 1 },
  bankName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  bankNumber: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  changeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.red,
    letterSpacing: 1.5,
  },
  withdrawBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    marginHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  withdrawBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  withdrawBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 2.5,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    paddingHorizontal: 32,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(22,163,74,0.10)',
    borderWidth: 2,
    borderColor: colors.verified,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  successCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    color: colors.verified,
  },
  successTitle: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  successAmount: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 44,
    color: colors.verified,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  successSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.3,
  },
});
