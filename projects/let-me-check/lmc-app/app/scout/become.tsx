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

const STEPS = [
  { icon: 'card-outline', title: 'Verify your identity', time: '2 min', why: 'Photo of your gov ID + selfie. Handled by Stripe Identity.', route: '/scout/identity' as const },
  { icon: 'cash-outline', title: 'Start earning', time: '5 min', why: 'Add your bank and earnings land straight in your account. Secured by Stripe Connect.', route: '/scout/payout' as const },
  { icon: 'document-text-outline', title: 'The Scout Code', time: '2 min', why: 'What every Scout agrees to. Independent contractor terms.', route: '/scout/rules' as const },
  { icon: 'checkmark-circle-outline', title: 'Get approved', time: 'Instant', why: 'Most Scouts approved in under 10 min total.', route: '/scout/approved' as const },
];

export default function BecomeScoutScreen() {
  const router = useRouter();

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(scout)/dashboard'))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroIcon}>
            <Ionicons name="videocam-outline" size={56} color={colors.red} />
          </View>

          <Text style={styles.title}>Be the eyes for the city</Text>
          <Text style={styles.subtitle}>
            Capture 15-second moments around town. Discreet, brief, and paid directly to your bank, $8 to $12 per check.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HOW IT WORKS · TAP A STEP TO PREVIEW</Text>
            {STEPS.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.stepRow}
                activeOpacity={0.7}
                onPress={() => router.push(s.route)}
              >
                <View style={styles.stepIcon}>
                  <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.stepTopRow}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepTime}>{s.time}</Text>
                  </View>
                  <Text style={styles.stepWhy}>{s.why}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={styles.stepChevron} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, ctaGlowShadow]}
            onPress={() => router.push('/scout/identity')}
            activeOpacity={0.85}
          >
            <CtaGlow radius={14} />
            <Text style={styles.primaryBtnText}>START SCOUT SETUP</Text>
          </TouchableOpacity>

          <Text style={styles.foot}>
            Average Scout earnings: $80 to $200 per week in active hours.
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
  scroll: { paddingHorizontal: 26, paddingBottom: 48 },
  heroIcon: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 27,
    color: colors.textPrimary,
    letterSpacing: -0.4,
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
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepChevron: {
    marginLeft: 4,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(218,37,29,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  stepTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  stepTime: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: colors.red,
  },
  stepWhy: {
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
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 3,
  },
  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
