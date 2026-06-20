import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { usePaymentMethod, type CardBrand } from '../state/payment-method';

// Phase-1 placeholder card to add when none is on file (no Stripe yet — brand +
// last4 only, persisted via the payment-method store → Supabase).
const PLACEHOLDER_CARD: { brand: CardBrand; last4: string } = { brand: 'Visa', last4: '4242' };

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { card, save, clear } = usePaymentMethod();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Payment Methods</Text>
        </View>

        <Text style={styles.sectionLabel}>YOUR CARDS</Text>

        {card ? (
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>💳</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{card.brand} ····  {card.last4}</Text>
                <Text style={styles.cardExpiry}>Saved for future checks</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.primaryBadge}
              onPress={() => clear()}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBadgeText}>REMOVE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.emptyText}>No card on file yet.</Text>
        )}

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => save(PLACEHOLDER_CARD.brand, PLACEHOLDER_CARD.last4)}
        >
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>ADD NEW CARD</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Cards will be securely stored with Stripe. We never store your full card number.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: { fontFamily: 'Inter_500Medium', color: '#ffffff', fontSize: 15, marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#ffffff', letterSpacing: 0.4 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0d0d0d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  cardExpiry: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.3,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  primaryBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  primaryBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 22,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#00FF7F',
    borderStyle: 'dashed',
  },
  addBtnPlus: { fontSize: 18, color: '#00FF7F' },
  addBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#00FF7F',
    letterSpacing: 2,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});
