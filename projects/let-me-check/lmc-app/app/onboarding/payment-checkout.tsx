import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

export default function PaymentCheckoutScreen() {
  const router = useRouter();

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(seeker)/home')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Add a payment method</Text>
          <Text style={styles.subtitle}>
            Only needed once. Stripe stores it securely — we never see your card number.
          </Text>

          <View style={styles.cardPreview}>
            <Text style={styles.cardLabel}>STRIPE PAYMENT SHEET</Text>
            <View style={styles.cardField}>
              <Text style={styles.cardFieldLabel}>CARD NUMBER</Text>
              <Text style={styles.cardFieldText}>•••• •••• •••• ••••</Text>
            </View>
            <View style={styles.cardRow}>
              <View style={[styles.cardField, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.cardFieldLabel}>EXP</Text>
                <Text style={styles.cardFieldText}>MM / YY</Text>
              </View>
              <View style={[styles.cardField, { flex: 1 }]}>
                <Text style={styles.cardFieldLabel}>CVC</Text>
                <Text style={styles.cardFieldText}>•••</Text>
              </View>
            </View>
            <View style={styles.cardField}>
              <Text style={styles.cardFieldLabel}>BILLING ZIP</Text>
              <Text style={styles.cardFieldText}>33139</Text>
            </View>
            <View style={styles.cardOrRow}>
              <View style={styles.cardDivider} />
              <Text style={styles.cardOrText}>OR</Text>
              <View style={styles.cardDivider} />
            </View>
            {/* Apple Pay button — platform-mandated black button, do not recolor */}
            <View style={styles.applePayBtn}>
              <Ionicons name="logo-apple" size={18} color="#ffffff" />
              <Text style={styles.applePayText}>Pay</Text>
            </View>
          </View>

          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Standard check at Bleau Live</Text>
            <Text style={styles.orderValue}>$16.50</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Scout pays out</Text>
            <Text style={styles.orderValueSub}>$8.00 to Scout</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>PAY $16.50 — START CHECK</Text>
          </TouchableOpacity>

          <Text style={styles.privacy}>
            By paying, you agree to Let Me Check's service terms. Refunded if Scout fails to deliver in 15 min.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  scroll: { paddingHorizontal: 26, paddingBottom: 48 },
  title: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 25,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  cardPreview: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 22,
  },
  cardLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  cardField: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  cardFieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  cardFieldText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
  },
  cardOrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  cardDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  cardOrText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
  },
  // Apple Pay — platform-mandated black button. Do not recolor.
  applePayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 6,
  },
  applePayText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  orderLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.textSecondary,
  },
  orderValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  orderValueSub: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: colors.textTertiary,
  },
  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 3,
  },
  privacy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
