import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getConnectStatus, startConnectOnboarding } from '../lib/payments';
import { colors } from '../lib/theme';

type VerifyState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'verified' }
  | { phase: 'pending' }
  | { phase: 'action_needed' };

export default function VerificationScreen() {
  const router = useRouter();
  const [state, setState] = useState<VerifyState>({ phase: 'loading' });
  const [opening, setOpening] = useState(false);

  const load = () => {
    setState({ phase: 'loading' });
    getConnectStatus()
      .then((status) => {
        if (status.chargesEnabled && status.payoutsEnabled) {
          setState({ phase: 'verified' });
        } else if (status.eligible) {
          // Account exists but not fully enabled — still processing
          setState({ phase: 'pending' });
        } else {
          // No account or requirements outstanding
          setState({ phase: 'action_needed' });
        }
      })
      .catch((e) => {
        setState({
          phase: 'error',
          message: e instanceof Error ? e.message : 'Could not check verification status.',
        });
      });
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReVerify = async () => {
    setOpening(true);
    try {
      const { url } = await startConnectOnboarding();
      await WebBrowser.openAuthSessionAsync(url, 'lmc://');
      load();
    } catch (e) {
      Alert.alert(
        'Could not open Stripe',
        e instanceof Error ? e.message : 'Please try again in a moment.',
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Identity & Verification</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Your identity status on the Scout network</Text>
        </View>

        {state.phase === 'loading' && (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={colors.red} />
            <Text style={styles.loadingText}>Checking verification status...</Text>
          </View>
        )}

        {state.phase === 'error' && (
          <View style={styles.centerWrap}>
            <Text style={styles.errorText}>{state.message}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryBtnText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}

        {state.phase === 'verified' && (
          <>
            <View style={styles.verifiedCard}>
              <Ionicons name="shield-checkmark" size={36} color={colors.verified} />
              <Text style={styles.verifiedTitle}>Identity verified</Text>
              <Text style={styles.verifiedSub}>
                Your identity was confirmed during Scout onboarding via Stripe's secure verification process.
              </Text>
            </View>

            <View style={styles.explainerCard}>
              <Text style={styles.explainerLabel}>HOW IT WORKS</Text>
              {[
                'Identity is verified once at signup via our payment partner, Stripe.',
                'Stripe verifies your government ID and confirms you are who you say you are.',
                'Let Me Check receives only an approved or denied status — we never see your ID documents.',
                'You would only be asked to re-verify if Stripe flags a compliance requirement.',
              ].map((item, i) => (
                <View key={i} style={styles.explainerRow}>
                  <View style={styles.explainerDot} />
                  <Text style={styles.explainerText}>{item}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {state.phase === 'pending' && (
          <>
            <View style={styles.pendingCard}>
              <Ionicons name="time-outline" size={32} color={colors.danger} />
              <Text style={styles.pendingTitle}>Verification pending</Text>
              <Text style={styles.pendingSub}>
                Stripe is reviewing your details. This usually completes within a few minutes. You can go online once verification is confirmed.
              </Text>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.refreshBtnText}>CHECK AGAIN</Text>
            </TouchableOpacity>
          </>
        )}

        {state.phase === 'action_needed' && (
          <>
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
              <Text style={styles.warningTitle}>Action needed</Text>
              <Text style={styles.warningBody}>
                Stripe has flagged a verification requirement for your account. Open Stripe to review and complete the required steps.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, opening && styles.primaryBtnDisabled]}
              onPress={handleReVerify}
              disabled={opening}
              activeOpacity={0.85}
            >
              <Ionicons
                name="open-outline"
                size={16}
                color={opening ? colors.textTertiary : colors.onRed}
              />
              <Text style={[styles.primaryBtnText, opening && styles.primaryBtnTextDim]}>
                {opening ? 'OPENING STRIPE...' : 'COMPLETE VERIFICATION'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.foot}>
          Identity verification is handled by Stripe. Let Me Check never stores your ID documents.
        </Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },

  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  titleRule: {
    height: 2,
    width: 32,
    backgroundColor: colors.red,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  centerWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 22,
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 2,
  },

  verifiedCard: {
    backgroundColor: 'rgba(22,163,74,0.06)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  verifiedTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: colors.verified,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  verifiedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  explainerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  explainerLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 2,
  },
  explainerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  explainerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.borderStrong,
    marginTop: 7,
    flexShrink: 0,
  },
  explainerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 19,
    letterSpacing: 0.2,
  },

  pendingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  pendingTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.danger,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pendingSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 14,
  },
  refreshBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 2,
  },

  warningCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  warningTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.danger,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  warningBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.red,
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 17,
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 12.5,
    letterSpacing: 2.5,
  },
  primaryBtnTextDim: {
    color: colors.textTertiary,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 16,
  },
});
