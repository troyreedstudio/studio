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
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { COUNTRY_DIAL_CODES, type DialCode } from '../data/markets';

type Step = 'method' | 'phone' | 'otp' | 'terms';

const LMC_SIZE = 22;
const LMC_MASK_W = 250;
const LMC_MASK_H = LMC_SIZE * 1.4;

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
  "No filming people's personal image (no faces / individuals)",
  'No filming inside courtrooms',
  "No filming someone's home",
  'No sharing of LMC clips on social media',
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
      ? 'Apple, Google, or phone. We\'ll set up Scout payouts right after.'
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
  const goBack = () => (step === 'method' ? router.push('/flow-map') : setStep(prevStep(step)));

  const handleFinish = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.replace('/welcome');
    }, 1100);
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Back</Text>
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
            <View style={styles.gradientWrap}>
              <LinearGradient
                colors={CHROME_STOPS}
                locations={CHROME_LOCATIONS}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          </MaskedView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.stepContent,
              { opacity: fade, transform: [{ translateY: slide }] },
            ]}
          >
            {step === 'method' && (
              <>
                <Text style={styles.title}>{titleByRole}</Text>
                {subtitleByRole.length > 0 && (
                  <Text style={styles.methodSubtitle}>{subtitleByRole}</Text>
                )}

                <View style={styles.methodList}>
                  <TouchableOpacity
                    style={styles.methodBtn}
                    onPress={() =>
                      router.push({ pathname: '/onboarding/quick-finish', params: { from: 'apple' } })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIcon}></Text>
                    <Text style={styles.methodLabel}>Continue with Apple</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.methodBtn}
                    onPress={() =>
                      router.push({ pathname: '/onboarding/quick-finish', params: { from: 'google' } })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.methodIcon, styles.methodIconG]}>G</Text>
                    <Text style={styles.methodLabel}>Continue with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.methodBtn}
                    onPress={() => goNext('phone')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIcon}>✆</Text>
                    <Text style={styles.methodLabel}>Continue with Phone</Text>
                  </TouchableOpacity>
                </View>

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
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, phone.length < 7 && styles.primaryBtnDisabled]}
                  disabled={phone.length < 7}
                  onPress={() => goNext('otp')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      phone.length < 7 && styles.primaryBtnTextDisabled,
                    ]}
                  >
                    SEND CODE
                  </Text>
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  Standard SMS rates may apply. We never share your number.
                </Text>
              </>
            )}

            {step === 'otp' && (
              <>
                <Text style={styles.title}>Enter the code</Text>
                <Text style={styles.subtitle}>
                  Sent to {country.dial} {phone || '••• ••• ••••'}
                </Text>

                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="––––––"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textAlign="center"
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, otp.length < 6 && styles.primaryBtnDisabled]}
                  disabled={otp.length < 6}
                  onPress={() =>
                    router.push({ pathname: '/onboarding/quick-finish', params: { from: 'phone' } })
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      otp.length < 6 && styles.primaryBtnTextDisabled,
                    ]}
                  >
                    VERIFY
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkBtn} activeOpacity={0.7}>
                  <Text style={styles.linkText}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'terms' && (
              <>
                <Text style={styles.title}>One last thing</Text>
                <Text style={styles.subtitle}>
                  LMC is a verification utility. Please agree to our use rules.
                </Text>

                <Text style={styles.sectionLabel}>ACCEPTABLE USE</Text>
                <View style={styles.rulesCard}>
                  {RULES.map((rule, i) => (
                    <View
                      key={i}
                      style={[styles.ruleRow, i < RULES.length - 1 && styles.ruleRowBorder]}
                    >
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
                    (!acceptedRules || !acceptedTerms || submitting) && styles.primaryBtnDisabled,
                  ]}
                  disabled={!acceptedRules || !acceptedTerms || submitting}
                  onPress={handleFinish}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      (!acceptedRules || !acceptedTerms || submitting) && styles.primaryBtnTextDisabled,
                    ]}
                  >
                    {submitting ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Country code picker */}
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
  bg: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safe: {
    flex: 1,
  },
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressDotDone: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  progressDotActive: {
    backgroundColor: '#00FF7F',
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 40,
  },
  maskWrap: {
    width: LMC_MASK_W,
    height: LMC_MASK_H,
  },
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
  gradientWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  wordmark: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    letterSpacing: 5,
    marginTop: 8,
  },
  brandLabel: {
    fontFamily: 'Orbitron_500Medium',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    letterSpacing: 4,
    marginTop: 14,
  },
  scroll: {
    paddingBottom: 48,
    paddingHorizontal: 26,
    flexGrow: 1,
  },
  stepContent: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 0,
    lineHeight: 32,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  methodSubtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 18,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    lineHeight: 21,
    marginBottom: 36,
    textAlign: 'center',
  },
  methodList: {
    gap: 10,
    marginBottom: 28,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  methodIcon: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
    width: 22,
    textAlign: 'center',
  },
  methodIconG: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  methodLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  legal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  legalLink: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  phoneWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
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
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  countryFlag: {
    fontSize: 20,
  },
  countryChevron: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ffffff',
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
    backgroundColor: 'rgba(20,55,130,0.5)',
  },
  modalFlag: { fontSize: 24 },
  modalName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  modalCode: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.6,
  },
  modalDial: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  modalCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#00FF7F',
    marginLeft: 6,
  },
  countryCodeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 15,
    color: '#ffffff',
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 19,
    color: '#ffffff',
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  otpInput: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 34,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 22,
    letterSpacing: 14,
    marginBottom: 22,
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
    letterSpacing: 3,
  },
  primaryBtnTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  linkBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#00FF7F',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 3,
    marginBottom: 12,
  },
  rulesCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  ruleX: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FF6B00',
    marginTop: 2,
  },
  ruleText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
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
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: '#00FF7F',
    borderColor: '#00FF7F',
  },
  checkboxCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#000',
  },
  checkLabel: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  linkInline: {
    color: '#00FF7F',
    fontFamily: 'Inter_600SemiBold',
  },
});
