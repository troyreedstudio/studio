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

// Shown after a returning user signs in via /auth/sign-in.
// For prototype, every signed-in user sees both options. In production,
// this branches based on the user's role on file: Seeker-only goes
// straight to home, Scout-only straight to dashboard, Both sees this picker.

export default function WelcomeBackScreen() {
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
          <Text style={styles.title}>Welcome back, Troy</Text>
          <Text style={styles.subtitle}>
            Where do you want to pick up today?
          </Text>

          {/* SEEKER CARD */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.replace('/(seeker)/home')}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="eye-outline" size={26} color="#ffffff" />
              </View>
              <View style={[styles.tagPill, styles.tagPillSeeker]}>
                <Ionicons name="eye" size={11} color="#88B4FF" />
                <Text style={[styles.tagPillText, styles.tagPillSeekerText]}>SEEKER</Text>
              </View>
            </View>
            <Text style={styles.cardHeadline}>Open as a Seeker</Text>
            <Text style={styles.cardLead}>
              Browse the map · request a check · watch the clip when it lands.
            </Text>
            <View style={styles.cardCtaRow}>
              <Text style={styles.cardCtaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* SCOUT CARD */}
          <TouchableOpacity
            style={[styles.card, styles.cardScout]}
            activeOpacity={0.9}
            onPress={() => router.replace('/(scout)/dashboard')}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="videocam-outline" size={26} color="#ffffff" />
              </View>
              <View style={[styles.tagPill, styles.tagPillScout]}>
                <Ionicons name="videocam" size={11} color="#00FF7F" />
                <Text style={[styles.tagPillText, styles.tagPillScoutText]}>SCOUT</Text>
              </View>
            </View>
            <Text style={styles.cardHeadline}>Open as a Scout</Text>
            <Text style={styles.cardLead}>
              Go online · accept incoming checks · earn directly to your bank.
            </Text>
            <View style={styles.cardCtaRow}>
              <Text style={styles.cardCtaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.foot}>
            Both roles are always one tap away from your profile.
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    marginBottom: 16,
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
    marginTop: 8,
  },
});
