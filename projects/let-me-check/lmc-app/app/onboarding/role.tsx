import React, { useState } from 'react';
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
import { setIntendedRole, getIntendedRole } from '../state/intended-role';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

type Role = 'seeker' | 'scout' | 'both';

const BOTH_PERKS = [
  'See any place before you go — in minutes',
  'Earn $8–$12 per check, on your own hours',
  'One account — flip between both anytime',
];

export default function RoleScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role>(getIntendedRole() ?? 'both');

  const handleContinue = () => {
    setIntendedRole(selected);
    router.replace({ pathname: '/auth/sign-up', params: { role: selected } });
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View key={i} style={[styles.dot, i < 1 && styles.dotDone, i === 1 && styles.dotActive]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Most people do both. You can switch anytime from your profile.
          </Text>

          {/* BOTH — the recommended hero */}
          <View style={styles.heroWrap}>
            <View style={styles.recommendedPill}>
              <Ionicons name="star" size={9} color="#1a1a1a" />
              <Text style={styles.recommendedPillText}>RECOMMENDED</Text>
            </View>
            <TouchableOpacity
              style={[styles.heroCard, selected === 'both' && styles.heroCardActive]}
              onPress={() => setSelected('both')}
              activeOpacity={0.9}
            >
              <View style={styles.roleTop}>
                <View style={styles.heroIcons}>
                  <View style={styles.roleIconWrap}>
                    <Ionicons name="eye-outline" size={22} color={colors.white} />
                  </View>
                  <View style={styles.roleIconWrap}>
                    <Ionicons name="videocam-outline" size={22} color={colors.white} />
                  </View>
                </View>
                {selected === 'both' && <Ionicons name="checkmark-circle" size={24} color={colors.verified} />}
              </View>
              <Text style={styles.heroTitle}>Seeker + Scout</Text>
              <Text style={styles.heroSub}>
                Know before you go — and earn as the eyes for your city.
              </Text>
              <View style={styles.perkList}>
                {BOTH_PERKS.map((p, i) => (
                  <View key={i} style={styles.perkRow}>
                    <Ionicons name="checkmark" size={14} color={colors.verified} />
                    <Text style={styles.perkText}>{p}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR JUST ONE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* SEEKER */}
          <TouchableOpacity
            style={[styles.roleCard, selected === 'seeker' && styles.cardActive]}
            onPress={() => setSelected('seeker')}
            activeOpacity={0.9}
          >
            <View style={styles.roleTop}>
              <View style={styles.roleIconWrap}>
                <Ionicons name="eye-outline" size={26} color={colors.white} />
              </View>
              {selected === 'seeker' && <Ionicons name="checkmark-circle" size={22} color={colors.verified} />}
            </View>
            <View style={styles.roleTitleRow}>
              <Text style={styles.roleHeadline}>Know before you go</Text>
              <View style={[styles.tagPill, styles.tagPillSeeker]}>
                <Ionicons name="eye" size={10} color={colors.red} />
                <Text style={[styles.tagPillText, styles.tagPillSeekerText]}>SEEKER</Text>
              </View>
            </View>
            <Text style={styles.roleDesc}>
              Pay a real person on the ground to film any place — the line, the crowd, the vibe — and watch it in minutes.
            </Text>
          </TouchableOpacity>

          {/* SCOUT */}
          <TouchableOpacity
            style={[styles.roleCard, selected === 'scout' && styles.cardActive]}
            onPress={() => setSelected('scout')}
            activeOpacity={0.9}
          >
            <View style={styles.roleTop}>
              <View style={styles.roleIconWrap}>
                <Ionicons name="videocam-outline" size={26} color={colors.white} />
              </View>
              {selected === 'scout' && <Ionicons name="checkmark-circle" size={22} color={colors.verified} />}
            </View>
            <View style={styles.roleTitleRow}>
              <Text style={styles.roleHeadline}>Be the eyes for the city</Text>
              <View style={[styles.tagPill, styles.tagPillScout]}>
                <Ionicons name="videocam" size={10} color={colors.red} />
                <Text style={[styles.tagPillText, styles.tagPillScoutText]}>SCOUT</Text>
              </View>
            </View>
            <Text style={styles.roleDesc}>
              Earn $8–$12 a check filming quick clips of places near you, on your own time. Direct to your bank.
            </Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity style={[styles.primaryBtn, ctaGlowShadow]} onPress={handleContinue} activeOpacity={0.85}>
            <CtaGlow radius={14} />
            <View style={styles.primaryBtnInner}>
              <Text style={styles.primaryBtnText}>CONTINUE</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onRed} />
            </View>
          </TouchableOpacity>

          <Text style={styles.foot}>
            You can change your mind — Seeker and Scout toggle lives in your profile.
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
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: 'rgba(218,37,29,0.35)' },
  dotActive: { backgroundColor: colors.red },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },

  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#4B5563', // a notch darker than textSecondary so it reads more present
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 26,
  },

  // Selected (light surface cards): red border + faint red tint
  cardActive: {
    backgroundColor: 'rgba(218,37,29,0.06)',
    borderColor: colors.red,
  },
  // Selected (DARK hero card): seamless — keep the dark bg + dark border (no red ring);
  // selection is shown by the green check. (Swap borderColor to colors.red to bring the ring back.)
  heroCardActive: {
    borderColor: colors.textPrimary,
  },

  // HERO (Both)
  heroWrap: { position: 'relative', marginBottom: 22 },
  recommendedPill: {
    position: 'absolute',
    top: -10,
    left: 18,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.amber,
    borderWidth: 1,
    borderColor: '#C99A1F',
  },
  recommendedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#1a1a1a',
    letterSpacing: 1.6,
  },
  heroCard: {
    backgroundColor: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
    borderRadius: 18,
    padding: 20,
    paddingTop: 22,
  },
  heroIcons: { flexDirection: 'row', gap: 8 },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.white,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 19,
    marginBottom: 16,
  },
  perkList: { gap: 9 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  perkText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
  },

  // Secondary role cards
  roleCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  roleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  roleHeadline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  roleDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagPillSeeker: {
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderColor: 'rgba(218,37,29,0.3)',
  },
  tagPillScout: {
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderColor: 'rgba(218,37,29,0.3)',
  },
  tagPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
  },
  tagPillSeekerText: { color: colors.red },
  tagPillScoutText: { color: colors.red },

  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  primaryBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
