import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { isPartnerVenue, getMarketById, DEFAULT_MARKET_ID } from '../data/markets';

export default function VenueScreen() {
  const router = useRouter();
  const {
    name = 'Komodo',
    city: cityParam,
    marketId: marketIdParam,
  } = useLocalSearchParams<{ name: string; city?: string; marketId?: string }>();
  const market = getMarketById(marketIdParam || DEFAULT_MARKET_ID) || getMarketById(DEFAULT_MARKET_ID)!;
  const city = cityParam || market.name;
  const isLive = market.status === 'live';
  const [selectedTier, setSelectedTier] = useState<'standard' | 'priority'>('standard');
  const [interior, setInterior] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);

  const isPartner = isPartnerVenue(String(name));

  const player = useVideoPlayer(require('../../assets/scout-sample.mov'), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const basePrice = selectedTier === 'standard' ? 15 : 20;
  const totalPrice = basePrice + (interior && isPartner ? 5 : 0);
  const tier = {
    price: `$${totalPrice}`,
    time: selectedTier === 'standard' ? '10 min' : '7 min',
    label: selectedTier === 'standard' ? 'Standard' : 'Priority',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(seeker)/home');
            }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.venueName}>{name}</Text>
          <View style={styles.venueCityRow}>
            <Text style={styles.venueCity}>{city}</Text>
            <View style={styles.venueDot} />
            <View style={styles.venueScoutDot} />
            <Text style={styles.venueScouts}>
              {isLive ? `${market.scouts} Scouts nearby` : 'Launching soon'}
            </Text>
          </View>
        </View>

        {/* Auto-playing silent preview — the real impulse trigger */}
        <View style={styles.photoArea}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
          />
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>PREVIEW · 15s</Text>
          </View>
        </View>

        {/* Live Status */}
        <View style={styles.liveStatus}>
          <View style={[styles.liveBlip, !isLive && styles.liveBlipSoon]} />
          <Text style={styles.liveText}>
            {isLive ? 'LIVE CHECKS AVAILABLE' : 'RECRUITING SCOUTS IN ' + city.toUpperCase()}
          </Text>
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
            <Text style={styles.tierDesc}>15-sec HD video of the queue</Text>
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
            <Text style={styles.tierDesc}>15-sec HD video · fast delivery</Text>
            {selectedTier === 'priority' && (
              <View style={[styles.selectedBadge, styles.selectedBadgeAmber]}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isPartner && (
          <TouchableOpacity
            style={styles.interiorCard}
            activeOpacity={0.85}
            onPress={() => setInterior(!interior)}
          >
            <View style={[styles.interiorCheck, interior && styles.interiorCheckActive]}>
              {interior && <Text style={styles.interiorCheckGlyph}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.interiorEyebrow}>✦ PARTNER VENUE</Text>
              <View style={styles.interiorTitleRow}>
                <Text style={styles.interiorTitle}>Include interior</Text>
                <Text style={styles.interiorBadge}>+$5</Text>
              </View>
              <Text style={styles.interiorSub}>
                {interior
                  ? `${name} is an LMC Partner. Scout films exterior + inside the venue. 30-sec video.`
                  : `${name} is a Partner — add inside footage to your check. 30-sec video.`}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaButton, processing && styles.ctaButtonProcessing]}
          disabled={processing}
          onPress={() => {
            setProcessing(true);
            setTimeout(() => {
              setProcessing(false);
              router.push({
                pathname: '/(seeker)/payment',
                params: {
                  venue: name,
                  city,
                  tier: selectedTier,
                  price: tier.price,
                  time: tier.time,
                  interior: interior ? '1' : '0',
                },
              });
            }, 900);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {processing ? 'ONE MOMENT…' : `REVIEW & PAY · ${tier.price}`}
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
  backText: { fontFamily: 'Inter_500Medium', color: '#fff', fontSize: 15 },
  venueName: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  venueCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  venueCity: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  venueDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  venueScoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF7F',
    marginRight: -3,
  },
  venueScouts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#00FF7F',
    letterSpacing: 0.3,
  },
  photoArea: {
    alignSelf: 'center',
    width: '55%',
    aspectRatio: 9 / 16,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#111',
    marginTop: 4,
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
    top: 10,
    left: 10,
    backgroundColor: 'rgba(20,55,130,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.85)',
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  photoBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#ffffff',
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
  liveBlip: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00FF7F' },
  liveBlipSoon: { backgroundColor: '#FF6B00' },
  liveText: { fontSize: 13, color: '#00FF7F', fontWeight: '700', letterSpacing: 1.5 },
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
    borderColor: '#FFCB47',
    backgroundColor: '#151200',
  },
  priorityBadge: {
    backgroundColor: '#FFCB47',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  priorityBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  tierLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  tierPrice: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 2 },
  tierTime: { fontSize: 13, color: '#00FF7F', fontWeight: '600', marginBottom: 8 },
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
  selectedBadgeAmber: { backgroundColor: '#FFCB47' },
  selectedBadgeText: { fontSize: 12, fontWeight: '800', color: '#000' },
  interiorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.6)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 20,
    marginTop: 14,
  },
  interiorCardActive: {
    borderColor: 'rgba(60,110,200,0.9)',
  },
  interiorEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#E8A0B0',
    letterSpacing: 2,
    marginBottom: 4,
  },
  interiorCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  interiorCheckActive: { backgroundColor: '#00FF7F', borderColor: '#00FF7F' },
  interiorCheckGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#000',
  },
  interiorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  interiorTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
  },
  interiorBadge: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 13,
    color: '#00FF7F',
    letterSpacing: 0.4,
  },
  interiorSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  partnerStar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(232,160,176,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(232,160,176,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerStarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#E8A0B0',
  },
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
