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
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

// Identity verification for Scouts is handled by Stripe Identity during the
// Stripe Connect Express onboarding (the payout step). Stripe collects the
// government ID + selfie liveness check directly inside their hosted flow,
// meaning we never see or store raw ID images — only an approved/denied status.
//
// This screen is an informational bridge: it explains what will happen and
// points the user to the payout step where the real verification occurs.
// The former "fake camera capture" prototype Alerts have been removed —
// they were misleading and never submitted anything to Stripe.

const WHY_ITEMS = [
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Keeps the network trustworthy',
    detail: 'One real human per account means Seekers can trust every video.',
  },
  {
    icon: 'card-outline' as const,
    title: 'Required for payouts',
    detail: 'Financial regulations require us to verify your identity before we can pay you.',
  },
  {
    icon: 'lock-closed-outline' as const,
    title: 'Handled by Stripe Identity',
    detail: 'Let Me Check never sees your raw ID. Stripe stores and processes it; we only receive an approved or denied status.',
  },
];

const HOW_ITEMS = [
  {
    n: '1',
    title: 'Connect your payout account',
    detail: "On the next screen, tap \"Set up payouts\" to open Stripe's secure onboarding.",
  },
  {
    n: '2',
    title: 'Verify your identity inside Stripe',
    detail: "Stripe will ask for a government-issued photo ID and a selfie. Takes about 2 minutes.",
  },
  {
    n: '3',
    title: 'Approval in minutes',
    detail: 'Most verifications complete automatically. Stripe notifies us and your Scout account activates.',
  },
];

export default function ScoutIdentityScreen() {
  const router = useRouter();

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.push('/scout/become'))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={[styles.dot, n === 1 && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={36} color={colors.verified} />
            </View>
            <Text style={styles.title}>Identity verification</Text>
            <Text style={styles.subtitle}>
              Your identity is verified by our payment partner, Stripe, as part of setting up payouts, not by a separate camera step.
            </Text>
          </View>

          {/* Why we verify */}
          <Text style={styles.sectionLabel}>WHY WE VERIFY</Text>
          <View style={styles.listCard}>
            {WHY_ITEMS.map((item, i) => (
              <View
                key={i}
                style={[styles.listRow, i < WHY_ITEMS.length - 1 && styles.listRowDivider]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={20} color={colors.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listDetail}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* How it works */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>HOW IT WORKS</Text>
          {HOW_ITEMS.map((item, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{item.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}

          {/* Privacy note */}
          <View style={styles.privacyCard}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.verified} />
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>Privacy</Text>
              <Text style={styles.privacyText}>
                Stripe is BIPA and GDPR compliant. We never see or store your raw ID images or biometric data.
              </Text>
            </View>
          </View>

          {/* CTA — proceed to payout setup where Stripe KYC actually happens */}
          <TouchableOpacity
            style={[styles.primaryBtn, ctaGlowShadow]}
            onPress={() => router.push('/scout/payout')}
            activeOpacity={0.85}
          >
            <CtaGlow radius={14} />
            <View style={styles.primaryBtnInner}>
              <Ionicons name="arrow-forward" size={16} color={colors.onRed} />
              <Text style={styles.primaryBtnText}>CONTINUE TO PAYOUT SETUP</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.foot}>
            Identity verification happens inside the Stripe payout flow on the next screen.
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
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.red },
  scroll: { paddingHorizontal: 26, paddingBottom: 64 },

  heroWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13.5,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 22 },

  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  listTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  listDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: colors.red,
  },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(22,163,74,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
    marginTop: 22,
    marginBottom: 24,
  },
  privacyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  privacyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 2.5,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
