import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function CheckerDashboard() {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.mode}>CHECKER MODE</Text>
            <Text style={styles.subMode}>{online ? 'You are online' : 'You are offline'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profilePill}
            onPress={() => router.push('/(user)/profile')}
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
              <Text style={styles.earningsChipText}>12 clips delivered</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(checker)/earnings')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Online Toggle */}
        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleTitle}>
              {online ? '🟢 Online — Accepting Requests' : '⚫ Offline — Not Available'}
            </Text>
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
                <View>
                  <Text style={styles.requestVenue}>Komodo Miami</Text>
                  <Text style={styles.requestDistance}>📍 0.3 miles away</Text>
                </View>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityBadgeText}>PRIORITY</Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.requestDetail}>
                  <Text style={styles.requestDetailLabel}>You earn</Text>
                  <Text style={styles.requestDetailValue}>$10.00</Text>
                </View>
                <View style={styles.requestDetailDivider} />
                <View style={styles.requestDetail}>
                  <Text style={styles.requestDetailLabel}>Delivery</Text>
                  <Text style={styles.requestDetailValue}>7 min</Text>
                </View>
                <View style={styles.requestDetailDivider} />
                <View style={styles.requestDetail}>
                  <Text style={styles.requestDetailLabel}>Clip</Text>
                  <Text style={styles.requestDetailValue}>60s HD</Text>
                </View>
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.declineBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => router.push('/(checker)/filming')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.acceptBtnText}>Accept → Earn $10</Text>
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
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(checker)/earnings')}>
            <Text style={styles.navIcon}>💰</Text>
            <Text style={styles.navLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(user)/profile')}>
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
    paddingBottom: 16,
  },
  mode: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  subMode: { fontSize: 13, color: '#888', marginTop: 2 },
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
  profileInitials: { color: '#fff', fontWeight: '700', fontSize: 14 },
  earningsCard: {
    backgroundColor: '#0d1a0d',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a2e1a',
    marginBottom: 12,
  },
  earningsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 2,
    marginBottom: 6,
  },
  earningsValue: { fontSize: 44, fontWeight: '900', color: '#fff', marginBottom: 12 },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsChip: {
    backgroundColor: '#1a2e1a',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  earningsChipText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  viewAllText: { color: '#888', fontSize: 13 },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 20,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  toggleSub: { fontSize: 12, color: '#555' },
  requestSection: { paddingHorizontal: 20 },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555',
    letterSpacing: 2,
  },
  newBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 1 },
  requestCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#22c55e33',
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requestVenue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  requestDistance: { fontSize: 13, color: '#888' },
  priorityBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityBadgeText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1 },
  requestDetails: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  requestDetail: { flex: 1, alignItems: 'center' },
  requestDetailLabel: { fontSize: 10, color: '#555', marginBottom: 4, fontWeight: '600' },
  requestDetailValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  requestDetailDivider: { width: 1, height: 30, backgroundColor: '#1a1a1a' },
  requestActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  declineBtnText: { color: '#888', fontWeight: '700', fontSize: 14 },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
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
  navLabel: { fontSize: 10, color: '#555', fontWeight: '600' },
  navLabelActive: { color: '#fff' },
});
