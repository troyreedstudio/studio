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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getIntendedRole } from '../state/intended-role';

type AuthSource = 'apple' | 'google' | 'phone';

const PREFILL: Record<'apple' | 'google', { first: string; last: string; email: string }> = {
  apple: { first: 'Troy', last: 'Reed', email: 'troy.reed@privaterelay.appleid.com' },
  google: { first: 'Troy', last: 'Reed', email: 'troy.reed@gmail.com' },
};

export default function QuickFinishScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: AuthSource }>();
  const source: AuthSource = from === 'apple' || from === 'google' ? from : 'phone';
  const isAutoFill = source === 'apple' || source === 'google';
  const seed = isAutoFill ? PREFILL[source] : { first: '', last: '', email: '' };

  const [first, setFirst] = useState(seed.first);
  const [last, setLast] = useState(seed.last);
  const [email, setEmail] = useState(seed.email);
  const [consented, setConsented] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sourceLabel = source === 'apple' ? 'FROM APPLE' : source === 'google' ? 'FROM GOOGLE' : '';
  const nameUntouched = first === seed.first && last === seed.last;
  const emailUntouched = email === seed.email;
  const nameAutoFilled = isAutoFill && nameUntouched;
  const emailAutoFilled = isAutoFill && emailUntouched;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = first.length >= 1 && last.length >= 1 && emailOk && consented;

  const handleFinish = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      // Scout-only users go straight into Scout-specific onboarding.
      // Seeker + Both users see Seeker rules first.
      const next = getIntendedRole() === 'scout' ? '/scout/become' : '/seeker/rules';
      router.replace(next);
    }, 700);
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Flow Map</Text>
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
          <TouchableOpacity
            style={styles.wireframeBadge}
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.wireframeBadgeText}>WF</Text>
          </TouchableOpacity>
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
                  color={source === 'apple' ? '#ffffff' : '#FFD56B'}
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
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {nameAutoFilled && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#00FF7F"
                    style={styles.inputCheck}
                  />
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
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {nameAutoFilled && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#00FF7F"
                    style={styles.inputCheck}
                  />
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
                  color={source === 'apple' ? '#ffffff' : '#FFD56B'}
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
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailAutoFilled && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#00FF7F"
                  style={styles.inputCheck}
                />
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

          {/* PHONE VERIFIED PILL */}
          <View style={styles.phoneRow}>
            <View style={styles.phoneIconWrap}>
              <Ionicons name="phone-portrait-outline" size={18} color="#00FF7F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.phoneTitle}>Phone verified</Text>
              <Text style={styles.phoneWhy}>From your sign-up. You can update it later in profile.</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color="#00FF7F" />
          </View>

          {/* CONSENT */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>ONE LAST STEP</Text>
          <TouchableOpacity
            style={styles.consentRow}
            activeOpacity={0.75}
            onPress={() => setConsented((v) => !v)}
          >
            <View style={[styles.checkbox, consented && styles.checkboxOn]}>
              {consented && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={styles.consentText}>
              <Text style={styles.consentBold}>I am 18 or older</Text> and I agree to LMC&apos;s{' '}
              <Text
                style={styles.consentLink}
                onPress={() => router.push('/legal/terms')}
              >
                Terms
              </Text>
              ,{' '}
              <Text
                style={styles.consentLink}
                onPress={() => router.push('/legal/privacy')}
              >
                Privacy Policy
              </Text>
              , and{' '}
              <Text
                style={styles.consentLink}
                onPress={() => router.push('/legal/aup')}
              >
                Acceptable Use Policy
              </Text>
              .
            </Text>
          </TouchableOpacity>

          {/* OPTIONAL SMS MARKETING — separate, unchecked by default, doesn't gate the CTA */}
          <TouchableOpacity
            style={styles.consentRow}
            activeOpacity={0.75}
            onPress={() => setSmsOptIn((v) => !v)}
          >
            <View style={[styles.checkbox, smsOptIn && styles.checkboxOn]}>
              {smsOptIn && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={styles.consentText}>
              Send me SMS updates about new venues, promos, and check-completion alerts.{' '}
              <Text style={styles.consentOptional}>(Optional · You can opt out anytime)</Text>
            </Text>
          </TouchableOpacity>

          {/* TRUST */}
          <View style={styles.trustCard}>
            <Ionicons name="lock-closed-outline" size={16} color="#00FF7F" />
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>How we use this</Text>
              <Text style={styles.trustWhy}>
                Encrypted at rest. Never sold. Used for your account, order receipts, and security. If you ever become a Scout, we collect tax info separately at that point.
              </Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, (!ready || submitting) && styles.primaryBtnDisabled]}
            disabled={!ready || submitting}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.primaryBtnText,
                (!ready || submitting) && styles.primaryBtnTextDisabled,
              ]}
            >
              {submitting ? 'CREATING ACCOUNT…' : 'FINISH SIGN-UP'}
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
  bg: { flex: 1, backgroundColor: '#000000' },
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
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotDone: { backgroundColor: 'rgba(0,255,127,0.55)' },
  dotActive: { backgroundColor: '#00FF7F' },
  wireframeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,107,0,0.18)',
  },
  wireframeBadgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF6B00',
    fontSize: 9,
    letterSpacing: 1.4,
  },

  scroll: { paddingHorizontal: 26, paddingBottom: 48 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 22,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sourcePillGoogle: {
    backgroundColor: 'rgba(255,213,107,0.1)',
    borderColor: 'rgba(255,213,107,0.4)',
  },
  sourcePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
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
    color: 'rgba(0,255,127,0.85)',
    marginTop: 6,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  fieldHalfLeft: { flex: 1, marginRight: 8 },
  fieldHalfRight: { flex: 1, marginLeft: 8 },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingRight: 38,
    letterSpacing: 0.3,
  },
  inputAutoFilled: {
    backgroundColor: 'rgba(0,255,127,0.06)',
    borderColor: 'rgba(0,255,127,0.3)',
  },
  fieldError: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#FF6B6B',
    marginTop: 6,
    paddingHorizontal: 4,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,255,127,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  phoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,255,127,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  phoneWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
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
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  consentText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  consentBold: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  consentLink: {
    fontFamily: 'Inter_700Bold',
    color: '#88B4FF',
    textDecorationLine: 'underline',
  },
  consentOptional: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(0,255,127,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.2)',
    marginTop: 18,
    marginBottom: 16,
  },
  trustTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ffffff',
    marginBottom: 3,
  },
  trustWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },

  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  primaryBtnTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
