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

function freqLabel(freq: RecurringFreq): string {
  return freq === 'daily' ? 'Every day' : freq === 'weekly' ? 'Every week' : 'Every month';
}

export default function RecurringScreen() {
  const router = useRouter();
  const { list, toggle, remove } = useRecurring();

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Recurring Checks</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.subtitle}>
          Schedule a Scout to check a place automatically. Cancel anytime.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={36} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={styles.emptyTitle}>No recurring checks yet</Text>
              <Text style={styles.emptySub}>
                Drop a pin → toggle &ldquo;Make this recurring&rdquo; on the payment screen to schedule one.
              </Text>
              <TouchableOpacity
                style={styles.cta}
                activeOpacity={0.85}
                onPress={() => router.replace('/(seeker)/home')}
              >
                <Text style={styles.ctaText}>BACK TO MAP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            list.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardIconWrap}>
                  <Ionicons
                    name="repeat"
                    size={18}
                    color={r.active ? '#00FF7F' : 'rgba(255,255,255,0.4)'}
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
                    trackColor={{ false: '#1e1e1e', true: '#00FF7F' }}
                    thumbColor="#ffffff"
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => remove(r.id)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color="rgba(255,255,255,0.55)" />
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
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
    width: 50,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 22,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 32 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 30,
  },
  cta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 12,
    letterSpacing: 2,
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
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,255,127,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  cardSchedule: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: '#00FF7F',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
