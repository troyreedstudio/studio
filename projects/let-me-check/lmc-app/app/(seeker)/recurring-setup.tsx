import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addRecurring, type RecurringFreq } from '../state/recurring';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

const FREQS: { key: RecurringFreq; label: string; sub: string }[] = [
  { key: 'daily', label: 'Daily', sub: 'Every day' },
  { key: 'weekly', label: 'Weekly', sub: 'Every week' },
  { key: 'monthly', label: 'Monthly', sub: 'Every month' },
];

const TIME_PRESETS = ['07:00', '09:00', '12:00', '18:00', '21:00', '23:00'];

export default function RecurringSetupScreen() {
  const router = useRouter();
  const {
    pinName = 'This place',
    pinAddress = '',
    pinLat = '25.7617',
    pinLon = '-80.1918',
    marketId = 'mia',
  } = useLocalSearchParams<{
    pinName?: string;
    pinAddress?: string;
    pinLat?: string;
    pinLon?: string;
    marketId?: string;
  }>();

  const [freq, setFreq] = useState<RecurringFreq>('weekly');
  const [time, setTime] = useState('09:00');

  const schedule = () => {
    addRecurring({
      id: `${pinName}-${Date.now()}`,
      venueName: String(pinName),
      address: pinAddress ? String(pinAddress) : undefined,
      freq,
      time,
      marketId: String(marketId),
      coord: [Number(pinLon), Number(pinLat)],
    });
    router.replace('/(seeker)/recurring');
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Schedule a Check</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Chosen place */}
          <Text style={styles.sectionLabel}>PLACE</Text>
          <View style={styles.placeCard}>
            <View style={styles.placeIconWrap}>
              <Ionicons name="location" size={18} color={colors.red} />
            </View>
            <View style={styles.placeBody}>
              <Text style={styles.placeName} numberOfLines={1}>{pinName}</Text>
              {pinAddress ? (
                <Text style={styles.placeAddr} numberOfLines={1}>{pinAddress}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() =>
                router.replace({ pathname: '/(seeker)/search', params: { mode: 'recurring' } })
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Frequency */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>HOW OFTEN</Text>
          <View style={styles.freqRow}>
            {FREQS.map((f) => {
              const active = freq === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.freqChip, active && styles.freqChipActive]}
                  onPress={() => setFreq(f.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.freqLabel, active && styles.freqLabelActive]}>
                    {f.label}
                  </Text>
                  <Text style={[styles.freqSub, active && styles.freqSubActive]}>
                    {f.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>WHAT TIME</Text>
          <View style={styles.timeWrap}>
            {TIME_PRESETS.map((t) => {
              const active = time === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                  onPress={() => setTime(t)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.timeText, active && styles.timeTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Billing note — charge happens at each run, never upfront */}
          <View style={styles.billNote}>
            <Ionicons name="card-outline" size={15} color={colors.red} />
            <Text style={styles.billNoteText}>
              Your card on file is charged each time a check runs, not now. Cancel or pause anytime.
            </Text>
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity style={[styles.cta, ctaGlowShadow]} activeOpacity={0.85} onPress={schedule}>
            <CtaGlow radius={14} />
            <Ionicons name="repeat" size={16} color={colors.onRed} />
            <Text style={styles.ctaText}>SCHEDULE THIS CHECK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
    width: 50,
  },
  title: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 16 },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sectionGap: { marginTop: 26 },

  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  placeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeBody: { flex: 1 },
  placeName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  placeAddr: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  changeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.red,
    letterSpacing: 0.3,
  },

  freqRow: { flexDirection: 'row', gap: 10 },
  freqChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  freqChipActive: {
    backgroundColor: 'rgba(218,37,29,0.06)',
    borderColor: colors.red,
  },
  freqLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  freqLabelActive: { color: colors.red },
  freqSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  freqSubActive: { color: 'rgba(218,37,29,0.7)' },

  timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  timeChipActive: {
    backgroundColor: 'rgba(218,37,29,0.06)',
    borderColor: colors.red,
  },
  timeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  timeTextActive: { color: colors.red },

  billNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: 'rgba(218,37,29,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.18)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 28,
  },
  billNoteText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    letterSpacing: 0.1,
  },

  ctaWrap: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 17,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 2.5,
  },
});
