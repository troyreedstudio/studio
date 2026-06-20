import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getCheck, getCheckClip, rateCheck, type CheckRow, type ClipRow } from '../lib/checks';

const TAGS = ['Busy Tonight', 'Short Line', 'Worth It'];

/** "Filmed 3 min ago" / "Filmed just now" from a clip's filmed_at timestamp. */
function formatFilmedAgo(filmedAt: string | null): string {
  if (!filmedAt) return 'Filmed moments ago';
  const then = new Date(filmedAt).getTime();
  if (Number.isNaN(then)) return 'Filmed moments ago';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'Filmed just now';
  if (mins === 1) return 'Filmed 1 min ago';
  if (mins < 60) return `Filmed ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? 'Filmed 1 hr ago' : `Filmed ${hrs} hrs ago`;
}

export default function DeliveryScreen() {
  const router = useRouter();
  const { checkId, venue = 'Komodo', city = 'Miami' } = useLocalSearchParams<{
    checkId: string;
    venue: string;
    city: string;
  }>();
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [check, setCheck] = useState<CheckRow | null>(null);
  const [clip, setClip] = useState<ClipRow | null>(null);

  // Load the real check row + its clip metadata (when/where filmed).
  useEffect(() => {
    if (!checkId) return;
    getCheck(checkId).then(setCheck).catch(() => {});
    getCheckClip(checkId).then(setClip).catch(() => {});
  }, [checkId]);

  // Prefer the real check's location label; fall back to the passed venue/city.
  const locationLabel = check?.location_label || `${venue}, ${city}`;
  const filmedLine = formatFilmedAgo(clip?.filmed_at ?? null);

  // Persist the rating to the ratings table (CHECK-06). Guard double-submit.
  const handleRate = async (star: number) => {
    if (submitting) return;
    setRating(star);
    if (!checkId) return;
    setSubmitting(true);
    try {
      await rateCheck(checkId, star);
    } catch (e) {
      setRating(0);
      Alert.alert(
        "Couldn't save your rating",
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backFab}
        onPress={() => router.replace('/(seeker)/home')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.92)" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.readyTitle}>YOUR CHECK IS READY</Text>
          <Text style={styles.venueName}>{locationLabel}</Text>
        </View>

        {/* Video Placeholder */}
        <View style={styles.videoBox}>
          <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
            <View style={styles.playIcon}>
              <Text style={styles.playArrow}>▶</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>HD · 15s</Text>
          </View>
          <View style={styles.liveTimestamp}>
            <View style={styles.liveBlip} />
            <Text style={styles.liveTime}>{filmedLine}</Text>
          </View>
        </View>

        {/* AI Verdict — auto-generated 1-line summary of the clip */}
        <View style={styles.aiVerdictRow}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✦ AI VERDICT</Text>
          </View>
          <Text style={styles.aiVerdictText}>Short line · ~30 inside · medium energy</Text>
        </View>

        {/* Crowd Tags */}
        <Text style={styles.sectionLabel}>CROWD REPORT</Text>
        <View style={styles.tagRow}>
          {TAGS.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Rating */}
        <Text style={styles.sectionLabel}>RATE YOUR CHECK</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRate(star)}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingFeedback}>
            {rating >= 4 ? 'Awesome! Thanks for rating 🙌' : 'Thanks for the feedback'}
          </Text>
        )}

        {/* Scout Info */}
        <View style={styles.scoutCard}>
          <View style={styles.scoutAvatar}>
            <Text style={styles.scoutAvatarText}>J</Text>
          </View>
          <View style={styles.scoutInfo}>
            <Text style={styles.scoutName}>Jake C.</Text>
            <Text style={styles.scoutRating}>⭐ 4.9 · 247 clips</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(seeker)/home')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>DONE · BACK TO HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push({ pathname: '/(seeker)/report', params: { venue } })}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>REPORT ISSUE</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backFab: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 5,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  successHeader: { alignItems: 'center', marginBottom: 28 },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,255,127,0.55)',
    borderWidth: 2,
    borderColor: '#00FF7F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkMark: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: '#00FF7F',
  },
  readyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  venueName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#cccccc',
    letterSpacing: 0.4,
  },
  videoBox: {
    height: 220,
    backgroundColor: '#0d0d0d',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playArrow: { fontSize: 20, color: '#000', marginLeft: 4 },
  videoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#000000aa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoBadgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    fontSize: 9,
    letterSpacing: 1.5,
  },
  liveTimestamp: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveBlip: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF7F' },
  liveTime: {
    fontFamily: 'Inter_600SemiBold',
    color: '#00FF7F',
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  aiVerdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,133,51,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,133,51,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 22,
    gap: 10,
  },
  aiBadge: {
    backgroundColor: '#00FF7F',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#000',
    letterSpacing: 1,
  },
  aiVerdictText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#fff',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#00FF7F',
    letterSpacing: 3,
    marginBottom: 12,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 22, flexWrap: 'wrap' },
  tag: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  tagText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#00FF7F',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  star: { fontSize: 36, color: '#222' },
  starActive: { color: '#FFCB47' },
  ratingFeedback: {
    fontFamily: 'Inter_400Regular',
    color: '#888',
    fontSize: 12.5,
    marginBottom: 22,
    letterSpacing: 0.3,
  },
  scoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 26,
    marginTop: 8,
  },
  scoutAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scoutAvatarText: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  scoutInfo: { flex: 1 },
  scoutName: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    fontSize: 17,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  scoutRating: {
    fontFamily: 'Inter_400Regular',
    color: '#888',
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  verifiedText: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  primaryBtn: {
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    fontSize: 12.5,
    letterSpacing: 2,
  },
});
