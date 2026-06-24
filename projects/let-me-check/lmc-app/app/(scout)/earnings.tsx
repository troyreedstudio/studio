import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useScoutEarnings } from '../state/scout-earnings';
import { getScoutEarnings, type ScoutEarnings } from '../lib/payments';
import { colors } from '../lib/theme';

const MAX_BAR_HEIGHT = 110;

// Day abbreviations in display order (Mon..Sun). The server returns ISO day
// names; we normalise to 3-char uppercase for the bar labels.
const DAY_ABBR: Record<string, string> = {
  monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU',
  friday: 'FRI', saturday: 'SAT', sunday: 'SUN',
};

export default function EarningsScreen() {
  const router = useRouter();
  const earnings = useScoutEarnings();

  const [data, setData] = useState<ScoutEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getScoutEarnings()
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load earnings.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Derived display values — fall back to 0 while loading or on error.
  const monthTotal = (data?.allTimeCents ?? 0) / 100;
  const available = (data?.availableCents ?? 0) / 100;

  // Bar chart data from real weeklyByDay. Normalise to {day, value(0-100), cents}.
  const weekMax = data?.weeklyByDay?.length
    ? Math.max(1, ...data.weeklyByDay.map((b) => b.cents))
    : 1;
  const barData = data?.weeklyByDay?.map((b) => ({
    day: DAY_ABBR[b.day.toLowerCase()] ?? b.day.slice(0, 3).toUpperCase(),
    value: Math.round((b.cents / weekMax) * 100),
    cents: b.cents,
  })) ?? [];

  // Find today's bar (highest value in the week, or last bar for display).
  // The server returns the week Mon-Sun; highlight the last non-zero bar as "today".
  const todayIdx = (() => {
    for (let i = barData.length - 1; i >= 0; i--) {
      if (barData[i].cents > 0) return i;
    }
    return barData.length - 1;
  })();

  const payouts = data?.payouts ?? [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Earnings</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>Your earnings, payouts, and history</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.red} />
              <Text style={styles.loadingText}>Loading earnings...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setLoading(true);
                  setLoadError(null);
                  getScoutEarnings()
                    .then(setData)
                    .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load earnings.'))
                    .finally(() => setLoading(false));
                }}
              >
                <Text style={styles.retryBtnText}>RETRY</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Big total card */}
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>ALL TIME</Text>
                <Text style={styles.totalValue}>${monthTotal.toFixed(2)}</Text>
                <View style={styles.totalRow}>
                  <View style={styles.totalChip}>
                    <View style={styles.totalChipDot} />
                    <Text style={styles.totalChipText}>
                      +${earnings.earningsToday.toFixed(2)} today
                    </Text>
                  </View>
                  <View style={styles.upBadge}>
                    <Ionicons name="trending-up" size={10} color={colors.verified} />
                    <Text style={styles.upText}>LIVE</Text>
                  </View>
                </View>
              </View>

              {/* Bar chart */}
              {barData.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>THIS WEEK</Text>
                  <View style={styles.chartCard}>
                    <View style={styles.barsRow}>
                      {barData.map((bar, i) => {
                        const isToday = i === todayIdx;
                        return (
                          <View key={bar.day} style={styles.barColumn}>
                            <Text
                              style={[
                                styles.barAmount,
                                !isToday && { opacity: 0 },
                              ]}
                            >
                              ${(bar.cents / 100).toFixed(0)}
                            </Text>
                            <View style={styles.barWrapper}>
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    height: Math.max(4, (bar.value / 100) * MAX_BAR_HEIGHT),
                                    backgroundColor: isToday
                                      ? colors.red
                                      : bar.cents > 0
                                      ? colors.border
                                      : colors.surface,
                                  },
                                ]}
                              />
                            </View>
                            <Text
                              style={[
                                styles.barDay,
                                isToday && styles.barDayActive,
                              ]}
                            >
                              {bar.day}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              {/* Stats row — real values from scout-earnings Edge fn (Wave D). */}
              <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
                ALL TIME
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {data?.totalChecks ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>VIDEOS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.amber }]}>
                    {data?.avgRating != null ? data.avgRating.toFixed(1) : '--'}
                  </Text>
                  <Text style={styles.statLabel}>RATING</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {data?.totalChecks && data.totalChecks > 0
                      ? `$${(data.allTimeCents / 100 / data.totalChecks).toFixed(0)}`
                      : '--'}
                  </Text>
                  <Text style={styles.statLabel}>AVG / VIDEO</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.verified }]}>
                    {data?.deliveryRate != null
                      ? `${Math.round(data.deliveryRate * 100)}%`
                      : '--'}
                  </Text>
                  <Text style={styles.statLabel}>DELIVERY</Text>
                </View>
              </View>

              {/* Recent payouts */}
              {payouts.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
                    RECENT PAYOUTS
                  </Text>
                  <View style={styles.payoutsList}>
                    {payouts.map((p, i) => {
                      const isPaid = p.status === 'paid';
                      return (
                        <View
                          key={p.id}
                          style={[
                            styles.payoutRow,
                            i < payouts.length - 1 && styles.payoutRowDivider,
                          ]}
                        >
                          <View style={styles.payoutLeft}>
                            <Text style={styles.payoutDate}>{p.arrivalDate}</Text>
                            <Text style={styles.payoutClips}>{p.method}</Text>
                          </View>
                          <View style={styles.payoutRight}>
                            <Text style={styles.payoutAmount}>
                              ${(p.amountCents / 100).toFixed(2)}
                            </Text>
                            <View
                              style={[
                                styles.statusBadge,
                                isPaid && styles.statusBadgePaid,
                              ]}
                            >
                              <View
                                style={[
                                  styles.statusDot,
                                  isPaid && styles.statusDotPaid,
                                ]}
                              />
                              <Text
                                style={[
                                  styles.statusText,
                                  isPaid && styles.statusTextPaid,
                                ]}
                              >
                                {p.status.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Withdraw card */}
              <View style={styles.withdrawCard}>
                <View style={styles.balanceRow}>
                  <View>
                    <Text style={styles.balanceLabel}>AVAILABLE TO WITHDRAW</Text>
                    <Text style={styles.balanceValue}>
                      ${available.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.balanceIconWrap}>
                    <Ionicons name="card-outline" size={20} color={colors.verified} />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.withdrawBtn, available <= 0 && styles.withdrawBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={available <= 0}
                  onPress={() => {
                    if (available <= 0) {
                      Alert.alert('Nothing to withdraw', 'Your available balance is $0.00.');
                      return;
                    }
                    router.push({
                      pathname: '/(scout)/withdraw',
                      params: {
                        available: available.toFixed(2),
                        payoutSpeed: data?.payoutSpeed ?? 'standard',
                      },
                    });
                  }}
                >
                  <Text style={styles.withdrawBtnText}>WITHDRAW TO BANK</Text>
                </TouchableOpacity>
                <Text style={styles.withdrawFoot}>
                  Standard payouts arrive in 1 to 2 business days. Instant in ~30 min (1.5% fee).
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  titleRule: {
    height: 2,
    width: 32,
    backgroundColor: colors.red,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 22,
    gap: 16,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 2,
  },

  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginHorizontal: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  totalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  totalValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 42,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.3)',
  },
  totalChipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.verified,
  },
  totalChipText: {
    fontFamily: 'Inter_700Bold',
    color: colors.verified,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  upBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22,163,74,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  upText: {
    fontFamily: 'Inter_700Bold',
    color: colors.verified,
    fontSize: 10,
    letterSpacing: 0.4,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 8 },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barAmount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: colors.red,
    marginBottom: 6,
    height: 14,
    letterSpacing: 0.3,
  },
  barWrapper: {
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
    width: '60%',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
    width: '100%',
  },
  barDay: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 8,
    letterSpacing: 1.2,
  },
  barDayActive: { color: colors.textPrimary },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  payoutsList: {
    marginHorizontal: 22,
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  payoutRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  payoutLeft: {},
  payoutDate: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  payoutClips: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  payoutRight: { alignItems: 'flex-end', gap: 6 },
  payoutAmount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,203,71,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.35)',
  },
  statusBadgePaid: {
    backgroundColor: 'rgba(22,163,74,0.10)',
    borderColor: 'rgba(22,163,74,0.35)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.amber,
  },
  statusDotPaid: { backgroundColor: colors.verified },
  statusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.amber,
    letterSpacing: 1.4,
  },
  statusTextPaid: { color: colors.verified },

  withdrawCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginHorizontal: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  balanceValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  balanceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  withdrawBtnDisabled: {
    backgroundColor: colors.border,
  },
  withdrawBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 12.5,
    letterSpacing: 2.5,
  },
  withdrawFoot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    letterSpacing: 0.2,
  },
});
