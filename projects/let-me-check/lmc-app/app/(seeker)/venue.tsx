import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

export default function VenueScreen() {
  const router = useRouter();
  const { name = 'Komodo', city = 'Miami' } = useLocalSearchParams<{ name: string; city: string }>();
  const [selectedTier, setSelectedTier] = useState<'standard' | 'priority'>('standard');
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);

  const player = useVideoPlayer(require('../../assets/lmc-trailer.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
  });

  const tier = selectedTier === 'standard'
    ? { price: '$15', time: '10 min', label: 'Standard' }
    : { price: '$20', time: '7 min', label: 'Priority' };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.venueName}>{name}</Text>
          <Text style={styles.venueCity}>{city}</Text>
        </View>

        {/* Mock video preview window */}
        {videoPlaying ? (
          <View style={styles.photoArea}>
            <VideoView
              player={player}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              nativeControls={false}
            />
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>SAMPLE PREVIEW · 30s</Text>
            </View>
            <TouchableOpacity
              style={styles.photoCloseBtn}
              onPress={() => {
                player.pause();
                setVideoPlaying(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.photoCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              player.play();
              setVideoPlaying(true);
            }}
          >
            <ImageBackground
              source={require('../../assets/splash-assets/miami-night.jpg')}
              style={styles.photoArea}
              imageStyle={{ borderRadius: 16 }}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                locations={[0, 1]}
                style={styles.photoGradient}
              />
              <View style={styles.photoBadge}>
                <Text style={styles.photoBadgeText}>SAMPLE PREVIEW · 30s</Text>
              </View>
              <View style={styles.photoPlayWrap}>
                <View style={styles.photoPlayCircle}>
                  <Text style={styles.photoPlayIcon}>▶</Text>
                </View>
              </View>
              <Text style={styles.photoSub}>Tap to play sample · Real footage replaces this after your check</Text>
            </ImageBackground>
          </TouchableOpacity>
        )}

        {/* Live Status */}
        <View style={styles.liveStatus}>
          <View style={styles.liveBlip} />
          <Text style={styles.liveText}>LIVE CHECKS AVAILABLE</Text>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>🕐 Scouts Nearby</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>⚡ Fast Delivery</Text>
          </View>
        </View>

        {/* Tier Cards */}
        <Text style={styles.sectionTitle}>SELECT YOUR TIER</Text>
        <View style={styles.tierRow}>
          <TouchableOpacity
            style={[styles.tierCard, selectedTier === 'standard' && styles.tierCardActive]}
            onPress={() => setSelectedTier('standard')}
            activeOpacity={0.8}
          >
            <Text style={styles.tierLabel}>Standard</Text>
            <Text style={styles.tierPrice}>$15</Text>
            <Text style={styles.tierTime}>~10 min</Text>
            <Text style={styles.tierDesc}>30-sec HD video of the queue</Text>
            {selectedTier === 'standard' && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tierCard, selectedTier === 'priority' && styles.tierCardPriorityActive]}
            onPress={() => setSelectedTier('priority')}
            activeOpacity={0.8}
          >
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>PRIORITY</Text>
            </View>
            <Text style={styles.tierLabel}>Priority</Text>
            <Text style={styles.tierPrice}>$20</Text>
            <Text style={styles.tierTime}>~7 min</Text>
            <Text style={styles.tierDesc}>30-sec HD video · rush delivery</Text>
            {selectedTier === 'priority' && (
              <View style={[styles.selectedBadge, styles.selectedBadgeAmber]}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaSummary}>
          <Text style={styles.ctaSummaryText}>{tier.label} · {tier.price} · ~{tier.time}</Text>
        </View>
        <TouchableOpacity
          style={[styles.ctaButton, processing && styles.ctaButtonProcessing]}
          disabled={processing}
          onPress={() => {
            setProcessing(true);
            setTimeout(() => {
              setProcessing(false);
              router.push({
                pathname: '/(seeker)/payment',
                params: { venue: name, city, tier: selectedTier, price: tier.price, time: tier.time },
              });
            }, 900);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {processing ? 'FINDING SCOUTS...' : `PAY ${tier.price} · ${tier.label.toUpperCase()}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#888', fontSize: 16 },
  venueName: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  venueCity: { fontSize: 14, color: '#888' },
  photoArea: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#111',
  },
  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
  },
  photoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: '#FF8533',
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  photoBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FF8533',
    letterSpacing: 1.5,
  },
  photoCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCloseIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  photoPlayWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlayIcon: {
    fontSize: 26,
    color: '#000',
    marginLeft: 4,
  },
  photoSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  liveBlip: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  liveText: { fontSize: 13, color: '#22c55e', fontWeight: '700', letterSpacing: 1.5 },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  infoChip: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  infoChipText: { color: '#888', fontSize: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tierRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#222',
    minHeight: 160,
  },
  tierCardActive: {
    borderColor: '#fff',
    backgroundColor: '#151515',
  },
  tierCardPriorityActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#151200',
  },
  priorityBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  priorityBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  tierLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  tierPrice: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 2 },
  tierTime: { fontSize: 13, color: '#22c55e', fontWeight: '600', marginBottom: 8 },
  tierDesc: { fontSize: 11, color: '#666', lineHeight: 16 },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeAmber: { backgroundColor: '#f59e0b' },
  selectedBadgeText: { fontSize: 12, fontWeight: '800', color: '#000' },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    padding: 20,
    paddingBottom: 36,
  },
  ctaSummary: { marginBottom: 10 },
  ctaSummaryText: { color: '#888', fontSize: 13, textAlign: 'center' },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaButtonProcessing: {
    backgroundColor: '#cccccc',
  },
  ctaButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
