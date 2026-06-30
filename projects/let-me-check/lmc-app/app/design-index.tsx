// TEMP: design-review index — remove before launch
//
// A scrollable overview of every screen in the app, grouped by flow section.
// Tap any row to navigate to that screen with sensible default params so the
// design renders even when the function isn't wired. Use the screen's own
// back button (or the OS swipe) to return here.
//
// This file is NOT part of the production build — delete it when launch prep begins.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from './lib/theme';

// ── Shared default params ─────────────────────────────────────────────────────

const DEFAULT_CHECK_ID = '27278640-92a1-4148-a03f-06240c2d2deb';
const DEFAULT_VENUE    = 'Komodo';
const DEFAULT_CITY     = 'Miami';
const DEFAULT_MARKET   = 'mia';

// ── Types ─────────────────────────────────────────────────────────────────────

type RouteEntry = {
  label: string;
  path: string;
  params?: Record<string, string>;
  /** Screens that require live Supabase data to render correctly */
  needsData?: boolean;
};

type Section = {
  title: string;
  entries: RouteEntry[];
};

// ── Route manifest ────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    title: 'ENTRY',
    entries: [
      {
        label: 'Splash',
        path: '/',
        // NOTE: The splash auto-advances after ~3.8s — view it via a cold relaunch.
      },
      {
        label: 'How It Works',
        path: '/how-it-works',
      },
      {
        label: 'Welcome',
        path: '/welcome',
      },
    ],
  },
  {
    title: 'ONBOARDING',
    entries: [
      {
        label: 'Role',
        path: '/onboarding/role',
      },
      {
        label: 'Country',
        path: '/onboarding/country',
      },
      {
        label: 'City',
        path: '/onboarding/city',
        params: { country: 'US', from: 'onboarding' },
      },
      {
        label: 'Both Fork',
        path: '/onboarding/both-fork',
      },
      {
        label: 'Welcome Back',
        path: '/onboarding/welcome-back',
      },
      {
        label: 'Permissions',
        path: '/onboarding/permissions',
        params: { next: '/(seeker)/home' },
      },
      {
        label: 'Personal Info',
        path: '/onboarding/personal-info',
      },
      {
        label: 'Quick Finish (Almost Done)',
        path: '/onboarding/quick-finish',
        params: { from: 'apple' },
      },
      {
        label: 'Payment Checkout',
        path: '/onboarding/payment-checkout',
      },
    ],
  },
  {
    title: 'AUTH',
    entries: [
      {
        label: 'Sign In',
        path: '/auth/sign-in',
      },
      {
        label: 'Sign Up',
        path: '/auth/sign-up',
      },
    ],
  },
  {
    title: 'BECOME A SCOUT',
    entries: [
      {
        label: 'Become a Scout',
        path: '/scout/become',
      },
      {
        label: 'Payout Setup',
        path: '/scout/payout',
      },
      {
        label: 'Scout Rules',
        path: '/scout/rules',
      },
      {
        label: 'Approved',
        path: '/scout/approved',
      },
    ],
  },
  {
    title: 'SEEKER',
    entries: [
      {
        label: 'Home',
        path: '/(seeker)/home',
      },
      {
        label: 'Search',
        path: '/(seeker)/search',
      },
      {
        label: 'Venue',
        path: '/(seeker)/venue',
        params: { name: DEFAULT_VENUE, city: DEFAULT_CITY, marketId: DEFAULT_MARKET },
      },
      {
        label: 'Payment',
        path: '/(seeker)/payment',
        params: {
          venue: DEFAULT_VENUE,
          city: DEFAULT_CITY,
          tier: 'standard',
          price: '$15',
          time: '10 min',
        },
      },
      {
        label: 'Finding Scout',
        path: '/(seeker)/finding',
        params: {
          checkId: DEFAULT_CHECK_ID,
          venue: DEFAULT_VENUE,
          city: DEFAULT_CITY,
          tier: 'standard',
          time: '10 min',
        },
        needsData: true,
      },
      {
        label: 'Waiting',
        path: '/(seeker)/waiting',
        params: {
          checkId: DEFAULT_CHECK_ID,
          venue: DEFAULT_VENUE,
          city: DEFAULT_CITY,
          tier: 'standard',
        },
        needsData: true,
      },
      {
        label: 'Delivery',
        path: '/(seeker)/delivery',
        params: {
          checkId: DEFAULT_CHECK_ID,
          venue: DEFAULT_VENUE,
          city: DEFAULT_CITY,
        },
        needsData: true,
      },
      {
        label: 'Cancelled',
        path: '/(seeker)/cancelled',
        params: {
          venue: DEFAULT_VENUE,
          fee: '1.50',
          refund: '10.00',
          total: '15.00',
        },
      },
      {
        label: 'Error',
        path: '/(seeker)/error',
        params: { type: 'no-scouts' },
      },
      {
        label: 'History',
        path: '/(seeker)/history',
      },
      {
        label: 'Profile',
        path: '/(seeker)/profile',
      },
      {
        label: 'Saved',
        path: '/(seeker)/saved',
      },
      {
        label: 'Recurring',
        path: '/(seeker)/recurring',
      },
      {
        label: 'Recurring Setup',
        path: '/(seeker)/recurring-setup',
        params: {
          pinName: DEFAULT_VENUE,
          pinAddress: '801 Brickell Ave, Miami',
          pinLat: '25.7617',
          pinLon: '-80.1918',
          marketId: DEFAULT_MARKET,
        },
      },
      {
        label: 'Invite',
        path: '/(seeker)/invite',
      },
      {
        label: 'Notifications',
        path: '/(seeker)/notifications',
      },
      {
        label: 'Preferred Cities',
        path: '/(seeker)/preferred-cities',
      },
      {
        label: 'Payment Methods',
        path: '/(seeker)/payment-methods',
      },
      {
        label: 'Membership',
        path: '/(seeker)/membership',
      },
      {
        label: 'Help',
        path: '/(seeker)/help',
      },
      {
        label: 'Seeker Rules',
        path: '/seeker/rules',
      },
    ],
  },
  {
    title: 'SCOUT',
    entries: [
      {
        label: 'Dashboard',
        path: '/(scout)/dashboard',
      },
      {
        label: 'Filming',
        path: '/(scout)/filming',
        params: {
          checkId: DEFAULT_CHECK_ID,
          venue: DEFAULT_VENUE,
          payout: '10',
          tier: 'priority',
        },
      },
      {
        label: 'Submitted',
        path: '/(scout)/submitted',
        params: {
          checkId: DEFAULT_CHECK_ID,
          venue: DEFAULT_VENUE,
          payout: '10',
        },
      },
      {
        label: 'Earnings',
        path: '/(scout)/earnings',
      },
      {
        label: 'Withdraw',
        path: '/(scout)/withdraw',
      },
      {
        label: 'Profile',
        path: '/(scout)/profile',
      },
      {
        label: 'Payout Method',
        path: '/(scout)/payout-method',
      },
      {
        label: 'Verification',
        path: '/(scout)/verification',
      },
      {
        label: 'Tax Documents',
        path: '/(scout)/tax-documents',
      },
      {
        label: 'Personal Info',
        path: '/(scout)/personal-info',
      },
      {
        label: 'Scout Code',
        path: '/(scout)/scout-code',
      },
    ],
  },
  {
    title: 'LEGAL',
    entries: [
      {
        label: 'Terms of Service',
        path: '/legal/terms',
      },
      {
        label: 'Privacy Policy',
        path: '/legal/privacy',
      },
      {
        label: 'Acceptable Use',
        path: '/legal/aup',
      },
      {
        label: 'Scout Code of Conduct',
        path: '/legal/code',
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DesignIndex() {
  const router = useRouter();

  // Flatten entries to assign sequential numbers across all sections.
  let counter = 0;

  const navigate = (entry: RouteEntry) => {
    if (entry.params) {
      router.push({ pathname: entry.path as never, params: entry.params });
    } else {
      router.push(entry.path as never);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Design Index</Text>
          <Text style={styles.headerSub}>Every screen in flow order</Text>
        </View>
        <View style={styles.devPill}>
          <Text style={styles.devPillText}>DEV</Text>
        </View>
      </View>

      <View style={styles.backHint}>
        <Text style={styles.backHintText}>
          ↩  Tap a row to open that screen — use the back gesture or back button to return here
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>

            {section.entries.map((entry) => {
              counter += 1;
              const num = counter;

              return (
                <TouchableOpacity
                  key={entry.path + (entry.params ? JSON.stringify(entry.params) : '')}
                  style={styles.row}
                  onPress={() => navigate(entry)}
                  activeOpacity={0.6}
                >
                  <View style={styles.rowNum}>
                    <Text style={styles.rowNumText}>{num}</Text>
                  </View>

                  <View style={styles.rowContent}>
                    <View style={styles.rowLabelRow}>
                      <Text style={styles.rowLabel}>{entry.label}</Text>
                      {entry.needsData && (
                        <View style={styles.dataPill}>
                          <Text style={styles.dataPillText}>needs data</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowPath}>{entry.path}</Text>
                  </View>

                  <Text style={styles.rowArrow}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            TEMP — design-review only. Remove before launch.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  devPill: {
    backgroundColor: colors.red,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 12,
  },
  devPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onRed,
    letterSpacing: 1,
  },
  backHint: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backHintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  rowNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  rowNumText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowContent: {
    flex: 1,
  },
  rowLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },
  dataPill: {
    backgroundColor: colors.amber,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  dataPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#5A3800',
  },
  rowPath: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  rowArrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 22,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  footer: {
    marginTop: 32,
    marginHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
