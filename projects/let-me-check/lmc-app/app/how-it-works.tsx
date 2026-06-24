import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useVideoPlayer, VideoView } from 'expo-video';
// TEMP: color audition — remove after color is chosen
import { useDevBg } from './state/dev-bg';
import DevBgPill from './components/DevBgPill';

const CHROME_STOPS: [string, string, ...string[]] = [
  '#a8a8a8', '#ffffff', '#ffffff', '#f2f2f2', '#8c8c8c', '#363636', '#161616',
];
const CHROME_LOCATIONS: [number, number, ...number[]] = [0, 0.22, 0.5, 0.58, 0.68, 0.88, 1];
const WORD_SIZE = 30;
const WORD_MASK_W = 300;
const WORD_MASK_H = WORD_SIZE * 1.35;

// Netflix-style concept landing (between the splash and the role picker).
// ONE combined 10–15s clip showing both the Seeker and Scout experience, playing
// in a framed window up top with LMC branding overlaid. A single CTA — "Choose
// the profile you want to be" — flows into the existing Choose Your Path workflow.
//
// VIDEO TO BE SOURCED: the frame is a placeholder for now. When the clip is ready,
// replace the block marked "VIDEO PLACEHOLDER" with an expo-video <VideoView>
// (expo-video ~3.0.16 is already installed). Frame proportions to match Troy's ref.

export default function HowItWorksScreen() {
  const router = useRouter();
  // TEMP: color audition — remove after color is chosen
  const devBg = useDevBg();

  // Placeholder combined trailer — autoplays, loops, muted (Netflix-hero style).
  const player = useVideoPlayer(require('../assets/concept-demo.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
  });

  const [isPlaying, setIsPlaying] = useState(false);

  // Play once the clip reports ready (play() in the setup runs too early to stick).
  useEffect(() => {
    player.play();
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
    });
    const playSub = player.addListener('playingChange', ({ isPlaying: playing }) => {
      setIsPlaying(playing);
    });
    return () => {
      statusSub.remove();
      playSub.remove();
    };
  }, [player]);

  // Derive ink color from the audition background: black on white, white on red/blue.
  const ink = devBg.isLight ? '#000000' : '#ffffff';
  const inkMuted = devBg.isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
  const inkFaint = devBg.isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';

  return (
    <View style={[styles.bg, { backgroundColor: devBg.hex }]}>
      <StatusBar barStyle={devBg.isLight ? 'dark-content' : 'light-content'} />

      {/* Back to splash */}
      <SafeAreaView style={styles.backHeader} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={ink} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Combined trailer (placeholder clip) fills this frame */}
      <View style={styles.videoFrame}>
        <VideoView
          style={StyleSheet.absoluteFillObject}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Tap to play/pause — also the autoplay fallback (sim sometimes won't auto-start) */}
        <TouchableOpacity
          style={styles.videoTapLayer}
          activeOpacity={1}
          onPress={() => (player.playing ? player.pause() : player.play())}
        >
          {!isPlaying && (
            <View style={styles.playWrap}>
              <Ionicons name="play" size={30} color="#000" style={{ marginLeft: 3 }} />
            </View>
          )}
        </TouchableOpacity>

        {/* Bottom fade — blends video into the CTA block; adapts to audition bg */}
        <LinearGradient
          colors={
            devBg.isLight
              ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.95)']
              : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.95)']
          }
          locations={[0, 0.6, 1]}
          style={styles.frameFade}
        />
      </View>

      {/* TEMP: color audition — remove after color is chosen */}
      <DevBgPill />

      {/* Choose-your-profile CTA */}
      <SafeAreaView style={styles.bottom}>
        <MaskedView
          style={styles.brandMaskWrap}
          maskElement={
            <View style={styles.brandMaskCenter}>
              <Text
                style={styles.brandWord}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                LET ME CHECK
              </Text>
            </View>
          }
        >
          <LinearGradient
            colors={CHROME_STOPS}
            locations={CHROME_LOCATIONS}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </MaskedView>
        <Text style={[styles.brandTag, { color: inkMuted }]}>Know Before You Go</Text>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            devBg.isLight
              ? { backgroundColor: '#000000', borderRadius: 14 }
              : { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
          ]}
          onPress={() => router.push('/onboarding/role')}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { color: devBg.isLight ? '#ffffff' : '#ffffff' }]}>
            Choose your profile
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInRow}
          onPress={() => router.push('/auth/sign-in')}
          activeOpacity={0.7}
        >
          <Text style={[styles.signInText, { color: inkMuted }]}>
            Already have an account?{' '}
            <Text style={[styles.signInBold, { color: devBg.isLight ? '#007AFF' : '#00FF7F' }]}>
              Sign in
            </Text>
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000000' },

  backHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 5,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Combined-trailer frame — fills the top, branding overlaid at its base
  videoFrame: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoTapLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoComing: {
    position: 'absolute',
    top: 70,
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.8,
  },
  frameFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  brandOverlay: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandMaskWrap: {
    width: WORD_MASK_W,
    height: WORD_MASK_H,
    alignSelf: 'center',
    marginBottom: 8,
  },
  brandMaskCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  brandWord: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: WORD_SIZE,
    color: '#000000',
    letterSpacing: 1,
    textAlign: 'center',
  },
  brandTag: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 14,
  },

  // Bottom CTA block
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 34,
    // TEMP: backgroundColor driven by devBg on the parent — remove hardcode with audition tool
    backgroundColor: 'transparent',
  },
  chooseEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  signInRow: { alignItems: 'center', paddingVertical: 8 },
  signInText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  signInBold: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
  },
});
