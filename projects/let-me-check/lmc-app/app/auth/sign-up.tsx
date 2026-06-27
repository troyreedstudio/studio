import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Animated,
  StatusBar,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { COUNTRY_DIAL_CODES, type DialCode } from '../data/markets';
import {
  signInWithApple,
  signInWithGoogle,
  sendPhoneOtp,
  verifyPhoneOtp,
  PHONE_AUTH_ENABLED,
} from '../lib/auth';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

type Step = 'method' | 'phone' | 'otp' | 'terms';

const LMC_SIZE = 22;
const LMC_MASK_W = 250;
const LMC_MASK_H = LMC_SIZE * 1.4;

// Chrome gradient reads well on the white canvas
const CHROME_STOPS: [string, string, ...string[]] = [
  '#a8a8a8',
  '#ffffff',
  '#ffffff',
  '#f2f2f2',
  '#8c8c8c',
  '#363636',
  '#161616',
];
const CHROME_LOCATIONS: [number, number, ...number[]] = [0, 0.22, 0.5, 0.58, 0.68, 0.88, 1];

const STEPS: Step[] = ['method', 'phone', 'otp', 'terms'];

const RULES = [
  "No filming people's personal image (no faces or individuals)",
  'No filming inside courtrooms',
  "No filming someone's home",
  'No sharing of Let Me Check clips on social media',
  'Imagery is for personal recommendation only',
];

function prevStep(s: Step): Step {
  const i = STEPS.indexOf(s);
  return i > 0 ? STEPS[i - 1] : 'method';
}

export default function SignUpScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: 'seeker' | 'scout' | 'both' }>();
  const titleByRole =
    role === 'scout'
      ? 'Sign up to start earning'
      : role === 'both'
      ? 'Sign up to start checking and earning'
      : role === 'seeker'
      ? 'Sign up to start checking'
      : 'How would you like to sign up?';
  const subtitleByRole =
    role === 'scout'
      ? "Apple, Google, or phone. We'll set up Scout payouts right after."
      : role
      ? 'Apple, Google, or phone. Takes about 90 seconds.'
      : '';
  const [step, setStep] = useState<Step>('method');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [country, setCountry] = useState<DialCode>(
    COUNTRY_DIAL_CODES.find((c) => c.code === 'US') || COUNTRY_DIAL_CODES[0]
  );
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAuth = async (fn: () => Promise<void>, next: () => void) => {
    setError(null);
    setSubmitting(true);
    try {
      await fn();
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(16);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [step, fade, slide]);

  const goNext = (next: Step) => setStep(next);
  const goBack = () =>
    step === 'method'
      ? router.canGoBack()
        ? router.back()
        : router.replace('/onboarding/role') // reached via replace from role — no back-history
      : setStep(prevStep(step));

  const handleFinish = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.replace('/welcome');
    }, 1100);
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {STEPS.map((s) => {
              const idxCurrent = STEPS.indexOf(step);
              const idxThis = STEPS.indexOf(s);
              const isActive = idxThis === idxCurrent;
              const isDone = idxThis < idxCurrent;
              return (
                <View
                  key={s}
                  style={[
                    styles.progressDot,
                    isDone && styles.progressDotDone,
                    isActive && styles.progressDotActive,
                  ]}
                />
              );
            })}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Chrome wordmark — reads on white canvas */}
        <View style={styles.brandHeader}>
          <MaskedView
            style={styles.maskWrap}
            maskElement={
              <View style={styles.maskCenter}>
                <Text
                  style={styles.lmcMask}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  LET ME CHECK
                </Text>
              </View>
            }
          >
            {/* Wordmark rule: BLACK on white (mirrors white-on-red elsewhere) */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000' }]} />
          </MaskedView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.stepContent, { opacity: fade, transform: [{ translateY: slide }] }]}>

            {step === 'method' && (
              <>
                <Text style={styles.title}>{titleByRole}</Text>
                {subtitleByRole.length > 0 && (
                  <Text style={styles.methodSubtitle}>{subtitleByRole}</Text>
                )}

                <View style={styles.methodList}>
                  {/* Apple — platform-mandated black button */}
                  <TouchableOpacity
                    style={styles.methodBtnApple}
                    disabled={submitting}
                    onPress={() =>
                      runAuth(signInWithApple, () =>
                        router.push({ pathname: '/onboarding/quick-finish', params: { from: 'apple' } })
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIconApple}></Text>
                    <Text style={styles.methodLabelApple}>Continue with Apple</Text>
                    <View style={styles.methodSpacer} />
                  </TouchableOpacity>

                  {/* Google — platform-mandated white button */}
                  <TouchableOpacity
                    style={styles.methodBtnGoogle}
                    disabled={submitting}
                    onPress={() =>
                      runAuth(signInWithGoogle, () =>
                        router.push({ pathname: '/onboarding/quick-finish', params: { from: 'google' } })
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIconG}>G</Text>
                    <Text style={styles.methodLabelGoogle}>Continue with Google</Text>
                    <View style={styles.methodSpacer} />
                  </TouchableOpacity>

                  {PHONE_AUTH_ENABLED ? (
                    <TouchableOpacity
                      style={styles.methodBtn}
                      onPress={() => goNext('phone')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="call-outline" size={18} color={colors.textPrimary} style={styles.methodIconIon} />
                      <Text style={styles.methodLabel}>Continue with Phone</Text>
                      <View style={styles.methodSpacer} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.methodBtn, styles.methodBtnDisabled]}>
                      <Ionicons name="call-outline" size={18} color={colors.textTertiary} style={styles.methodIconIon} />
                      <Text style={[styles.methodLabel, styles.methodLabelDisabled]}>
                        Phone — coming soon
                      </Text>
                      <View style={styles.methodSpacer} />
                    </View>
                  )}
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Text style={styles.legal}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.legalLink}>Terms</Text> and{' '}
                  <Text style={styles.legalLink}>Privacy Policy</Text>.
                </Text>
              </>
            )}

            {step === 'phone' && (
              <>
                <Text style={styles.title}>What&apos;s your number?</Text>
                <Text style={styles.subtitle}>
                  We&apos;ll text you a 6-digit code to verify.
                </Text>

                <View style={styles.phoneWrap}>
                  <TouchableOpacity
                    style={styles.countryCode}
                    activeOpacity={0.7}
                    onPress={() => setCountryPickerOpen(true)}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={styles.countryCodeText}>{country.dial}</Text>
                    <Text style={styles.countryChevron}>▾</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="(555) 123 4567"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, ctaGlowShadow, (phone.length < 7 || submitting) && styles.primaryBtnDisabled]}
                  disabled={phone.length < 7 || submitting}
                  onPress={() =>
                    runAuth(
                      () => sendPhoneOtp(country.dial + phone.replace(/\D/g, '')),
                      () => goNext('otp')
                    )
                  }
                  activeOpacity={0.85}
                >
                  {(phone.length >= 7 && !submitting) && <CtaGlow radius={14} />}
                  <Text style={[styles.primaryBtnText, phone.length < 7 && styles.primaryBtnTextDisabled]}>
                    SEND CODE
                  </Text>
                </TouchableOpacity>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Text style={styles.disclaimer}>
                  Standard SMS rates may apply. We never share your number.
                </Text>
              </>
            )}

            {step === 'otp' && (
              <>
                <Text style={styles.title}>Enter the code</Text>
                <Text style={styles.subtitle}>
                  Sent to {country.dial} {phone || '•••  •••  ••••'}
                </Text>

                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="––––––"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textAlign="center"
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, ctaGlowShadow, (otp.length < 6 || submitting) && styles.primaryBtnDisabled]}
                  disabled={otp.length < 6 || submitting}
                  onPress={() =>
                    runAuth(
                      () => verifyPhoneOtp(country.dial + phone.replace(/\D/g, ''), otp),
                      () => router.push({ pathname: '/onboarding/quick-finish', params: { from: 'phone' } })
                    )
                  }
                  activeOpacity={0.85}
                >
                  {(otp.length >= 6 && !submitting) && <CtaGlow radius={14} />}
                  <Text style={[styles.primaryBtnText, otp.length < 6 && styles.primaryBtnTextDisabled]}>
                    VERIFY
                  </Text>
                </TouchableOpacity>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity style={styles.linkBtn} activeOpacity={0.7}>
                  <Text style={styles.linkText}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'terms' && (
              <>
                <Text style={styles.title}>One last thing</Text>
                <Text style={styles.subtitle}>
                  Let Me Check is a verification utility. Please agree to our use rules.
                </Text>

                <Text style={styles.sectionLabel}>ACCEPTABLE USE</Text>
                <View style={styles.rulesCard}>
                  {RULES.map((rule, i) => (
                    <View key={i} style={[styles.ruleRow, i < RULES.length - 1 && styles.ruleRowBorder]}>
                      <Text style={styles.ruleX}>—</Text>
                      <Text style={styles.ruleText}>{rule}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setAcceptedRules(!acceptedRules)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedRules && styles.checkboxActive]}>
                    {acceptedRules && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkLabel}>
                    I agree to follow these rules. Violation may result in account suspension.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                    {acceptedTerms && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkLabel}>
                    I have read and accept the{' '}
                    <Text style={styles.linkInline}>Terms of Service</Text> and{' '}
                    <Text style={styles.linkInline}>Privacy Policy</Text>.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    ctaGlowShadow,
                    (!acceptedRules || !acceptedTerms || submitting) && styles.primaryBtnDisabled,
                  ]}
                  disabled={!acceptedRules || !acceptedTerms || submitting}
                  onPress={handleFinish}
                  activeOpacity={0.85}
                >
                  {(acceptedRules && acceptedTerms && !submitting) && <CtaGlow radius={14} />}
                  <Text
                    style={[
                      styles.primaryBtnText,
                      (!acceptedRules || !acceptedTerms || submitting) && styles.primaryBtnTextDisabled,
                    ]}
                  >
                    {submitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Country code picker — dark sheet stays dark (system modal pattern) */}
      <Modal
        visible={countryPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCountryPickerOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Country code</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {COUNTRY_DIAL_CODES.map((c) => {
                const isSelected = c.code === country.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCountry(c);
                      setCountryPickerOpen(false);
                    }}
                  >
                    <Text style={styles.modalFlag}>{c.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalName}>{c.name}</Text>
                      <Text style={styles.modalCode}>{c.code}</Text>
                    </View>
                    <Text style={styles.modalDial}>{c.dial}</Text>
                    {isSelected && <Text style={styles.modalCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 18,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotDone: { backgroundColor: 'rgba(218,37,29,0.35)' },
  progressDotActive: { backgroundColor: colors.red },

  brandHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 40,
  },
  maskWrap: { width: LMC_MASK_W, height: LMC_MASK_H },
  maskCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  lmcMask: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: LMC_SIZE,
    letterSpacing: 1,
    textAlign: 'center',
    color: '#000',
    backgroundColor: 'transparent',
  },
  gradientWrap: { flex: 1, overflow: 'hidden' },

  scroll: { paddingBottom: 48, paddingHorizontal: 26, flexGrow: 1 },
  stepContent: { flex: 1 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: 0,
    lineHeight: 32,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  methodSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#4B5563', // a notch darker for presence (matches role subtitle)
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 18,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 21,
    marginBottom: 36,
    textAlign: 'center',
  },
  methodList: { gap: 10, marginBottom: 28 },

  // Apple — platform-mandated black button
  methodBtnApple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000', // Apple = primary, bold black (also App-Store compliant)
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  methodIconApple: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
    width: 22,
    textAlign: 'center',
  },
  methodLabelApple: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Google — platform-mandated white button
  methodBtnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonGrey, // grey-button token (locked standard)
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  methodIconG: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#EA4335',
    width: 22,
    textAlign: 'center',
  },
  methodLabelGoogle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  // Right spacer = icon width, so the label centers in the button (icon left, text dead-center)
  methodSpacer: { width: 22 },

  // Phone — neutral surface button
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  methodIcon: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    width: 22,
    textAlign: 'center',
  },
  methodIconIon: {
    width: 22,
    textAlign: 'center',
  },
  methodLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  methodBtnDisabled: { opacity: 0.45 },
  methodLabelDisabled: { color: colors.textTertiary },

  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  legal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textSecondary, // one notch darker so the legal line is legible
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  legalLink: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
  },

  phoneWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  countryFlag: { fontSize: 20 },
  countryChevron: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  countryCodeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 19,
    color: colors.textPrimary,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },

  otpInput: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 34,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 22,
    letterSpacing: 14,
    marginBottom: 22,
  },

  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryBtnDisabled: { backgroundColor: colors.border },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 3,
  },
  primaryBtnTextDisabled: { color: colors.textTertiary },

  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  linkBtn: { paddingVertical: 12, alignItems: 'center' },
  linkText: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.red,
    fontSize: 13,
    letterSpacing: 0.5,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 3,
    marginBottom: 12,
  },
  rulesCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    overflow: 'hidden',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  ruleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ruleX: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.red,
    marginTop: 2,
  },
  ruleText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    lineHeight: 19,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  checkboxCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.white,
  },
  checkLabel: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  linkInline: {
    color: colors.red,
    fontFamily: 'Inter_600SemiBold',
  },

  // Country picker modal — dark sheet (system modal convention)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  modalScroll: { paddingHorizontal: 16 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalRowSelected: {
    backgroundColor: 'rgba(218,37,29,0.07)',
  },
  modalFlag: { fontSize: 24 },
  modalName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  modalCode: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  modalDial: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  modalCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.red,
    marginLeft: 6,
  },
});
