import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Font Preview — same screen content rendered in each of the 3 font finalists.
 * Toggle Manrope / Orbitron / Sora at the top, watch the rest of the screen re-render.
 * Shows: LMC hero, countdown, venue, steps, tier badge, CTA — all typography elements
 * in one place so Troy can decide which font system carries the whole app best.
 */

type FontSystem = 'manrope' | 'orbitron' | 'sora';

const FONT_SYSTEMS: Record<FontSystem, {
  name: string;
  desc: string;
  hero: string;
  heroSize: number;
  heroSpacing: number;
  sub: string;
  subSpacing: number;
  subSize: number;
  subTransform?: 'uppercase' | 'lowercase' | 'none';
  label: string;
  countdown: string;
  countdownSize: number;
  countdownSpacing: number;
  venue: string;
  step: string;
  body: string;
  badge: string;
}> = {
  manrope: {
    name: 'MANROPE',
    desc: 'Engineered · mission control',
    hero: 'Manrope_800ExtraBold',
    heroSize: 100,
    heroSpacing: 2,
    sub: 'JetBrainsMono_700Bold',
    subSize: 11,
    subSpacing: 4,
    subTransform: 'uppercase',
    label: 'JetBrainsMono_700Bold',
    countdown: 'JetBrainsMono_700Bold',
    countdownSize: 80,
    countdownSpacing: 2,
    venue: 'Manrope_600SemiBold',
    step: 'JetBrainsMono_500Medium',
    body: 'Manrope_500Medium',
    badge: 'JetBrainsMono_700Bold',
  },
  orbitron: {
    name: 'ORBITRON',
    desc: 'Sci-fi geometric · brand monogram',
    hero: 'Orbitron_900Black',
    heroSize: 80,
    heroSpacing: 6,
    sub: 'Rajdhani_700Bold',
    subSize: 12,
    subSpacing: 5,
    subTransform: 'uppercase',
    label: 'Rajdhani_700Bold',
    countdown: 'Orbitron_700Bold',
    countdownSize: 72,
    countdownSpacing: 4,
    venue: 'Rajdhani_600SemiBold',
    step: 'Rajdhani_700Bold',
    body: 'Rajdhani_500Medium',
    badge: 'Rajdhani_700Bold',
  },
  sora: {
    name: 'SORA',
    desc: 'OpenAI / Anthropic · soft modern · mono numbers',
    hero: 'Sora_800ExtraBold',
    heroSize: 92,
    heroSpacing: -2,
    sub: 'Sora_500Medium',
    subSize: 13,
    subSpacing: 1,
    subTransform: 'none',
    label: 'Sora_600SemiBold',
    countdown: 'JetBrainsMono_700Bold',
    countdownSize: 80,
    countdownSpacing: 2,
    venue: 'Sora_600SemiBold',
    step: 'Sora_600SemiBold',
    body: 'Sora_500Medium',
    badge: 'Sora_600SemiBold',
  },
};

export default function FontPreview() {
  const router = useRouter();
  const [selected, setSelected] = useState<FontSystem>('manrope');
  const F = FONT_SYSTEMS[selected];

  const subLabel = selected === 'sora' ? 'let me check' : 'LET.ME.CHECK';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>FONT PREVIEW</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Font toggle */}
      <View style={styles.toggleRow}>
        {(['manrope', 'orbitron', 'sora'] as FontSystem[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.toggleBtn, selected === f && styles.toggleBtnActive]}
            onPress={() => setSelected(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, selected === f && styles.toggleLabelActive]}>
              {FONT_SYSTEMS[f].name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fontDesc}>{F.desc}</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero block — LMC monogram + sub */}
        <View style={styles.heroBlock}>
          <Text
            style={[
              styles.hero,
              { fontFamily: F.hero, fontSize: F.heroSize, letterSpacing: F.heroSpacing },
            ]}
          >
            LMC
          </Text>
          <Text
            style={[
              styles.sub,
              {
                fontFamily: F.sub,
                fontSize: F.subSize,
                letterSpacing: F.subSpacing,
                textTransform: F.subTransform,
              },
            ]}
          >
            {subLabel}
          </Text>
        </View>

        {/* Countdown moment — orange */}
        <View style={styles.countdownBlock}>
          <Text style={[styles.etaLabel, { fontFamily: F.label }]}>YOUR CHECK ARRIVES IN</Text>
          <Text
            style={[
              styles.countdown,
              { fontFamily: F.countdown, fontSize: F.countdownSize, letterSpacing: F.countdownSpacing },
            ]}
          >
            07<Text style={styles.countdownColon}>:</Text>34
          </Text>
          <Text style={[styles.venue, { fontFamily: F.venue }]}>Komodo · Miami · 0.5 mi</Text>
        </View>

        {/* Progress steps */}
        <View style={styles.stepsRow}>
          {[
            { label: 'PAID', state: 'done' },
            { label: 'ASSIGNED', state: 'done' },
            { label: 'RECORDING', state: 'active' },
            { label: 'DELIVERED', state: 'pending' },
          ].map((s, i, arr) => (
            <View key={s.label} style={styles.stepWrap}>
              <View
                style={[
                  styles.stepDot,
                  s.state === 'done' && { backgroundColor: '#00FFA3' },
                  s.state === 'active' && { backgroundColor: '#FF6B00' },
                  s.state === 'pending' && { backgroundColor: '#333' },
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  { fontFamily: F.step, color: s.state === 'pending' ? '#555' : '#fff' },
                ]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Tier badges — both Standard & Priority side by side */}
        <View style={styles.tierRow}>
          <View style={styles.tierBadgeStandard}>
            <Text style={[styles.tierBadgeText, { fontFamily: F.badge, color: '#00FFA3' }]}>
              STANDARD · $15
            </Text>
          </View>
          <View style={styles.tierBadgePriority}>
            <Text style={[styles.tierBadgeText, { fontFamily: F.badge, color: '#FF6B00' }]}>
              PRIORITY · $20
            </Text>
          </View>
        </View>

        {/* CTA sample */}
        <View style={styles.ctaSample}>
          <Text style={[styles.ctaText, { fontFamily: F.badge }]}>PAY $15 · STANDARD</Text>
        </View>

        {/* Body text sample */}
        <Text style={[styles.bodySample, { fontFamily: F.body }]}>
          Scout is 0.5 mi away and arriving in about 7 minutes. You'll get a 15-second clip the moment they finish recording.
        </Text>

        {/* Numbers sample */}
        <View style={styles.numbersRow}>
          <View style={styles.numberItem}>
            <Text style={[styles.numberValue, { fontFamily: F.countdown }]}>$15</Text>
            <Text style={[styles.numberLabel, { fontFamily: F.body }]}>standard</Text>
          </View>
          <View style={styles.numberDivider} />
          <View style={styles.numberItem}>
            <Text style={[styles.numberValue, { fontFamily: F.countdown }]}>142</Text>
            <Text style={[styles.numberLabel, { fontFamily: F.body }]}>scouts</Text>
          </View>
          <View style={styles.numberDivider} />
          <View style={styles.numberItem}>
            <Text style={[styles.numberValue, { fontFamily: F.countdown }]}>7:34</Text>
            <Text style={[styles.numberLabel, { fontFamily: F.body }]}>ETA</Text>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  back: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#fff' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff', letterSpacing: 3 },

  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  toggleLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#888',
    letterSpacing: 2,
  },
  toggleLabelActive: { color: '#000' },

  fontDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    letterSpacing: 0.3,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    textAlign: 'center',
  },

  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  // Hero block
  heroBlock: {
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginBottom: 22,
  },
  hero: { color: '#fff' },
  sub: { color: '#FF6B00', marginTop: 6 },

  // Countdown block
  countdownBlock: {
    alignItems: 'center',
    marginBottom: 26,
  },
  etaLabel: {
    fontSize: 10,
    color: '#FF6B00',
    letterSpacing: 3,
    marginBottom: 8,
  },
  countdown: {
    color: '#FF6B00',
    lineHeight: 84,
  },
  countdownColon: { color: 'rgba(255,107,0,0.4)' },
  venue: {
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.3,
    marginTop: 8,
  },

  // Steps
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 28,
  },
  stepWrap: { alignItems: 'center', width: 60 },
  stepDot: { width: 18, height: 18, borderRadius: 9, marginBottom: 6 },
  stepLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
  },

  // Tier row
  tierRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  tierBadgeStandard: {
    flex: 1,
    backgroundColor: 'rgba(0,255,163,0.1)',
    borderWidth: 1,
    borderColor: '#00FFA3',
    borderRadius: 100,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tierBadgePriority: {
    flex: 1,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderRadius: 100,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tierBadgeText: { fontSize: 11, letterSpacing: 1.5 },

  // CTA
  ctaSample: {
    backgroundColor: '#00FFA3',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 22,
  },
  ctaText: {
    fontSize: 13,
    color: '#000',
    letterSpacing: 2,
  },

  // Body
  bodySample: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
    letterSpacing: 0.2,
    marginBottom: 24,
  },

  // Numbers row
  numbersRow: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  numberItem: { flex: 1, alignItems: 'center' },
  numberValue: {
    fontSize: 22,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  numberLabel: {
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  numberDivider: { width: 1, backgroundColor: '#1a1a1a' },
});
