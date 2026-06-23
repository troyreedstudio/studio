// Standalone Scout Code screen in the (scout) route group.
// Renders the Code of Conduct content directly — avoids the legal/[doc].tsx
// "Accept" button wizard chrome and ensures router.back() always returns to
// the Scout profile without bouncing through the signup flow.

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'What you can film',
    body:
      'Public sidewalks, streets, parking lots, plazas. The line, queue, or entry area of a venue from a public vantage point. Public-facing interiors (GREEN-tier venues) per category guidelines. Partner Interior (+$5) when the venue is marked PARTNER.',
  },
  {
    heading: "What we don't capture",
    body:
      "Close-ups of strangers' faces (auto-blurred regardless). Children in frame. Anyone who explicitly objects. Areas marked \"No Photography\". Airport security, gates, customs. Hospitals, schools, courts, police, military. Bathrooms, locker rooms, dressing rooms — ever. Private homes or private property. Audio of any kind (mic stays muted).",
  },
  {
    heading: 'Quality standards',
    body:
      "Rejection = no payment. A video can be rejected for: blurry, shaky, or out-of-focus footage; venue not visible; GPS mismatch; lens covered; faces in frame that couldn't be auto-blurred; audio detected; video shorter than required. You get up to 3 takes per check, use them.",
  },
  {
    heading: 'Conduct',
    body:
      'Be unobtrusive. If asked what you\'re doing: "I\'m using Let Me Check, an app that does location checks. I can leave right now if that\'s a problem." If asked to stop, stop immediately and hit TROUBLE HERE. Do not provoke a reaction. No staging or re-shoots, one take, real-time.',
  },
  {
    heading: 'Pay',
    body:
      'Standard $8 (10-minute window). Priority $12 (7-minute window). Honest abort $3 (TROUBLE HERE + GPS proof). Fake or abandon $0 plus possible account suspension.',
  },
  {
    heading: 'Independent Contractor',
    body:
      "You're an independent contractor, not a Let Me Check employee. You set your own hours, choose which checks to accept, and are responsible for your own taxes. A 1099-NEC is mailed each January if you earn $600 or more. Let Me Check may deactivate your account at any time for violations.",
  },
];

export default function ScoutCodeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.docLabel}>SCOUT</Text>
          <Text style={styles.title}>The Scout Code</Text>
          <View style={styles.titleRule} />
          <Text style={styles.effective}>Effective 2026-06-08</Text>
        </View>

        <Text style={styles.intro}>
          The full Code of Conduct every Scout signs at onboarding. Read this before your first check, and refer back anytime.
        </Text>

        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <Ionicons name="chevron-forward" size={13} color="#00FF7F" />
              <Text style={styles.heading}>{section.heading}</Text>
            </View>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footLabel}>QUESTIONS?</Text>
          <Text style={styles.footText}>
            Email support@letmecheck.app. We respond within 24 hours.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingBottom: 32 },

  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 18,
  },
  docLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  titleRule: {
    height: 2,
    width: 32,
    backgroundColor: '#00FF7F',
    marginBottom: 10,
  },
  effective: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3,
  },

  intro: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 21,
    letterSpacing: 0.2,
    paddingHorizontal: 22,
    marginBottom: 24,
  },

  section: {
    marginHorizontal: 22,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  heading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
    letterSpacing: 0.2,
  },

  footer: {
    marginHorizontal: 22,
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(0,255,127,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.15)',
  },
  footLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(0,255,127,0.7)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  footText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
    letterSpacing: 0.2,
  },
});
