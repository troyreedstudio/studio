// ─────────────────────────────────────────────────────────────────────────────
// demo-menu.tsx — TEMPORARY investor-walkthrough flow map (remove before launch).
// One screen that jumps to every page (Seeker + Scout + onboarding) so the whole
// app can be demoed smoothly on the simulator without hitting the sign-in wall.
// Deep link: lmc:///demo-menu   (the boot splash also routes here while demoing).
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const RED = '#DA251D';
const INK = '#0A0A0A';
const G2 = '#4B5563';
const G3 = '#6B7280';
const LINE = '#E5E7EB';
const SURFACE = '#F5F5F7';

type Row = { label: string; sub: string; href: string };
type Section = { title: string; tint: string; rows: Row[] };

// Mock params so param-driven screens render fully when jumped to cold.
const V = 'venue=Komodo&city=Miami&marketId=mia';
const CHECK = 'checkId=demo-check&venue=Komodo&city=Miami&tier=standard&time=10 min&price=$15';

const SECTIONS: Section[] = [
  {
    title: '▶  GUIDED STORY · END-TO-END  (tap 1 → 9)',
    tint: RED,
    rows: [
      { label: '1 · Seeker picks a place', sub: 'Home globe — tap a city to check it', href: '/(seeker)/home' },
      { label: '2 · Seeker chooses a tier', sub: 'Venue detail — Standard or Priority', href: `/(seeker)/venue?name=Komodo&city=Miami&marketId=mia` },
      { label: '3 · Seeker requests + pays', sub: 'Payment — order summary + fees', href: `/(seeker)/payment?${CHECK}` },
      { label: '4 · Matching a Scout nearby', sub: 'Finding — a real person on the ground', href: `/(seeker)/finding?${CHECK}` },
      { label: '5 · Scout gets the job', sub: 'Scout dashboard — request comes in', href: '/(scout)/dashboard?demo=1' },
      { label: '6 · Scout films the clip', sub: 'Filming — record UI + countdown', href: `/(scout)/filming?${CHECK}&payout=10&tier=priority` },
      { label: '7 · Scout submits + earns', sub: 'Submitted — clip sent, payout', href: `/(scout)/submitted?venue=Komodo&payout=10` },
      { label: '8 · Seeker watches the clip', sub: 'Delivery — the video + rate the Scout', href: `/(seeker)/delivery?${CHECK}` },
      { label: '9 · What the Scout keeps', sub: 'Earnings — weekly payouts', href: '/(scout)/earnings?demo=1' },
    ],
  },
  {
    title: 'SEEKER · THE CORE JOURNEY',
    tint: RED,
    rows: [
      { label: 'Home — the globe', sub: 'Live satellite globe, tap a city to check it', href: '/(seeker)/home' },
      { label: 'Search', sub: 'Find any place by name or voice', href: '/(seeker)/search' },
      { label: 'Venue detail', sub: 'Pick Standard or Priority tier', href: `/(seeker)/venue?name=Komodo&city=Miami&marketId=mia` },
      { label: 'Payment', sub: 'Order summary + fee breakdown', href: `/(seeker)/payment?${CHECK}` },
      { label: 'Finding a Scout', sub: 'Matching you to someone on the ground', href: `/(seeker)/finding?${CHECK}` },
      { label: 'Waiting', sub: 'Live countdown + delivery progress', href: `/(seeker)/waiting?${CHECK}` },
      { label: 'Delivery', sub: 'Watch the clip + rate the Scout', href: `/(seeker)/delivery?${CHECK}` },
      { label: 'History', sub: 'Past checks + stats', href: '/(seeker)/history' },
    ],
  },
  {
    title: 'SEEKER · ACCOUNT & EXTRAS',
    tint: RED,
    rows: [
      { label: 'Profile', sub: 'Seeker account hub', href: '/(seeker)/profile' },
      { label: 'Saved places', sub: 'Bookmarked spots', href: '/(seeker)/saved' },
      { label: 'Membership', sub: 'Prepaid credits / plan', href: '/(seeker)/membership' },
      { label: 'Recurring checks', sub: 'Scheduled repeat checks', href: '/(seeker)/recurring' },
      { label: 'Set up recurring', sub: 'Create a recurring check', href: '/(seeker)/recurring-setup' },
      { label: 'Preferred cities', sub: 'Your markets', href: '/(seeker)/preferred-cities' },
      { label: 'Payment methods', sub: 'Cards on file', href: '/(seeker)/payment-methods' },
      { label: 'Personal info', sub: 'Name, email, phone', href: '/(seeker)/personal-info' },
      { label: 'Notifications', sub: 'Alert settings', href: '/(seeker)/notifications' },
      { label: 'Invite friends', sub: 'Referral code', href: '/(seeker)/invite' },
      { label: 'Help', sub: 'Support + FAQ', href: '/(seeker)/help' },
    ],
  },
  {
    title: 'SCOUT · EARN ON THE GROUND',
    tint: '#16A34A',
    rows: [
      { label: 'Dashboard', sub: 'Go online, accept requests', href: '/(scout)/dashboard?demo=1' },
      { label: 'Filming', sub: 'Record UI + countdown', href: `/(scout)/filming?${CHECK}&payout=10&tier=priority` },
      { label: 'Submitted', sub: 'Success + earnings', href: `/(scout)/submitted?venue=Komodo&payout=10` },
      { label: 'Earnings', sub: 'Weekly chart + payouts', href: '/(scout)/earnings?demo=1' },
      { label: 'Withdraw', sub: 'Cash out', href: '/(scout)/withdraw' },
      { label: 'Payout method', sub: 'Bank / debit', href: '/(scout)/payout-method' },
      { label: 'Verification', sub: 'Scout onboarding / KYC', href: '/(scout)/verification' },
      { label: 'Tax documents', sub: 'W-9 / 1099', href: '/(scout)/tax-documents' },
      { label: 'Scout ID / code', sub: 'Unique Scout badge', href: '/(scout)/scout-code' },
      { label: 'Personal info', sub: 'Scout details', href: '/(scout)/personal-info' },
      { label: 'Scout profile', sub: 'Scout account hub', href: '/(scout)/profile' },
    ],
  },
  {
    title: 'FIRST-RUN · ONBOARDING',
    tint: G2,
    rows: [
      { label: 'How it works', sub: 'The intro explainer', href: '/how-it-works' },
      { label: 'Welcome / choose profile', sub: 'Seeker vs Scout', href: '/welcome' },
      { label: 'Pick a role', sub: 'Seeker or Scout', href: '/onboarding/role' },
      { label: 'Country', sub: 'Location step', href: '/onboarding/country' },
      { label: 'City', sub: 'Market selection', href: '/onboarding/city' },
      { label: 'Permissions', sub: 'Location / notifications', href: '/onboarding/permissions' },
      { label: 'Personal info', sub: 'Name / details', href: '/onboarding/personal-info' },
      { label: 'Payment checkout', sub: 'Add a card', href: '/onboarding/payment-checkout' },
      { label: 'Quick finish', sub: 'Wrap-up', href: '/onboarding/quick-finish' },
      { label: 'Both roles fork', sub: 'Seeker + Scout choice', href: '/onboarding/both-fork' },
      { label: 'Welcome back', sub: 'Returning-user picker', href: '/onboarding/welcome-back' },
    ],
  },
  {
    title: 'EDGE STATES',
    tint: G3,
    rows: [
      { label: 'Cancelled check', sub: 'No Scout / cancelled', href: `/(seeker)/cancelled?${CHECK}` },
      { label: 'Error state', sub: 'Something went wrong', href: '/(seeker)/error' },
      { label: 'Sign in', sub: 'Login screen', href: '/auth/sign-in' },
      { label: 'Sign up', sub: 'Create account', href: '/auth/sign-up' },
    ],
  },
];

export default function DemoMenu() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>DEMO WALKTHROUGH</Text>
          <Text style={styles.title}>Let Me Check</Text>
          <Text style={styles.subtitle}>Tap any screen to jump to it. Use the back gesture to return here.</Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: section.tint }]}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.href}
                  style={[styles.row, i < section.rows.length - 1 && styles.rowBorder]}
                  activeOpacity={0.7}
                  onPress={() => router.push(row.href as any)}
                >
                  <View style={[styles.dot, { backgroundColor: section.tint }]} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={styles.rowSub}>{row.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={G3} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>Temporary demo menu · remove before launch</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingTop: 64, paddingBottom: 48, paddingHorizontal: 18 },
  header: { marginBottom: 22 },
  eyebrow: { color: RED, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  title: { color: INK, fontSize: 32, fontWeight: '900', letterSpacing: -0.5, marginTop: 6 },
  subtitle: { color: G3, fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: LINE, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: LINE },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1 },
  rowLabel: { color: INK, fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  rowSub: { color: G3, fontSize: 12, marginTop: 1 },
  footer: { color: '#B0B4BB', fontSize: 11, textAlign: 'center', marginTop: 8 },
});
