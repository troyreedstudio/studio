import React, { useState } from 'react';
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
  MARKETS,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_MARKET_ID,
  getCountryByCode,
  getMarketsForCountry,
  type Market,
  type MarketStatus,
} from '../data/markets';

type Status = MarketStatus;
type City = Market & { scouts: number; status: MarketStatus };

const DETECTED_ID = 'mia';

export default function CityPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ country?: string }>();
  const countryCode = params.country || DEFAULT_COUNTRY_CODE;
  const country = getCountryByCode(countryCode) || getCountryByCode(DEFAULT_COUNTRY_CODE)!;

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    countryCode === 'US' ? DETECTED_ID : null
  );

  const allCitiesInCountry: City[] = getMarketsForCountry(countryCode) as City[];

  const filtered = allCitiesInCountry.filter((c) =>
    `${c.name} ${c.region}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const featuredCities = filtered.filter((c) => c.featured);
  const sections: { label: string; status: Status }[] = [
    { label: 'LIVE NOW', status: 'live' },
    { label: 'LAUNCHING SOON', status: 'soon' },
    { label: 'WAITLIST', status: 'waitlist' },
  ];

  const handleContinue = () => {
    if (!selectedId) return;
    router.replace({
      pathname: '/(seeker)/home',
      params: { marketId: selectedId },
    });
  };

  const detected = allCitiesInCountry.find((c) => c.id === DETECTED_ID && c.status === 'live');

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Flow Map</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View key={i} style={[styles.dot, styles.dotDone]} />
            ))}
          </View>
          <TouchableOpacity
            style={styles.wireframeBadge}
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.wireframeBadgeText}>WF</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Pick your city</Text>
        <Text style={styles.subtitle}>
          {country.flag} {country.name} · {allCitiesInCountry.length} cities. Scouts where we&apos;ve launched, waitlist for the rest.
        </Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.55)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or country"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.searchInput}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Detected banner */}
        {detected && query.length === 0 && (
          <TouchableOpacity
            style={styles.detectedRow}
            activeOpacity={0.85}
            onPress={() => setSelectedId(detected.id)}
          >
            <View style={styles.detectedIconWrap}>
              <Ionicons name="locate" size={14} color="#00FF7F" />
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
                          `${city.name} — Waitlist`,
                          `${city.name} isn't a LMC market yet. Join the waitlist and we'll let you know when it opens.`,
                          [
                            { text: 'Not now', style: 'cancel' },
                            { text: 'Join waitlist', onPress: () => {} },
                          ]
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
                We&apos;ll let you know when LMC launches in your city.
              </Text>
              <TouchableOpacity style={styles.waitlistBtn} activeOpacity={0.85}>
                <Text style={styles.waitlistBtnText}>JOIN THE WAITLIST</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !selectedId && styles.ctaDisabled]}
            disabled={!selectedId}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.ctaText, !selectedId && styles.ctaTextDisabled]}
            >
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
      <View
        style={[
          styles.monoWrap,
          selected && tappable && styles.monoWrapSelected,
        ]}
      >
        <Text style={styles.monoText}>{monogram}</Text>
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

const INDIGO = '#143782';
const INDIGO_LIGHT = 'rgba(20,55,130,0.5)';

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  wireframeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,107,0,0.18)',
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotDone: { backgroundColor: '#00FF7F' },
  wireframeBadgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF6B00',
    fontSize: 9,
    letterSpacing: 1.4,
  },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    paddingHorizontal: 22,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.2,
    padding: 0,
  },

  detectedRow: {
    marginHorizontal: 22,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,255,127,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detectedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,255,127,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#00FF7F',
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  detectedCity: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  detectedAction: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#00FF7F',
    letterSpacing: 1.6,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 24 },

  section: { marginBottom: 18 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
    marginBottom: 10,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  cardSelected: {
    backgroundColor: INDIGO_LIGHT,
    borderColor: 'rgba(60,110,200,0.7)',
  },
  cardDimmed: {
    opacity: 0.6,
  },

  monoWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: INDIGO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monoWrapSelected: {
    backgroundColor: '#ffffff',
  },
  monoText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 1,
  },

  cardBody: { flex: 1 },
  cityName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  cityNameDimmed: { color: 'rgba(255,255,255,0.7)' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cityRegion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scoutCount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: '#00FF7F',
    letterSpacing: 0.4,
  },
  scoutLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: 'rgba(0,255,127,0.55)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF3B30',
  },
  statusLiveText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 1,
  },
  statusSoon: {
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderColor: 'rgba(255,107,0,0.4)',
  },
  statusSoonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FF6B00',
    letterSpacing: 1.2,
  },
  statusWait: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statusWaitText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
  },

  emptyWrap: {
    paddingTop: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
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
    borderColor: 'rgba(0,255,127,0.4)',
    backgroundColor: 'rgba(0,255,127,0.06)',
  },
  waitlistBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#00FF7F',
    letterSpacing: 2,
  },

  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cta: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 3,
  },
  ctaTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
});
