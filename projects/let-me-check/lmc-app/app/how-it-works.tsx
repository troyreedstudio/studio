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
import { colors } from './lib/theme';
import { BackButton } from './components/BackButton';

const CHROME_STOPS: [string, string, ...string[]] = [
  '#a8a8a8', '#ffffff', '#ffffff', '#f2f2f2', '#8c8c8c', '#363636', '#161616',
];
const CHROME_LOCATIONS: [number, number, ...number[]] = [0, 0.22, 0.5, 0.58, 0.68, 0.88, 1];
const WORD_SIZE = 30;
const WORD_MASK_W = 300;
const WORD_MASK_H = WORD_SIZE * 1.35;

// LOCKED: this screen is the RED brand moment. bg = #DA251D, all ink = white.
const BG = colors.red;
const INK = colors.onRed;
const INK_MUTED = 'rgba(255,255,255,0.65)';

// Netflix-style concept landing (between the splash and the role picker).
// ONE combined 10-15s clip showing both the Seeker and Scout experience, playing
// in a framed window up top with LMC branding overlaid. A single CTA flows into
// the Choose Your Path workflow.
//
// VIDEO TO BE SOURCED: the frame is a placeholder for now. When the clip is ready,
// replace the block marked "VIDEO PLACEHOLDER" with an expo-video <VideoView>
// (expo-video ~3.0.16 is already installed). Frame proportions to match Troy's ref.

export default function HowItWorksScreen() {
  const router = useRouter();

  // Placeholder combined trailer — autoplays, loops, muted (Netflix-hero style).
  const player = useVideoPlayer(require('../assets/concept-demo.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Start true: the clip muted-autoplays, so assume playing — this avoids the
  // play button flashing on screen during the splash → video-page transition.
  // The playingChange listener below corrects it to false only on a real pause.
  const [isPlaying, setIsPlaying] = useState(true);

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

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />

      {/* Back to splash */}
      <SafeAreaView style={styles.backHeader} pointerEvents="box-none">
        <BackButton fallback="/" style={styles.backBtn} />
      </SafeAreaView>

      {/* Combined trailer (placeholder clip) fills this frame */}
      <View style={styles.videoFrame}>
        <VideoView
          style={StyleSheet.absoluteFillObject}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Tap to play/pause — also the autoplay fallback */}
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

        {/* Bottom fade — blends video into the red CTA block */}
        <LinearGradient
          colors={['rgba(218,37,29,0)', 'rgba(218,37,29,0.55)', 'rgba(218,37,29,0.98)']}
          locations={[0, 0.6, 1]}
          style={styles.frameFade}
        />
      </View>

      {/* Choose-your-profile CTA */}
      <SafeAreaView style={styles.bottom}>
        <Text style={[styles.brandTag, { color: INK }]}>Know Before You Go</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/onboarding/role')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Choose your profile</Text>
          <Ionicons name="arrow-forward" size={16} color={INK} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInRow}
          onPress={() => router.push('/auth/sign-in')}
          activeOpacity={0.7}
        >
          <Text style={styles.signInText}>
            Already have an account?{' '}
            <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: BG },

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
  frameFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
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
    fontFamily: 'Orbitron_700Bold',
    fontSize: 18,
    letterSpacing: 1.5,
    lineHeight: 26,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 18,
  },

  // Bottom CTA block — transparent over the red bg
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 34,
    backgroundColor: 'transparent',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    marginBottom: 8,
    marginHorizontal: 26, // narrower, not edge-to-edge
    backgroundColor: 'rgba(255,255,255,0.08)', // more transparent inside
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: INK,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  signInRow: { alignItems: 'center', paddingVertical: 8 },
  signInText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: INK_MUTED,
    letterSpacing: 0.2,
  },
  signInBold: {
    fontFamily: 'Inter_700Bold',
    color: INK,
  },
});
