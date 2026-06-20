import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useScoutEarnings } from '../state/scout-earnings';
import { listOpenChecks, acceptCheck, type CheckRow } from '../lib/checks';

// Display-only payout label derived from the check tier. NO money is written
// here — earnings are credited in Phase 4. Real pricing: standard $8, priority $12.
const TIER_PAYOUT: Record<string, number> = { standard: 8, priority: 12 };
const payoutForTier = (tier: string | null | undefined) =>
  TIER_PAYOUT[tier ?? 'standard'] ?? 8;

export default function ScoutDashboard() {
  const router = useRouter();
  const earnings = useScoutEarnings();
  const [online, setOnline] = useState(true);
  const [openChecks, setOpenChecks] = useState<CheckRow[]>([]);
  const [taken, setTaken] = useState(false);

  // The first open check is what the Scout sees in the incoming-request card.
  const request = openChecks[0] ?? null;

  // Pull the real open-check list (status='dispatching', RLS-scoped). Only fetch
  // when online — going offline clears the list.
  const refresh = useCallback(async () => {
    try {
      const checks = await listOpenChecks();
      setOpenChecks(checks);
    } catch {
      setOpenChecks([]);
    }
  }, []);

  // Fetch on mount + whenever the Scout goes online; clear when offline.
  useEffect(() => {
    if (online) {
      refresh();
    } else {
      setOpenChecks([]);
    }
  }, [online, refresh]);

  // Refresh when the dashboard regains focus (e.g. returning from filming).
  useFocusEffect(
    useCallback(() => {
      if (online) refresh();
    }, [online, refresh]),
  );

  const handleAccept = async () => {
    if (!request) return;
    setTaken(false);
    try {
      // Atomic claim (accept_check). A lost race throws -> show "taken" + refresh.
      await acceptCheck(request.id);
      router.push({
        pathname: '/(scout)/filming',
        params: {
          checkId: request.id,
          venue: request.location_label ?? 'Location',
          tier: request.tier,
        },
      });
    } catch {
      // Someone else won the race (or the check moved on). Surface it inline and
      // refresh so the Scout sees the current open list.
      setTaken(true);
      refresh();
    }
  };

  const handleDecline = () => {
    // Drop this check from the local view; the next open check (if any) shows.
    setOpenChecks((prev) => prev.slice(1));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Top bar — Flow Map exit for prototype navigation */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.push('/flow-map')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backText}>‹ Flow Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.wireframeBadge}
              onPress={() => router.push('/flow-map')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={styles.wireframeBadgeText}>WF</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mode}>Scout Mode</Text>
              <View style={styles.modeRule} />
              <Text style={styles.subMode}>
                {online ? 'You’re online · ready to earn' : 'You’re offline'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profilePill}
              onPress={() => router.push('/(scout)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.profileInitials}>TR</Text>
            </TouchableOpacity>
          </View>

          {/* Earnings Card */}
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>TODAY’S EARNINGS</Text>
            <Text style={styles.earningsValue}>
              ${earnings.earningsToday.toFixed(2)}
            </Text>
            <View style={styles.earningsRow}>
              <View style={styles.earningsChip}>
                <View style={styles.earningsDot} />
                <Text style={styles.earningsChipText}>
                  {earnings.clipsDelivered} clips delivered
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(scout)/earnings')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.viewAllText}>VIEW ALL ›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Online Toggle */}
          <View style={styles.toggleCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.toggleTitleRow}>
                <View
                  style={[
                    styles.statusBubble,
                    online ? styles.statusBubbleOn : styles.statusBubbleOff,
                  ]}
                />
                <Text style={styles.toggleTitle}>
                  {online ? 'Online · Accepting Requests' : 'Offline · Not Available'}
                </Text>
              </View>
              <Text style={styles.toggleSub}>
                {online
                  ? 'You’ll be pinged when a check is requested nearby.'
                  : 'Toggle on to start earning.'}
              </Text>
            </View>
            <Switch
              value={online}
              onValueChange={setOnline}
              trackColor={{ false: '#222', true: 'rgba(0,255,127,0.35)' }}
              thumbColor={online ? '#00FF7F' : '#666'}
              ios_backgroundColor="#222"
            />
          </View>

          {/* Incoming Request OR Empty State */}
          {online && request ? (
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
                    <Text style={styles.requestVenue}>
                      {request.location_label ?? 'Location'}
                    </Text>
                    <View style={styles.requestDistanceRow}>
                      <Ionicons
                        name="location"
                        size={11}
                        color="rgba(255,255,255,0.6)"
                      />
                      <Text style={styles.requestDistance}>
                        On-demand check · tap to accept
                      </Text>
                    </View>
                  </View>
                  {request.tier === 'priority' && (
                    <View style={styles.priorityBadge}>
                      <Ionicons name="flash" size={9} color="#1a1a1a" />
                      <Text style={styles.priorityBadgeText}>PRIORITY</Text>
                    </View>
                  )}
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>YOU EARN</Text>
                    <Text style={styles.requestDetailValue}>
                      ${payoutForTier(request.tier)}.00
                    </Text>
                  </View>
                  <View style={styles.requestDetailDivider} />
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>DELIVERY</Text>
                    <Text style={styles.requestDetailValue}>
                      {request.tier === 'priority' ? '7 min' : '10 min'}
                    </Text>
                  </View>
                  <View style={styles.requestDetailDivider} />
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>CLIP</Text>
                    <Text style={styles.requestDetailValue}>15s</Text>
                  </View>
                </View>

                {taken && (
                  <View style={styles.takenNote}>
                    <Ionicons name="alert-circle" size={13} color="#FFCB47" />
                    <Text style={styles.takenNoteText}>
                      Another Scout grabbed that one. Showing the latest open checks.
                    </Text>
                  </View>
                )}

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    activeOpacity={0.7}
                    onPress={handleDecline}
                  >
                    <Text style={styles.declineBtnText}>DECLINE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={handleAccept}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.acceptBtnText}>
                      ACCEPT · EARN ${payoutForTier(request.tier)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : online ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="radio-outline" size={22} color="#00FF7F" />
              </View>
              <Text style={styles.emptyTitle}>Listening for requests</Text>
              <Text style={styles.emptyWhy}>
                You’ll be pinged the moment a check is requested in your area.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="moon-outline" size={22} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={styles.emptyTitle}>You’re offline</Text>
              <Text style={styles.emptyWhy}>
                Toggle on above to receive incoming requests.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="radio" size={20} color="#ffffff" />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(scout)/earnings')}
          >
            <Ionicons name="stats-chart-outline" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.navLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.replace('/(seeker)/home')}
          >
            <Ionicons name="eye-outline" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.navLabel}>Seeker Mode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(scout)/profile')}
          >
            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  scroll: { paddingBottom: 110 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  wireframeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,107,0,0.18)',
  },
  wireframeBadgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF6B00',
    fontSize: 9,
    letterSpacing: 1.4,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 22,
  },
  mode: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  modeRule: {
    height: 2,
    width: 32,
    backgroundColor: '#00FF7F',
    marginTop: 8,
  },
  subMode: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    letterSpacing: 0.2,
  },
  profilePill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  earningsCard: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 18,
    marginHorizontal: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.55)',
    marginBottom: 14,
  },
  earningsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  earningsValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 42,
    color: '#ffffff',
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
    backgroundColor: 'rgba(0,255,127,0.1)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.35)',
  },
  earningsDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00FF7F',
  },
  earningsChipText: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  viewAllText: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 10.5,
    letterSpacing: 2,
  },

  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  statusBubbleOn: { backgroundColor: '#00FF7F' },
  statusBubbleOff: { backgroundColor: 'rgba(255,255,255,0.3)' },
  toggleTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  toggleSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 16,
    lineHeight: 16,
  },

  requestSection: { paddingHorizontal: 22 },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  requestTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#00FF7F',
    letterSpacing: 2.5,
  },
  newBadge: {
    backgroundColor: '#00FF7F',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#000000',
    letterSpacing: 1.4,
  },
  requestCard: {
    backgroundColor: 'rgba(0,255,127,0.04)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,127,0.4)',
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  requestVenue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  requestDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestDistance: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFCB47',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C99A1F',
  },
  priorityBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#1a1a1a',
    letterSpacing: 1.5,
  },
  requestDetails: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  requestDetail: { flex: 1, alignItems: 'center' },
  requestDetailLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  requestDetailValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  requestDetailDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  takenNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,203,71,0.08)',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.3)',
    marginBottom: 12,
  },
  takenNoteText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
    lineHeight: 16,
  },

  requestActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  declineBtnText: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    letterSpacing: 2,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#00FF7F',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 12,
    letterSpacing: 2,
  },

  emptyCard: {
    marginHorizontal: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  emptyWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },

  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 24,
    paddingTop: 12,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  navLabelActive: { color: '#ffffff' },
});
