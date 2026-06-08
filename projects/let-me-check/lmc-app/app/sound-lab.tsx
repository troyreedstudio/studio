import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';

const SOUNDS = [
  {
    key: 'warm',
    number: '1',
    name: 'WARM',
    tagline: 'Mercedes EQS · welcoming swell',
    description: 'Detuned warm pad with sub-bass. Slow filter sweep opens up from dark to bright.',
    src: require('../assets/sounds/boot-ambient.wav'),
  },
  {
    key: 'bright',
    number: '2',
    name: 'BRIGHT',
    tagline: 'Apple · crystalline shimmer',
    description: 'Bell-like cascade of high notes entering one by one. Sparkles, then sustains.',
    src: require('../assets/sounds/boot-bright.wav'),
  },
  {
    key: 'deep',
    number: '3',
    name: 'DEEP',
    tagline: 'Cinematic · powerful arrival',
    description: 'Deep Maj7 voicing with sub bass, slow swell, pitch glide. Most dramatic of the three.',
    src: require('../assets/sounds/boot-deep.wav'),
  },
] as const;

export default function SoundLab() {
  const router = useRouter();
  const warm = useAudioPlayer(SOUNDS[0].src);
  const bright = useAudioPlayer(SOUNDS[1].src);
  const deep = useAudioPlayer(SOUNDS[2].src);
  const players = { warm, bright, deep };
  const [playing, setPlaying] = useState<string | null>(null);

  const playSound = (key: 'warm' | 'bright' | 'deep') => {
    Object.values(players).forEach((p) => {
      try { p.pause(); } catch {}
    });
    const p = players[key];
    try {
      p.seekTo(0);
      p.play();
      setPlaying(key);
      setTimeout(() => setPlaying((current) => (current === key ? null : current)), 3200);
    } catch (e) {
      // ignore
    }
  };

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.6}>
            <Text style={styles.back}>‹ back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>SOUND LAB</Text>
          <Text style={styles.sub}>tap to play · pick a winner</Text>
        </View>

        <View style={styles.tiles}>
          {SOUNDS.map((s) => {
            const isPlaying = playing === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.tile, isPlaying && styles.tileActive]}
                onPress={() => playSound(s.key as 'warm' | 'bright' | 'deep')}
                activeOpacity={0.75}
              >
                <View style={styles.tileTop}>
                  <Text style={styles.tileNumber}>{s.number}</Text>
                  <View style={styles.tileLabels}>
                    <Text style={styles.tileName}>{s.name}</Text>
                    <Text style={styles.tileTag}>{s.tagline}</Text>
                  </View>
                  <View style={[styles.playDot, isPlaying && styles.playDotActive]} />
                </View>
                <Text style={styles.tileDesc}>{s.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.foot}>
          Each is a synthesized chime. Tell me the number you like and I&apos;ll lock it in as the boot sound.
        </Text>
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
    paddingHorizontal: 22,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  back: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Orbitron_700Bold',
    color: '#ffffff',
    fontSize: 22,
    letterSpacing: 3,
  },
  sub: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  tiles: {
    flex: 1,
    gap: 14,
    justifyContent: 'center',
  },
  tile: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 18,
  },
  tileActive: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255,107,0,0.08)',
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  tileNumber: {
    fontFamily: 'Orbitron_700Bold',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 32,
    letterSpacing: 0,
    width: 36,
  },
  tileLabels: {
    flex: 1,
  },
  tileName: {
    fontFamily: 'Orbitron_700Bold',
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: 2,
  },
  tileTag: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 3,
  },
  playDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  playDotActive: {
    backgroundColor: '#FF6B00',
  },
  tileDesc: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
  foot: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 28,
    paddingTop: 18,
    lineHeight: 17,
  },
});
