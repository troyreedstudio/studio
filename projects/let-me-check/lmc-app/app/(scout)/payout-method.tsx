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

type ConnectState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'not_onboarded' }
  | { phase: 'active'; payoutsEnabled: boolean; payoutSpeed: 'standard' | 'instant' }
  | { phase: 'action_needed' };

export default function PayoutMethodScreen() {
  const router = useRouter();
  const [state, setState] = useState<ConnectState>({ phase: 'loading' });
  const [opening, setOpening] = useState(false);

  const load = () => {
    setState({ phase: 'loading' });
    getConnectStatus()
      .then((status) => {
        if (!status.eligible && !status.chargesEnabled) {
          setState({ phase: 'not_onboarded' });
        } else if (status.chargesEnabled && status.payoutsEnabled) {
          setState({
            phase: 'active',
            payoutsEnabled: status.payoutsEnabled,
            payoutSpeed: status.payoutSpeed,
          });
        } else {
          // chargesEnabled but something still pending — Stripe flagged
          setState({ phase: 'action_needed' });
        }
      })
      .catch((e) => {
        setState({
          phase: 'error',
          message: e instanceof Error ? e.message : 'Could not load payout status.',
        });
      });
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenStripe = async () => {
    setOpening(true);
    try {
      const { url } = await startConnectOnboarding();
      await WebBrowser.openAuthSessionAsync(url, 'lmc://');
      // After browser closes, re-check status
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
          <Text style={styles.title}>Payout Method</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Your bank account for Scout earnings</Text>
        </View>

        {state.phase === 'loading' && (
          <View style={styles.centerWrap}>
            <ActivityIndicator color="#00FF7F" />
            <Text style={styles.loadingText}>Checking payout status...</Text>
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

        {state.phase === 'not_onboarded' && (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="card-outline" size={28} color="rgba(255,255,255,0.4)" />
              <Text style={styles.infoTitle}>No payout method set up</Text>
              <Text style={styles.infoBody}>
                Connect a bank account via Stripe to receive your earnings. Takes about 5 minutes. Let Me Check never stores your banking details — Stripe handles everything securely.
              </Text>
            </View>

            <View style={styles.trustList}>
              {[
                'Bank-level 256-bit encryption',
                'PCI DSS Level 1 compliant',
                'Your banking details go directly to Stripe',
              ].map((item) => (
                <View key={item} style={styles.trustRow}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#00FF7F" />
                  <Text style={styles.trustText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, opening && styles.primaryBtnDisabled]}
              onPress={handleOpenStripe}
              disabled={opening}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color={opening ? 'rgba(255,255,255,0.35)' : '#000'} />
              <Text style={[styles.primaryBtnText, opening && styles.primaryBtnTextDim]}>
                {opening ? 'OPENING STRIPE...' : 'SET UP PAYOUTS'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {state.phase === 'active' && (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusDotWrap}>
                  <View style={styles.statusDotGreen} />
                </View>
                <View style={styles.statusBody}>
                  <Text style={styles.statusTitle}>Payout account active</Text>
                  <Text style={styles.statusSub}>
                    {state.payoutSpeed === 'instant'
                      ? 'Instant payouts enabled (~30 min, 2% fee)'
                      : 'Standard payouts (1 to 2 business days, no fee)'}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#00FF7F" />
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>STATUS</Text>
                <Text style={styles.detailValue}>Charges enabled</Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>PAYOUTS</Text>
                <Text style={styles.detailValue}>
                  {state.payoutsEnabled ? 'Enabled' : 'Pending'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>SPEED</Text>
                <Text style={styles.detailValue}>
                  {state.payoutSpeed === 'instant' ? 'Instant' : 'Standard'}
                </Text>
              </View>
            </View>

            <Text style={styles.manageNote}>
              To change your bank account or update your payout speed, open your Stripe dashboard below.
            </Text>

            <TouchableOpacity
              style={[styles.secondaryBtn, opening && styles.secondaryBtnDisabled]}
              onPress={handleOpenStripe}
              disabled={opening}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={15} color={opening ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)'} />
              <Text style={[styles.secondaryBtnText, opening && styles.secondaryBtnTextDim]}>
                {opening ? 'OPENING STRIPE...' : 'MANAGE IN STRIPE'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {state.phase === 'action_needed' && (
          <>
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={24} color="#FFCB47" />
              <Text style={styles.warningTitle}>Action needed</Text>
              <Text style={styles.warningBody}>
                Stripe needs additional information to enable your payouts. Open your Stripe dashboard to complete the required steps.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, opening && styles.primaryBtnDisabled]}
              onPress={handleOpenStripe}
              disabled={opening}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color={opening ? 'rgba(255,255,255,0.35)' : '#000'} />
              <Text style={[styles.primaryBtnText, opening && styles.primaryBtnTextDim]}>
                {opening ? 'OPENING STRIPE...' : 'COMPLETE IN STRIPE'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.foot}>
          Payouts powered by Stripe Connect Express. Let Me Check never stores your bank credentials.
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

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  infoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  infoBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  trustList: {
    marginHorizontal: 22,
    marginBottom: 28,
    gap: 10,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
  },

  statusCard: {
    backgroundColor: 'rgba(0,255,127,0.06)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.25)',
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDotWrap: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF7F',
  },
  statusBody: { flex: 1 },
  statusTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  statusSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },

  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    marginHorizontal: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.8,
  },
  detailValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  manageNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 22,
    marginBottom: 16,
    lineHeight: 18,
    letterSpacing: 0.2,
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

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 14,
  },
  secondaryBtnDisabled: {
    opacity: 0.5,
  },
  secondaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    letterSpacing: 2.5,
  },
  secondaryBtnTextDim: {
    color: 'rgba(255,255,255,0.3)',
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 8,
  },
});
