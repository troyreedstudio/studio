import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_COUNTRY_CODE,
  getCountryByCode,
  getMarketsForCountry,
  getMarketById,
  type Market,
  type MarketStatus,
} from '../data/markets';
import { getIntendedRole } from '../state/intended-role';
import { setManualLocation } from '../state/location';
import { colors } from '../lib/theme';
import { CtaGlow } from '../components/CtaGlow';
import { BackButton } from '../components/BackButton';

type Status = MarketStatus;
type City = Market & { scouts: number; status: MarketStatus };

async function detectCityId(cities: City[]): Promise<string | null> {
  try {
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();
    if (!data?.success) return null;
    const ipCity: string = ((data.city as string | undefined) ?? '').toLowerCase();
    const ipRegion: string = ((data.region as string | undefined) ?? '').toLowerCase();
    if (!ipCity) return null;
    const match = cities.find(
      (c) =>
        (c.status === 'live' || c.status === 'soon') &&
        (c.name.toLowerCase() === ipCity ||
          c.region.toLowerCase() === ipRegion ||
          c.name.toLowerCase().includes(ipCity) ||
          ipCity.includes(c.name.toLowerCase()))
    );
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export default function CityPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ country?: string; from?: string }>();
  const countryCode = params.country || DEFAULT_COUNTRY_CODE;
  const isPostAuth = params.from === 'home';
  const country = getCountryByCode(countryCode) || getCountryByCode(DEFAULT_COUNTRY_CODE)!;

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detectedId, setDetectedId] = useState<string | null>(null);

  const allCitiesInCountry: City[] = getMarketsForCountry(countryCode) as City[];

  useEffect(() => {
    let cancelled = false;
    detectCityId(allCitiesInCountry).then((id) => {
      if (cancelled) return;
      setDetectedId(id);
      if (id) setSelectedId(id);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const filtered = allCitiesInCountry.filter((c) =>
    `${c.name} ${c.region}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const sections: { label: string; status: Status }[] = [
    { label: 'LIVE NOW', status: 'live' },
    { label: 'LAUNCHING SOON', status: 'soon' },
    { label: 'WAITLIST', status: 'waitlist' },
  ];

  const handleContinue = () => {
    if (!selectedId) return;

    if (isPostAuth) {
      const chosenMarket = getMarketById(selectedId);
      if (chosenMarket) {
        setManualLocation(chosenMarket.center, chosenMarket.name);
      }
      router.replace({
        pathname: '/(seeker)/home',
        params: { marketId: selectedId },
      });
      return;
    }

    const role = getIntendedRole() ?? 'seeker';
    router.replace({
      pathname: '/auth/sign-up',
      params: { role, marketId: selectedId },
    });
  };

  const detected = detectedId
    ? allCitiesInCountry.find((c) => c.id === detectedId && c.status === 'live')
    : null;

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton fallback="/onboarding/country" />
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View key={i} style={[styles.dot, styles.dotDone]} />
            ))}
          </View>
        </View>

        <Text style={styles.title}>Pick your city</Text>
        <Text style={styles.subtitle}>
          {country.flag} {country.name} · {allCitiesInCountry.length} cities. Scouts where we&apos;ve launched, waitlist for the rest.
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or country"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {detected && query.length === 0 && (
          <TouchableOpacity
            style={styles.detectedRow}
            activeOpacity={0.85}
            onPress={() => setSelectedId(detected.id)}
          >
            <View style={styles.detectedIconWrap}>
              <Ionicons name="locate" size={14} color={colors.verified} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detectedLabel}>DETECTED LOCATION</Text>
              <Text style={styles.detectedCity}>{detected.name}, {detected.region}</Text>
            </View>
            <Text style={styles.detectedAction}>USE</Text>
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section) => {
            const items = filtered.filter((c) => c.status === section.status);
            if (items.length === 0) return null;
            return (
              <View key={section.status} style={styles.section}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                {items.map((city) => (
                  <CityCard
                    key={city.id}
                    city={city}
                    selected={selectedId === city.id}
                    onPress={() => {
                      if (city.status === 'live' || city.status === 'soon') {
                        setSelectedId(city.id);
                      } else {
                        Alert.alert(
                          `${city.name} — Not live yet`,
                          `${city.name} isn't a Let Me Check market yet. Waitlist sign-up is coming soon.`,
                          [{ text: 'OK' }]
                        );
                      }
                    }}
                  />
                ))}
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Not on the map yet</Text>
              <Text style={styles.emptySub}>
                We&apos;ll let you know when Let Me Check launches in your city.
              </Text>
              <View style={styles.waitlistBtn}>
                <Text style={styles.waitlistBtnText}>WAITLIST COMING SOON</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !selectedId && styles.ctaDisabled]}
            disabled={!selectedId}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, !selectedId && styles.ctaTextDisabled]}>
              CONTINUE
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function CityCard({
  city,
  selected,
  onPress,
}: {
  city: City;
  selected: boolean;
  onPress: () => void;
}) {
  const isLive = city.status === 'live';
  const isSoon = city.status === 'soon';
  const monogram = city.name.charAt(0);
  const tappable = isLive || isSoon;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && tappable && styles.cardSelected,
        !tappable && styles.cardDimmed,
      ]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[styles.monoWrap, !isLive && styles.monoWrapSoon, isLive && selected && styles.monoWrapSelected]}>
        {isLive && <CtaGlow radius={18} />}
        <Text style={[styles.monoText, selected && isLive && styles.monoTextSelected]}>
          {monogram}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cityName, !isLive && styles.cityNameDimmed]}>
          {city.name}
        </Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cityRegion}>{city.region}</Text>
          {isLive && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.scoutCount}>{city.scouts}</Text>
              <Text style={styles.scoutLabel}>Scouts</Text>
            </>
          )}
        </View>
      </View>

      {isLive && (
        <View style={[styles.statusPill, styles.statusLive]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusLiveText}>LIVE</Text>
        </View>
      )}
      {isSoon && (
        <View style={[styles.statusPill, styles.statusSoon]}>
          <Text style={styles.statusSoonText}>SOON</Text>
        </View>
      )}
      {!isLive && !isSoon && (
        <View style={[styles.statusPill, styles.statusWait]}>
          <Text style={styles.statusWaitText}>WAITLIST</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: 'rgba(218,37,29,0.4)' },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    paddingHorizontal: 22,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 22,
    marginBottom: 18,
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  searchWrap: {
    marginHorizontal: 22,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    padding: 0,
  },

  detectedRow: {
    marginHorizontal: 22,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(22,163,74,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detectedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(22,163,74,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.verified,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  detectedCity: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  detectedAction: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.verified,
    letterSpacing: 1.6,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 24 },

  section: { marginBottom: 18 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 10,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  cardSelected: {
    backgroundColor: 'rgba(218,37,29,0.06)',
    borderColor: colors.red,
  },
  cardDimmed: { opacity: 0.5 },

  monoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.red, // transitional red gradient avatar (CtaGlow renders on top)
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monoWrapSelected: {
    backgroundColor: colors.red,
  },
  monoWrapSoon: {
    backgroundColor: '#9CA3AF', // muted grey avatar for non-live cities (red is reserved for LIVE so it pops)
  },
  monoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.white, // white initial on the red avatar
    letterSpacing: 0,
  },
  monoTextSelected: {
    color: colors.white,
  },

  cardBody: { flex: 1 },
  cityName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  cityNameDimmed: { color: colors.textSecondary },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cityRegion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  scoutCount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: colors.verified,
    letterSpacing: 0.4,
  },
  scoutLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusLive: {
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderColor: 'rgba(22,163,74,0.35)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.verified,
  },
  statusLiveText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.verified,
    letterSpacing: 1,
  },
  statusSoon: {
    backgroundColor: 'rgba(107,114,128,0.08)', // muted grey = "coming soon" (off-palette orange retired)
    borderColor: 'rgba(107,114,128,0.3)',
  },
  statusSoonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  statusWait: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statusWaitText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },

  emptyWrap: {
    paddingTop: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 30,
  },
  waitlistBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  waitlistBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 2,
  },

  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cta: {
    backgroundColor: colors.buttonGrey, // locked grey button
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong, // subtle edge so the enabled grey reads as tappable
  },
  ctaDisabled: {
    backgroundColor: '#F1F2F4', // lighter + faded = clearly "not ready yet" (distinct from enabled grey)
    borderColor: colors.border,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: colors.buttonGreyText, // dark text on the grey button
    fontSize: 13,
    letterSpacing: 3,
  },
  ctaTextDisabled: {
    color: colors.buttonGreyText,
  },
});
