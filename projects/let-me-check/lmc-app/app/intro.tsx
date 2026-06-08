import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

const ICON_SIZE = 120;
const ICON_MASK_BOX = 160;

const CHROME_STOPS: [string, string, ...string[]] = [
  '#a8a8a8',
  '#ffffff',
  '#ffffff',
  '#f2f2f2',
  '#8c8c8c',
  '#363636',
  '#161616',
];
const CHROME_LOCATIONS: [number, number, ...number[]] = [0, 0.22, 0.5, 0.58, 0.68, 0.88, 1];

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'eye-outline',
    title: 'REAL EYES',
    sub: 'Visual verification on demand.',
  },
  {
    icon: 'time-outline',
    title: 'RIGHT NOW',
    sub: 'Delivered in 7–10 minutes.',
  },
  {
    icon: 'location-outline',
    title: 'ANYWHERE',
    sub: 'DMVs. Airports. Restaurants. Wherever.',
  },
];

export default function IntroCarousel() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const breath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(20);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [index, fade, slide]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1.06, duration: 2400, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const goNext = () => {
    if (index === SLIDES.length - 1) {
      router.replace('/auth/sign-up');
    } else {
      setIndex(index + 1);
    }
  };

  const skip = () => router.replace('/auth/sign-up');

  const current = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.devLink}>‹ Flow Map</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={skip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.iconWrap,
              { opacity: fade, transform: [{ translateY: slide }, { scale: breath }] },
            ]}
          >
            <MaskedView
              style={styles.iconMask}
              maskElement={
                <View style={styles.iconCenter}>
                  <Ionicons name={current.icon} size={ICON_SIZE} color="#000" />
                </View>
              }
            >
              <View style={styles.iconGradientWrap}>
                <LinearGradient
                  colors={CHROME_STOPS}
                  locations={CHROME_LOCATIONS}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            </MaskedView>
          </Animated.View>

          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.sub}>{current.sub}</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => {
              const active = i === index;
              return (
                <View
                  key={i}
                  style={[styles.dot, active && styles.dotActive]}
                />
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isLast ? 'GET STARTED' : 'CONTINUE'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  devLink: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: ICON_MASK_BOX,
    height: ICON_MASK_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 56,
  },
  iconMask: {
    width: ICON_MASK_BOX,
    height: ICON_MASK_BOX,
  },
  iconCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconGradientWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 14,
  },
  sub: {
    fontFamily: 'Inter_300Light',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  footer: {
    paddingBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#00FF7F',
  },
  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 3,
  },
});
