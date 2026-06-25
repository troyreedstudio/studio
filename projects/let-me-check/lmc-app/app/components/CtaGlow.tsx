import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * CtaGlow — premium red gradient fill for primary CTA buttons.
 *
 * Usage: render as the FIRST child of the button's TouchableOpacity so
 * content layers on top. Conditionally render only when the button is
 * enabled (so the disabled grey state shows through unobstructed).
 *
 * <TouchableOpacity style={[styles.cta, ctaGlowShadow, !enabled && styles.ctaDisabled]} ...>
 *   {enabled && <CtaGlow />}
 *   <Text style={styles.ctaText}>...</Text>
 * </TouchableOpacity>
 */
interface CtaGlowProps {
  radius?: number;
}

export function CtaGlow({ radius = 14 }: CtaGlowProps) {
  return (
    <LinearGradient
      colors={['#FF5247', '#DA251D', '#9E0E07']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
}

/**
 * ctaGlowShadow — subtle red float-shadow.
 * Spread into the button's style array alongside ctaGlowShadow:
 *   style={[styles.cta, ctaGlowShadow, !enabled && styles.ctaDisabled]}
 *
 * Do NOT add overflow:'hidden' to the button — that clips the shadow.
 */
export const ctaGlowShadow: ViewStyle = {
  shadowColor: '#DA251D',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.22,
  shadowRadius: 14,
  elevation: 6,
};
