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
              <Text style={styles.verifiedText}>✓ Verified User</Text>
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
          onPress={() => router.push('/(checker)/dashboard')}
        >
          <Text style={styles.switchModeBtnText}>Switch to Checker Mode →</Text>
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
  backText: { color: '#888', fontSize: 16, marginBottom: 8 },
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
    marginBottom: 12,
  },
  avatarInitials: { fontSize: 32, fontWeight: '900', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  memberSince: { fontSize: 13, color: '#555', marginBottom: 10 },
  verifiedRow: { flexDirection: 'row' },
  verifiedBadge: {
    backgroundColor: '#14532d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: { color: '#22c55e', fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#555', fontWeight: '600' },
  statDivider: { width: 1, height: 36, backgroundColor: '#1e1e1e' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#555',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  settingsList: {
    backgroundColor: '#111',
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { fontSize: 18 },
  settingLabel: { fontSize: 15, color: '#fff' },
  settingArrow: { fontSize: 20, color: '#444' },
  referralBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a0d',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f59e0b33',
    marginBottom: 16,
  },
  referralLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  referralEmoji: { fontSize: 26 },
  referralTitle: { fontSize: 15, fontWeight: '700', color: '#f59e0b', marginBottom: 2 },
  referralSub: { fontSize: 12, color: '#888' },
  referralBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  referralBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  switchModeBtn: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  switchModeBtnText: { color: '#888', fontSize: 14 },
  signOutBtn: {
    marginHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#444', fontSize: 14 },
});
