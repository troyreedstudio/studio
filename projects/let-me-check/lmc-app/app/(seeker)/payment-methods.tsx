// TODO (post-v1): real Stripe card management — list saved cards, set default,
// remove cards via the Stripe Customer Portal or a custom UI backed by
// stripe-list-payment-methods / stripe-detach-payment-method Edge Functions.
// For v1 the Stripe PaymentSheet (in payment.tsx) handles card capture and
// saving directly; this screen is kept as a placeholder only.

import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/BackButton';
import { usePaymentMethod } from '../state/payment-method';
import { colors } from '../lib/theme';

export default function PaymentMethodsScreen() {
  const { card, clear } = usePaymentMethod();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton fallback="/(seeker)/home" />
          <Text style={styles.title}>Payment Methods</Text>
        </View>

        <Text style={styles.sectionLabel}>YOUR CARDS</Text>

        {card ? (
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.cardIcon}>
                <Ionicons name="card-outline" size={20} color={colors.red} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{card.brand} ····  {card.last4}</Text>
                <Text style={styles.cardExpiry}>To use a different card, choose or add one at checkout</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No card on file yet. Cards are saved automatically when you complete a check.</Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          Cards are securely stored with Stripe. We never store your full card number.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: -0.4,
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardEmoji: { /* replaced by Ionicons card-outline */ },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  cardExpiry: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  emptyCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  removeBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.danger,
    letterSpacing: 1.5,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.3,
    marginTop: 16,
  },
});
