import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/api';

const CITIES = [
  { id: 'mia', name: 'Miami', region: 'Florida, USA' },
  { id: 'nyc', name: 'New York', region: 'New York, USA' },
  { id: 'lax', name: 'Los Angeles', region: 'California, USA' },
  { id: 'lon', name: 'London', region: 'United Kingdom' },
  { id: 'dxb', name: 'Dubai', region: 'United Arab Emirates' },
  { id: 'sfo', name: 'San Francisco', region: 'California, USA' },
  { id: 'chi', name: 'Chicago', region: 'Illinois, USA' },
  { id: 'atl', name: 'Atlanta', region: 'Georgia, USA' },
];

export default function PreferredCitiesScreen() {
  const router = useRouter();
  // Start empty — real selection loads from the profile on mount.
  const [selected, setSelected] = useState<Set<string>>(new Set<string>());
  // Gate rendering of city rows until saved data has resolved so the UI never
  // shows unselected rows that then snap to the persisted selection.
  const [loaded, setLoaded] = useState(false);

  // Load persisted preferred_cities (text[] in DB) into a Set on mount.
  useEffect(() => {
    getProfile()
      .then((profile) => {
        const saved = (profile as any)?.preferred_cities as string[] | null;
        setSelected(new Set(saved ?? []));
      })
      .catch(() => {
        // Network error keeps an empty set — honest empty state.
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  // Optimistically toggles the local Set and persists the full array to profiles.preferred_cities.
  // Write failures are silent so an offline toggle still reflects the user's choice.
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      (async () => {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        // preferred_cities is not in generated types until Plan 04 regen — cast to any.
        await (supabase as any)
          .from('profiles')
          .update({ preferred_cities: Array.from(next) })
          .eq('id', uid);
      })().catch(() => {});
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
        {loaded && CITIES.map((c) => {
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
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: { fontFamily: 'Inter_500Medium', color: '#ffffff', fontSize: 15, marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#ffffff', letterSpacing: 0.4, marginBottom: 5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888', letterSpacing: 0.3 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#00FF7F',
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
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cityRowActive: {
    borderColor: '#00FF7F',
    backgroundColor: 'rgba(255,133,51,0.05)',
  },
  cityLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  cityPin: { fontSize: 16 },
  cityInfo: { flex: 1 },
  cityName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
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
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
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
