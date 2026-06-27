import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

type ErrorType = 'no-scouts' | 'payment-declined' | 'connection' | 'missed-window';

const ERRORS: Record<ErrorType, {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  message: string;
  primaryLabel: string;
  primaryRoute: string;
  secondaryLabel: string;
}> = {
  'no-scouts': {
    iconName: 'search',
    iconColor: '#DA251D', // colors.red — no import cycle
    title: 'No Scouts Available',
    message: "We couldn't find a Scout near this location right now. You haven't been charged. Try again in a few minutes or pick a different place.",
    primaryLabel: 'TRY AGAIN',
    primaryRoute: '/(seeker)/home',
    secondaryLabel: 'Back to Home',
  },
  'payment-declined': {
    iconName: 'card-outline',
    iconColor: '#DA251D',
    title: 'Payment Declined',
    message: 'Your card was declined. No charge was made. Try again and use a different card or payment method.',
    primaryLabel: 'TRY AGAIN',
    primaryRoute: '/(seeker)/home',
    secondaryLabel: 'Back to Home',
  },
  'connection': {
    iconName: 'cloud-offline-outline',
    iconColor: '#B0151B', // colors.danger
    title: 'Connection Lost',
    message: "Looks like you're offline. Check your connection and try again.",
    primaryLabel: 'RETRY',
    primaryRoute: '/(seeker)/home',
    secondaryLabel: 'Back to Home',
  },
  'missed-window': {
    iconName: 'time-outline',
    iconColor: '#DA251D',
    title: 'Scout Missed the Window',
    message: 'Your Scout did not deliver in time. You have been refunded automatically and the Scout has been warned. Sorry about that.',
    primaryLabel: 'REQUEST AGAIN',
    primaryRoute: '/(seeker)/home',
    secondaryLabel: 'Back to Home',
  },
};

export default function ErrorScreen() {
  const router = useRouter();
  const { type = 'no-scouts' } = useLocalSearchParams<{ type: ErrorType }>();
  const err = ERRORS[type as ErrorType] || ERRORS['no-scouts'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity
        style={styles.backFab}
        onPress={() => router.replace('/(seeker)/home')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.inner}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name={err.iconName} size={44} color={err.iconColor} />
        </View>

        <Text style={styles.title}>{err.title}</Text>
        <Text style={styles.message}>{err.message}</Text>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.primaryBtn, ctaGlowShadow]}
            onPress={() => router.replace(err.primaryRoute as any)}
            activeOpacity={0.85}
          >
            <CtaGlow radius={14} />
            <Text style={styles.primaryBtnText}>{err.primaryLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(seeker)/home')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>{err.secondaryLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  emoji: { /* replaced by Ionicons */ },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
    marginBottom: 38,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 2.5,
  },
  secondaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
