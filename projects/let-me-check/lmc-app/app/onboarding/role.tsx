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
import { setIntendedRole } from '../state/intended-role';

type Role = 'seeker' | 'scout' | 'both';

const SEEKER_PERKS = [
  'Real eyes on any location — venues, airports, DMVs',
  '$15–$20 for a 15-second clip, delivered in minutes',
  'Watch, rate, and save the moment',
];

const SCOUT_PERKS = [
  'Capture moments around the city — $8–$12 per check',
  'On your own time, in your own city',
  'Discreet, brief, premium — direct to your bank',
];

export default function RoleScreen() {
  const router = useRouter();
  // Default to 'both' — recommended pick for the marketplace. Subtle nudge,
  // not a forced choice. User can switch to Seeker or Scout with one tap.
  const [selected, setSelected] = useState<Role | null>('both');

  const handleContinue = () => {
    if (!selected) return;
    setIntendedRole(selected);
    // Every role routes through sign-up first so the user has an account.
    // Quick Finish then routes based on intended role:
    //   - seeker → /seeker/rules → /(seeker)/home
    //   - both → /seeker/rules → /onboarding/both-fork
    //   - scout → /scout/become (skips Seeker rules; Scout Code is shown later in flow)
    router.replace({ pathname: '/auth/sign-up', params: { role: selected } });
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Flow Map</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < 1 && styles.dotDone,
                  i === 1 && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.wireframeBadge}
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.wireframeBadgeText}>WF</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            How do you want to use LMC?
          </Text>
          <Text style={styles.subtitle}>
            You can switch or do both anytime from your profile. We just want to land you in the right place first.
          </Text>

          {/* SEEKER CARD */}
          <TouchableOpacity
            style={[styles.roleCard, selected === 'seeker' && styles.roleCardActive]}
            onPress={() => setSelected('seeker')}
            activeOpacity={0.9}
          >
            <View style={styles.roleTop}>
              <View style={styles.roleIconWrap}>
                <Ionicons name="eye-outline" size={28} color="#ffffff" />
              </View>
              {selected === 'seeker' && (
                <Ionicons name="checkmark-circle" size={22} color="#00FF7F" />
              )}
            </View>
            <Text style={styles.roleHeadline}>I want to know before I go</Text>
            <View style={[styles.tagPill, styles.tagPillSeeker]}>
              <Ionicons name="eye" size={11} color="#88B4FF" />
              <Text style={[styles.tagPillText, styles.tagPillSeekerText]}>SEEKER</Text>
            </View>
            <View style={styles.perkList}>
              {SEEKER_PERKS.map((p, i) => (
                <View key={i} style={styles.perkRow}>
                  <Ionicons name="checkmark" size={14} color="#00FF7F" />
                  <Text style={styles.perkText}>{p}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.roleFoot}>You&apos;ll land on the Seeker home map.</Text>
          </TouchableOpacity>

          {/* SCOUT CARD */}
          <TouchableOpacity
            style={[styles.roleCard, selected === 'scout' && styles.roleCardActive]}
            onPress={() => setSelected('scout')}
            activeOpacity={0.9}
          >
            <View style={styles.roleTop}>
              <View style={styles.roleIconWrap}>
                <Ionicons name="videocam-outline" size={28} color="#ffffff" />
              </View>
              {selected === 'scout' && (
                <Ionicons name="checkmark-circle" size={22} color="#00FF7F" />
              )}
            </View>
            <Text style={styles.roleHeadline}>I&apos;ll be the eyes for the city</Text>
            <View style={[styles.tagPill, styles.tagPillScout]}>
              <Ionicons name="videocam" size={11} color="#00FF7F" />
              <Text style={[styles.tagPillText, styles.tagPillScoutText]}>SCOUT</Text>
            </View>
            <View style={styles.perkList}>
              {SCOUT_PERKS.map((p, i) => (
                <View key={i} style={styles.perkRow}>
                  <Ionicons name="checkmark" size={14} color="#00FF7F" />
                  <Text style={styles.perkText}>{p}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.roleFoot}>
              You&apos;ll start the ~10 min Scout setup (ID + payout + rules).
            </Text>
          </TouchableOpacity>

          {/* BOTH — recommended hero pick. Always carries champagne accent + RECOMMENDED pill. */}
          <View style={styles.bothWrap}>
            <View style={styles.recommendedPill}>
              <Ionicons name="star" size={9} color="#1a1a1a" />
              <Text style={styles.recommendedPillText}>RECOMMENDED</Text>
            </View>
            <TouchableOpacity
              style={[styles.bothRow, styles.bothRowHero, selected === 'both' && styles.bothRowActive]}
              onPress={() => setSelected('both')}
              activeOpacity={0.85}
            >
              <View style={styles.bothLeft}>
                <Ionicons name="swap-horizontal-outline" size={18} color="#88B4FF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bothTitle}>Both — Seeker and Scout</Text>
                  <Text style={styles.bothWhy}>
                    Sign up once. Full LMC access — keep the option to earn whenever you&apos;re ready.
                  </Text>
                </View>
              </View>
              {selected === 'both' && (
                <Ionicons name="checkmark-circle" size={20} color="#88B4FF" />
              )}
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, !selected && styles.primaryBtnDisabled]}
            disabled={!selected}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <View style={styles.primaryBtnInner}>
              <Text
                style={[styles.primaryBtnText, !selected && styles.primaryBtnTextDisabled]}
              >
                {selected ? 'CONTINUE' : 'PICK ONE TO CONTINUE'}
              </Text>
              {selected && (
                <Ionicons name="arrow-forward" size={16} color="#000" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.foot}>
            You can change your mind — Seeker ↔ Scout toggle lives in your profile.
          </Text>
        </ScrollView>
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
    paddingBottom: 16,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotDone: { backgroundColor: 'rgba(0,255,127,0.55)' },
  dotActive: { backgroundColor: '#00FF7F' },
  wireframeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,107,0,0.18)',
  },
  wireframeBadgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF6B00',
    fontSize: 9,
    letterSpacing: 1.4,
  },

  scroll: { paddingHorizontal: 22, paddingBottom: 40 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 22,
  },

  roleCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  roleCardActive: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderColor: 'rgba(60,110,200,0.7)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleHeadline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  tagPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
  },
  tagPillSeeker: {
    backgroundColor: 'rgba(60,110,200,0.18)',
    borderColor: 'rgba(136,180,255,0.5)',
  },
  tagPillScout: {
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderColor: 'rgba(0,255,127,0.45)',
  },
  tagPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 2.2,
  },
  tagPillSeekerText: { color: '#88B4FF' },
  tagPillScoutText: { color: '#00FF7F' },
  perkList: { gap: 8, marginBottom: 12 },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  perkText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  roleFoot: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },

  bothWrap: {
    position: 'relative',
    marginTop: 4,
    marginBottom: 20,
  },
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
    backgroundColor: '#FFCB47',
    borderWidth: 1,
    borderColor: '#C99A1F',
  },
  recommendedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#1a1a1a',
    letterSpacing: 1.6,
  },
  bothRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  bothRowHero: {
    backgroundColor: 'rgba(20,55,130,0.3)',
    borderColor: 'rgba(60,110,200,0.55)',
    paddingTop: 18,
    paddingBottom: 16,
  },
  bothRowActive: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderColor: 'rgba(60,110,200,0.7)',
  },
  bothLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bothTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  bothWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },

  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  primaryBtnTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
