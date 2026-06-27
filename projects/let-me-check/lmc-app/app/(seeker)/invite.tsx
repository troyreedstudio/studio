import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Share,
  Platform,
  ToastAndroid,
  Alert,
  StatusBar,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyReferral, type ReferralStats } from '../lib/referrals';
import { colors } from '../lib/theme';

// Deep-link base URL for referral invites.
// The onboarding flow reads the ?ref= param at quick-finish.tsx.
const INVITE_BASE_URL = 'https://letmecheck.app/join';

function buildShareMessage(code: string): string {
  return (
    `Know before you go. I use Let Me Check to see any venue live, on demand. ` +
    `Use my code ${code} when you sign up and you'll get credits on your first check. ` +
    `${INVITE_BASE_URL}?ref=${code}`
  );
}

export default function InviteScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyReferral().then((data) => {
      if (!cancelled) {
        setStats(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!stats?.code) return;
    await Clipboard.setStringAsync(stats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Code copied', ToastAndroid.SHORT);
    }
  }, [stats?.code]);

  const handleShare = useCallback(async () => {
    if (!stats?.code) return;
    try {
      await Share.share({
        message: buildShareMessage(stats.code),
        url: `${INVITE_BASE_URL}?ref=${stats.code}`,
        title: 'Join me on Let Me Check',
      });
    } catch {
      Alert.alert('Could not open share sheet', 'Try copying the code instead.');
    }
  }, [stats?.code]);

  const code = stats?.code ?? '';
  const invited = stats?.invited ?? 0;
  const joined = stats?.joined ?? 0;
  const creditsCents = stats?.creditsCents ?? 0;
  const creditsDisplay = creditsCents === 0 ? '0' : `$${(creditsCents / 100).toFixed(0)}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Invite Friends</Text>
        </View>

        {/* Reward card — copy describes the mechanic; amounts come from referral_config */}
        <View style={styles.rewardCard}>
          <View style={styles.rewardIconWrap}>
            <Ionicons name="gift-outline" size={30} color={colors.red} />
          </View>
          <Text style={styles.rewardTitle}>Give credits, get credits</Text>
          <Text style={styles.rewardSub}>
            Friends who sign up with your code get credits toward their first check.
            You earn credits when they complete their first one.
          </Text>
        </View>

        {/* Referral code */}
        <Text style={styles.sectionLabel}>YOUR REFERRAL CODE</Text>
        <View style={styles.codeCard}>
          {loading ? (
            <Text style={styles.codePlaceholder}>Loading...</Text>
          ) : (
            <Text style={styles.codeText}>{code || 'Generating...'}</Text>
          )}
          <TouchableOpacity
            style={[styles.copyBtn, (loading || !code) && styles.copyBtnDisabled]}
            activeOpacity={0.7}
            onPress={handleCopy}
            disabled={loading || !code}
          >
            <Text style={styles.copyBtnText}>{copied ? 'COPIED' : 'COPY'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{loading ? '--' : String(invited)}</Text>
            <Text style={styles.statLabel}>Invited</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{loading ? '--' : String(joined)}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{loading ? '--' : creditsDisplay}</Text>
            <Text style={styles.statLabel}>Credits</Text>
          </View>
        </View>

        {/* Share */}
        <Text style={styles.sectionLabel}>SHARE</Text>
        <View style={styles.shareButtons}>
          <TouchableOpacity
            style={[styles.shareBtn, (loading || !code) && styles.shareBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleCopy}
            disabled={loading || !code}
          >
            <Ionicons name="copy-outline" size={22} color={colors.red} />
            <Text style={styles.shareBtnText}>{copied ? 'Copied' : 'Copy code'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareBtn, (loading || !code) && styles.shareBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleShare}
            disabled={loading || !code}
          >
            <Ionicons name="share-outline" size={22} color={colors.red} />
            <Text style={styles.shareBtnText}>Share link</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Credits apply when your friend completes their first check.
          Amounts are set by Let Me Check and may vary.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 15,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  rewardCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: colors.red,
    marginBottom: 24,
    alignItems: 'center',
  },
  rewardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(218,37,29,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rewardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
  },
  codeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  codePlaceholder: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.textTertiary,
  },
  copyBtn: {
    backgroundColor: colors.red,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  copyBtnDisabled: {
    backgroundColor: colors.surface,
  },
  copyBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  shareButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareBtnDisabled: {
    opacity: 0.4,
  },
  shareBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
