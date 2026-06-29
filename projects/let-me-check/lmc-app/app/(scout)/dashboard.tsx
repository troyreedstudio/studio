import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useScoutEarnings } from '../state/scout-earnings';
import { acceptCheck, type CheckRow } from '../lib/checks';
import { upsertScoutLocation, setScoutOffline } from '../lib/scout-location';
import { listOpenChecksForScout } from '../lib/dispatch';
import { colors } from '../lib/theme';
import { BottomNav } from '../components/BottomNav';

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
  const [locationDenied, setLocationDenied] = useState(false);

  // Last known Scout coord — written by the watchPositionAsync callback and read
  // by refresh() to pass to the geo-filtered RPC. Null until first GPS fix.
  const lastCoord = useRef<{ lat: number; lng: number } | null>(null);
  // Holds the expo-location subscription so we can .remove() it on going offline
  // or screen unmount (T-05-25: foreground-only, stops cleanly when not online).
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  // The first open check is what the Scout sees in the incoming-request card.
  const request = openChecks[0] ?? null;

  // Pull geo-filtered open checks. Uses listOpenChecksForScout (DISP-01) when a
  // coord is known; shows empty when location is unknown (not yet fixed).
  const refresh = useCallback(async () => {
    try {
      if (lastCoord.current) {
        const checks = await listOpenChecksForScout(
          lastCoord.current.lat,
          lastCoord.current.lng,
        );
        setOpenChecks(checks);
      } else {
        // No GPS fix yet — show empty; watchPositionAsync will call refresh
        // as soon as the first fix arrives.
        setOpenChecks([]);
      }
    } catch {
      setOpenChecks([]);
    }
  }, []);

  // Start / stop the foreground location watch when the online toggle changes.
  // SCOUT-03: while online the Scout's location is upserted to scout_locations
  // every ~30 s (timeInterval) or after 20 m of movement (distanceInterval).
  // The geo-filtered refresh() runs on each tick so the job list stays current.
  useEffect(() => {
    let cancelled = false;

    const startWatch = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      setLocationDenied(false);

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30_000,   // re-emit every 30 s while stationary
          distanceInterval: 20,   // or after 20 m of movement
        },
        async (pos) => {
          if (cancelled) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          lastCoord.current = { lat, lng };
          // Upsert Scout's live location so the dispatch RPC can find them.
          upsertScoutLocation(lat, lng, pos.coords.accuracy ?? undefined).catch(
            () => {},
          );
          // Refresh the geo-filtered job list on each location tick.
          refresh();
        },
      );

      if (cancelled) {
        sub.remove();
      } else {
        locationSub.current = sub;
      }
    };

    if (online) {
      startWatch();
    } else {
      // Going offline: stop the watch, clear the list, mark offline in DB.
      locationSub.current?.remove();
      locationSub.current = null;
      setOpenChecks([]);
      setScoutOffline().catch(() => {});
    }

    return () => {
      cancelled = true;
      locationSub.current?.remove();
      locationSub.current = null;
      // Mark offline in DB when the screen unmounts while online.
      if (online) setScoutOffline().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

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
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mode}>Scout Mode</Text>
              <View style={styles.modeRule} />
              <Text style={styles.subMode}>
                {online ? 'You\'re online, ready to earn' : 'You\'re offline'}
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
            {/* Full transitional red gradient hero */}
            <LinearGradient
              colors={['#FF5247', '#DA251D', '#9E0E07']}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.earningsLabel}>TODAY'S EARNINGS</Text>
            <Text style={styles.earningsValue}>
              ${earnings.earningsToday.toFixed(2)}
            </Text>
            <View style={styles.earningsRow}>
              <View style={styles.earningsChip}>
                <View style={styles.earningsDot} />
                <Text style={styles.earningsChipText}>
                  {earnings.clipsDelivered} videos delivered
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
                  {online ? 'Online, Accepting Requests' : 'Offline, Not Available'}
                </Text>
              </View>
              <Text style={styles.toggleSub}>
                {online
                  ? 'You\'ll be pinged when a check is requested nearby.'
                  : 'Toggle on to start earning.'}
              </Text>
            </View>
            <Switch
              value={online}
              onValueChange={setOnline}
              trackColor={{ false: colors.border, true: 'rgba(22,163,74,0.35)' }}
              thumbColor={online ? colors.verified : colors.textTertiary}
              ios_backgroundColor={colors.surface}
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
                        color={colors.textSecondary}
                      />
                      <Text style={styles.requestDistance}>
                        On-demand check, tap to accept
                      </Text>
                    </View>
                  </View>
                  {request.tier === 'priority' && (
                    <View style={styles.priorityBadge}>
                      <Ionicons name="flash" size={9} color={colors.black} />
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
                    <Text style={styles.requestDetailLabel}>VIDEO</Text>
                    <Text style={styles.requestDetailValue}>15s</Text>
                  </View>
                </View>

                {taken && (
                  <View style={styles.takenNote}>
                    <Ionicons name="alert-circle" size={13} color={colors.danger} />
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
                      ACCEPT, EARN ${payoutForTier(request.tier)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : online ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                {locationDenied ? (
                  <Ionicons name="location-outline" size={22} color={colors.danger} />
                ) : (
                  <Ionicons name="radio-outline" size={22} color={colors.verified} />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {locationDenied ? 'Location needed' : 'Listening for requests'}
              </Text>
              <Text style={styles.emptyWhy}>
                {locationDenied
                  ? 'Allow location access in Settings to receive nearby jobs.'
                  : 'You\'ll be pinged the moment a check is requested in your area.'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="moon-outline" size={22} color={colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>You're offline</Text>
              <Text style={styles.emptyWhy}>
                Toggle on above to receive incoming requests.
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomNav variant="scout" active="dashboard" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { paddingBottom: 24 },

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
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  modeRule: {
    height: 2,
    width: 32,
    backgroundColor: colors.red,
    marginTop: 8,
  },
  subMode: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  profilePill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontSize: 13,
    letterSpacing: 0.3,
  },

  earningsCard: {
    backgroundColor: colors.red, // red gradient hero (CtaGlow-style) — white text on top
    borderRadius: 18,
    overflow: 'hidden', // clip the gradient to the rounded corners
    marginHorizontal: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.red,
    marginBottom: 14,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  earningsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)', // muted white label on the red card
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  earningsValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 42,
    color: colors.white, // white $ amount — the focal point
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
    backgroundColor: 'rgba(255,255,255,0.12)', // translucent white pill on the red card
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  earningsDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.white,
  },
  earningsChipText: {
    fontFamily: 'Inter_700Bold',
    color: colors.white,
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  viewAllText: {
    fontFamily: 'Inter_700Bold',
    color: colors.white,
    fontSize: 10.5,
    letterSpacing: 2,
  },

  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    gap: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
  statusBubbleOn: { backgroundColor: colors.verified },
  statusBubbleOff: { backgroundColor: colors.textTertiary },
  toggleTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  toggleSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    letterSpacing: 2.5,
  },
  newBadge: {
    backgroundColor: colors.verified,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.white,
    letterSpacing: 1.4,
  },
  requestCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(218,37,29,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.3)',
  },
  priorityBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.red,
    letterSpacing: 1.5,
  },
  requestDetails: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestDetail: { flex: 1, alignItems: 'center' },
  requestDetailLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  requestDetailValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  requestDetailDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  takenNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.red,
    marginBottom: 12,
  },
  takenNoteText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    lineHeight: 16,
  },

  requestActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 12,
    letterSpacing: 2,
  },

  emptyCard: {
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  emptyWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },

});
