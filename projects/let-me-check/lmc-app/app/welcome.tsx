import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

const LMC_SIZE = 60;
const LMC_MASK_W = 332;
const LMC_MASK_H = LMC_SIZE * 1.3;

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

export default function WelcomeScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slideUp]);

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.topBlock, { opacity: fade }]}>
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
                colors={CHROME_STOPS}
                locations={CHROME_LOCATIONS}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          </MaskedView>

          <Text style={styles.tagline}>KNOW BEFORE YOU GO</Text>

          <Text style={styles.welcomeSub}>
            15-second video checks. Any location. In minutes.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomBlock,
            { opacity: fade, transform: [{ translateY: slideUp }] },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/onboarding/role')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>GET STARTED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInRow}
            onPress={() => router.push('/auth/sign-in')}
            activeOpacity={0.6}
          >
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.proofRow}>
            <View style={styles.proofDot} />
            <Text style={styles.proofText}>Miami + NYC · 142 Scouts on the ground</Text>
          </View>

          <Text style={styles.legal}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink}>Terms</Text> and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>
        </Animated.View>
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
    justifyContent: 'space-between',
  },
  topBlock: {
    alignItems: 'center',
    paddingTop: 60,
  },
  maskWrap: {
    width: LMC_MASK_W,
    height: LMC_MASK_H,
  },
  maskCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  lmcMask: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: LMC_SIZE,
    letterSpacing: 1,
    textAlign: 'center',
    color: '#000',
    backgroundColor: 'transparent',
  },
  gradientWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  wordmark: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    letterSpacing: 6,
    marginTop: 14,
  },
  tagline: {
    fontFamily: 'Inter_300Light',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 18,
  },
  bottomBlock: {
    paddingBottom: 24,
  },
  welcomeSub: {
    fontFamily: 'Inter_300Light',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 28,
    letterSpacing: 0.3,
  },
  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 3,
  },
  signInRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  signInText: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  signInBold: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 4,
  },
  proofDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF7F',
  },
  proofText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  legal: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 18,
    paddingHorizontal: 8,
  },
  legalLink: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.6)',
  },
});
