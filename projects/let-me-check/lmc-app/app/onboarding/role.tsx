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

type Role = 'seeker' | 'scout' | 'both';

const BOTH_PERKS = [
  'See any place before you go — in minutes',
  'Earn $8–$12 per check, on your own hours',
  'One account — flip between both anytime',
];

export default function RoleScreen() {
  const router = useRouter();
  // Default to 'both' (recommended hero) — unless they leaned a way on the
  // how-it-works videos, in which case start on that side.
  const [selected, setSelected] = useState<Role>(getIntendedRole() ?? 'both');

  const handleContinue = () => {
    setIntendedRole(selected);
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
              <View key={i} style={[styles.dot, i < 1 && styles.dotDone, i === 1 && styles.dotActive]} />
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
              style={[styles.heroCard, selected === 'both' && styles.cardActive]}
              onPress={() => setSelected('both')}
              activeOpacity={0.9}
            >
              <View style={styles.roleTop}>
                <View style={styles.heroIcons}>
                  <View style={styles.roleIconWrap}>
                    <Ionicons name="eye-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={styles.roleIconWrap}>
                    <Ionicons name="videocam-outline" size={22} color="#ffffff" />
                  </View>
                </View>
                {selected === 'both' && <Ionicons name="checkmark-circle" size={24} color="#00FF7F" />}
              </View>
              <Text style={styles.heroTitle}>Seeker + Scout</Text>
              <Text style={styles.heroSub}>
                Know before you go — and earn as the eyes for your city.
              </Text>
              <View style={styles.perkList}>
                {BOTH_PERKS.map((p, i) => (
                  <View key={i} style={styles.perkRow}>
                    <Ionicons name="checkmark" size={14} color="#00FF7F" />
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
                <Ionicons name="eye-outline" size={26} color="#ffffff" />
              </View>
              {selected === 'seeker' && <Ionicons name="checkmark-circle" size={22} color="#00FF7F" />}
            </View>
            <View style={styles.roleTitleRow}>
              <Text style={styles.roleHeadline}>Know before you go</Text>
              <View style={[styles.tagPill, styles.tagPillSeeker]}>
                <Ionicons name="eye" size={10} color="#88B4FF" />
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
                <Ionicons name="videocam-outline" size={26} color="#ffffff" />
              </View>
              {selected === 'scout' && <Ionicons name="checkmark-circle" size={22} color="#00FF7F" />}
            </View>
            <View style={styles.roleTitleRow}>
              <Text style={styles.roleHeadline}>Be the eyes for the city</Text>
              <View style={[styles.tagPill, styles.tagPillScout]}>
                <Ionicons name="videocam" size={10} color="#00FF7F" />
                <Text style={[styles.tagPillText, styles.tagPillScoutText]}>SCOUT</Text>
              </View>
            </View>
            <Text style={styles.roleDesc}>
              Earn $8–$12 a check filming quick clips of places near you, on your own time. Direct to your bank.
            </Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
            <View style={styles.primaryBtnInner}>
              <Text style={styles.primaryBtnText}>CONTINUE</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
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
    marginBottom: 26,
  },

  // Shared selected state — light BLUE tint so black text stays readable
  cardActive: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderColor: 'rgba(60,110,200,0.6)',
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
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 20,
    paddingTop: 22,
  },
  heroIcons: { flexDirection: 'row', gap: 8 },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
    marginBottom: 16,
  },
  perkList: { gap: 9 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  perkText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },

  // Secondary role cards (Seeker / Scout) — full width, with descriptions
  roleCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  roleDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
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
    backgroundColor: 'rgba(60,110,200,0.18)',
    borderColor: 'rgba(136,180,255,0.5)',
  },
  tagPillScout: {
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderColor: 'rgba(0,255,127,0.45)',
  },
  tagPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
  },
  tagPillSeekerText: { color: '#88B4FF' },
  tagPillScoutText: { color: '#00FF7F' },

  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  primaryBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 2.5,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
