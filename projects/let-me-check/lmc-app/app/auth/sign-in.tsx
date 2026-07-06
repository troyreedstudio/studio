import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  signInWithApple,
  signInWithGoogle,
  sendPhoneOtp,
  verifyPhoneOtp,
  PHONE_AUTH_ENABLED,
} from '../lib/auth';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

type Step = 'method' | 'phone' | 'otp';

export default function SignInScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goBack = () => {
    if (step === 'method') router.push('/welcome');
    else if (step === 'phone') setStep('method');
    else setStep('phone');
  };

  const runAuth = async (fn: () => Promise<void>, next?: () => void) => {
    setError(null);
    setBusy(true);
    try {
      await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Sign-in timed out — the provider never responded. Tap to try again.')),
            40000,
          ),
        ),
      ]);
      // On success, carry the returning user forward. The sign-in screen lives in
      // the 'auth' group, which BootGate deliberately never redirects from — so
      // without an explicit next() the user was STRANDED here after a SUCCESSFUL
      // sign-in. welcome-back was built for exactly this but was never wired up.
      next?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed. Please try again.';
      setError(msg);
      Alert.alert('Sign-in problem', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goBack}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 18 }}
              activeOpacity={0.7}
              style={{ alignSelf: 'flex-start', marginLeft: -4 }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.red} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'method' && (
              <>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>
                  Sign in to pick up where you left off.
                </Text>

                <View style={styles.methodList}>
                  {/* Apple — platform-mandated black button */}
                  <TouchableOpacity
                    style={styles.methodBtnApple}
                    onPress={() => runAuth(signInWithApple, () => router.replace('/onboarding/welcome-back'))}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIconApple}></Text>
                    <Text style={styles.methodLabelApple}>Continue with Apple</Text>
                    <View style={styles.methodSpacer} />
                  </TouchableOpacity>

                  {/* Google — platform-mandated white button with brand colors */}
                  <TouchableOpacity
                    style={styles.methodBtnGoogle}
                    onPress={() => runAuth(signInWithGoogle, () => router.replace('/onboarding/welcome-back'))}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIconG}>G</Text>
                    <Text style={styles.methodLabelGoogle}>Continue with Google</Text>
                    <View style={styles.methodSpacer} />
                  </TouchableOpacity>

                  {PHONE_AUTH_ENABLED ? (
                    <TouchableOpacity
                      style={styles.methodBtn}
                      onPress={() => setStep('phone')}
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

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>NEW TO LET ME CHECK?</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.signUpRow}
                  onPress={() => router.push('/auth/sign-up')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signUpText}>
                    Don&apos;t have an account?{' '}
                    <Text style={styles.signUpBold}>Sign up</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'phone' && (
              <>
                <Text style={styles.title}>What&apos;s your number?</Text>
                <Text style={styles.subtitle}>We&apos;ll text you a 6-digit code.</Text>

                <View style={styles.phoneRow}>
                  <View style={styles.countryPill}>
                    <Text style={styles.countryFlag}>🇺🇸</Text>
                    <Text style={styles.countryCode}>+1</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="(305) 555-0100"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, ctaGlowShadow, (phone.length < 10 || busy) && styles.primaryBtnDisabled]}
                  disabled={phone.length < 10 || busy}
                  onPress={() =>
                    runAuth(async () => {
                      await sendPhoneOtp('+1' + phone.replace(/\D/g, ''));
                      setStep('otp');
                    })
                  }
                  activeOpacity={0.85}
                >
                  {(phone.length >= 10 && !busy) && <CtaGlow radius={14} />}
                  <Text style={[styles.primaryBtnText, phone.length < 10 && styles.primaryBtnTextDisabled]}>
                    SEND CODE
                  </Text>
                </TouchableOpacity>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </>
            )}

            {step === 'otp' && (
              <>
                <Text style={styles.title}>Enter the code</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to +1 {phone || '(305) 555-0100'}.
                </Text>

                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textAlign="center"
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, ctaGlowShadow, (otp.length < 6 || busy) && styles.primaryBtnDisabled]}
                  disabled={otp.length < 6 || busy}
                  onPress={() =>
                    runAuth(() => verifyPhoneOtp('+1' + phone.replace(/\D/g, ''), otp), () => router.replace('/onboarding/welcome-back'))
                  }
                  activeOpacity={0.85}
                >
                  {(otp.length >= 6 && !busy) && <CtaGlow radius={14} />}
                  <Text style={[styles.primaryBtnText, otp.length < 6 && styles.primaryBtnTextDisabled]}>
                    VERIFY + SIGN IN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setOtp('')} style={styles.resendRow}>
                  <Text style={styles.resendText}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scroll: {
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 36,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 27,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  methodList: { gap: 10, marginBottom: 24 },

  // Apple — platform-mandated black button
  methodBtnApple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
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
  methodSpacer: { width: 22 },

  // Google — secondary grey button (matches sign-up; Apple=black primary, Google=grey)
  methodBtnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.buttonGrey,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
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

  // Phone — neutral surface button
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
  },
  signUpRow: { alignItems: 'center', paddingVertical: 10 },
  signUpText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  signUpBold: {
    fontFamily: 'Inter_700Bold',
    color: colors.red,
  },

  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  countryFlag: { fontSize: 16 },
  countryCode: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },

  otpInput: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 32,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 18,
    letterSpacing: 8,
    marginBottom: 20,
  },
  resendRow: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  resendText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12.5,
    color: colors.red,
    letterSpacing: 0.4,
  },

  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnDisabled: { backgroundColor: colors.border },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 13,
    letterSpacing: 2.5,
  },
  primaryBtnTextDisabled: { color: colors.textTertiary },
});
