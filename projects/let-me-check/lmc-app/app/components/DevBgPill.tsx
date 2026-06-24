// TEMP: color audition — remove after color is chosen.
// See app/state/dev-bg.ts for full removal instructions.

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { cycleDevBg, useDevBg, PALETTE } from '../state/dev-bg';

export default function DevBgPill() {
  const current = useDevBg();
  // Derive the index by matching the hex value — palette items are unique by hex
  const idx = PALETTE.findIndex((c) => c.hex === current.hex);

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={cycleDevBg}
      activeOpacity={0.75}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={[styles.swatch, { backgroundColor: current.hex }]} />
      <Text style={styles.label}>
        {current.name}{'  '}{current.hex}
      </Text>
      <Text style={styles.counter}>
        {idx + 1}/{PALETTE.length}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 44,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(20,20,24,0.82)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    // keep above everything including the overlay on the splash
    zIndex: 9999,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.2,
  },
  counter: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginLeft: 2,
  },
});
