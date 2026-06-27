import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { startConnectOnboarding, getConnectStatus } from '../lib/payments';
import type { PayoutSpeed } from '../lib/payments';
import { colors } from '../lib/theme';
import { CtaGlow } from '../components/CtaGlow';

const WHAT_STRIPE_NEEDS = [
  {
    icon: 'business-outline' as const,
    title: 'Bank account or debit card',
    why: 'Connect your bank in one tap.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Full SSN (US only)',
    why: 'IRS requirement. Stripe stores it, we never see it.',
  },
  {
    icon: 'person-outline' as const,
    title: 'Legal name + DOB',
    why: 'Auto-filled from your ID check.',
  },
  {
    icon: 'home-outline' as const,
    title: 'Home address',
    why: 'For your 1099 tax form.',
  },
];

const TRUST_BULLETS = [
  'Payouts handled by Stripe Connect Express',
  'Bank-level encryption (256-bit) + PCI DSS Level 1 compliance',
  'Let Me Check never stores your SSN or bank credentials, Stripe does',
  'You can update bank or close the account from your Scout dashboard',
];

export default function ScoutPayoutScreen() {
  const router = useRouter();
  const [speed, setSpeed] = useState<PayoutSpeed>('standard');
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Opens the Stripe Connect hosted onboarding URL.
  // Passes the chosen payout speed through — this is the D-05 sole write path.
  // After the browser returns, checks live eligibility from the server (SCOUT-01).
  // Never trusts the deep-link return: eligibility comes from accounts.retrieve (Pitfall 5).
  const handleOpenStripe = async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      // D-05: payout speed is passed to stripe-connect-onboard which persists it
      // to scout_stripe_accounts.payout_speed (RLS bars a direct client write).
      const { url } = await startConnectOnboarding(speed);
      setLoading(false);

      // Open the Stripe hosted onboarding in an in-app browser session.
      // lmc:// is the return scheme registered in app.config.js.
      await WebBrowser.openAuthSessionAsync(url, 'lmc://');

      // After the browser closes, verify eligibility from the server — never
      // trust the deep-link return alone (T-04-28 / Pitfall 5 / SCOUT-01).
      setVerifying(true);
      const status = await getConnectStatus();
      setVerifying(false);

      if (status.eligible) {
        // Both charges_enabled && payouts_enabled confirmed by the server.
        router.push('/scout/rules');
      } else {
        Alert.alert(
          'Stripe is still verifying your details',
          'This usually takes a few minutes. Once Stripe confirms, you can go online and start earning.',
          [
            {
              text: 'Try again',
              onPress: handleOpenStripe,
            },
            { text: 'Later', style: 'cancel' },
          ],
        );
      }
    } catch (e) {
      setLoading(false);
      setVerifying(false);
      Alert.alert(
        'Something went wrong',
        e instanceof Error ? e.message : 'Please try again in a moment.',
      );
    }
  };

  const btnLabel = verifying
    ? 'CHECKING STATUS...'
    : loading
    ? 'OPENING STRIPE...'
    : authorized
    ? 'OPEN STRIPE CONNECT'
    : 'AUTHORIZE TO CONTINUE';

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
                style={[
                  styles.dot,
                  n < 2 && styles.dotDone,
                  n === 2 && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Start earning</Text>
          <Text style={styles.subtitle}>
            Here&apos;s what you&apos;ll make. Set up your payouts below, secured by Stripe.
          </Text>

          {/* WHAT YOU EARN — lead with the upside */}
          <Text style={styles.sectionLabel}>WHAT YOU EARN</Text>
          <View style={styles.earnGrid}>
            <View style={styles.earnCell}>
              <Text style={styles.earnAmount}>$8</Text>
              <Text style={styles.earnLabel}>Standard check</Text>
              <Text style={styles.earnWhy}>10-min delivery window</Text>
            </View>
            <View style={styles.earnCell}>
              <Text style={styles.earnAmount}>$12</Text>
              <Text style={styles.earnLabel}>Priority check</Text>
              <Text style={styles.earnWhy}>7-min delivery window</Text>
            </View>
            <View style={styles.earnCell}>
              <Text style={styles.earnAmount}>$3</Text>
              <Text style={styles.earnLabel}>No-fault pay</Text>
              <Text style={styles.earnWhy}>Could not film for a valid reason, GPS verified</Text>
            </View>
            <View style={[styles.earnCell, styles.earnCellHero]}>
              <CtaGlow radius={10} />
              <Text style={[styles.earnAmount, styles.earnTextHero]}>$80–$200</Text>
              <Text style={[styles.earnLabel, styles.earnTextHero]}>Typical week</Text>
              <Text style={[styles.earnWhy, styles.earnWhyHero]}>Active hours in a live market</Text>
            </View>
          </View>

          {/* PAYOUT SPEED */}
          {/*
            FEES. Standard ACH is free / 1–2 days (Stripe pass-through).
            Instant: Scout is charged 2% (DECIDED 2026-06-15). Stripe's Instant Payout fee
            is ~1.5% (flat US-wide, debit-rail based — not state-dependent), so LMC keeps
            ~0.5% margin per instant payout. Confirm Stripe's exact live fee when wiring
            Connect and keep the 2% Scout-facing rate above it. See studio/OUTSTANDING.md.
          */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>PAYOUT SPEED</Text>
          <View style={styles.speedRow}>
            <TouchableOpacity
              style={[styles.speedCard, speed === 'standard' && styles.speedCardActive]}
              onPress={() => setSpeed('standard')}
              activeOpacity={0.85}
            >
              <View style={styles.speedTop}>
                <Text style={styles.speedTitle}>Standard</Text>
                {speed === 'standard' && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.verified} />
                )}
              </View>
              <Text style={styles.speedTime}>1–2 days</Text>
              <Text style={styles.speedFee}>$0 fee</Text>
              <Text style={styles.speedNote}>Standard ACH to your bank account.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.speedCard, speed === 'instant' && styles.speedCardActive]}
              onPress={() => setSpeed('instant')}
              activeOpacity={0.85}
            >
              <View style={styles.speedTop}>
                <Text style={styles.speedTitle}>Instant</Text>
                {speed === 'instant' && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.verified} />
                )}
              </View>
              <Text style={styles.speedTime}>~30 min</Text>
              <Text style={styles.speedFee}>2% fee</Text>
              <Text style={styles.speedNote}>Requires eligible debit card.</Text>
            </TouchableOpacity>
          </View>

          {/* WHAT STRIPE WILL ASK FOR */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            WHAT STRIPE WILL ASK FOR
          </Text>
          {WHAT_STRIPE_NEEDS.map((item, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={18} color={colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowWhy}>{item.why}</Text>
              </View>
            </View>
          ))}

          {/* TAX COMPLIANCE */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            TAX COMPLIANCE
          </Text>
          <View style={styles.contractCard}>
            <Bullet text="You complete a W-9 inside Stripe during onboarding (~30 seconds)." />
            <Bullet text="We mail you a 1099-NEC each January if you earn $600+ in a calendar year." />
            <Bullet text="You're an independent contractor, responsible for your own quarterly taxes." />
          </View>

          {/* TRUST */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            HOW WE PROTECT YOUR INFO
          </Text>
          <View style={styles.contractCard}>
            {TRUST_BULLETS.map((b, i) => (
              <Bullet key={i} text={b} />
            ))}
          </View>

          {/* AUTHORIZE — Scout Code consent (SCOUT-02) */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            AUTHORIZE
          </Text>
          <TouchableOpacity
            style={styles.gateRow}
            activeOpacity={0.75}
            onPress={() => setAuthorized((v) => !v)}
          >
            <View style={[styles.checkbox, authorized && styles.checkboxOn]}>
              {authorized && <Ionicons name="checkmark" size={14} color={colors.onRed} />}
            </View>
            <Text style={styles.gateText}>
              <Text style={styles.gateBold}>I AUTHORIZE</Text> Let Me Check to create a Stripe Connect Express account on my behalf to receive payouts. I will complete identity and tax verification with Stripe.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, (!authorized || loading || verifying) && styles.primaryBtnDisabled]}
            disabled={!authorized || loading || verifying}
            onPress={handleOpenStripe}
            activeOpacity={0.85}
          >
            <View style={styles.primaryBtnInner}>
              <Ionicons
                name="open-outline"
                size={16}
                color={(authorized && !loading && !verifying) ? colors.onRed : colors.textTertiary}
              />
              <Text
                style={[styles.primaryBtnText, (!authorized || loading || verifying) && styles.primaryBtnTextDisabled]}
              >
                {btnLabel}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.foot}>
            Stripe handles onboarding in about 5 minutes. Your data goes directly to them. Let Me Check never sees it.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.contractRow}>
      <Text style={styles.contractBullet}>·</Text>
      <Text style={styles.contractText}>{text}</Text>
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
  dotDone: { backgroundColor: colors.borderStrong },
  dotActive: { backgroundColor: colors.red },
  scroll: { paddingHorizontal: 26, paddingBottom: 64 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 22,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 20 },

  speedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  speedCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  speedCardActive: {
    backgroundColor: colors.bg,
    borderColor: colors.red,
  },
  speedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  speedTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  speedTime: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: colors.verified,
    marginBottom: 2,
  },
  speedFee: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  speedNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 15,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  rowWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  earnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  earnCell: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  earnAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.red,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  earnLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  earnWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 15,
  },
  // "Typical week" hero cell — red gradient (CtaGlow) with white text
  earnCellHero: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    overflow: 'hidden',
  },
  earnTextHero: { color: colors.white },
  earnWhyHero: { color: 'rgba(255,255,255,0.8)' },

  contractCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  contractRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  contractBullet: {
    fontFamily: 'Inter_700Bold',
    color: colors.textTertiary,
    fontSize: 14,
    lineHeight: 18,
  },
  contractText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  gateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  gateText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  gateBold: {
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    letterSpacing: 1,
  },

  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  primaryBtnTextDisabled: {
    color: colors.textTertiary,
    letterSpacing: 2,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
