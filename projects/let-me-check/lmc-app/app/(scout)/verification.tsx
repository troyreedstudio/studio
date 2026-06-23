import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getConnectStatus, startConnectOnboarding } from '../lib/payments';

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
            <ActivityIndicator color="#00FF7F" />
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
              <Ionicons name="shield-checkmark" size={36} color="#00FF7F" />
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
              <Ionicons name="time-outline" size={32} color="#FFCB47" />
              <Text style={styles.pendingTitle}>Verification pending</Text>
              <Text style={styles.pendingSub}>
                Stripe is reviewing your details. This usually completes within a few minutes. You can go online once verification is confirmed.
              </Text>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={15} color="rgba(255,255,255,0.7)" />
              <Text style={styles.refreshBtnText}>CHECK AGAIN</Text>
            </TouchableOpacity>
          </>
        )}

        {state.phase === 'action_needed' && (
          <>
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle-outline" size={32} color="#FFCB47" />
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
                color={opening ? 'rgba(255,255,255,0.35)' : '#000'}
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
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingBottom: 32 },

  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
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
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  titleRule: {
    height: 2,
    width: 32,
    backgroundColor: '#00FF7F',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
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
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,100,100,0.9)',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  retryBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 2,
  },

  verifiedCard: {
    backgroundColor: 'rgba(0,255,127,0.06)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.25)',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  verifiedTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#00FF7F',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  verifiedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  explainerCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    marginHorizontal: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  explainerLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
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
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginTop: 7,
    flexShrink: 0,
  },
  explainerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 19,
    letterSpacing: 0.2,
  },

  pendingCard: {
    backgroundColor: 'rgba(255,203,71,0.06)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.25)',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  pendingTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFCB47',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pendingSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
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
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  refreshBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },

  warningCard: {
    backgroundColor: 'rgba(255,203,71,0.07)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.28)',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  warningTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFCB47',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  warningBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 17,
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 12.5,
    letterSpacing: 2.5,
  },
  primaryBtnTextDim: {
    color: 'rgba(255,255,255,0.35)',
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 16,
  },
});
