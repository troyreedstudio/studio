import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { setIntendedRoleFlags } from '../lib/api';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

/**
 * Derive a stable, human-readable Scout ID from the user's Supabase auth UUID.
 * Takes the last 7 hex chars of the UUID and converts them to our base-32
 * alphabet, giving a deterministic "SCT-XXXX-XXX" that never changes across
 * remounts (unlike Math.random()).
 */
function stableScoutId(uid: string): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hex = uid.replace(/-/g, '').slice(-7);
  const n = parseInt(hex, 16);
  let out = '';
  let v = n;
  for (let i = 0; i < 7; i++) {
    out = CHARS[v % 32] + out;
    v = Math.floor(v / 32);
  }
  return `SCT-${out.slice(0, 4)}-${out.slice(4)}`;
}

const ON_FILE = [
  { title: 'Identity verified', detail: 'Stripe Identity, gov ID + selfie liveness' },
  { title: 'Payout method set', detail: 'Stripe Connect Express, bank •••• 4242' },
  { title: 'Code of Conduct signed', detail: 'Consent + agreement on record (today)' },
  { title: 'Independent Contractor agreement', detail: 'W-9 on file via Stripe, 1099 each January' },
];

const UNLOCKED = [
  { icon: 'notifications-outline' as const, title: 'Real-time job alerts', detail: 'Pinged when a check appears near you.' },
  { icon: 'card-outline' as const, title: 'Weekly auto-payouts', detail: 'Every Friday, or Instant on demand.' },
  { icon: 'gift-outline' as const, title: 'Refer-a-Scout: $50', detail: 'When a friend completes 10 paid checks.' },
];

const FIRST_STEPS = [
  { title: 'Open your Scout dashboard', detail: 'Set availability and go online when you are ready to earn.' },
  { title: 'Allow location and notifications', detail: 'You can only be dispatched when location is on.' },
  { title: 'Take a practice video', detail: 'A free 15-second test so you are calibrated for your first paid check.' },
];

export default function ScoutApprovedScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(1)).current;
  const [scoutId, setScoutId] = useState('SCT-••••-•••');
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  useEffect(() => {
    // AUTH-03: set is_scout=true + current_role='scout' in the profiles table.
    // Best-effort — a transient failure must not block the confirmation screen.
    setIntendedRoleFlags('scout').catch(() => {});

    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (uid) setScoutId(stableScoutId(uid));
    }).catch(() => {});

    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1.05, duration: 2200, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fade, breath]);

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
              <View key={n} style={[styles.dot, styles.dotDone]} />
            ))}
          </View>
        </View>

        <Animated.View style={[styles.scrollWrap, { opacity: fade }]}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* HERO */}
            <View style={styles.hero}>
              <View style={styles.checkWrap}>
                <Animated.View
                  style={[styles.ring, { opacity: 0.18, transform: [{ scale: breath }] }]}
                />
                <Animated.View
                  style={[styles.checkCircle, { transform: [{ scale: breath }] }]}
                >
                  <Text style={styles.checkGlyph}>✓</Text>
                </Animated.View>
              </View>

              <Text style={styles.title}>Congratulations, you&apos;re a Scout!</Text>
              <Text style={styles.subtitle}>
                You&apos;re verified and ready to earn. Accept check requests whenever you go online.
              </Text>
            </View>

            {/* SCOUT CARD */}
            <View style={styles.scoutCard}>
              <View style={styles.scoutCardTop}>
                <Text style={styles.scoutCardBrand}>LMC SCOUT</Text>
                <View style={styles.verifiedPill}>
                  <View style={styles.verifiedDot} />
                  <Text style={styles.verifiedPillText}>VERIFIED</Text>
                </View>
              </View>
              <Text style={styles.scoutCardId}>{scoutId}</Text>
              <View style={styles.scoutCardMeta}>
                <View style={styles.scoutCardMetaCell}>
                  <Text style={styles.scoutCardMetaLabel}>MEMBER SINCE</Text>
                  <Text style={styles.scoutCardMetaValue}>{today}</Text>
                </View>
                <View style={styles.scoutCardMetaCell}>
                  <Text style={styles.scoutCardMetaLabel}>HOME MARKET</Text>
                  <Text style={styles.scoutCardMetaValue}>Miami, FL</Text>
                </View>
              </View>
            </View>

            {/* WHAT'S ON FILE */}
            <Text style={styles.sectionLabel}>WHAT&apos;S ON FILE</Text>
            <View style={styles.listCard}>
              {ON_FILE.map((row, i) => (
                <View
                  key={i}
                  style={[styles.listRow, i < ON_FILE.length - 1 && styles.listRowDivider]}
                >
                  <View style={styles.greenCheck}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{row.title}</Text>
                    <Text style={styles.listWhy}>{row.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* WHAT YOU UNLOCKED */}
            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
              WHAT YOU UNLOCKED
            </Text>
            {UNLOCKED.map((item, i) => (
              <View key={i} style={styles.unlockRow}>
                <View style={styles.unlockIcon}>
                  <Ionicons name={item.icon} size={18} color={colors.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listWhy}>{item.detail}</Text>
                </View>
              </View>
            ))}

            {/* FIRST STEPS */}
            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
              FIRST STEPS
            </Text>
            {FIRST_STEPS.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{step.title}</Text>
                  <Text style={styles.listWhy}>{step.detail}</Text>
                </View>
              </View>
            ))}

            {/* FULL CODE LINK */}
            <TouchableOpacity
              onPress={() => router.push('/legal/code')}
              activeOpacity={0.7}
              style={styles.codeLinkRow}
            >
              <Ionicons name="document-text-outline" size={14} color={colors.red} />
              <Text style={styles.rulesLink}>Read the full Code of Conduct</Text>
            </TouchableOpacity>

            {/* SUPPORT */}
            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>NEED HELP</Text>
            <View style={styles.supportCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>support@letmecheck.app</Text>
                <Text style={styles.listWhy}>
                  Or tap the help icon in your Scout dashboard. Most replies within an hour.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL('mailto:support@letmecheck.app').catch(() =>
                    Alert.alert('No mail app available'),
                  )
                }
                activeOpacity={0.7}
              >
                <Text style={styles.supportEmail}>EMAIL</Text>
              </TouchableOpacity>
            </View>

            {/* CTAs */}
            <TouchableOpacity
              style={[styles.primaryBtn, ctaGlowShadow]}
              onPress={() => router.replace('/(scout)/dashboard')}
              activeOpacity={0.85}
            >
              <CtaGlow radius={14} />
              <View style={styles.primaryBtnInner}>
                <Ionicons name="play" size={14} color={colors.onRed} />
                <Text style={styles.primaryBtnText}>OPEN SCOUT DASHBOARD</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(seeker)/home')}
              activeOpacity={0.7}
              style={styles.swapBtn}
            >
              <Text style={styles.swapText}>
                Back to <Text style={styles.swapBold}>Seeker mode</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
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
  dot: { width: 24, height: 3, borderRadius: 2 },
  dotDone: { backgroundColor: colors.red },
  scrollWrap: { flex: 1 },
  scroll: { paddingHorizontal: 26, paddingBottom: 64 },

  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  checkWrap: { width: 120, height: 120, marginBottom: 18, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.verified,
  },
  checkCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.verified,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.verified,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  checkGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: colors.white,
    marginTop: 2,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
  },

  // SCOUT CARD — red brand surface
  scoutCard: {
    backgroundColor: colors.red,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  scoutCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoutCardBrand: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    letterSpacing: 3,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  verifiedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.white,
  },
  verifiedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.white,
    letterSpacing: 1.4,
  },
  scoutCardId: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    color: colors.white,
    letterSpacing: 2,
    marginBottom: 14,
  },
  scoutCardMeta: {
    flexDirection: 'row',
    gap: 24,
  },
  scoutCardMetaCell: { flex: 1 },
  scoutCardMetaLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  scoutCardMetaValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: colors.white,
    letterSpacing: 0.2,
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
    paddingVertical: 12,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greenCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  listTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  listWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  unlockRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  unlockIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(218,37,29,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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

  codeLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  rulesLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.red,
    letterSpacing: 0.4,
  },

  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  supportEmail: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.red,
    letterSpacing: 1.6,
  },

  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
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
  swapBtn: { alignItems: 'center', paddingVertical: 6 },
  swapText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  swapBold: {
    fontFamily: 'Inter_700Bold',
    color: colors.red,
  },
});
