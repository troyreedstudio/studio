import React, { useEffect, useRef } from 'react';
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
import { addRecent } from '../state/recents';

export default function ConfirmedScreen() {
  const router = useRouter();
  const {
    venue = 'Komodo',
    city = 'Miami',
    tier = 'standard',
    time = '10 min',
    total = '$16.50',
    scout = 'Your Scout',
  } = useLocalSearchParams<{
    venue: string;
    city: string;
    tier: string;
    time: string;
    total: string;
    scout: string;
  }>();

  const isPriority = tier === 'priority';

  // A confirmed check is a real check — record it so it surfaces in "RECENT" on home.
  useEffect(() => {
    addRecent({ name: venue, city });
  }, [venue, city]);

  const checkScale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.7)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(checkScale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 2.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backFab}
          onPress={() => router.replace('/(seeker)/home')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.92)" />
        </TouchableOpacity>
        <View style={styles.center}>
          <View style={styles.checkWrap}>
            <Animated.View
              style={[
                styles.ring,
                { opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            />
            <Animated.View
              style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}
            >
              <Text style={styles.checkGlyph}>✓</Text>
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
            <Text style={styles.eyebrow}>SCOUT MATCHED</Text>
            <Text style={styles.title}>Your check is on the way.</Text>
            <Text style={styles.subtitle}>
              {scout} accepted your check near {venue}. Your clip will be with you within {time}.
            </Text>

            {/* Receipt */}
            <View style={styles.receipt}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Venue</Text>
                <Text style={styles.receiptValue} numberOfLines={1}>
                  {venue}
                </Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>City</Text>
                <Text style={styles.receiptValue}>{city}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Tier</Text>
                <View
                  style={[
                    styles.tierPill,
                    isPriority && styles.tierPillPriority,
                  ]}
                >
                  <Text
                    style={[
                      styles.tierPillText,
                      isPriority && styles.tierPillTextPriority,
                    ]}
                  >
                    {isPriority ? 'PRIORITY' : 'STANDARD'}
                  </Text>
                </View>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Total charged</Text>
                <Text style={styles.receiptTotal}>{total}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment</Text>
                <Text style={styles.receiptValue}>Visa •••• 4242</Text>
              </View>
            </View>

            <Text style={styles.foot}>
              Receipt sent to your email. Full refund if your Scout misses the delivery window.
            </Text>
          </Animated.View>
        </View>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={() =>
              router.replace({
                pathname: '/(seeker)/waiting',
                params: { venue, city, tier, time },
              })
            }
          >
            <Text style={styles.ctaText}>TRACK MY CHECK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const INDIGO = 'rgba(20,55,130,0.5)';

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1, paddingHorizontal: 22 },
  backFab: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 5,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  checkWrap: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#00FF7F',
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#00FF7F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FF7F',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  checkGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 44,
    color: '#000000',
    marginTop: 2,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#00FF7F',
    letterSpacing: 2.4,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.2,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  receipt: {
    width: '100%',
    backgroundColor: INDIGO,
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  receiptLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  receiptValue: {
    flexShrink: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  receiptTotal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tierPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tierPillPriority: { backgroundColor: 'rgba(255,107,0,0.15)' },
  tierPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 1.4,
  },
  tierPillTextPriority: { color: '#FF6B00' },
  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  ctaWrap: { paddingBottom: 16 },
  cta: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 3,
  },
});
