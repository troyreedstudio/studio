import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

type Step = 'method' | 'phone' | 'otp' | 'terms';

const RULES = [
  'No filming people\'s personal image (no faces / individuals)',
  'No filming inside courtrooms',
  'No filming someone\'s home',
  'No sharing of LMC clips on social media (Instagram, TikTok, etc.)',
  'Imagery is for personal recommendation and use only',
];

export default function SignUpScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const goNext = (next: Step) => setStep(next);

  const handleFinish = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.replace('/');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step === 'method' ? router.back() : setStep(prevStep(step)))}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {(['method', 'phone', 'otp', 'terms'] as Step[]).map((s) => (
              <View key={s} style={[styles.progressDot, step === s && styles.progressDotActive]} />
            ))}
          </View>
        </View>

        {/* STEP: method picker */}
        {step === 'method' && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Welcome to LMC</Text>
            <Text style={styles.subtitle}>Know before you go. Sign up in 30 seconds.</Text>

            <View style={styles.methodList}>
              <TouchableOpacity style={styles.methodBtn} activeOpacity={0.85}>
                <Text style={styles.methodIcon}></Text>
                <Text style={styles.methodLabel}>Continue with Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.methodBtn} activeOpacity={0.85}>
                <Text style={styles.methodIcon}>G</Text>
                <Text style={styles.methodLabel}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.methodBtn}
                onPress={() => goNext('phone')}
                activeOpacity={0.85}
              >
                <Text style={styles.methodIcon}>✉</Text>
                <Text style={styles.methodLabel}>Continue with Email & Phone</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.methodLegal}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        )}

        {/* STEP: phone */}
        {step === 'phone' && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>What's your number?</Text>
            <Text style={styles.subtitle}>We'll text you a 6-digit code to verify.</Text>

            <View style={styles.phoneWrap}>
              <View style={styles.countryCode}>
                <Text style={styles.countryFlag}>🇺🇸</Text>
                <Text style={styles.countryCodeText}>+1</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#444"
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
              <Text style={styles.primaryBtnText}>SEND CODE</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Standard SMS rates may apply. We never share your number.
            </Text>
          </View>
        )}

        {/* STEP: OTP */}
        {step === 'otp' && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.subtitle}>Sent to +1 {phone || '••• ••• ••••'}</Text>

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •"
              placeholderTextColor="#333"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, otp.length < 6 && styles.primaryBtnDisabled]}
              disabled={otp.length < 6}
              onPress={() => goNext('terms')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>VERIFY</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} activeOpacity={0.7}>
              <Text style={styles.linkText}>Resend code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP: terms + acceptable use */}
        {step === 'terms' && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>One last thing</Text>
            <Text style={styles.subtitle}>
              LMC is a verification utility. To keep it that way, please agree to our rules.
            </Text>

            {/* Acceptable Use Rules */}
            <Text style={styles.sectionLabel}>ACCEPTABLE USE</Text>
            <View style={styles.rulesCard}>
              {RULES.map((rule, i) => (
                <View key={i} style={[styles.ruleRow, i < RULES.length - 1 && styles.ruleRowBorder]}>
                  <Text style={styles.ruleX}>✕</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>

            {/* Acceptance toggles */}
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
                I have read and accept the <Text style={styles.linkInline}>Terms of Service</Text> and <Text style={styles.linkInline}>Privacy Policy</Text>.
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
              <Text style={styles.primaryBtnText}>
                {submitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function prevStep(s: Step): Step {
  if (s === 'phone') return 'method';
  if (s === 'otp') return 'phone';
  if (s === 'terms') return 'otp';
  return 'method';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  backText: { fontFamily: 'Inter_500Medium', color: '#fff', fontSize: 15 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#222',
  },
  progressDotActive: { backgroundColor: '#FF8533' },
  stepContent: { paddingHorizontal: 24 },
  title: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 30,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.3,
    lineHeight: 19,
    marginBottom: 32,
  },
  methodList: { gap: 10, marginBottom: 24 },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  methodIcon: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#fff',
    width: 24,
    textAlign: 'center',
  },
  methodLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.3,
  },
  methodLegal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  phoneWrap: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 18,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
  },
  countryFlag: { fontSize: 20 },
  countryCodeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 22,
    color: '#fff',
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  otpInput: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 38,
    color: '#fff',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    paddingVertical: 22,
    letterSpacing: 12,
    marginBottom: 22,
  },
  primaryBtn: {
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: '#2a2a2a',
    shadowOpacity: 0,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  linkBtn: { paddingVertical: 12, alignItems: 'center' },
  linkText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FF8533',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  rulesCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
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
  ruleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  ruleX: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ef4444',
    marginTop: 2,
  },
  ruleText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#cccccc',
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
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: '#FF8533',
    borderColor: '#FF8533',
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
    color: '#cccccc',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  linkInline: { color: '#FF8533', fontFamily: 'Inter_600SemiBold' },
});
