import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { listMyChecks, listMyRatings, type CheckRow } from '../lib/checks';
import { colors } from '../lib/theme';

// Seeker-paid total per tier (the pricing model). Used for the price label +
// "Total Spent". Currency-aware display is a later refinement; symbol from row.
const TIER_PRICE: Record<string, number> = { standard: 16.5, priority: 22 };

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// A check is watchable only once its clip is delivered (or rated after watching).
function isWatchable(status: string | null): boolean {
  return status === 'delivered' || status === 'rated';
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'delivered': return 'Ready to watch';
    case 'rated': return 'Watched';
    case 'dispatching':
    case 'requested': return 'Finding a Scout';
    case 'assigned':
    case 'filming':
    case 'uploaded':
    case 'processing': return 'In progress';
    case 'blur_review': return 'Processing';
    case 'cancelled': return 'Cancelled';
    case 'no_scout': return 'No Scout found';
    default: return status ?? '';
  }
}

export default function HistoryScreen() {
  const router = useRouter();
  const [checks, setChecks] = useState<CheckRow[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([listMyChecks(), listMyRatings()])
      .then(([rows, ratings]) => {
        setChecks(rows);
        setRatingsMap(ratings);
      })
      .catch(() => { setError(true); setChecks([]); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = checks ?? [];
  const totalSpent = rows
    .filter((c) => isWatchable(c.status))
    .reduce((sum, c) => sum + (TIER_PRICE[c.tier] ?? 0), 0);
  // Real ratings from the ratings table, not from CheckRow (which has no rating column).
  const ratingValues = Array.from(ratingsMap.values()).filter((r) => r > 0);
  const avgRating = ratingValues.length
    ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Activity</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rows.length}</Text>
            <Text style={styles.statLabel}>Total Checks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgRating ? `${avgRating.toFixed(1)}★` : '—'}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>RECENT CHECKS</Text>

        {checks === null ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="small" color={colors.red} />
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>Couldn’t load your checks.</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>No checks yet.</Text>
            <Text style={styles.stateSub}>Your verification videos will show up here.</Text>
          </View>
        ) : (
          rows.map((check) => {
            const watchable = isWatchable(check.status);
            const rating = ratingsMap.get(check.id) ?? 0;
            const price = TIER_PRICE[check.tier] ?? 0;
            const label = check.location_label || 'Check';
            return (
              <TouchableOpacity
                key={check.id}
                style={styles.checkCard}
                activeOpacity={watchable ? 0.8 : 1}
                disabled={!watchable}
                onPress={() =>
                  watchable &&
                  router.push({
                    pathname: '/(seeker)/delivery',
                    params: { checkId: check.id, venue: label, city: '' },
                  })
                }
              >
                <View style={styles.checkLeft}>
                  <View style={styles.venueAvatar}>
                    <Text style={styles.venueAvatarText}>{label[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={styles.checkInfo}>
                    <Text style={styles.checkVenue} numberOfLines={1}>{label}</Text>
                    <Text style={styles.checkCity}>
                      {fmtDate(check.created_at)} · {statusLabel(check.status)}
                    </Text>
                    {rating > 0 ? (
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Text key={s} style={[styles.star, s <= rating && styles.starActive]}>★</Text>
                        ))}
                      </View>
                    ) : watchable ? (
                      <Text style={styles.watchHint}>▶ Tap to watch</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.checkRight}>
                  <View style={[styles.tierPill, check.tier === 'priority' && styles.tierPillPriority]}>
                    <Text style={[styles.tierPillText, check.tier === 'priority' && styles.tierPillTextPriority]}>
                      {check.tier.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.checkPrice}>${price.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backText: { fontFamily: 'Inter_500Medium', color: colors.red, fontSize: 15, marginBottom: 14 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, color: colors.textPrimary, letterSpacing: 0.4 },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 20,
    marginVertical: 16, padding: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 24, color: colors.textPrimary, letterSpacing: 0.3, marginBottom: 4 },
  statLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.textTertiary, letterSpacing: 1.5, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  sectionLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.textTertiary, letterSpacing: 3,
    paddingHorizontal: 20, marginBottom: 12, textTransform: 'uppercase',
  },
  stateWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  stateText: { fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, fontSize: 14 },
  stateSub: { fontFamily: 'Inter_400Regular', color: colors.textTertiary, fontSize: 12 },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: colors.border },
  retryText: { fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 12, letterSpacing: 1 },
  checkCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg,
    borderRadius: 14, marginHorizontal: 20, marginBottom: 8, padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  checkLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  venueAvatar: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  venueAvatarText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 22, color: colors.textTertiary, letterSpacing: 0.3 },
  checkInfo: { flex: 1 },
  checkVenue: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.textPrimary, letterSpacing: 0.3, marginBottom: 3 },
  checkCity: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textSecondary, letterSpacing: 0.3, marginBottom: 5 },
  starsRow: { flexDirection: 'row' },
  star: { fontSize: 12, color: colors.border },
  starActive: { color: colors.amber },
  watchHint: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.red, letterSpacing: 0.3 },
  checkRight: { alignItems: 'flex-end', gap: 6 },
  tierPill: { backgroundColor: colors.surface, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3 },
  tierPillPriority: { backgroundColor: 'rgba(255,203,71,0.12)' },
  tierPillText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.textTertiary, letterSpacing: 1.5 },
  tierPillTextPriority: { color: colors.amber },
  checkPrice: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 16, color: colors.textPrimary, letterSpacing: 0.3 },
});
