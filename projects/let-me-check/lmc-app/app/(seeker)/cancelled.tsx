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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

const SUPPORT_EMAIL = 'support@letmecheck.app';

export default function CancelledScreen() {
  const router = useRouter();
  const {
    venue = 'Komodo',
    fee = '5.00',
    refund = '10.00',
    total = '15.00',
  } = useLocalSearchParams<{
    venue: string;
    fee: string;
    refund: string;
    total: string;
  }>();

  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      delay: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backFab}
          onPress={() => router.replace('/(seeker)/home')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Animated.View style={[styles.glyphCircle, { transform: [{ scale }] }]}>
            <Text style={styles.glyph}>✕</Text>
          </Animated.View>

          <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
            <Text style={styles.eyebrow}>CHECK CANCELLED</Text>
            <Text style={styles.title}>You won&apos;t see {venue}.</Text>
            <Text style={styles.subtitle}>
              We pulled the Scout. A small fee covers their dispatch time.
            </Text>

            <View style={styles.receipt}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Order total</Text>
                <Text style={styles.receiptValue}>${Number(total).toFixed(2)}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Cancellation fee</Text>
                <Text style={styles.receiptFee}>− ${Number(fee).toFixed(2)}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabelBold}>Refunded to your card</Text>
                <Text style={styles.receiptRefund}>${Number(refund).toFixed(2)}</Text>
              </View>
            </View>

            <Text style={styles.foot}>
              Refund posts in 3–5 business days. Need help?{' '}
              <Text
                style={styles.footLink}
                onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              >
                Contact support
              </Text>
              .
            </Text>
          </Animated.View>
        </View>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.cta, ctaGlowShadow]}
            activeOpacity={0.85}
            onPress={() => router.replace('/(seeker)/home')}
          >
            <CtaGlow radius={14} />
            <Text style={styles.ctaText}>BACK TO MAP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
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
  glyphCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  glyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 44,
    color: colors.textPrimary,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2.4,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  receipt: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  receiptLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  receiptLabelBold: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  receiptValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  // Cancellation fee: colors.danger — destructive/cost is a distinct error state
  receiptFee: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: colors.danger,
    letterSpacing: 0.3,
  },
  // Refund amount: colors.verified — money coming back is a positive/success state
  receiptRefund: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 16,
    color: colors.verified,
    letterSpacing: 0.4,
  },
  receiptDivider: { height: 1, backgroundColor: colors.border },
  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  footLink: {
    fontFamily: 'Inter_700Bold',
    color: colors.red,
  },
  ctaWrap: { paddingBottom: 16 },
  cta: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 3,
  },
});
