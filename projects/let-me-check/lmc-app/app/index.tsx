import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Easing } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';

const bootChime = require('../assets/sounds/boot-deep.wav');

const SIZE = 60;
const MASK_WIDTH = 320;
const MASK_HEIGHT = SIZE * 1.3;
const SHINE_WIDTH = 120;

const LIQUID_CHROME_STOPS: [string, string, ...string[]] = [
  '#a8a8a8',
  '#ffffff',
  '#ffffff',
  '#f2f2f2',
  '#8c8c8c',
  '#363636',
  '#161616',
];

const LIQUID_CHROME_LOCATIONS: [number, number, ...number[]] = [0, 0.22, 0.5, 0.58, 0.68, 0.88, 1];

export default function BootSplash() {
  const shineX = useRef(new Animated.Value(-SHINE_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1.15)).current;
  const breath = useRef(new Animated.Value(1)).current;
  const player = useAudioPlayer(bootChime);
  const router = useRouter();

  useEffect(() => {
    scale.setValue(1.15);
    overlayOpacity.setValue(1);
    breath.setValue(1);
    shineX.setValue(-SHINE_WIDTH);

    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      // sound not ready, skip
    }

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1.02,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    breathLoop.start();

    const sweep = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(shineX, {
          toValue: MASK_WIDTH + SHINE_WIDTH,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shineX, {
          toValue: -SHINE_WIDTH,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    sweep.start();

    const advanceTimer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        router.replace('/how-it-works');
      });
    }, 3800);

    return () => {
      sweep.stop();
      breathLoop.stop();
      clearTimeout(advanceTimer);
    };
  }, [shineX, overlayOpacity, scale, breath, router]);

  const composedScale = Animated.multiply(scale, breath);

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.heroGroup, { transform: [{ scale: composedScale }] }]}>
        <MaskedView
          style={styles.maskWrap}
          maskElement={
            <View style={styles.maskCenter}>
              <Text
                style={styles.lmcMask}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.4}
              >
                LET ME CHECK
              </Text>
            </View>
          }
        >
          <View style={styles.gradientWrap}>
            <LinearGradient
              colors={LIQUID_CHROME_STOPS}
              locations={LIQUID_CHROME_LOCATIONS}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View
              style={[
                styles.shine,
                { transform: [{ translateX: shineX }, { skewX: '-22deg' }] },
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,0)',
                ]}
                locations={[0, 0.42, 0.58, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
        </MaskedView>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.overlay, { opacity: overlayOpacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGroup: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    letterSpacing: 6,
    marginTop: 6,
  },
  maskWrap: {
    width: MASK_WIDTH,
    height: MASK_HEIGHT,
  },
  maskCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  lmcMask: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: SIZE,
    letterSpacing: 1,
    textAlign: 'center',
    color: '#000',
    backgroundColor: 'transparent',
  },
  gradientWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: SHINE_WIDTH,
  },
  overlay: {
    backgroundColor: '#000000',
  },
});
