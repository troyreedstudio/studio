import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { switchRole, signOut } from '../lib/auth';
import { deleteMyAccount } from '../lib/account';
import { getProfile } from '../lib/api';
import { listMyChecks } from '../lib/checks';
import { supabase } from '../lib/supabase';

type IconName = keyof typeof Ionicons.glyphMap;

const SETTINGS: { icon: IconName; label: string; route: string }[] = [
  { icon: 'receipt-outline', label: 'Past Checks', route: '/(seeker)/history' },
  { icon: 'heart-outline', label: 'Saved Places', route: '/(seeker)/saved' },
  { icon: 'repeat-outline', label: 'Recurring Checks', route: '/(seeker)/recurring' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/(seeker)/notifications' },
  { icon: 'location-outline', label: 'Preferred Cities', route: '/(seeker)/preferred-cities' },
  { icon: 'help-circle-outline', label: 'Help', route: '/(seeker)/help' },
];

/** Derive initials from a display name (e.g. "Troy Reed" -> "TR"; single word -> first 2 chars). */
function toInitials(name: string | null): string {
  if (!name) return 'S';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [stats, setStats] = useState<{ count: number; spent: number; avgRating: number | null }>({
    count: 0,
    spent: 0,
    avgRating: null,
  });

  // Load real profile data, check stats, and avg rating from the Seeker's own ratings rows.
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;

      const [profile, checks] = await Promise.all([getProfile(), listMyChecks()]);

      // Real display name + member-since date.
      setDisplayName(profile?.display_name ?? null);
      if (profile?.created_at) {
        setMemberSince(
          new Date(profile.created_at).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        );
      }

      // Count + spent: exclude cancelled and no_scout (these weren't delivered).
      const delivered = checks.filter(
        (c) => c.status !== 'cancelled' && c.status !== 'no_scout'
      );
      const count = delivered.length;
      const spent = delivered.reduce(
        (acc, c) => acc + (c.tier === 'priority' ? 20 : 15),
        0
      );

      // Avg rating: Seeker reads their own rows via ratings_select_own RLS (0005).
      let avgRating: number | null = null;
      if (uid) {
        const { data: rows } = await supabase
          .from('ratings')
          .select('stars')
          .eq('seeker_id', uid);
        if (rows && rows.length > 0) {
          avgRating =
            Math.round(
              (rows.reduce((s, r) => s + (r.stars ?? 0), 0) / rows.length) * 10
            ) / 10;
        }
      }

      setStats({ count, spent, avgRating });
    })().catch(() => {
      // Network error — keep zero/null states; no fake numbers.
    });
  }, []);

  // AUTH-03: persist current_role='scout' (logs auth.role_switched) then route to
  // the Scout hub. Route optimistically; the write completes in the background.
  const handleSwitchToScout = () => {
    void switchRole('scout').catch(() => {});
    router.replace('/(scout)/dashboard');
  };

  // AUTH-04: sign out (logs auth.signed_out + clears the session) then return to
  // the entry flow. The boot gate keeps a signed-out user out of the hubs.
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
              const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
              Alert.alert('Could not delete account', msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const initials = toInitials(displayName);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.push('/(seeker)/home'))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{displayName ?? 'Seeker'}</Text>
          <Text style={styles.memberSince}>
            {memberSince ? `Member since ${memberSince}` : ' '}
          </Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#00FF7F" />
            <Text style={styles.verifiedText}>VERIFIED SEEKER</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.count}</Text>
            <Text style={styles.statLabel}>CHECKS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{`$${stats.spent}`}</Text>
            <Text style={styles.statLabel}>SPENT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.avgRating != null ? `${stats.avgRating}★` : '—'}
            </Text>
            <Text style={styles.statLabel}>AVG RATING</Text>
          </View>
        </View>

        {/* Settings List */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.settingsList}>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.settingRow,
                i < SETTINGS.length - 1 && styles.settingRowBorder,
              ]}
              onPress={() => router.push(item.route as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={item.icon} size={18} color="#00FF7F" />
                </View>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Referral banner — routes to the real invite screen */}
        <TouchableOpacity
          style={styles.referralBanner}
          onPress={() => router.push('/(seeker)/invite' as never)}
          activeOpacity={0.8}
        >
          <View style={styles.referralLeft}>
            <View style={styles.referralIconWrap}>
              <Ionicons name="gift-outline" size={20} color="#FFCB47" />
            </View>
            <View>
              <Text style={styles.referralTitle}>Invite friends</Text>
              <Text style={styles.referralSub}>Give credits, get credits</Text>
            </View>
          </View>
          <View style={styles.referralBtn}>
            <Text style={styles.referralBtnText}>INVITE</Text>
          </View>
        </TouchableOpacity>

        {/* Switch Mode */}
        <TouchableOpacity
          style={styles.switchModeBtn}
          onPress={handleSwitchToScout}
          activeOpacity={0.85}
        >
          <Ionicons name="swap-horizontal" size={16} color="#ffffff" />
          <Text style={styles.switchModeBtnText}>SWITCH TO SCOUT MODE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
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
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 22, paddingTop: 12 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0d0d0d',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitials: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 34,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  userName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  memberSince: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.4)',
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  verifiedText: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 9,
    letterSpacing: 1.4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginHorizontal: 22,
    marginTop: 8,
    marginBottom: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.4,
  },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  settingsList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0,255,127,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  referralBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,203,71,0.08)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.3)',
    marginBottom: 18,
  },
  referralLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  referralIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,203,71,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFCB47',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  referralSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#888',
    letterSpacing: 0.2,
  },
  referralBtn: {
    backgroundColor: '#FFCB47',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  referralBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  switchModeBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
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
    color: '#666',
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
    color: '#ff5a5a',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
