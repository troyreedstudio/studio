import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

const TAGS = ['Busy Tonight', 'Short Line', 'Worth It'];

export default function DeliveryScreen() {
  const router = useRouter();
  const { venue = 'Komodo', city = 'Miami' } = useLocalSearchParams<{
    venue: string;
    city: string;
  }>();
  const [rating, setRating] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.readyTitle}>YOUR CHECK IS READY</Text>
          <Text style={styles.venueName}>{venue} · {city}</Text>
        </View>

        {/* Video Placeholder */}
        <View style={styles.videoBox}>
          <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
            <View style={styles.playIcon}>
              <Text style={styles.playArrow}>▶</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>HD · 30s</Text>
          </View>
          <View style={styles.liveTimestamp}>
            <View style={styles.liveBlip} />
            <Text style={styles.liveTime}>Filmed 2 min ago</Text>
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
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
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
          onPress={() => router.push('/(seeker)/home')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>CHECK ANOTHER VENUE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>REPORT ISSUE</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  successHeader: { alignItems: 'center', marginBottom: 28 },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#14532d',
    borderWidth: 2,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkMark: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: '#22c55e',
  },
  readyTitle: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 26,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  venueName: {
    fontFamily: 'CormorantGaramond_700Bold',
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
  liveBlip: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveTime: {
    fontFamily: 'Inter_600SemiBold',
    color: '#22c55e',
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
    backgroundColor: '#FF8533',
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
    color: '#FF8533',
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
    color: '#22c55e',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  star: { fontSize: 36, color: '#222' },
  starActive: { color: '#f59e0b' },
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
    fontFamily: 'CormorantGaramond_700Bold',
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
    color: '#22c55e',
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
