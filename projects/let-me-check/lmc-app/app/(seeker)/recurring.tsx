import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRecurring, type RecurringFreq } from '../state/recurring';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

function freqLabel(freq: RecurringFreq): string {
  return freq === 'daily' ? 'Every day' : freq === 'weekly' ? 'Every week' : 'Every month';
}

export default function RecurringScreen() {
  const router = useRouter();
  const { list, toggle, remove } = useRecurring();

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Recurring Checks</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push({ pathname: '/(seeker)/search', params: { mode: 'recurring' } })}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={colors.red} />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Schedule a Scout to check a place automatically. Cancel anytime.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={36} color={colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No recurring checks yet</Text>
              <Text style={styles.emptySub}>
                Schedule a Scout to check a place on repeat, like your gym on Monday mornings or JFK before every flight.
              </Text>
              <TouchableOpacity
                style={[styles.cta, ctaGlowShadow]}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(seeker)/search', params: { mode: 'recurring' } })}
              >
                <CtaGlow radius={12} />
                <Ionicons name="add" size={16} color={colors.onRed} />
                <Text style={styles.ctaText}>NEW RECURRING CHECK</Text>
              </TouchableOpacity>
            </View>
          ) : (
            list.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={[styles.cardIconWrap, !r.active && styles.cardIconWrapInactive]}>
                  <Ionicons
                    name="repeat"
                    size={18}
                    color={r.active ? colors.red : colors.textTertiary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{r.venueName}</Text>
                  {r.address ? <Text style={styles.cardSub}>{r.address}</Text> : null}
                  <Text style={styles.cardSchedule}>
                    {freqLabel(r.freq)} · {r.time}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Switch
                    value={r.active}
                    onValueChange={() => toggle(r.id)}
                    trackColor={{ false: colors.border, true: colors.red }}
                    thumbColor={colors.bg}
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => remove(r.id)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 22,
    paddingTop: 14,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 32 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 30,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 50,
    justifyContent: 'flex-end',
  },
  newBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.red,
    letterSpacing: 0.2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 12,
    letterSpacing: 2,
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
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconWrapInactive: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  },
  cardBody: { flex: 1 },
  cardName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  cardSchedule: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
