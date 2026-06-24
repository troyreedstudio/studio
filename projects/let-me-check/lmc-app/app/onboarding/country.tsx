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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES, type Country } from '../data/markets';
import { colors } from '../lib/theme';

/**
 * Detect the user's country code via IP geolocation (ipwho.is).
 * Returns an ISO 3166-1 alpha-2 code (e.g. "US") or null on failure.
 * Never throws — a null result simply hides the "DETECTED LOCATION" banner
 * and the user picks their country manually.
 */
async function detectCountryCode(): Promise<string | null> {
  try {
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();
    if (data?.success && typeof data.country_code === 'string' && data.country_code.length === 2) {
      return (data.country_code as string).toUpperCase();
    }
  } catch {
    // Network unavailable or parse failure — fall through to null
  }
  return null;
}

export default function CountryPickerScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    detectCountryCode().then((code) => {
      if (cancelled) return;
      setDetectedCode(code);
      if (code && COUNTRIES.some((c) => c.code === code)) {
        setSelectedCode(code);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = COUNTRIES.filter((c) =>
    `${c.name} ${c.code}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const featured = filtered.filter((c) => c.featured);
  const others = filtered.filter((c) => !c.featured);

  const detected = detectedCode ? COUNTRIES.find((c) => c.code === detectedCode) : null;

  const handleContinue = () => {
    if (!selectedCode) return;
    router.replace({
      pathname: '/onboarding/city',
      params: { country: selectedCode },
    });
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding/role')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View key={i} style={[styles.dot, i < 4 && styles.dotDone]} />
            ))}
          </View>
        </View>

        <Text style={styles.title}>Pick your country</Text>
        <Text style={styles.subtitle}>
          Let Me Check works in countries where we have Scouts on the ground. More coming.
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries"
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
            onPress={() => setSelectedCode(detected.code)}
          >
            <View style={styles.detectedIconWrap}>
              <Ionicons name="locate" size={14} color={colors.verified} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detectedLabel}>DETECTED LOCATION</Text>
              <Text style={styles.detectedCity}>
                {detected.flag} {detected.name}
              </Text>
            </View>
            <Text style={styles.detectedAction}>USE</Text>
          </TouchableOpacity>
        )}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {featured.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>POPULAR</Text>
              {featured.map((c) => (
                <CountryCard
                  key={c.code}
                  country={c}
                  selected={selectedCode === c.code}
                  onPress={() => handlePickCountry(c, setSelectedCode)}
                />
              ))}
            </View>
          )}

          {others.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MORE COUNTRIES</Text>
              {others.map((c) => (
                <CountryCard
                  key={c.code}
                  country={c}
                  selected={selectedCode === c.code}
                  onPress={() => handlePickCountry(c, setSelectedCode)}
                />
              ))}
            </View>
          )}

          {filtered.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Not on the map yet</Text>
              <Text style={styles.emptySub}>
                We&apos;ll let you know when Let Me Check launches in your country.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !selectedCode && styles.ctaDisabled]}
            disabled={!selectedCode}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, !selectedCode && styles.ctaTextDisabled]}>
              CONTINUE
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function handlePickCountry(
  c: Country,
  setSelectedCode: (code: string) => void
) {
  if (c.status === 'live') {
    setSelectedCode(c.code);
  } else if (c.status === 'soon') {
    Alert.alert(
      `${c.name} — Launching soon`,
      `We're recruiting Scouts in ${c.name}. Waitlist sign-up coming soon — check back in the app.`,
      [{ text: 'OK' }]
    );
  } else {
    Alert.alert(
      `${c.name} — Not live yet`,
      `${c.name} isn't a Let Me Check market yet. Waitlist sign-up is coming soon.`,
      [{ text: 'OK' }]
    );
  }
}

function CountryCard({
  country,
  selected,
  onPress,
}: {
  country: Country;
  selected: boolean;
  onPress: () => void;
}) {
  const isLive = country.status === 'live';
  const isSoon = country.status === 'soon';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && isLive && styles.cardSelected,
        !isLive && styles.cardDimmed,
      ]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <Text style={styles.flag}>{country.flag}</Text>
      <View style={styles.cardBody}>
        <Text style={[styles.countryName, !isLive && styles.countryNameDimmed]}>
          {country.name}
        </Text>
        <Text style={styles.countryCode}>{country.code}</Text>
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
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 20, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: 'rgba(218,37,29,0.4)' },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    paddingHorizontal: 22,
    marginBottom: 6,
    letterSpacing: 0.2,
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
  cardDimmed: { opacity: 0.55 },
  flag: { fontSize: 30 },
  cardBody: { flex: 1 },
  countryName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  countryNameDimmed: { color: colors.textSecondary },
  countryCode: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.6,
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
  emptyWrap: { paddingTop: 24, alignItems: 'center' },
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
    paddingHorizontal: 30,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cta: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: colors.border },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 3,
  },
  ctaTextDisabled: { color: colors.textTertiary },
});
