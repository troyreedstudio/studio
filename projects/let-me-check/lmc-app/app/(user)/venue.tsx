import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

export default function VenueScreen() {
  const router = useRouter();
  const { name = 'Komodo', city = 'Miami' } = useLocalSearchParams<{ name: string; city: string }>();
  const [selectedTier, setSelectedTier] = useState<'standard' | 'priority'>('standard');

  const tier = selectedTier === 'standard'
    ? { price: '$15', time: '15 min', label: 'Standard' }
    : { price: '$20', time: '7 min', label: 'Priority' };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.venueName}>{name}</Text>
          <Text style={styles.venueCity}>{city}</Text>
        </View>

        {/* Photo Placeholder */}
        <View style={styles.photoArea}>
          <Text style={styles.photoLabel}>📸 LIVE PREVIEW</Text>
          <Text style={styles.photoSub}>Real footage available after check</Text>
        </View>

        {/* Live Status */}
        <View style={styles.liveStatus}>
          <View style={styles.liveBlip} />
          <Text style={styles.liveText}>LIVE CHECKS AVAILABLE</Text>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>🕐 Checkers Nearby</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>⚡ Fast Delivery</Text>
          </View>
        </View>

        {/* Tier Cards */}
        <Text style={styles.sectionTitle}>SELECT YOUR TIER</Text>
        <View style={styles.tierRow}>
          <TouchableOpacity
            style={[styles.tierCard, selectedTier === 'standard' && styles.tierCardActive]}
            onPress={() => setSelectedTier('standard')}
            activeOpacity={0.8}
          >
            <Text style={styles.tierLabel}>Standard</Text>
            <Text style={styles.tierPrice}>$15</Text>
            <Text style={styles.tierTime}>~15 min</Text>
            <Text style={styles.tierDesc}>HD video clip of the venue</Text>
            {selectedTier === 'standard' && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tierCard, selectedTier === 'priority' && styles.tierCardPriorityActive]}
            onPress={() => setSelectedTier('priority')}
            activeOpacity={0.8}
          >
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>PRIORITY</Text>
            </View>
            <Text style={styles.tierLabel}>Priority</Text>
            <Text style={styles.tierPrice}>$20</Text>
            <Text style={styles.tierTime}>~7 min</Text>
            <Text style={styles.tierDesc}>Rush delivery + priority checker</Text>
            {selectedTier === 'priority' && (
              <View style={[styles.selectedBadge, styles.selectedBadgeAmber]}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaSummary}>
          <Text style={styles.ctaSummaryText}>{tier.label} · {tier.price} · ~{tier.time}</Text>
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() =>
            router.push({
              pathname: '/(user)/payment',
              params: { venue: name, city, tier: selectedTier, price: tier.price, time: tier.time },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>REQUEST CHECK</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#888', fontSize: 16 },
  venueName: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  venueCity: { fontSize: 14, color: '#888' },
  photoArea: {
    marginHorizontal: 20,
    height: 200,
    backgroundColor: '#111',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  photoLabel: { fontSize: 16, color: '#444', marginBottom: 8 },
  photoSub: { fontSize: 12, color: '#333' },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  liveBlip: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  liveText: { fontSize: 13, color: '#22c55e', fontWeight: '700', letterSpacing: 1.5 },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  infoChip: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  infoChipText: { color: '#888', fontSize: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tierRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#222',
    minHeight: 160,
  },
  tierCardActive: {
    borderColor: '#fff',
    backgroundColor: '#151515',
  },
  tierCardPriorityActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#151200',
  },
  priorityBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  priorityBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  tierLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  tierPrice: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 2 },
  tierTime: { fontSize: 13, color: '#22c55e', fontWeight: '600', marginBottom: 8 },
  tierDesc: { fontSize: 11, color: '#666', lineHeight: 16 },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeAmber: { backgroundColor: '#f59e0b' },
  selectedBadgeText: { fontSize: 12, fontWeight: '800', color: '#000' },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    padding: 20,
    paddingBottom: 36,
  },
  ctaSummary: { marginBottom: 10 },
  ctaSummaryText: { color: '#888', fontSize: 13, textAlign: 'center' },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
