import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

const SETTINGS = [
  { icon: '💳', label: 'Payment Methods' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '📍', label: 'Preferred Cities' },
  { icon: '👥', label: 'Invite Friends' },
  { icon: '❓', label: 'Help' },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>TR</Text>
          </View>
          <Text style={styles.userName}>Troy R.</Text>
          <Text style={styles.memberSince}>Member since January 2026</Text>
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified Seeker</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>14</Text>
            <Text style={styles.statLabel}>Checks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>$245</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.8★</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
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
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Referral Banner */}
        <View style={styles.referralBanner}>
          <View style={styles.referralLeft}>
            <Text style={styles.referralEmoji}>🎁</Text>
            <View>
              <Text style={styles.referralTitle}>Give $5, Get $5</Text>
              <Text style={styles.referralSub}>Invite friends and earn credits</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.referralBtn}>
            <Text style={styles.referralBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Switch Mode */}
        <TouchableOpacity
          style={styles.switchModeBtn}
          onPress={() => router.push('/(scout)/dashboard')}
        >
          <Text style={styles.switchModeBtnText}>Switch to Scout Mode →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: '#FF8533',
    fontSize: 14,
    marginBottom: 8,
  },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitials: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 36,
    color: '#fff',
    letterSpacing: 0.5,
  },
  userName: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  memberSince: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  verifiedRow: { flexDirection: 'row' },
  verifiedBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  verifiedText: {
    fontFamily: 'Inter_700Bold',
    color: '#22c55e',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statDivider: { width: 1, height: 36, backgroundColor: '#1e1e1e' },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingsList: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 18,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { fontSize: 17 },
  settingLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
  },
  settingArrow: {
    fontSize: 20,
    color: '#FF8533',
  },
  referralBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginBottom: 18,
  },
  referralLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  referralEmoji: { fontSize: 26 },
  referralTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 17,
    color: '#f59e0b',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  referralSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#888',
    letterSpacing: 0.3,
  },
  referralBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  referralBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  switchModeBtn: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  switchModeBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    fontSize: 12,
    letterSpacing: 2,
  },
  signOutBtn: {
    marginHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: 'Inter_500Medium',
    color: '#666',
    fontSize: 12.5,
    letterSpacing: 0.5,
  },
});
