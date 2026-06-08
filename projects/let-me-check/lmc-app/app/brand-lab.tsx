import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Brand Lab v6 — LMC as hero monogram.
 * Each card flips the hierarchy: LMC dominates, "let me check" is a small label below.
 * 3-letter acronyms make iconic brands (NASA, BMW, IBM, HSBC) — see what hits.
 */

export default function BrandLab() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>BRAND LAB · v6</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text style={styles.subtitle}>6 finalists · B / F / I / J / L / P · LMC white hero</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* B · MISSION CONTROL — LMC white hero, orange rest */}
        <DirectionCard label="B · MISSION CONTROL" desc="Manrope · LMC white · orange accents" accent="#FF6B00">
          <Text style={[styles.heroB, { color: '#fff' }]}>LMC</Text>
          <Text style={[styles.subB, { color: '#FF6B00' }]}>LET.ME.CHECK</Text>
          <View style={[styles.cta, { backgroundColor: '#FF6B00' }]}>
            <Text style={[styles.ctaTextB, { color: '#000' }]}>PAY $15 · STANDARD</Text>
          </View>
          <Text style={styles.statsB}>$15.00 · 7:00 · 142 ACTIVE</Text>
        </DirectionCard>

        {/* F · OPERATOR GREEN — same as B in green */}
        <DirectionCard label="F · OPERATOR GREEN" desc="Manrope · #00FFA3" accent="#00FFA3">
          <Text style={[styles.heroB, { color: '#fff' }]}>LMC</Text>
          <Text style={[styles.subB, { color: '#00FFA3' }]}>LET.ME.CHECK</Text>
          <View style={[styles.cta, { backgroundColor: '#00FFA3' }]}>
            <Text style={[styles.ctaTextB, { color: '#000' }]}>PAY $15 · STANDARD</Text>
          </View>
          <Text style={[styles.statsB, { color: '#00FFA3' }]}>$15.00 · 7:00 · 142 ACTIVE</Text>
        </DirectionCard>

        {/* I · GEOMETRIC ORANGE — Orbitron hero */}
        <DirectionCard label="I · GEOMETRIC ORANGE" desc="Orbitron · #FF6B00" accent="#FF6B00">
          <Text style={[styles.heroI, { color: '#fff' }]}>LMC</Text>
          <Text style={[styles.subI, { color: '#FF6B00' }]}>LET · ME · CHECK</Text>
          <View style={[styles.cta, { backgroundColor: '#FF6B00' }]}>
            <Text style={[styles.ctaTextI, { color: '#000' }]}>PAY $15 · STANDARD</Text>
          </View>
          <Text style={styles.statsI}>$15.00 · 7 min · 142 active</Text>
        </DirectionCard>

        {/* J · GEOMETRIC GREEN */}
        <DirectionCard label="J · GEOMETRIC GREEN" desc="Orbitron · #00FFA3" accent="#00FFA3">
          <Text style={[styles.heroI, { color: '#fff' }]}>LMC</Text>
          <Text style={[styles.subI, { color: '#00FFA3' }]}>LET · ME · CHECK</Text>
          <View style={[styles.cta, { backgroundColor: '#00FFA3' }]}>
            <Text style={[styles.ctaTextI, { color: '#000' }]}>PAY $15 · STANDARD</Text>
          </View>
          <Text style={[styles.statsI, { color: '#00FFA3' }]}>$15.00 · 7 min · 142 active</Text>
        </DirectionCard>

        {/* L · SORA — OpenAI / Anthropic */}
        <DirectionCard label="L · SORA" desc="Sora · #FF6B00 · OpenAI feel" accent="#FF6B00">
          <Text style={[styles.heroL, { color: '#fff' }]}>LMC</Text>
          <Text style={[styles.subL, { color: '#FF6B00' }]}>let me check</Text>
          <View style={[styles.cta, { backgroundColor: '#FF6B00' }]}>
            <Text style={[styles.ctaTextL, { color: '#000' }]}>Pay $15 · Standard</Text>
          </View>
          <Text style={styles.statsL}>$15.00 · 7 min · 142 active</Text>
        </DirectionCard>

        {/* P · SORA GREEN — Sora in acid green */}
        <DirectionCard label="P · SORA GREEN" desc="Sora · #00FFA3" accent="#00FFA3">
          <Text style={[styles.heroL, { color: '#fff' }]}>LMC</Text>
          <Text style={[styles.subL, { color: '#00FFA3' }]}>let me check</Text>
          <View style={[styles.cta, { backgroundColor: '#00FFA3' }]}>
            <Text style={[styles.ctaTextL, { color: '#000' }]}>Pay $15 · Standard</Text>
          </View>
          <Text style={[styles.statsL, { color: '#00FFA3' }]}>$15.00 · 7 min · 142 active</Text>
        </DirectionCard>

        {/* COLOR PALETTE EXPLORER */}
        <View style={styles.paletteSection}>
          <Text style={styles.sectionLabel}>COLOR PALETTE OPTIONS</Text>
          <Text style={styles.sectionSub}>(same mark, different accent)</Text>
          <View style={styles.swatchRow}>
            <ColorSwatch hex="#FF6B00" name="Orange" />
            <ColorSwatch hex="#00FFA3" name="Acid Green" />
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DirectionCard({
  label,
  desc,
  accent,
  children,
}: {
  label: string;
  desc: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardDot, { backgroundColor: accent }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function ColorSwatch({ hex, name }: { hex: string; name: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: hex }]} />
      <Text style={styles.swatchHex}>{hex}</Text>
      <Text style={styles.swatchName}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  back: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#fff' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff', letterSpacing: 3 },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#666',
    letterSpacing: 0.4,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  // Card shell
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 18,
    padding: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#888', letterSpacing: 2.5 },
  cardDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#555', letterSpacing: 0.3, marginTop: 2 },
  cardBody: { alignItems: 'center', paddingVertical: 8 },
  cta: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10, marginTop: 18, marginBottom: 14 },

  // ─── B / F / K · Manrope hero ──────────
  heroB: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 84,
    letterSpacing: 2,
    lineHeight: 88,
  },
  subB: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 6,
  },
  ctaTextB: { fontFamily: 'Manrope_700Bold', fontSize: 12, letterSpacing: 2 },
  statsB: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, color: '#FF6B00', letterSpacing: 0.8 },

  // ─── I / J · Orbitron hero ─────────────
  heroI: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 72,
    letterSpacing: 6,
    lineHeight: 76,
  },
  subI: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 11,
    letterSpacing: 5,
    marginTop: 10,
  },
  ctaTextI: { fontFamily: 'Orbitron_700Bold', fontSize: 11, letterSpacing: 2.5 },
  statsI: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#FF6B00', letterSpacing: 0.8 },

  // ─── L · Sora hero ─────────────────────
  heroL: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 80,
    letterSpacing: -2,
    lineHeight: 84,
  },
  subL: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  ctaTextL: { fontFamily: 'Sora_600SemiBold', fontSize: 13, letterSpacing: 0.3 },
  statsL: { fontFamily: 'Sora_500Medium', fontSize: 12, color: '#FF6B00', letterSpacing: 0.3 },

  // ─── M · SpaceX (Saira Condensed) ──────
  heroM: {
    fontFamily: 'SairaCondensed_900Black',
    fontSize: 96,
    letterSpacing: 4,
    lineHeight: 96,
  },
  subM: {
    fontFamily: 'SairaCondensed_500Medium',
    fontSize: 12,
    letterSpacing: 6,
    marginTop: 4,
  },
  ctaTextM: { fontFamily: 'SairaCondensed_700Bold', fontSize: 13, letterSpacing: 3 },
  statsM: { fontFamily: 'SairaCondensed_500Medium', fontSize: 13, color: '#FF6B00', letterSpacing: 1.5 },

  // ─── N · Supreme Box ───────────────────
  supremeBox: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 22,
    paddingVertical: 6,
    transform: [{ skewX: '-6deg' }],
  },
  supremeHero: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 58,
    color: '#fff',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  supremeSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 4,
    marginTop: 14,
  },
  ctaTextN: { fontFamily: 'Manrope_700Bold', fontSize: 12, letterSpacing: 2 },
  statsN: { fontFamily: 'Manrope_500Medium', fontSize: 12, color: '#888', letterSpacing: 0.4 },

  // ─── O · Off-White ─────────────────────
  heroO: {
    fontFamily: 'HankenGrotesk_800ExtraBold',
    fontSize: 72,
    letterSpacing: 1,
    lineHeight: 76,
  },
  subO: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 8,
  },
  ctaTextO: { fontFamily: 'HankenGrotesk_800ExtraBold', fontSize: 12, letterSpacing: 2.5 },
  statsO: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 12,
    color: '#fff',
    letterSpacing: 2,
    marginTop: 4,
  },
  industrialTagO: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginTop: 12,
  },

  // Palette
  paletteSection: {
    marginTop: 18,
    paddingHorizontal: 6,
    paddingTop: 24,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff', letterSpacing: 3 },
  sectionSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#666', letterSpacing: 0.3, marginTop: 4, marginBottom: 18 },
  swatchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  swatch: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  swatchChip: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 8 },
  swatchHex: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, color: '#fff', letterSpacing: 0.3 },
  swatchName: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#666', letterSpacing: 0.3, marginTop: 2 },
});
