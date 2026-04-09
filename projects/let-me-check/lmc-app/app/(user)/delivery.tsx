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
            <Text style={styles.videoBadgeText}>HD · 60s</Text>
          </View>
          <View style={styles.liveTimestamp}>
            <View style={styles.liveBlip} />
            <Text style={styles.liveTime}>Filmed 2 min ago</Text>
          </View>
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

        {/* Checker Info */}
        <View style={styles.checkerCard}>
          <View style={styles.checkerAvatar}>
            <Text style={styles.checkerAvatarText}>J</Text>
          </View>
          <View style={styles.checkerInfo}>
            <Text style={styles.checkerName}>Jake C.</Text>
            <Text style={styles.checkerRating}>⭐ 4.9 · 247 clips</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(user)/home')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>CHECK ANOTHER VENUE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>📤  SHARE CLIP</Text>
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
  checkMark: { fontSize: 36, color: '#22c55e', fontWeight: '900' },
  readyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 6,
  },
  venueName: { fontSize: 14, color: '#888' },
  videoBox: {
    height: 220,
    backgroundColor: '#111',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 24,
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
  videoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  liveTimestamp: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveBlip: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveTime: { color: '#22c55e', fontSize: 11, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#555',
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tag: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#22c55e44',
  },
  tagText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  star: { fontSize: 36, color: '#222' },
  starActive: { color: '#f59e0b' },
  ratingFeedback: { color: '#888', fontSize: 13, marginBottom: 20 },
  checkerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 24,
    marginTop: 8,
  },
  checkerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  checkerInfo: { flex: 1 },
  checkerName: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  checkerRating: { color: '#888', fontSize: 12 },
  verifiedBadge: {
    backgroundColor: '#14532d',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
