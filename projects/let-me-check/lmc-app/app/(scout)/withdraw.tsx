import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { requestPayout } from '../lib/payments';

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
            placeholderTextColor="#444"
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
          <View style={styles.bankIcon}>
            <Text style={styles.bankEmoji}>🏦</Text>
          </View>
          <View style={styles.bankInfo}>
            <Text style={styles.bankName}>Chase Checking</Text>
            <Text style={styles.bankNumber}>···· ···· ···· 6193 · Troy R.</Text>
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
          ]}
          disabled={!validAmount || processing}
          onPress={handleWithdraw}
          activeOpacity={0.85}
        >
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
            ? 'Powered by Stripe Connect · ~30 min · 1.5% fee'
            : 'Powered by Stripe Connect · 1 to 2 business days · No fees'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: { fontFamily: 'Inter_500Medium', color: '#fff', fontSize: 15, marginBottom: 16 },
  title: { fontFamily: 'BodoniModa_700Bold', fontSize: 28, color: '#fff', letterSpacing: 0.4, marginBottom: 5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888', letterSpacing: 0.3 },
  balanceCard: {
    backgroundColor: '#0d1a0d',
    borderRadius: 18,
    marginHorizontal: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1a3a1a',
    marginBottom: 26,
  },
  balanceLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#22c55e',
    letterSpacing: 3,
    marginBottom: 8,
  },
  balanceValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 44,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  balanceStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#22c55e',
    letterSpacing: 0.3,
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
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 14,
  },
  dollarSign: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 32,
    color: '#666',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 36,
    color: '#fff',
    letterSpacing: 0.5,
    padding: 0,
  },
  quickRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, flexWrap: 'wrap' },
  quickChip: {
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 1,
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 12,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankEmoji: { fontSize: 20 },
  bankInfo: { flex: 1 },
  bankName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  bankNumber: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.5,
  },
  changeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 1.5,
  },
  withdrawBtn: {
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  withdrawBtnDisabled: {
    backgroundColor: '#2a2a2a',
    shadowOpacity: 0,
  },
  withdrawBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
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
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 2,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  successCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    color: '#22c55e',
  },
  successTitle: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 26,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  successAmount: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 44,
    color: '#22c55e',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  successSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.3,
  },
});
