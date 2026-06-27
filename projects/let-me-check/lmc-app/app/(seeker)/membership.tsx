import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

type Tier = {
  id: 'free' | 'plus' | 'pro';
  name: string;
  price: string;
  per: string;
  tagline: string;
  features: { text: string; included: boolean }[];
  cta: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Pay-as-you-go',
    price: '$0',
    per: 'free',
    tagline: 'Just pay per check. No commitment.',
    features: [
      { text: '$15 Standard · $20 Priority per check', included: true },
      { text: 'Delivery in 7–10 minutes', included: true },
      { text: '15-second verified video', included: true },
      { text: 'Save up to 5 places', included: true },
      { text: 'Standard support', included: true },
      { text: 'Recurring scheduled checks', included: false },
      { text: 'Priority dispatch (faster Scouts)', included: false },
      { text: 'Premium video quality (4K)', included: false },
    ],
    cta: 'CURRENT PLAN',
  },
  {
    id: 'plus',
    name: 'LMC Plus',
    price: '$29',
    per: '/ month',
    tagline: '10 checks a month. Save $121.',
    featured: true,
    features: [
      { text: '10 Standard checks included', included: true },
      { text: 'Additional checks at $12 (was $15)', included: true },
      { text: 'Save unlimited places', included: true },
      { text: 'Recurring scheduled checks', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Watch any check delivered to you, ever', included: true },
      { text: 'Priority dispatch (faster Scouts)', included: false },
      { text: 'Premium video quality (4K)', included: false },
    ],
    cta: 'UPGRADE TO PLUS',
  },
  {
    id: 'pro',
    name: 'LMC Pro',
    price: '$79',
    per: '/ month',
    tagline: 'Unlimited Standard. 5 Priority.',
    features: [
      { text: 'Unlimited Standard checks', included: true },
      { text: '5 Priority checks / month', included: true },
      { text: 'Save unlimited places', included: true },
      { text: 'Recurring scheduled checks', included: true },
      { text: 'Priority dispatch (faster Scouts)', included: true },
      { text: 'Premium video quality (4K)', included: true },
      { text: 'Dedicated concierge support', included: true },
      { text: 'API access for businesses', included: true },
    ],
    cta: 'UPGRADE TO PRO',
  },
];

export default function MembershipScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<Tier['id']>('plus');

  const handleUpgrade = (tier: Tier) => {
    if (tier.id === 'free') return;
    Alert.alert(
      `${tier.name} — ${tier.price}${tier.per}`,
      `In production this would open the Apple/Google subscription flow.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroIconWrap}>
            <View style={styles.heroIcon}>
              <Ionicons name="eye" size={28} color={colors.red} />
            </View>
          </View>
          <Text style={styles.title}>Upgrade your eyes.</Text>
          <Text style={styles.subtitle}>
            More checks, lower per-check price, and Priority dispatch.
          </Text>

          {TIERS.map((tier) => {
            const isSelected = selectedId === tier.id;
            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.tierCard,
                  isSelected && styles.tierCardSelected,
                  tier.featured && styles.tierCardFeatured,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedId(tier.id)}
              >
                {tier.featured && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{tier.price}</Text>
                    <Text style={styles.per}>{tier.per}</Text>
                  </View>
                </View>
                <Text style={styles.tagline}>{tier.tagline}</Text>

                <View style={styles.divider} />

                {tier.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons
                      name={f.included ? 'checkmark-circle' : 'close-circle-outline'}
                      size={16}
                      color={f.included ? colors.verified : colors.border}
                    />
                    <Text
                      style={[
                        styles.featureText,
                        !f.included && styles.featureTextDisabled,
                      ]}
                    >
                      {f.text}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={[
                    styles.cta,
                    tier.id === 'free' && styles.ctaFree,
                    tier.id !== 'free' && ctaGlowShadow,
                  ]}
                  onPress={() => handleUpgrade(tier)}
                  disabled={tier.id === 'free'}
                  activeOpacity={0.85}
                >
                  {tier.id !== 'free' && <CtaGlow radius={12} />}
                  <Text style={[styles.ctaText, tier.id === 'free' && styles.ctaTextFree]}>
                    {tier.cta}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.foot}>
            Cancel anytime in Settings. Charged via your Apple ID. Auto-renews monthly.
            Unused checks roll over for 30 days.
          </Text>
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 48 },
  heroIconWrap: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(218,37,29,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  tierCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    position: 'relative',
  },
  tierCardSelected: {
    borderColor: colors.red,
    backgroundColor: 'rgba(218,37,29,0.03)',
  },
  tierCardFeatured: {
    borderColor: colors.red,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.red,
  },
  popularBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.onRed,
    letterSpacing: 1.5,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tierName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  price: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
  },
  per: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textPrimary,
    letterSpacing: 0.1,
    lineHeight: 17,
  },
  featureTextDisabled: { color: colors.textTertiary },
  cta: {
    marginTop: 14,
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaFree: { backgroundColor: colors.surface },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 12,
    letterSpacing: 2,
  },
  ctaTextFree: { color: colors.textTertiary },
  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
    paddingHorizontal: 12,
  },
});
