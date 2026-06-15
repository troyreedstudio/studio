import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const CITIES = [
  { id: 'mia', name: 'Miami', region: 'Florida, USA', scouts: 142 },
  { id: 'nyc', name: 'New York', region: 'New York, USA', scouts: 318 },
  { id: 'lax', name: 'Los Angeles', region: 'California, USA', scouts: 224 },
  { id: 'lon', name: 'London', region: 'United Kingdom', scouts: 187 },
  { id: 'dxb', name: 'Dubai', region: 'United Arab Emirates', scouts: 96 },
  { id: 'sfo', name: 'San Francisco', region: 'California, USA', scouts: 81 },
  { id: 'chi', name: 'Chicago', region: 'Illinois, USA', scouts: 64 },
  { id: 'atl', name: 'Atlanta', region: 'Georgia, USA', scouts: 73 },
];

export default function PreferredCitiesScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(['mia', 'nyc']));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Preferred Cities</Text>
          <Text style={styles.subtitle}>Get trending updates from cities you follow</Text>
        </View>

        <Text style={styles.sectionLabel}>FOLLOW CITIES</Text>
        {CITIES.map((c) => {
          const isSelected = selected.has(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.cityRow, isSelected && styles.cityRowActive]}
              onPress={() => toggle(c.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cityLeft}>
                <Text style={styles.cityPin}>📍</Text>
                <View style={styles.cityInfo}>
                  <Text style={styles.cityName}>{c.name}</Text>
                  <Text style={styles.cityRegion}>{c.region}</Text>
                </View>
              </View>
              <View style={styles.cityRight}>
                <View style={styles.scoutPill}>
                  <View style={styles.scoutDot} />
                  <Text style={styles.scoutCount}>{c.scouts}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.disclaimer}>
          You'll receive trending notifications for cities you follow. {selected.size} {selected.size === 1 ? 'city' : 'cities'} selected.
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
  title: { fontFamily: 'BodoniModa_700Bold', fontSize: 28, color: '#fff', letterSpacing: 0.4, marginBottom: 5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888', letterSpacing: 0.3 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  cityRowActive: {
    borderColor: '#FF8533',
    backgroundColor: 'rgba(255,133,51,0.05)',
  },
  cityLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  cityPin: { fontSize: 16 },
  cityInfo: { flex: 1 },
  cityName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  cityRegion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.3,
  },
  cityRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoutDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22c55e' },
  scoutCount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#22c55e',
    letterSpacing: 0.3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
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
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 12,
  },
});
