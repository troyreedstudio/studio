import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { isPartnerVenue, getMarketById, DEFAULT_MARKET_ID } from '../data/markets';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

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
      <StatusBar barStyle="dark-content" />
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
              {isLive ? 'Scouts active in your area' : 'Launching soon'}
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
          <Text style={[styles.liveText, !isLive && styles.liveTextSoon]}>
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
            style={[styles.interiorCard, interior && styles.interiorCardActive]}
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
                  ? `${name} is a Let Me Check Partner. Scout films exterior + inside the venue. 30-sec video.`
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
          style={[styles.ctaButton, ctaGlowShadow]}
          onPress={() => {
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
          }}
          activeOpacity={0.85}
        >
          <CtaGlow radius={14} />
          <Text style={styles.ctaButtonText}>{`REVIEW & PAY · ${tier.price}`}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: { marginBottom: 12 },
  backText: { fontFamily: 'Inter_500Medium', color: colors.red, fontSize: 15 },
  venueName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  venueCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  venueCity: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  venueDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  venueScoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.verified,
    marginRight: -3,
  },
  venueScouts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.verified,
    letterSpacing: 0.3,
  },
  photoArea: {
    alignSelf: 'center',
    width: '55%',
    aspectRatio: 9 / 16,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  photoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.textPrimary,
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  photoBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.bg,
    letterSpacing: 1.5,
  },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  liveBlip: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.verified },
  liveBlipSoon: { backgroundColor: colors.red },
  liveText: {
    fontSize: 13,
    color: colors.verified,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  liveTextSoon: { color: colors.red },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  infoChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoChipText: { color: colors.textSecondary, fontSize: 12 },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tierRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 160,
  },
  tierCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  tierCardPriorityActive: {
    borderColor: colors.red,
    backgroundColor: 'rgba(218,37,29,0.04)',
  },
  priorityBadge: {
    backgroundColor: 'rgba(218,37,29,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  priorityBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.red,
    letterSpacing: 1,
  },
  tierLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  tierPrice: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tierTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  tierDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeAmber: { backgroundColor: colors.red },
  selectedBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.bg,
  },
  interiorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 20,
    marginTop: 14,
  },
  interiorCardActive: {
    borderColor: colors.red,
    backgroundColor: 'rgba(218,37,29,0.04)',
  },
  interiorCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  interiorCheckActive: { backgroundColor: colors.red, borderColor: colors.red },
  interiorCheckGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.onRed,
  },
  interiorEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.red,
    letterSpacing: 2,
    marginBottom: 4,
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
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  interiorBadge: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 13,
    color: colors.red,
    letterSpacing: 0.4,
  },
  interiorSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 20,
    paddingBottom: 36,
  },
  ctaButton: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: colors.onRed,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 1.5,
  },
});
