import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSavedPlaces } from '../state/saved';

export default function SavedPlacesScreen() {
  const router = useRouter();
  const { list, remove } = useSavedPlaces();

  const handleCheck = (place: { name: string; coord: [number, number]; marketId: string }) => {
    router.replace({
      pathname: '/(seeker)/home',
      params: {
        marketId: place.marketId,
        pinLat: String(place.coord[1]),
        pinLon: String(place.coord[0]),
        pinName: place.name,
      },
    });
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Saved Places</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.subtitle}>
          One-tap checks for spots you watch often.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bookmark-outline" size={36} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={styles.emptyTitle}>No saved places yet</Text>
              <Text style={styles.emptySub}>
                Tap the heart on any &ldquo;Is this your spot?&rdquo; card to save it here.
              </Text>
              <TouchableOpacity
                style={styles.cta}
                activeOpacity={0.85}
                onPress={() => router.replace('/(seeker)/home')}
              >
                <Text style={styles.ctaText}>BACK TO MAP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            list.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="location" size={18} color="#E8A0B0" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{p.name}</Text>
                  {p.address ? <Text style={styles.cardSub}>{p.address}</Text> : null}
                  {p.category ? <Text style={styles.cardCategory}>{p.category}</Text> : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.checkBtn}
                    onPress={() => handleCheck(p)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.checkBtnText}>CHECK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => remove(p.id)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color="rgba(255,255,255,0.55)" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const INDIGO = '#143782';

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
    width: 50,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 22,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 32 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 30,
  },
  cta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 12,
    letterSpacing: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(232,160,176,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  cardCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#E8A0B0',
    letterSpacing: 1.4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkBtn: {
    backgroundColor: INDIGO,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  checkBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 10,
    letterSpacing: 1.4,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
