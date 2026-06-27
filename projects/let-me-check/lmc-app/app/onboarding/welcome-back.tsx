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

// Shown after a returning user signs in via /auth/sign-in.
// For prototype, every signed-in user sees both options. In production,
// this branches based on the user's role on file.

export default function WelcomeBackScreen() {
  const router = useRouter();

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header} />

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
                <Ionicons name="eye-outline" size={26} color={colors.red} />
              </View>
              <View style={[styles.tagPill, styles.tagPillSeeker]}>
                <Ionicons name="eye" size={11} color={colors.red} />
                <Text style={[styles.tagPillText, styles.tagPillSeekerText]}>SEEKER</Text>
              </View>
            </View>
            <Text style={styles.cardHeadline}>Open as a Seeker</Text>
            <Text style={styles.cardLead}>
              Browse the map, request a check, watch the clip when it lands.
            </Text>
            <View style={styles.cardCtaRow}>
              <Text style={styles.cardCtaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.red} />
            </View>
          </TouchableOpacity>

          {/* SCOUT CARD */}
          <TouchableOpacity
            style={[styles.card, styles.cardScout]}
            activeOpacity={0.9}
            onPress={() => router.replace('/(scout)/dashboard')}
          >
            <View style={styles.cardTop}>
              <View style={[styles.cardIconWrap, styles.cardIconWrapLight]}>
                <Ionicons name="videocam-outline" size={26} color={colors.onRed} />
              </View>
              <View style={[styles.tagPill, styles.tagPillScout]}>
                <Ionicons name="videocam" size={11} color={colors.onRed} />
                <Text style={[styles.tagPillText, styles.tagPillScoutText]}>SCOUT</Text>
              </View>
            </View>
            <Text style={styles.cardHeadlineLight}>Open as a Scout</Text>
            <Text style={styles.cardLeadLight}>
              Go online, accept incoming checks, earn directly to your bank.
            </Text>
            <View style={styles.cardCtaRowLight}>
              <Text style={styles.cardCtaTextLight}>Continue</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.onRed} />
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
  bg: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },

  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },

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
    marginBottom: 26,
  },

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
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapLight: {
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    marginBottom: 16,
  },
  cardLeadLight: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
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
    marginTop: 8,
  },
});
