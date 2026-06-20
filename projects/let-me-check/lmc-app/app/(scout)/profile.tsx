import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { switchRole, signOut } from '../lib/auth';

type IconName = keyof typeof Ionicons.glyphMap;

// One account, two hats — this is the Scout (worker) hub. Shared account items
// (notifications, help, personal info) are common to both roles.
const SCOUT_ITEMS: { icon: IconName; label: string; route: string }[] = [
  { icon: 'stats-chart-outline', label: 'Earnings', route: '/(scout)/earnings' },
  { icon: 'card-outline', label: 'Payout method', route: '/scout/payout' },
  { icon: 'shield-checkmark-outline', label: 'Identity & verification', route: '/scout/identity' },
  { icon: 'document-text-outline', label: 'Tax documents (1099)', route: '/scout/payout' },
  { icon: 'reader-outline', label: 'The Scout Code', route: '/legal/code' },
];

const ACCOUNT_ITEMS: { icon: IconName; label: string; route: string }[] = [
  { icon: 'person-outline', label: 'Personal info', route: '/onboarding/personal-info' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/(seeker)/notifications' },
  { icon: 'help-circle-outline', label: 'Help', route: '/(seeker)/help' },
];

const SCOUT_ID = 'SCT-7K4M-X9P';

export default function ScoutProfileScreen() {
  const router = useRouter();
  const [online, setOnline] = useState(false);

  // AUTH-03: persist current_role='seeker' (logs auth.role_switched) then route to
  // the Seeker hub.
  const handleSwitchToSeeker = () => {
    void switchRole('seeker').catch(() => {});
    router.replace('/(seeker)/home');
  };

  // AUTH-04: sign out then return to the entry flow.
  const handleSignOut = () => {
    void signOut().catch(() => {});
    router.replace('/index');
  };

  const renderItem = (item: { icon: IconName; label: string; route: string }, i: number, len: number) => (
    <TouchableOpacity
      key={item.label}
      style={[styles.settingRow, i < len - 1 && styles.settingRowBorder]}
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.push('/(scout)/dashboard'))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>TR</Text>
          </View>
          <Text style={styles.userName}>Troy R.</Text>
          <Text style={styles.memberSince}>Scout · {SCOUT_ID}</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#00FF7F" />
            <Text style={styles.verifiedText}>VERIFIED SCOUT</Text>
          </View>
        </View>

        {/* Availability */}
        <View style={[styles.availCard, online && styles.availCardOn]}>
          <View style={styles.availLeft}>
            <View style={[styles.availDot, online && styles.availDotOn]} />
            <View>
              <Text style={styles.availTitle}>{online ? 'You’re online' : 'You’re offline'}</Text>
              <Text style={styles.availSub}>
                {online ? 'Receiving check requests near you.' : 'Go online to receive checks.'}
              </Text>
            </View>
          </View>
          <Switch
            value={online}
            onValueChange={setOnline}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(0,255,127,0.5)' }}
            thumbColor={online ? '#00FF7F' : '#f4f4f4'}
            ios_backgroundColor="rgba(255,255,255,0.15)"
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>$1,240</Text>
            <Text style={styles.statLabel}>EARNED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>87</Text>
            <Text style={styles.statLabel}>CHECKS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9★</Text>
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

        {/* Refer a Scout */}
        <View style={styles.referralBanner}>
          <View style={styles.referralLeft}>
            <View style={styles.referralIconWrap}>
              <Ionicons name="gift-outline" size={20} color="#FFCB47" />
            </View>
            <View>
              <Text style={styles.referralTitle}>Refer a Scout — $50</Text>
              <Text style={styles.referralSub}>When a friend completes 10 paid checks</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.referralBtn}
            onPress={() => router.push('/(seeker)/invite')}
            activeOpacity={0.85}
          >
            <Text style={styles.referralBtnText}>INVITE</Text>
          </TouchableOpacity>
        </View>

        {/* Switch Mode */}
        <TouchableOpacity
          style={styles.switchModeBtn}
          onPress={handleSwitchToSeeker}
          activeOpacity={0.85}
        >
          <Ionicons name="swap-horizontal" size={16} color="#ffffff" />
          <Text style={styles.switchModeBtnText}>SWITCH TO SEEKER MODE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
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
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
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

  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    marginHorizontal: 22,
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  availCardOn: {
    backgroundColor: 'rgba(0,255,127,0.08)',
    borderColor: 'rgba(0,255,127,0.3)',
  },
  availLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  availDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  availDotOn: { backgroundColor: '#00FF7F' },
  availTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  availSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 16,
    marginHorizontal: 22,
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
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 16,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 22,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
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
    color: 'rgba(255,255,255,0.5)',
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
    backgroundColor: 'rgba(255,255,255,0.035)',
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12.5,
    letterSpacing: 0.5,
  },
});
