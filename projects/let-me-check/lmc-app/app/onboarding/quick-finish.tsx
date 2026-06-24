import React, { useEffect, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getIntendedRole } from '../state/intended-role';
import { recordOnboardingConsents } from '../lib/consent';
import { supabase } from '../lib/supabase';
import { setIntendedRoleFlags, updateProfile } from '../lib/api';
import { applyReferralCode } from '../lib/referrals';
import { colors } from '../lib/theme';

type AuthSource = 'apple' | 'google' | 'phone';

export default function QuickFinishScreen() {
  const router = useRouter();
  const { from, ref: refCode } = useLocalSearchParams<{ from?: AuthSource; ref?: string }>();
  const source: AuthSource = from === 'apple' || from === 'google' ? from : 'phone';
  const isAutoFill = source === 'apple' || source === 'google';

  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [autoFilledName, setAutoFilledName] = useState(false);
  const [autoFilledEmail, setAutoFilledEmail] = useState(false);
  const [consented, setConsented] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referralCode, setReferralCode] = useState(
    typeof refCode === 'string' ? refCode.trim().toUpperCase() : '',
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata ?? {};
      const rawFull: string =
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        '';
      const firstName: string =
        (meta.given_name as string | undefined) ??
        (meta.first_name as string | undefined) ??
        rawFull.split(' ')[0] ??
        '';
      const lastName: string =
        (meta.family_name as string | undefined) ??
        (meta.last_name as string | undefined) ??
        rawFull.split(' ').slice(1).join(' ') ??
        '';
      const rawEmail: string =
        (data?.user?.email as string | undefined) ??
        (meta.email as string | undefined) ??
        '';

      if (firstName || lastName) {
        setFirst(firstName);
        setLast(lastName);
        setAutoFilledName(true);
      }
      if (rawEmail) {
        setEmail(rawEmail);
        setAutoFilledEmail(true);
      }
    }).catch(() => {});
  }, []);

  const sourceLabel = source === 'apple' ? 'FROM APPLE' : source === 'google' ? 'FROM GOOGLE' : '';
  const nameAutoFilled = isAutoFill && autoFilledName;
  const emailAutoFilled = isAutoFill && autoFilledEmail;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = first.length >= 1 && last.length >= 1 && emailOk && consented;

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const role = getIntendedRole();
      if (role) {
        await setIntendedRoleFlags(role);
      }

      const displayName = `${first.trim()} ${last.trim()}`.trim();
      if (displayName) {
        await updateProfile({ displayName });
      }

      void recordOnboardingConsents();

      if (referralCode.length >= 1) {
        void applyReferralCode(referralCode);
      }
    } catch {
      // Non-blocking — a transient network error should not strand the user.
    } finally {
      setSubmitting(false);
      const next = getIntendedRole() === 'scout' ? '/scout/become' : '/seeker/rules';
      router.replace(next);
    }
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/sign-up')}
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
                  i < 4 && styles.dotDone,
                  i === 4 && styles.dotActive,
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
          <Text style={styles.title}>Almost done</Text>
          <Text style={styles.subtitle}>
            {isAutoFill
              ? `We pre-filled what ${source === 'apple' ? 'Apple' : 'Google'} shared. Confirm or edit, then check the box below.`
              : 'Just a name and email to finish your account.'}
          </Text>

          {/* NAME */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>YOUR NAME</Text>
            {nameAutoFilled && (
              <View style={[styles.sourcePill, source === 'apple' ? styles.sourcePillApple : styles.sourcePillGoogle]}>
                <Ionicons
                  name={source === 'apple' ? 'logo-apple' : 'logo-google'}
                  size={10}
                  color={source === 'apple' ? colors.textPrimary : '#EA4335'}
                />
                <Text style={styles.sourcePillText}>{sourceLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.row}>
            <View style={[styles.field, styles.fieldHalfLeft]}>
              <Text style={styles.label}>FIRST</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, nameAutoFilled && styles.inputAutoFilled]}
                  value={first}
                  onChangeText={setFirst}
                  placeholder="Troy"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {nameAutoFilled && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.textTertiary} style={styles.inputCheck} />
                )}
              </View>
            </View>
            <View style={[styles.field, styles.fieldHalfRight]}>
              <Text style={styles.label}>LAST</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, nameAutoFilled && styles.inputAutoFilled]}
                  value={last}
                  onChangeText={setLast}
                  placeholder="Reed"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {nameAutoFilled && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.textTertiary} style={styles.inputCheck} />
                )}
              </View>
            </View>
          </View>

          {/* EMAIL */}
          <View style={styles.sectionRow}>
            <Text style={styles.label}>EMAIL</Text>
            {emailAutoFilled && (
              <View style={[styles.sourcePill, source === 'apple' ? styles.sourcePillApple : styles.sourcePillGoogle]}>
                <Ionicons
                  name={source === 'apple' ? 'logo-apple' : 'logo-google'}
                  size={10}
                  color={source === 'apple' ? colors.textPrimary : '#EA4335'}
                />
                <Text style={styles.sourcePillText}>{sourceLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.field}>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, emailAutoFilled && styles.inputAutoFilled]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailAutoFilled && (
                <Ionicons name="checkmark-circle" size={16} color={colors.textTertiary} style={styles.inputCheck} />
              )}
            </View>
            {email.length > 0 && !emailOk && (
              <Text style={styles.fieldError}>Hmm — that email doesn&apos;t look right.</Text>
            )}
            {source === 'apple' && emailAutoFilled && email.includes('privaterelay') && (
              <Text style={styles.fieldHint}>
                Apple gave us a relay address. You can keep it or swap for your real email.
              </Text>
            )}
          </View>

          {source === 'phone' && (
            <View style={styles.phoneRow}>
              <View style={styles.phoneIconWrap}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.verified} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.phoneTitle}>Phone verified</Text>
                <Text style={styles.phoneWhy}>From your sign-up. You can update it later in profile.</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.verified} />
            </View>
          )}

          {/* CONSENT */}
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
              <Text style={styles.consentLink} onPress={() => router.push('/legal/terms')}>Terms</Text>
              ,{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>
              , and{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/legal/aup')}>Acceptable Use Policy</Text>
              .
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.consentRow}
            activeOpacity={0.75}
            onPress={() => setSmsOptIn((v) => !v)}
          >
            <View style={[styles.checkbox, smsOptIn && styles.checkboxOn]}>
              {smsOptIn && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.consentText}>
              Send me SMS updates about new venues, promos, and check-completion alerts.{' '}
              <Text style={styles.consentOptional}>(Optional, you can opt out anytime)</Text>
            </Text>
          </TouchableOpacity>

          {/* REFERRAL CODE */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>HAVE A REFERRAL CODE?</Text>
          <View style={[styles.field, { marginBottom: 18 }]}>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, referralCode.length > 0 && styles.inputAutoFilled]}
                value={referralCode}
                onChangeText={(v) => setReferralCode(v.trim().toUpperCase())}
                placeholder="e.g. ABC1234"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
              />
              {referralCode.length > 0 && (
                <Ionicons name="gift-outline" size={16} color={colors.amber} style={styles.inputCheck} />
              )}
            </View>
            <Text style={styles.fieldHint}>
              {referralCode.length > 0
                ? 'Code saved. Applied automatically when you finish.'
                : 'Optional. Your friend gave you a code to enter here.'}
            </Text>
          </View>

          {/* TRUST */}
          <View style={styles.trustCard}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.red} />
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>How we use this</Text>
              <Text style={styles.trustWhy}>
                Encrypted at rest. Never sold. Used for your account, order receipts, and security. If you ever become a Scout, we collect tax info separately at that point.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!ready || submitting) && styles.primaryBtnDisabled]}
            disabled={!ready || submitting}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, (!ready || submitting) && styles.primaryBtnTextDisabled]}>
              {submitting ? 'CREATING ACCOUNT...' : 'FINISH SIGN-UP'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.foot}>
            Your info is encrypted. We never sell it.
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
  sectionLabelGap: { marginTop: 18 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },

  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  sourcePillApple: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  sourcePillGoogle: {
    backgroundColor: 'rgba(234,67,53,0.07)',
    borderColor: 'rgba(234,67,53,0.25)',
  },
  sourcePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1.4,
  },

  row: { flexDirection: 'row' },
  field: { marginBottom: 14 },
  inputWrap: { position: 'relative' },
  inputCheck: {
    position: 'absolute',
    right: 14,
    top: 16,
  },
  fieldHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textTertiary,
    marginTop: 6,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  fieldHalfLeft: { flex: 1, marginRight: 8 },
  fieldHalfRight: { flex: 1, marginLeft: 8 },
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
    paddingRight: 38,
    letterSpacing: 0.3,
  },
  inputAutoFilled: {
    backgroundColor: colors.surface,      // subtle neutral "filled" cue (was green)
    borderColor: colors.borderStrong,
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
  consentOptional: {
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    fontSize: 12,
  },

  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(218,37,29,0.06)', // faint red highlight (was green; green = verified only)
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.18)',
    marginTop: 18,
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
    letterSpacing: 2.5,
  },
  primaryBtnTextDisabled: {
    color: colors.textTertiary,
    letterSpacing: 2,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
