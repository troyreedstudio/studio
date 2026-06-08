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
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Status = 'BUILT' | 'WIREFRAME' | 'MERGED' | 'DEFERRED';
type Step = {
  num: number;
  name: string;
  desc: string;
  route: string;
  status: Status;
  badge?: string;
};

const FULL_SEEKER: Step[] = [
  { num: 1, name: 'Splash', desc: 'Chrome LMC boot · chime · 4 sec auto-advance', route: '/', status: 'BUILT' },
  { num: 2, name: 'Welcome', desc: 'Brand mark + tagline + GET STARTED · Sign in', route: '/welcome', status: 'BUILT' },
  { num: 3, name: 'Intro Carousel', desc: '3 slides · Real Eyes / Right Now / Anywhere', route: '/intro', status: 'BUILT' },
  { num: 4, name: 'Sign Up — Method', desc: 'Apple · Google · Phone', route: '/auth/sign-up', status: 'BUILT' },
  { num: 5, name: 'Sign In (returning users)', desc: 'Apple · Google · Phone OTP → /onboarding/welcome-back', route: '/auth/sign-in', status: 'BUILT' },
  { num: 6, name: 'Welcome Back', desc: 'Returning-user role picker · Seeker → home / Scout → dashboard', route: '/onboarding/welcome-back', status: 'BUILT' },
  { num: 7, name: 'Phone + OTP', desc: 'Number entry → SMS code (Phone path only)', route: '/auth/sign-up', status: 'BUILT' },
  { num: 8, name: 'Personal Info (Seeker)', desc: 'Name · email · phone verified pill · "I am 18+" checkbox + bundled consent (Terms · Privacy · AUP). NO DOB / SSN / bank — that all lives in the Scout flow only.', route: '/onboarding/personal-info', status: 'BUILT' },
  { num: 9, name: 'Rules / Acceptable Use', desc: 'Acceptable use + Terms + Privacy checkboxes', route: '/auth/sign-up', status: 'BUILT' },
  { num: 10, name: 'Permissions', desc: 'Location (REQUIRED) + Notifications (RECOMMENDED) · iOS-style prompts · if-denied warnings · iOS Settings deeplink', route: '/onboarding/permissions', status: 'BUILT' },
  { num: 11, name: 'Choose Your Path', desc: 'Seeker vs Scout vs Both · ALL routes go through /auth/sign-up now (Scout no longer skips auth)', route: '/onboarding/role', status: 'BUILT' },
  { num: 12, name: 'Seeker Home', desc: 'Map + bottom sheet · browse + request a check', route: '/(seeker)/home', status: 'BUILT' },
  { num: 13, name: 'Legal docs', desc: 'Terms · Privacy · AUP · Scout Code — reachable from consent links anywhere in onboarding', route: '/legal/terms', status: 'BUILT' },
  { num: 14, name: 'Payment (at checkout)', desc: 'Stripe Payment Sheet — built inline on payment.tsx, slides up from bottom · saves card via shared state', route: '/(seeker)/payment', status: 'BUILT' },
];

const FULL_SCOUT: Step[] = [
  // ===== ONBOARDING =====
  { num: 1, name: 'Become a Scout', desc: 'Entry from Choose Path or Seeker profile · explains the ~10 min flow · all 4 step rows tappable', route: '/scout/become', status: 'BUILT' },
  { num: 2, name: 'Identity Verification', desc: 'ID-type selector · front/back/selfie slots · consent gate · Stripe Identity handoff', route: '/scout/identity', status: 'BUILT' },
  { num: 3, name: 'Configure Payouts', desc: 'Speed selector · earnings preview · tax + trust · Stripe Connect handoff', route: '/scout/payout', status: 'BUILT' },
  { num: 4, name: 'The Scout Code', desc: 'Code of Conduct · sidewalks · safety · audio · QUALITY STANDARDS (rejection = no pay) · dual gate (CONSENT + AGREE)', route: '/scout/rules', status: 'BUILT' },
  { num: 5, name: 'Approved', desc: 'Chrome ✓ hero · Scout ID card · on-file checklist · unlocked perks · first steps · reminders + support', route: '/scout/approved', status: 'BUILT' },

  // ===== OPERATIONAL =====
  { num: 6, name: 'Scout Dashboard', desc: 'Top bar back · online toggle · auto-rotating incoming requests (5-venue pool) · reactive today\'s earnings · 4-tab nav', route: '/(scout)/dashboard', status: 'BUILT' },
  { num: 7, name: 'Filming + Camera', desc: 'Premium white record button (breathing halo) · simulated camera viewfinder · GPS/MIC pills · CAPTURED green flash at 15s · STOP & RETAKE label · 3-take retake decision card', route: '/(scout)/filming', status: 'BUILT' },
  { num: 8, name: 'Upload + Submitted', desc: 'Visible upload progress (UPLOADING → VERIFYING → DELIVERED) · 4-step status timeline · earnings flip PENDING → CLEARED · cleared-payment toast · Quality Standards reminder', route: '/(scout)/submitted', status: 'BUILT' },
  { num: 9, name: 'Earnings Dashboard', desc: 'THIS MONTH indigo card · weekly bar chart with today highlighted · ALL TIME stats · payouts list (gold PENDING / green PAID) · indigo Withdraw card', route: '/(scout)/earnings', status: 'BUILT' },
];

// LEAN (V2) — DoorDash/Substack-style segmentation, Uber-style minimum data.
// Comprehensive map of every screen we ship in V2 Lean — onboarding, returning
// user, operational, profile, deeper sub-pages, and legal. In order.
const LEAN_SEEKER: Step[] = [
  // ===== ONBOARDING (new user sign-up) =====
  { num: 1, name: 'Splash', desc: 'Brand boot · 2 sec auto-advance · 1st-time only', route: '/', status: 'BUILT' },
  { num: 2, name: 'Welcome', desc: 'Brand mark + Know Before You Go + GET STARTED · Sign in for returning users', route: '/welcome', status: 'BUILT' },
  { num: 3, name: 'Choose Your Path', desc: 'Seeker · Scout · Both. Segments early so sign-up copy + funnel adapt to role.', route: '/onboarding/role', status: 'BUILT' },
  { num: 4, name: 'Sign Up — Method', desc: 'Apple · Google · Phone — copy adapts by role chosen at step 3', route: '/auth/sign-up', status: 'BUILT' },
  { num: 5, name: 'Phone + OTP', desc: 'Number entry → SMS 6-digit code. Phone path only — skipped for Apple/Google.', route: '/auth/sign-up', status: 'BUILT', badge: 'CONDITIONAL' },
  { num: 6, name: 'Quick Finish (Seeker)', desc: 'Name + email auto-fill (Apple/Google) · phone-verified pill · single bundled 18+ + Terms/Privacy/AUP checkbox. NO DOB / SSN / bank.', route: '/onboarding/quick-finish', status: 'BUILT' },
  { num: 7, name: 'How LMC Works (Seeker)', desc: 'WHAT YOU\'LL GET · WHAT WE DON\'T CAPTURE · AVOID USING LMC TO · refunds · dual gate (I UNDERSTAND + I AGREE). Only Seeker/Both — Scout-only skips.', route: '/seeker/rules', status: 'BUILT' },
  { num: 8, name: 'Both Fork', desc: 'Shown only to users who picked BOTH. Scout setup leads (indigo card), Seeker-first is secondary. Either path keeps both roles.', route: '/onboarding/both-fork', status: 'BUILT', badge: 'CONDITIONAL' },

  // ===== RETURNING USER (sign-in flow) =====
  { num: 9, name: 'Sign In (returning)', desc: 'Apple · Google · Phone OTP for returning users. Routes to Welcome Back.', route: '/auth/sign-in', status: 'BUILT' },
  { num: 10, name: 'Welcome Back', desc: '"Welcome back, Troy" — two-card role picker. Seeker → /(seeker)/home · Scout → /(scout)/dashboard.', route: '/onboarding/welcome-back', status: 'BUILT' },

  // ===== SEEKER OPERATIONAL (request → watch) =====
  { num: 11, name: 'Seeker Home', desc: 'Map + bottom sheet · drop-pin · search · recents · saved chips · "Become a Scout" invite card', route: '/(seeker)/home', status: 'BUILT' },
  { num: 12, name: 'Venue Detail', desc: 'Auto-playing preview video · Standard ($15) / Priority ($20) tier picker · Partner Interior +$5 toggle · LIVE CHECKS pill', route: '/(seeker)/venue', status: 'BUILT' },
  { num: 13, name: 'Payment + Stripe Sheet', desc: 'Order summary · payment-method row · Stripe-style sheet slides up (Apple Pay + card form + save toggle) · saved card persists', route: '/(seeker)/payment', status: 'BUILT' },
  { num: 14, name: 'Confirmed', desc: 'Animated green ✓ · payment confirmation receipt · TRACK MY CHECK CTA', route: '/(seeker)/confirmed', status: 'BUILT' },
  { num: 15, name: 'Waiting', desc: 'Satellite map · Scout on site jitter · countdown · uniform meta pills · cancel link with refund Alert', route: '/(seeker)/waiting', status: 'BUILT' },
  { num: 16, name: 'Delivery', desc: 'Video player · 5-star rating · Scout info · save/share/replay', route: '/(seeker)/delivery', status: 'BUILT' },
  { num: 17, name: 'Cancelled', desc: 'Animated white ✕ · refund math (Order total − $5 fee = refund)', route: '/(seeker)/cancelled', status: 'BUILT' },

  // ===== SEEKER PROFILE + HISTORY =====
  { num: 18, name: 'Profile', desc: 'Account settings · role toggle · referrals · sign-out', route: '/(seeker)/profile', status: 'BUILT' },
  { num: 19, name: 'History', desc: 'Past checks · stats · ratings · tap to replay', route: '/(seeker)/history', status: 'BUILT' },
  { num: 20, name: 'Saved Places', desc: 'Saved venues with one-tap CHECK + remove', route: '/(seeker)/saved', status: 'BUILT' },
  { num: 21, name: 'Recurring Checks', desc: 'Schedule auto-checks daily/weekly/monthly at set time', route: '/(seeker)/recurring', status: 'BUILT' },
  { num: 22, name: 'Membership', desc: '3-tier subscription · Free / Plus $29 / Pro $79', route: '/(seeker)/membership', status: 'BUILT' },
  { num: 23, name: 'Search', desc: 'Full-screen modal · venues, cities, recents · voice + current location', route: '/(seeker)/search', status: 'BUILT' },

  // ===== SEEKER DEEPER PROFILE =====
  { num: 24, name: 'Invite Friends', desc: 'Referral code share + link', route: '/(seeker)/invite', status: 'BUILT' },
  { num: 25, name: 'Payment Methods', desc: 'Cards on file · add / remove · default selection', route: '/(seeker)/payment-methods', status: 'BUILT' },
  { num: 26, name: 'Notifications', desc: 'Push + email + SMS preferences toggles', route: '/(seeker)/notifications', status: 'BUILT' },
  { num: 27, name: 'Help / Support', desc: 'FAQ · contact email · in-app form', route: '/(seeker)/help', status: 'BUILT' },
  { num: 28, name: 'Report Issue', desc: 'Report a bug or a venue · category + description', route: '/(seeker)/report', status: 'BUILT' },
  { num: 29, name: 'Error State', desc: 'Network / unexpected error fallback screen', route: '/(seeker)/error', status: 'BUILT' },
  { num: 30, name: 'Preferred Cities', desc: 'Set city watchlist for venue browsing + alerts', route: '/(seeker)/preferred-cities', status: 'BUILT' },

  // ===== LEGAL =====
  { num: 31, name: 'Legal — Terms', desc: 'Terms of Service · 8 sections · linked from consent screens', route: '/legal/terms', status: 'BUILT' },
  { num: 32, name: 'Legal — Privacy', desc: 'Privacy Policy · 8 sections · how we use your data', route: '/legal/privacy', status: 'BUILT' },
  { num: 33, name: 'Legal — AUP', desc: 'Acceptable Use Policy · 6 sections · what LMC is/isn\'t for', route: '/legal/aup', status: 'BUILT' },
  { num: 34, name: 'Legal — Scout Code', desc: 'The Scout Code readable doc · 6 sections · linked from Approved screen', route: '/legal/code', status: 'BUILT' },
];

// What we cut from FULL → LEAN, and where it went. The LEAN flow is what we ship.
const LEAN_CUTS: Step[] = [
  { num: 0, name: 'Intro Carousel', desc: 'MOVED — surfaces as a first-launch tour overlay on Seeker Home instead of a 3-screen blocker. (Uber: no carousel — they trust their brand mark)', route: '/intro', status: 'DEFERRED' },
  { num: 0, name: 'Personal Info screen', desc: 'MERGED into Quick Finish — Apple/Google pre-fills name+email, user only types DOB. (Uber: same single-screen approach)', route: '/onboarding/personal-info', status: 'MERGED' },
  { num: 0, name: 'Rules / AUP screen', desc: 'MERGED into Quick Finish as one bundled checkbox with links to full Terms · Privacy · AUP text. (Uber: same — single consent line at sign-up)', route: '/auth/sign-up', status: 'MERGED' },
  { num: 0, name: 'Permissions screen', desc: 'DEFERRED — iOS prompts Location naturally when map mounts, Notifications when first check is requested. No pre-emptive permissions wall. (Uber: same — asks at point-of-need)', route: '/onboarding/permissions', status: 'DEFERRED' },
  { num: 0, name: 'Payment screen', desc: 'DEFERRED to first checkout via Stripe sheet. No card on file required to browse. (Uber: same — payment added at first ride)', route: '/onboarding/payment-checkout', status: 'DEFERRED' },
];

const LEAN_SCOUT: Step[] = FULL_SCOUT;

const CHROME_STOPS: [string, string, ...string[]] = [
  '#a8a8a8', '#ffffff', '#ffffff', '#f2f2f2', '#8c8c8c', '#363636', '#161616',
];
const CHROME_LOCATIONS: [number, number, ...number[]] = [0, 0.22, 0.5, 0.58, 0.68, 0.88, 1];

export default function FlowMapScreen() {
  const router = useRouter();
  const [version, setVersion] = useState<'full' | 'lean'>('full');
  const [mode, setMode] = useState<'seeker' | 'scout'>('seeker');

  const flow =
    version === 'full'
      ? mode === 'seeker' ? FULL_SEEKER : FULL_SCOUT
      : mode === 'seeker' ? LEAN_SEEKER : LEAN_SCOUT;

  const cuts = version === 'lean' && mode === 'seeker' ? LEAN_CUTS : [];

  const fullCount = mode === 'seeker' ? FULL_SEEKER.length : FULL_SCOUT.length;
  const leanCount = mode === 'seeker' ? LEAN_SEEKER.length : LEAN_SCOUT.length;

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.brandHeader}>
          <MaskedView
            style={styles.maskWrap}
            maskElement={
              <View style={styles.maskCenter}>
                <Text style={styles.lmcMask}>LMC</Text>
              </View>
            }
          >
            <View style={styles.gradientWrap}>
              <LinearGradient
                colors={CHROME_STOPS}
                locations={CHROME_LOCATIONS}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          </MaskedView>
          <Text style={styles.eyebrow}>USER FLOW MAP</Text>
          <View style={styles.prototypePill}>
            <View style={styles.prototypeDot} />
            <Text style={styles.prototypeText}>PROTOTYPE · payments + delivery simulated · feedback welcome</Text>
          </View>
        </View>

        <View style={styles.versionTabs}>
          <TouchableOpacity
            onPress={() => setVersion('full')}
            style={[styles.versionTab, version === 'full' && styles.versionTabActiveFull]}
            activeOpacity={0.8}
          >
            <Text style={[styles.versionTabText, version === 'full' && styles.versionTabTextActiveFull]}>
              v1 · FULL
            </Text>
            <Text style={[styles.versionTabCount, version === 'full' && styles.versionTabCountActiveFull]}>
              {fullCount} steps
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setVersion('lean')}
            style={[styles.versionTab, version === 'lean' && styles.versionTabActiveLean]}
            activeOpacity={0.8}
          >
            <Text style={[styles.versionTabText, version === 'lean' && styles.versionTabTextActiveLean]}>
              v2 · LEAN
            </Text>
            <Text style={[styles.versionTabCount, version === 'lean' && styles.versionTabCountActiveLean]}>
              {leanCount} steps
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setMode('seeker')}
            style={[styles.tab, mode === 'seeker' && styles.tabActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, mode === 'seeker' && styles.tabTextActive]}>
              SEEKER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('scout')}
            style={[styles.tab, mode === 'scout' && styles.tabActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, mode === 'scout' && styles.tabTextActive]}>
              SCOUT
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {version === 'lean' && mode === 'seeker' && (
            <View style={styles.compareBox}>
              <Text style={styles.compareTitle}>v2 LEAN saves 4 screens</Text>
              <Text style={styles.compareSub}>
                FULL: 10 screens · ~90 sec for Phone path{'\n'}
                LEAN: 6 screens · ~60 sec for Phone path · ~30 sec for Apple/Google
              </Text>
            </View>
          )}

          {flow.map((step, idx) => {
            const isLast = idx === flow.length - 1 && cuts.length === 0;
            return (
              <StepCard
                key={`${step.num}-${step.name}`}
                step={step}
                isLast={isLast}
                onPress={() => router.push(step.route as never)}
              />
            );
          })}

          {cuts.length > 0 && (
            <>
              <View style={styles.cutsHeader}>
                <Text style={styles.cutsHeaderText}>CUT FROM v1 FULL</Text>
                <View style={styles.cutsHeaderLine} />
              </View>
              {cuts.map((step) => (
                <StepCard
                  key={`cut-${step.name}`}
                  step={step}
                  isLast
                  onPress={() => router.push(step.route as never)}
                />
              ))}
            </>
          )}

          <View style={styles.legend}>
            <Text style={styles.legendTitle}>STATUS LEGEND</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.pillBuilt]} />
              <Text style={styles.legendText}><Text style={styles.legendBold}>BUILT</Text> — production screen</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.pillWireframe]} />
              <Text style={styles.legendText}><Text style={styles.legendBold}>WIREFRAME</Text> — placeholder for flow review</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.pillMerged]} />
              <Text style={styles.legendText}><Text style={styles.legendBold}>MERGED</Text> — combined into another step</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.pillDeferred]} />
              <Text style={styles.legendText}><Text style={styles.legendBold}>DEFERRED</Text> — moved to point-of-need or post-signup</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StepCard({ step, isLast, onPress }: { step: Step; isLast: boolean; onPress: () => void }) {
  const statusStyle = statusToStyle(step.status);
  const isCut = step.status === 'MERGED' || step.status === 'DEFERRED';

  return (
    <View style={styles.stepWrap}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepCircle, statusStyle.circle]}>
          {step.num > 0 ? (
            <Text style={[styles.stepNum, statusStyle.numText]}>{step.num}</Text>
          ) : (
            <Ionicons name="close" size={12} color={statusStyle.iconColor} />
          )}
        </View>
        {!isLast && <View style={styles.stepLine} />}
      </View>

      <TouchableOpacity
        style={[styles.stepCard, isCut && styles.stepCardCut]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.stepCardHeader}>
          <Text style={[styles.stepName, isCut && styles.stepNameCut]}>{step.name}</Text>
          <View style={styles.badgesRow}>
            {step.badge && (
              <View style={styles.badgeOpt}>
                <Text style={styles.badgeOptText}>{step.badge}</Text>
              </View>
            )}
            <View style={[styles.statusPill, statusStyle.pill]}>
              <Text style={[styles.statusText, statusStyle.text]}>{step.status}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.stepDesc, isCut && styles.stepDescCut]}>{step.desc}</Text>
        <View style={styles.stepRoute}>
          <Ionicons name="link-outline" size={11} color="rgba(255,255,255,0.4)" />
          <Text style={styles.stepRouteText}>{step.route}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: 'auto' }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function statusToStyle(s: Status) {
  switch (s) {
    case 'BUILT':
      return { circle: styles.circleBuilt, pill: styles.pillBuilt, text: styles.textBuilt, numText: styles.numBuilt, iconColor: '#00FF7F' };
    case 'WIREFRAME':
      return { circle: styles.circleWireframe, pill: styles.pillWireframe, text: styles.textWireframe, numText: styles.numWireframe, iconColor: '#FF6B00' };
    case 'MERGED':
      return { circle: styles.circleMerged, pill: styles.pillMerged, text: styles.textMerged, numText: styles.numMerged, iconColor: 'rgba(255,255,255,0.45)' };
    case 'DEFERRED':
      return { circle: styles.circleDeferred, pill: styles.pillDeferred, text: styles.textDeferred, numText: styles.numDeferred, iconColor: 'rgba(255,255,255,0.45)' };
  }
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  brandHeader: { alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  maskWrap: { width: 130, height: 32 },
  maskCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  lmcMask: { fontFamily: 'Orbitron_700Bold', fontSize: 28, color: '#000', backgroundColor: 'transparent' },
  gradientWrap: { flex: 1, overflow: 'hidden' },
  eyebrow: { fontFamily: 'Orbitron_500Medium', color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 4, marginTop: 12 },
  prototypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,203,71,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.35)',
    marginTop: 10,
  },
  prototypeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFCB47',
  },
  prototypeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#FFCB47',
    letterSpacing: 1.2,
  },
  versionTabs: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  versionTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  versionTabActiveFull: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255,107,0,0.08)',
  },
  versionTabActiveLean: {
    borderColor: '#00FF7F',
    backgroundColor: 'rgba(0,255,127,0.08)',
  },
  versionTabText: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 1.6,
  },
  versionTabTextActiveFull: { color: '#FF6B00' },
  versionTabTextActiveLean: { color: '#00FF7F' },
  versionTabCount: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 2,
  },
  versionTabCountActiveFull: { color: 'rgba(255,107,0,0.8)' },
  versionTabCountActiveLean: { color: 'rgba(0,255,127,0.8)' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tabActive: {
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 1.6,
  },
  tabTextActive: { color: '#ffffff' },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },
  compareBox: {
    backgroundColor: 'rgba(0,255,127,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  compareTitle: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  compareSub: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    lineHeight: 17,
  },
  stepWrap: { flexDirection: 'row', minHeight: 110 },
  stepLeft: { alignItems: 'center', width: 36 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 14,
  },
  circleBuilt: { backgroundColor: 'rgba(0,255,127,0.15)', borderColor: '#00FF7F' },
  circleWireframe: { backgroundColor: 'rgba(255,107,0,0.12)', borderColor: 'rgba(255,107,0,0.6)' },
  circleMerged: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.25)' },
  circleDeferred: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.25)' },
  stepNum: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 11 },
  numBuilt: { color: '#00FF7F' },
  numWireframe: { color: 'rgba(255,107,0,0.9)' },
  numMerged: { color: 'rgba(255,255,255,0.45)' },
  numDeferred: { color: 'rgba(255,255,255,0.45)' },
  stepLine: { flex: 1, width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 4 },
  stepCard: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepCardCut: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  stepName: { fontFamily: 'Inter_700Bold', color: '#ffffff', fontSize: 14, letterSpacing: 0.2, flex: 1, paddingRight: 8 },
  stepNameCut: { color: 'rgba(255,255,255,0.55)', textDecorationLine: 'line-through' },
  badgeOpt: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeOptText: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    letterSpacing: 1.2,
  },
  statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  pillBuilt: { backgroundColor: 'rgba(0,255,127,0.18)' },
  pillWireframe: { backgroundColor: 'rgba(255,107,0,0.18)' },
  pillMerged: { backgroundColor: 'rgba(255,255,255,0.1)' },
  pillDeferred: { backgroundColor: 'rgba(255,255,255,0.1)' },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  textBuilt: { color: '#00FF7F' },
  textWireframe: { color: '#FF6B00' },
  textMerged: { color: 'rgba(255,255,255,0.6)' },
  textDeferred: { color: 'rgba(255,255,255,0.6)' },
  stepDesc: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  stepDescCut: { color: 'rgba(255,255,255,0.45)' },
  stepRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  stepRouteText: { fontFamily: 'JetBrainsMono_500Medium', color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  cutsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  cutsHeaderText: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 2,
  },
  cutsHeaderLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  legend: {
    marginTop: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  legendTitle: { fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 2, marginBottom: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', fontSize: 11, flex: 1 },
  legendBold: { fontFamily: 'Inter_700Bold', color: '#ffffff' },
});
