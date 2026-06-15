import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const CARDS = [
  { id: '1', brand: 'Visa', last4: '4242', name: 'Troy Reed', expiry: '08/29', primary: true },
  { id: '2', brand: 'Mastercard', last4: '8821', name: 'Troy Reed', expiry: '03/27', primary: false },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();

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
        {CARDS.map((card) => (
          <View key={card.id} style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>💳</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{card.brand} ····  {card.last4}</Text>
                <Text style={styles.cardExpiry}>{card.name} · Expires {card.expiry}</Text>
              </View>
            </View>
            {card.primary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>ADD NEW CARD</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Cards are securely stored with Stripe. We never store your full card number.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: { fontFamily: 'Inter_500Medium', color: '#fff', fontSize: 15, marginBottom: 16 },
  title: { fontFamily: 'BodoniModa_700Bold', fontSize: 28, color: '#fff', letterSpacing: 0.4 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
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
    borderColor: '#1e1e1e',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  cardExpiry: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.3,
  },
  primaryBadge: {
    backgroundColor: 'rgba(255,133,51,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,133,51,0.4)',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  primaryBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FF8533',
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
    borderColor: '#FF8533',
    borderStyle: 'dashed',
  },
  addBtnPlus: { fontSize: 18, color: '#FF8533' },
  addBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#FF8533',
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
