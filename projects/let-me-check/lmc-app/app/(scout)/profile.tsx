import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { switchRole, signOut } from '../lib/auth';
import { deleteMyAccount } from '../lib/account';
import { getProfile } from '../lib/api';
import { getScoutEarnings, type ScoutEarnings } from '../lib/payments';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { CtaGlow } from '../components/CtaGlow';

/**
 * Derive a stable, human-readable Scout ID from the user's Supabase auth UUID.
 * Same algorithm as scout/approved.tsx — deterministic "SCT-XXXX-XXX" from
 * the last 7 hex digits of the UUID.
 */
function stableScoutId(uid: string): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hex = uid.replace(/-/g, '').slice(-7);
  const n = parseInt(hex, 16);
  let out = '';
  let v = n;
  for (let i = 0; i < 7; i++) {
    out = CHARS[v % 32] + out;
    v = Math.floor(v / 32);
  }
  return `SCT-${out.slice(0, 4)}-${out.slice(4)}`;
}

type IconName = keyof typeof Ionicons.glyphMap;

// One account, two hats -- this is the Scout (worker) hub. Shared account items
// (notifications, help, personal info) are common to both roles.
const SCOUT_ITEMS: { icon: IconName; label: string; route: string }[] = [
  { icon: 'stats-chart-outline', label: 'Earnings', route: '/(scout)/earnings' },
  { icon: 'card-outline', label: 'Payout method', route: '/(scout)/payout-method' },
  { icon: 'shield-checkmark-outline', label: 'Identity & verification', route: '/(scout)/verification' },
  { icon: 'document-text-outline', label: 'Tax documents (1099)', route: '/(scout)/tax-documents' },
  { icon: 'reader-outline', label: 'The Scout Code', route: '/(scout)/scout-code' },
  { icon: 'gift-outline', label: 'Invite friends', route: '/(seeker)/invite' },
];

const ACCOUNT_ITEMS: { icon: IconName; label: string; route: string }[] = [
  { icon: 'person-outline', label: 'Personal info', route: '/(scout)/personal-info' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/(seeker)/notifications' },
  { icon: 'help-circle-outline', label: 'Help', route: '/(seeker)/help' },
];

export default function ScoutProfileScreen() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  // Real profile + earnings data
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<ScoutEarnings | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [scoutId, setScoutId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    Promise.all([getProfile(), getScoutEarnings(), supabase.auth.getUser()])
      .then(([profile, earnings, { data: u }]) => {
        if (cancelled) return;
        setDisplayName(profile?.display_name ?? null);
        setEarningsData(earnings);
        if (u.user?.id) setScoutId(stableScoutId(u.user.id));
      })
      .catch(() => {
        // Stats fail silently -- show zeros rather than crash
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive initials from display name (fallback to '?')
  const initials = displayName
    ? displayName
        .trim()
        .split(/\s+/)
        .map((w) => (w[0] ?? '').toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  const firstName = displayName
    ? displayName.trim().split(/\s+/)[0] ?? null
    : null;

  // Stat values — real data from scout-earnings Edge fn (Wave D).
  const totalEarned = earningsData ? (earningsData.allTimeCents / 100).toFixed(2) : '0.00';
  const totalChecks = earningsData ? String(earningsData.totalChecks) : '0';
  const rating = earningsData?.avgRating != null
    ? earningsData.avgRating.toFixed(1)
    : '--';

  // AUTH-03: persist current_role='seeker' then route to the Seeker hub.
  const handleSwitchToSeeker = () => {
    void switchRole('seeker').catch(() => {});
    router.replace('/(seeker)/home');
  };

  // AUTH-04: sign out then return to the entry flow.
  const handleSignOut = () => {
    void signOut().catch(() => {});
    router.replace('/index');
  };

  // D-03: two-step destructive confirm before calling the delete-account Edge Function.
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteMyAccount();
              router.replace('/index');
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : 'Something went wrong. Please try again.';
              Alert.alert('Could not delete account', msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const renderItem = (
    item: { icon: IconName; label: string; route: string },
    i: number,
    len: number,
  ) => (
    <TouchableOpacity
      key={item.label}
      style={[styles.settingRow, i < len - 1 && styles.settingRowBorder]}
      onPress={() => router.push(item.route as never)}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconWrap}>
          <Ionicons name={item.icon} size={18} color={colors.red} />
        </View>
        <Text style={styles.settingLabel}>{item.label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.push('/(scout)/dashboard')
            }
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            {statsLoading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <Text style={styles.userName}>{firstName ?? 'Scout'}</Text>
          <Text style={styles.memberSince}>Scout</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.verified} />
            <Text style={styles.verifiedText}>VERIFIED SCOUT</Text>
          </View>
        </View>

        {/* Scout ID card -- tappable, routes to invite screen */}
        <TouchableOpacity
          style={styles.scoutIdCard}
          onPress={() => router.push('/(seeker)/invite' as never)}
          activeOpacity={0.75}
        >
          <View style={styles.scoutIdLeft}>
            <View style={styles.scoutIdIconWrap}>
              <Ionicons name="finger-print-outline" size={18} color={colors.red} />
            </View>
            <View>
              <Text style={styles.scoutIdLabel}>YOUR SCOUT ID</Text>
              {statsLoading ? (
                <ActivityIndicator color={colors.red} size="small" style={{ marginTop: 2 }} />
              ) : (
                <Text style={styles.scoutIdValue}>{scoutId ?? 'SCT-••••-•••'}</Text>
              )}
            </View>
          </View>
          <View style={styles.scoutIdRight}>
            <Text style={styles.inviteHint}>Invite friends</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* Stats Row -- real data, real zeros on a fresh account */}
        <View style={styles.statsRow}>
          <CtaGlow radius={16} />
          <View style={styles.statItem}>
            {statsLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.statValue}>${totalEarned}</Text>
            )}
            <Text style={styles.statLabel}>EARNED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            {statsLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.statValue}>{totalChecks}</Text>
            )}
            <Text style={styles.statLabel}>CHECKS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            {statsLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.statValue}>{rating}</Text>
            )}
            <Text style={styles.statLabel}>RATING</Text>
          </View>
        </View>

        {/* Scout section */}
        <Text style={styles.sectionLabel}>SCOUT</Text>
        <View style={styles.settingsList}>
          {SCOUT_ITEMS.map((item, i) => renderItem(item, i, SCOUT_ITEMS.length))}
        </View>

        {/* Account section */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.settingsList}>
          {ACCOUNT_ITEMS.map((item, i) => renderItem(item, i, ACCOUNT_ITEMS.length))}
        </View>

        {/* Switch Mode */}
        <TouchableOpacity
          style={styles.switchModeBtn}
          onPress={handleSwitchToSeeker}
          activeOpacity={0.85}
        >
          <Ionicons name="swap-horizontal" size={16} color={colors.textPrimary} />
          <Text style={styles.switchModeBtnText}>SWITCH TO SEEKER MODE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
          disabled={deleting}
        >
          <Text style={styles.deleteAccountText}>
            {deleting ? 'Deleting...' : 'Delete Account'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 22, paddingTop: 12 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitials: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 34,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  userName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  memberSince: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22,163,74,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.35)',
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  verifiedText: {
    fontFamily: 'Inter_700Bold',
    color: colors.verified,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.red,
    overflow: 'hidden',
    borderRadius: 16,
    marginHorizontal: 22,
    marginBottom: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    color: colors.white,
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.4,
  },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  settingsList: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: colors.bg,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(218,37,29,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },

  scoutIdCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(218,37,29,0.05)',
    borderRadius: 16,
    marginHorizontal: 22,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.20)',
  },
  scoutIdLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoutIdIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(218,37,29,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoutIdLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.6,
    marginBottom: 3,
  },
  scoutIdValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  scoutIdRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inviteHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  switchModeBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontSize: 12,
    letterSpacing: 2,
  },
  signOutBtn: {
    marginHorizontal: 22,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    fontSize: 12.5,
    letterSpacing: 0.5,
  },
  deleteAccountBtn: {
    marginHorizontal: 22,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteAccountText: {
    fontFamily: 'Inter_500Medium',
    color: colors.danger,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
