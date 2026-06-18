import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// MATCHING / DISPATCH PHASE — the "finding a Scout" wait.
// This time is INCIDENTAL (Uber-style): it is NOT counted against the delivery
// SLA. The 10-minute delivery clock only starts once a Scout ACCEPTS (on the
// waiting screen). If no Scout accepts in time, we bail to the no-scouts refund
// so the Seeker can make a Plan B instead of waiting in no-man's-land.

const MATCH_MS = 5500; // prototype: Scout accepts after ~5.5s of searching
const REVEAL_MS = 1400; // hold the "accepted" reveal before the clock starts

const MATCHED_SCOUT = { name: 'Jake C.', rating: '4.9', clips: '247' };

const STATUSES = [
  'Pinging Scouts inside the venue',
  '3 Scouts nearby',
  'Jake is reviewing the job',
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function FindingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    venue?: string;
    city?: string;
    tier?: string;
    time?: string;
    total?: string;
  }>();
  const venue = params.venue || 'this venue';

  const [elapsed, setElapsed] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [matched, setMatched] = useState(false);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const matchFade = useRef(new Animated.Value(0)).current;

  // Pulsing radar rings
  useEffect(() => {
    const mkPulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const a = mkPulse(ring1, 0);
    const b = mkPulse(ring2, 1100);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [ring1, ring2]);

  // Incidental elapsed timer
  useEffect(() => {
    if (matched) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [matched]);

  // Cycle the status lines
  useEffect(() => {
    if (matched) return;
    const t = setInterval(() => {
      setStatusIdx((i) => Math.min(STATUSES.length - 1, i + 1));
    }, MATCH_MS / STATUSES.length);
    return () => clearInterval(t);
  }, [matched]);

  // Match, reveal, then start the delivery clock on the waiting screen
  useEffect(() => {
    const matchT = setTimeout(() => {
      setMatched(true);
      Animated.timing(matchFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, MATCH_MS);
    return () => clearTimeout(matchT);
  }, [matchFade]);

  useEffect(() => {
    if (!matched) return;
    const goT = setTimeout(() => {
      router.replace({ pathname: '/(seeker)/confirmed', params: { ...params, scout: MATCHED_SCOUT.name } });
    }, REVEAL_MS);
    return () => clearTimeout(goT);
  }, [matched, params, router]);

  const ringStyle = (val: Animated.Value) => ({
    opacity: val.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] }) }],
  });

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* Cancel is free here — no Scout has committed yet */}
        <View style={styles.header}>
          {!matched ? (
            <TouchableOpacity
              onPress={() => router.replace('/(seeker)/home')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        <View style={styles.center}>
          {/* Radar */}
          <View style={styles.radarWrap}>
            <Animated.View style={[styles.ring, ringStyle(ring1)]} />
            <Animated.View style={[styles.ring, ringStyle(ring2)]} />
            <View style={styles.core}>
              <Ionicons
                name={matched ? 'checkmark' : 'navigate'}
                size={30}
                color="#000"
              />
            </View>
          </View>

          {!matched ? (
            <>
              <Text style={styles.title}>Finding a Scout near {venue}</Text>
              <Text style={styles.status}>{STATUSES[statusIdx]}…</Text>

              <View style={styles.timerPill}>
                <Text style={styles.timerText}>Searching · {pad(Math.floor(elapsed / 60))}:{pad(elapsed % 60)}</Text>
              </View>
              <Text style={styles.incidental}>
                You haven’t been charged yet. The charge and your 10-minute clock both start the moment a Scout accepts.
              </Text>
            </>
          ) : (
            <Animated.View style={{ opacity: matchFade, alignItems: 'center' }}>
              <Text style={styles.matchedEyebrow}>SCOUT FOUND</Text>
              <Text style={styles.matchedName}>{MATCHED_SCOUT.name} accepted</Text>
              <View style={styles.matchedMeta}>
                <Ionicons name="star" size={12} color="#FFCB47" />
                <Text style={styles.matchedMetaText}>
                  {MATCHED_SCOUT.rating} · {MATCHED_SCOUT.clips} clips · on-site
                </Text>
              </View>
              <Text style={styles.matchedNote}>Payment confirmed. Starting your clock…</Text>
            </Animated.View>
          )}
        </View>

        {/* Plan-B path: if no Scout takes the job, the Seeker isn't stuck */}
        {!matched && (
          <TouchableOpacity
            style={styles.noScoutLink}
            onPress={() => router.replace({ pathname: '/(seeker)/error', params: { type: 'no-scouts' } })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Text style={styles.noScoutText}>Simulate: no Scouts available</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1, paddingHorizontal: 26 },
  header: {
    height: 40,
    justifyContent: 'center',
    paddingTop: 8,
  },
  cancelText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -30 },

  radarWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00FF7F',
  },
  core: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00FF7F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF7F',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 21,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  status: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
    marginBottom: 22,
  },
  timerPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  timerText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  incidental: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
    paddingHorizontal: 18,
  },

  matchedEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#00FF7F',
    letterSpacing: 2.4,
    marginBottom: 10,
  },
  matchedName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  matchedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  matchedMetaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  matchedNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },

  noScoutLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noScoutText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
  },
});
