import React, { useEffect, useMemo, useRef } from 'react';
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

function generateScoutId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'SCT-';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  id += '-';
  for (let i = 0; i < 3; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
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
  { title: 'Open your Scout dashboard', detail: 'Set availability + go online when you’re ready to earn.' },
  { title: 'Allow location & notifications', detail: 'You can only be dispatched when location is on.' },
  { title: 'Take a practice clip', detail: 'A free 15-second test so you’re calibrated for your first paid check.' },
];

export default function ScoutApprovedScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(1)).current;
  const scoutId = useMemo(generateScoutId, []);
  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  useEffect(() => {
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
      <StatusBar barStyle="light-content" />
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
                  style={[styles.ring, { opacity: 0.22, transform: [{ scale: breath }] }]}
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
                    <Ionicons name="checkmark" size={14} color="#000" />
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
                  <Ionicons name={item.icon} size={18} color="#ffffff" />
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
              <Ionicons name="document-text-outline" size={14} color="#00FF7F" />
              <Text style={styles.rulesLink}>Read the full Code of Conduct</Text>
            </TouchableOpacity>

            {/* SUPPORT */}
            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>NEED HELP</Text>
            <View style={styles.supportCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ffffff" />
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
              style={styles.primaryBtn}
              onPress={() => router.replace('/(scout)/dashboard')}
              activeOpacity={0.85}
            >
              <View style={styles.primaryBtnInner}>
                <Ionicons name="play" size={14} color="#000" />
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
  bg: { flex: 1, backgroundColor: '#000000' },
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
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2 },
  dotDone: { backgroundColor: '#00FF7F' },
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
    backgroundColor: '#00FF7F',
  },
  checkCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#00FF7F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FF7F',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  checkGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: '#ffffff',
    marginTop: 2,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
  },

  // SCOUT CARD
  scoutCard: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.6)',
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
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.4)',
  },
  verifiedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00FF7F',
  },
  verifiedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#00FF7F',
    letterSpacing: 1.4,
  },
  scoutCardId: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    color: '#ffffff',
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
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  scoutCardMetaValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 22 },

  listCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  greenCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00FF7F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  listTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  listWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: 'rgba(255,255,255,0.035)',
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
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: '#00FF7F',
  },

  remindCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
  },
  remindRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  remindBullet: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 18,
  },
  remindText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  rulesLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  rulesLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#00FF7F',
    letterSpacing: 0.4,
  },
  codeLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },

  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  supportEmail: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#00FF7F',
    letterSpacing: 1.6,
  },

  primaryBtn: {
    backgroundColor: '#ffffff',
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
    color: '#000000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  swapBtn: { alignItems: 'center', paddingVertical: 6 },
  swapText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
  swapBold: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
  },
});
