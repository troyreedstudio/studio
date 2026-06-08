import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChromeSplash() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.bg}
      activeOpacity={1}
      onPress={() => router.replace('/')}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.heroWrap}>
        <Text style={styles.lmcShadow}>LMC</Text>
        <Text style={styles.lmcBase}>LMC</Text>
        <Text style={styles.lmcHighlight}>LMC</Text>
      </View>
    </TouchableOpacity>
  );
}

const SIZE = 110;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrap: {
    height: SIZE * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lmcShadow: {
    position: 'absolute',
    fontFamily: 'Manrope_700Bold',
    fontSize: SIZE,
    letterSpacing: -3,
    color: 'rgba(40,40,40,1)',
    transform: [{ translateY: 2 }],
  },
  lmcBase: {
    position: 'absolute',
    fontFamily: 'Manrope_700Bold',
    fontSize: SIZE,
    letterSpacing: -3,
    color: '#C8C8C8',
  },
  lmcHighlight: {
    position: 'absolute',
    fontFamily: 'Manrope_700Bold',
    fontSize: SIZE,
    letterSpacing: -3,
    color: 'rgba(255,255,255,0.5)',
    transform: [{ translateY: -1 }],
  },
});
