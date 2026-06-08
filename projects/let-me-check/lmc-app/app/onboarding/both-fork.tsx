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

// Shown to users who picked "Both" at /onboarding/role, after they've completed
// Seeker-light sign-up + the Service Standards consent.
// Lets them choose which side to activate first. Either path is valid — the
// account is already created, the choice is just about which side they want now.

export default function BothForkScreen() {
  const router = useRouter();

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
              <View key={i} style={[styles.dot, styles.dotDone]} />
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
          <Text style={styles.title}>You&apos;re in.</Text>
          <Text style={styles.subtitle}>
            Your LMC account is set. Choose which side to activate first — you&apos;ll keep access to both, on your own time.
          </Text>

          {/* SCOUT CARD — lead position */}
          <TouchableOpacity
            style={[styles.card, styles.cardScout]}
            activeOpacity={0.9}
            onPress={() => router.replace('/scout/become')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="videocam-outline" size={26} color="#ffffff" />
              </View>
              <View style={[styles.tagPill, styles.tagPillScout]}>
                <Ionicons name="videocam" size={11} color="#00FF7F" />
                <Text style={[styles.tagPillText, styles.tagPillScoutText]}>SCOUT</Text>
              </View>
            </View>

            <Text style={styles.cardHeadline}>Activate your Scout role</Text>
            <Text style={styles.cardLead}>
              ~5 minutes. ID verification, payouts, then your first job.
            </Text>

            <View style={styles.bulletList}>
              <Bullet text="Identity verified through Stripe (private, encrypted)" />
              <Bullet text="Payouts arrive directly to your bank" />
              <Bullet text="Your name, address, and account stay yours alone" />
            </View>

            <View style={styles.cardCtaRow}>
              <Text style={styles.cardCtaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* SEEKER CARD — secondary, refined */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.replace('/(seeker)/home')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="eye-outline" size={26} color="#ffffff" />
              </View>
              <View style={[styles.tagPill, styles.tagPillSeeker]}>
                <Ionicons name="eye" size={11} color="#88B4FF" />
                <Text style={[styles.tagPillText, styles.tagPillSeekerText]}>SEEKER</Text>
              </View>
            </View>

            <Text style={styles.cardHeadline}>Open LMC as a Seeker first</Text>
            <Text style={styles.cardLead}>
              Browse and request checks now. You can activate Scout from your profile any time.
            </Text>

            <View style={styles.cardCtaRow}>
              <Text style={styles.cardCtaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
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

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
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
  dotDone: { backgroundColor: '#00FF7F' },
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

  scroll: { paddingHorizontal: 22, paddingBottom: 48 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
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

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
  },
  cardScout: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderColor: 'rgba(60,110,200,0.55)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  cardLead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(0,255,127,0.7)',
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  cardCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cardCtaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#ffffff',
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

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 14,
    marginTop: 8,
  },
});
