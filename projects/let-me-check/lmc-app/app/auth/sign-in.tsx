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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

type Step = 'method' | 'phone' | 'otp';

export default function SignInScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const goBack = () => {
    if (step === 'method') router.push('/welcome');
    else if (step === 'phone') setStep('method');
    else setStep('phone');
  };

  const proceedAfterAuth = () => {
    router.replace('/onboarding/welcome-back');
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
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
          >
            {step === 'method' && (
              <>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>
                  Sign in to pick up where you left off.
                </Text>

                <View style={styles.methodList}>
                  <TouchableOpacity
                    style={styles.methodBtn}
                    onPress={proceedAfterAuth}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIcon}></Text>
                    <Text style={styles.methodLabel}>Continue with Apple</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.methodBtn}
                    onPress={proceedAfterAuth}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.methodIcon, styles.methodIconG]}>G</Text>
                    <Text style={styles.methodLabel}>Continue with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.methodBtn}
                    onPress={() => setStep('phone')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.methodIcon}>✆</Text>
                    <Text style={styles.methodLabel}>Continue with Phone</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>NEW TO LMC?</Text>
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
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, phone.length < 10 && styles.primaryBtnDisabled]}
                  disabled={phone.length < 10}
                  onPress={() => setStep('otp')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      phone.length < 10 && styles.primaryBtnTextDisabled,
                    ]}
                  >
                    SEND CODE
                  </Text>
                </TouchableOpacity>
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
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textAlign="center"
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, otp.length < 6 && styles.primaryBtnDisabled]}
                  disabled={otp.length < 6}
                  onPress={proceedAfterAuth}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      otp.length < 6 && styles.primaryBtnTextDisabled,
                    ]}
                  >
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
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
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
  scroll: {
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 36,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  methodList: { gap: 10, marginBottom: 24 },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  methodIcon: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
    width: 22,
    textAlign: 'center',
  },
  methodIconG: { color: '#ffffff' },
  methodLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
  },
  signUpRow: { alignItems: 'center', paddingVertical: 10 },
  signUpText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
  signUpBold: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
  },

  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  countryFlag: { fontSize: 16 },
  countryCode: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },

  otpInput: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 32,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 18,
    letterSpacing: 8,
    marginBottom: 20,
  },
  resendRow: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  resendText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12.5,
    color: '#00FF7F',
    letterSpacing: 0.4,
  },

  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
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
  },
});
