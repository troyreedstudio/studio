import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [consented, setConsented] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = first.length >= 1 && last.length >= 1 && emailOk && consented;

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding/role')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < 3 && styles.dotDone,
                  i === 3 && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>A bit about you</Text>
          <Text style={styles.subtitle}>
            Just the basics — what we need to set up your account. We never share it.
          </Text>

          <Text style={styles.sectionLabel}>YOUR NAME</Text>
          <View style={styles.field}>
            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              style={styles.input}
              value={first}
              onChangeText={setFirst}
              placeholder="Troy"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>LAST NAME</Text>
            <TextInput
              style={styles.input}
              value={last}
              onChangeText={setLast}
              placeholder="Reed"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>CONTACT</Text>
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {email.length > 0 && !emailOk && (
              <Text style={styles.fieldError}>Hmm — that email doesn't look right.</Text>
            )}
          </View>

          <View style={styles.phoneRow}>
            <View style={styles.phoneIconWrap}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.verified} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.phoneTitle}>Phone verified</Text>
              <Text style={styles.phoneWhy}>From your sign-up. Update it in profile later if it changes.</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color={colors.verified} />
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>ONE LAST STEP</Text>
          <TouchableOpacity
            style={styles.consentRow}
            activeOpacity={0.75}
            onPress={() => setConsented((v) => !v)}
          >
            <View style={[styles.checkbox, consented && styles.checkboxOn]}>
              {consented && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.consentText}>
              <Text style={styles.consentBold}>I am 18 or older</Text> and I agree to Let Me Check's{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/legal/terms')}>
                Terms
              </Text>
              ,{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/legal/privacy')}>
                Privacy Policy
              </Text>
              , and{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/legal/aup')}>
                Acceptable Use Policy
              </Text>
              .
            </Text>
          </TouchableOpacity>

          <View style={styles.trustCard}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.verified} />
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>How we use this</Text>
              <Text style={styles.trustWhy}>
                Encrypted at rest. Never sold. Used for your account, order receipts, and security. If you ever become a Scout, we&apos;ll collect tax info separately at that point.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, ctaGlowShadow, !ready && styles.primaryBtnDisabled]}
            disabled={!ready}
            onPress={() => router.push('/onboarding/permissions')}
            activeOpacity={0.85}
          >
            {ready && <CtaGlow radius={14} />}
            <Text style={[styles.primaryBtnText, !ready && styles.primaryBtnTextDisabled]}>
              CONTINUE
            </Text>
          </TouchableOpacity>

          <Text style={styles.privacy}>
            Your info is stored encrypted. We never sell it.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: 'rgba(218,37,29,0.35)' },
  dotActive: { backgroundColor: colors.red },
  scroll: { paddingHorizontal: 26, paddingBottom: 48 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 22,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 20 },

  field: { marginBottom: 14 },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    letterSpacing: 0.3,
  },
  fieldError: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: colors.danger,
    marginTop: 6,
    paddingHorizontal: 4,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(22,163,74,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  phoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(22,163,74,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  phoneWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  consentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 10,
    marginBottom: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  consentText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  consentBold: {
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  consentLink: {
    fontFamily: 'Inter_700Bold',
    color: colors.red,
    textDecorationLine: 'underline',
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(22,163,74,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.18)',
    marginTop: 22,
    marginBottom: 16,
  },
  trustTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  trustWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.border,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 3,
  },
  primaryBtnTextDisabled: {
    color: colors.textTertiary,
  },

  privacy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
