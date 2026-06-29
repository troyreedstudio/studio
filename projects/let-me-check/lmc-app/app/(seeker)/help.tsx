import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Linking, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/BackButton';
import { colors } from '../lib/theme';

const FAQS = [
  { q: 'What is Let Me Check?', a: 'Order a real 15-second video of any place from a real person nearby. Delivered in 7-10 minutes. From $15.' },
  { q: 'How do I request a check?', a: 'Tap "Where do you need eyes?" on home, type or speak the place, pick a tier (Standard $15 or Priority $20), and pay. A nearby Scout will film and deliver to you within minutes.' },
  { q: 'When am I charged?', a: 'When you tap CONFIRM & PAY. If no Scout accepts within 5 minutes, you\'re refunded automatically.' },
  { q: 'Can I get a refund?', a: 'Yes — automatic if no Scout shows up, the video arrives outside the time window, or the Scout filmed the wrong place.' },
  { q: 'How do Scouts get verified?', a: 'GPS geofence, GPS-stamped videos, AI signage detection, reference photos, and a 20-min cooldown per venue prevent fraud.' },
  { q: 'Can I share the video?', a: 'No. Per our policy, LMC videos are for personal use and verification only. Sharing to social media is not allowed.' },
  { q: 'What if the Scout films the wrong place?', a: 'Tap REPORT ISSUE on the delivery screen and pick "Wrong place." We refund automatically and warn the Scout.' },
  { q: 'Can I become a Scout?', a: 'Yes — switch modes anytime from your Profile. You\'ll need to pass a quick verification flow and link a payout account.' },
];

const CONTACT_OPTIONS = [
  { icon: 'mail-outline', label: 'Email Support', value: 'help@letmecheck.com', href: 'mailto:help@letmecheck.com' },
  { icon: 'chatbubble-ellipses-outline', label: 'Live Chat', value: 'Mon-Fri, 9am-6pm EST', href: 'mailto:help@letmecheck.com' },
  // PLACEHOLDER: swap for the hosted URL before submission (D-05)
  { icon: 'document-text-outline', label: 'Terms of Service', value: 'lmc.app/terms', href: 'https://lmc.app/terms' },
  // PLACEHOLDER: swap for the hosted URL before submission (D-05)
  { icon: 'lock-closed-outline', label: 'Privacy Policy', value: 'lmc.app/privacy', href: 'https://lmc.app/privacy' },
];

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton fallback="/(seeker)/home" />
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>How can we help you today?</Text>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionLabel}>FREQUENTLY ASKED</Text>
        <View style={styles.faqList}>
          {FAQS.map((f, i) => (
            <View key={i} style={[styles.faqRow, i < FAQS.length - 1 && styles.faqRowBorder]}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Text style={styles.faqA}>{f.a}</Text>
            </View>
          ))}
        </View>

        {/* Contact */}
        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>STILL NEED HELP?</Text>
        <View style={styles.contactList}>
          {CONTACT_OPTIONS.map((c, i) => (
            <TouchableOpacity
              key={c.label}
              style={[styles.contactRow, i < CONTACT_OPTIONS.length - 1 && styles.contactRowBorder]}
              activeOpacity={0.7}
              onPress={() => { if (c.href) void Linking.openURL(c.href); }}
            >
              <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.red} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{c.label}</Text>
                <Text style={styles.contactValue}>{c.value}</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dev preview — gated to development builds only, not visible in Release */}
        {__DEV__ && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>DEV · PREVIEW ERROR STATES</Text>
            <View style={styles.devList}>
              {[
                { key: 'no-scouts', label: 'No Scouts available' },
                { key: 'payment-declined', label: 'Payment declined' },
                { key: 'connection', label: 'Connection lost' },
                { key: 'missed-window', label: 'Scout missed window' },
              ].map((e, i, arr) => (
                <TouchableOpacity
                  key={e.key}
                  style={[styles.devRow, i < arr.length - 1 && styles.devRowBorder]}
                  onPress={() => router.push({ pathname: '/(seeker)/error', params: { type: e.key } })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.devLabel}>{e.label}</Text>
                  <Text style={styles.devArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.disclaimer}>
          Let Me Check · "Know Before You Go" · v1.0 · Built with care
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary, letterSpacing: 0.3 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  faqList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqRow: { padding: 16 },
  faqRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  faqQ: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  faqA: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  contactList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  contactRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  contactIcon: { fontSize: 18 },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  contactValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  contactArrow: {
    fontSize: 20,
    color: colors.red,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  devList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: 22,
    overflow: 'hidden',
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  devRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  devLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  devArrow: {
    fontSize: 18,
    color: colors.red,
  },
});
