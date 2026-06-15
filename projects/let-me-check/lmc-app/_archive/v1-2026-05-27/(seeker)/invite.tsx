import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function InviteScreen() {
  const router = useRouter();
  const referralCode = 'TROY-LMC5';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Invite Friends</Text>
        </View>

        {/* Big Reward Card */}
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEmoji}>🎁</Text>
          <Text style={styles.rewardTitle}>Give $5, Get $5</Text>
          <Text style={styles.rewardSub}>
            Friends who sign up with your code get $5 off their first check. You earn $5 in credits when they redeem.
          </Text>
        </View>

        {/* Referral Code */}
        <Text style={styles.sectionLabel}>YOUR REFERRAL CODE</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeText}>{referralCode}</Text>
          <TouchableOpacity style={styles.copyBtn} activeOpacity={0.7}>
            <Text style={styles.copyBtnText}>COPY</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Invited</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>$15</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        {/* Share Buttons */}
        <Text style={styles.sectionLabel}>SHARE</Text>
        <View style={styles.shareButtons}>
          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85}>
            <Text style={styles.shareBtnIcon}>💬</Text>
            <Text style={styles.shareBtnText}>iMessage</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85}>
            <Text style={styles.shareBtnIcon}>📧</Text>
            <Text style={styles.shareBtnText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85}>
            <Text style={styles.shareBtnIcon}>🔗</Text>
            <Text style={styles.shareBtnText}>More</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Credits apply automatically on your friend's first check. Limit 10 invites per month.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: { fontFamily: 'Inter_500Medium', color: '#fff', fontSize: 15, marginBottom: 16 },
  title: { fontFamily: 'BodoniModa_700Bold', fontSize: 28, color: '#fff', letterSpacing: 0.4 },
  rewardCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    marginBottom: 24,
    alignItems: 'center',
  },
  rewardEmoji: { fontSize: 36, marginBottom: 10 },
  rewardTitle: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 24,
    color: '#f59e0b',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  rewardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 22,
  },
  codeText: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 2,
  },
  copyBtn: {
    backgroundColor: '#FF8533',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  copyBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 22,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 26,
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
  shareButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  shareBtnIcon: { fontSize: 22 },
  shareBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
