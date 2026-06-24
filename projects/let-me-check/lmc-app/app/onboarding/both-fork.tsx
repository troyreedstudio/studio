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

// Shown to users who picked "Both" at /onboarding/role, after they've completed
// Seeker-light sign-up + the Service Standards consent.
// Lets them choose which side to activate first.

export default function BothForkScreen() {
  const router = useRouter();

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View key={i} style={[styles.dot, styles.dotDone]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>You&apos;re in.</Text>
          <Text style={styles.subtitle}>
            Your Let Me Check account is set. Choose which side to activate first. You&apos;ll keep access to both, on your own time.
          </Text>

          {/* SCOUT CARD — lead position */}
          <TouchableOpacity
            style={[styles.card, styles.cardScout]}
            activeOpacity={0.9}
            onPress={() => router.replace('/scout/become')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="videocam-outline" size={26} color={colors.white} />
              </View>
              <View style={[styles.tagPill, styles.tagPillScout]}>
                <Ionicons name="videocam" size={11} color={colors.onRed} />
                <Text style={[styles.tagPillText, styles.tagPillScoutText]}>SCOUT</Text>
              </View>
            </View>

            <Text style={styles.cardHeadlineLight}>Activate your Scout role</Text>
            <Text style={styles.cardLeadLight}>
              About 5 minutes. ID verification, payouts, then your first job.
            </Text>

            <View style={styles.bulletList}>
              <Bullet text="Identity verified through Stripe (private, encrypted)" light />
              <Bullet text="Payouts arrive directly to your bank" light />
              <Bullet text="Your name, address, and account stay yours alone" light />
            </View>

            <View style={styles.cardCtaRowLight}>
              <Text style={styles.cardCtaTextLight}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.onRed} />
            </View>
          </TouchableOpacity>

          {/* SEEKER CARD — secondary */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.replace('/(seeker)/home')}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.cardIconWrap, styles.cardIconWrapDark]}>
                <Ionicons name="eye-outline" size={26} color={colors.textPrimary} />
              </View>
              <View style={[styles.tagPill, styles.tagPillSeeker]}>
                <Ionicons name="eye" size={11} color={colors.red} />
                <Text style={[styles.tagPillText, styles.tagPillSeekerText]}>SEEKER</Text>
              </View>
            </View>

            <Text style={styles.cardHeadline}>Open Let Me Check as a Seeker first</Text>
            <Text style={styles.cardLead}>
              Browse and request checks now. You can activate Scout from your profile any time.
            </Text>

            <View style={styles.cardCtaRow}>
              <Text style={styles.cardCtaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.red} />
            </View>
          </TouchableOpacity>

          <Text style={styles.foot}>
            Whichever you choose, the other side is one tap away from your profile.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Bullet({ text, light }: { text: string; light?: boolean }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, light && styles.bulletDotLight]} />
      <Text style={[styles.bulletText, light && styles.bulletTextLight]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: 'rgba(218,37,29,0.4)' },
  scroll: { paddingHorizontal: 22, paddingBottom: 48 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
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
    marginBottom: 26,
  },

  // Scout card — red fill (action surface)
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
  },
  cardScout: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapDark: {
    backgroundColor: colors.border,
  },
  cardHeadline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  cardHeadlineLight: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.onRed,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  cardLead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    lineHeight: 19,
    marginBottom: 14,
  },
  cardLeadLight: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
    lineHeight: 19,
    marginBottom: 14,
  },

  bulletList: { gap: 8, marginBottom: 18 },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    marginTop: 8,
  },
  bulletDotLight: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  bulletTextLight: {
    color: 'rgba(255,255,255,0.82)',
  },

  cardCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardCtaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.red,
    letterSpacing: 2,
  },
  cardCtaRowLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  cardCtaTextLight: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.onRed,
    letterSpacing: 2,
  },

  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagPillSeeker: {
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderColor: 'rgba(218,37,29,0.3)',
  },
  tagPillScout: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  tagPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 2.2,
  },
  tagPillSeekerText: { color: colors.red },
  tagPillScoutText: { color: colors.onRed },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 14,
    marginTop: 8,
  },
});
