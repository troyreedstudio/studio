import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function ScoutDashboard() {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.mode}>Scout Mode</Text>
            <View style={styles.greetingRule} />
            <Text style={styles.subMode}>{online ? 'You are online · ready to earn' : 'You are offline'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profilePill}
            onPress={() => router.push('/(seeker)/profile')}
          >
            <Text style={styles.profileInitials}>TR</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>TONIGHT'S EARNINGS</Text>
          <Text style={styles.earningsValue}>$127.00</Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsChip}>
              <View style={styles.earningsDot} />
              <Text style={styles.earningsChipText}>12 clips delivered</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(scout)/earnings')}>
              <Text style={styles.viewAllText}>VIEW ALL ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Online Toggle */}
        <View style={styles.toggleCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.toggleTitleRow}>
              <View style={[styles.statusBubble, online ? styles.statusBubbleOn : styles.statusBubbleOff]} />
              <Text style={styles.toggleTitle}>
                {online ? 'Online — Accepting Requests' : 'Offline — Not Available'}
              </Text>
            </View>
            <Text style={styles.toggleSub}>
              {online ? 'You will receive check requests nearby' : 'Go online to start earning'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={setOnline}
            trackColor={{ false: '#222', true: '#14532d' }}
            thumbColor={online ? '#22c55e' : '#555'}
          />
        </View>

        {/* Incoming Request */}
        {online && (
          <View style={styles.requestSection}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTitle}>INCOMING REQUEST</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            </View>

            <View style={styles.requestCard}>
              <View style={styles.requestTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestVenue}>Komodo Miami</Text>
                  <Text style={styles.requestDistance}>📍 0.3 miles · Brickell</Text>
                </View>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityBadgeText}>PRIORITY</Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.requestDetail}>
                  <Text style={styles.requestDetailLabel}>YOU EARN</Text>
                  <Text style={styles.requestDetailValue}>$10.00</Text>
                </View>
                <View style={styles.requestDetailDivider} />
                <View style={styles.requestDetail}>
                  <Text style={styles.requestDetailLabel}>DELIVERY</Text>
                  <Text style={styles.requestDetailValue}>7 min</Text>
                </View>
                <View style={styles.requestDetailDivider} />
                <View style={styles.requestDetail}>
                  <Text style={styles.requestDetailLabel}>CLIP</Text>
                  <Text style={styles.requestDetailValue}>30s HD</Text>
                </View>
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.declineBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.declineBtnText}>DECLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => router.push('/(scout)/filming')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.acceptBtnText}>ACCEPT · EARN $10</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📡</Text>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(scout)/earnings')}>
            <Text style={styles.navIcon}>💰</Text>
            <Text style={styles.navLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(seeker)/profile')}>
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  mode: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 28,
    color: '#fff',
    letterSpacing: 0.3,
  },
  greetingRule: {
    height: 2,
    width: 36,
    backgroundColor: '#22c55e',
    marginTop: 8,
  },
  subMode: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  profilePill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    fontSize: 14,
  },
  earningsCard: {
    backgroundColor: '#0d1a0d',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1a3a1a',
    marginBottom: 14,
  },
  earningsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#22c55e',
    letterSpacing: 3,
    marginBottom: 8,
  },
  earningsValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 48,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a1f0a',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1a3a1a',
  },
  earningsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  earningsChipText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#22c55e',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF8533',
    fontSize: 11,
    letterSpacing: 2,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 22,
    gap: 12,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusBubble: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBubbleOn: { backgroundColor: '#22c55e' },
  statusBubbleOff: { backgroundColor: '#555' },
  toggleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#fff',
    letterSpacing: 0.2,
  },
  toggleSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 16,
  },
  requestSection: { paddingHorizontal: 20 },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  requestTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FF8533',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  newBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#000',
    letterSpacing: 1.5,
  },
  requestCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requestVenue: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  requestDistance: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    letterSpacing: 0.3,
  },
  priorityBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#000',
    letterSpacing: 1.5,
  },
  requestDetails: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  requestDetail: { flex: 1, alignItems: 'center' },
  requestDetailLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  requestDetailValue: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.3,
  },
  requestDetailDivider: { width: 1, height: 28, backgroundColor: '#1e1e1e' },
  requestActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  declineBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#888',
    fontSize: 12,
    letterSpacing: 2,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 12,
    letterSpacing: 2,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingBottom: 24,
    paddingTop: 12,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navIcon: { fontSize: 20 },
  navLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#555',
    letterSpacing: 0.5,
  },
  navLabelActive: { color: '#fff' },
});
