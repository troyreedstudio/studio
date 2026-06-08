import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const SETTINGS = [
  { id: 'delivered', label: 'Check Delivered', sub: 'When your video is ready to watch', defaultValue: true },
  { id: 'scout-assigned', label: 'Scout Assigned', sub: 'When a Scout accepts your request', defaultValue: true },
  { id: 'reminder', label: 'Re-check Reminders', sub: 'For places you check often', defaultValue: false },
  { id: 'trending', label: 'Trending Near You', sub: 'When queues spike at a venue you watch', defaultValue: false },
  { id: 'promotions', label: 'Promotions & Credits', sub: 'New cities, referral bonuses, deals', defaultValue: true },
  { id: 'marketing', label: 'LMC Updates', sub: 'Product news and new features', defaultValue: false },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, boolean>>(
    SETTINGS.reduce((acc, s) => ({ ...acc, [s.id]: s.defaultValue }), {})
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Choose what you want to hear from us</Text>
        </View>

        <Text style={styles.sectionLabel}>YOUR PREFERENCES</Text>
        <View style={styles.list}>
          {SETTINGS.map((s, i) => (
            <View
              key={s.id}
              style={[styles.row, i < SETTINGS.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{s.label}</Text>
                <Text style={styles.rowSub}>{s.sub}</Text>
              </View>
              <Switch
                value={values[s.id]}
                onValueChange={(v) => setValues((prev) => ({ ...prev, [s.id]: v }))}
                trackColor={{ false: '#222', true: '#88B4FF' }}
                thumbColor={values[s.id] ? '#fff' : '#666'}
              />
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          Push and email notifications follow these preferences. SMS notifications are sent only for urgent updates (Scout missed delivery, payment issue).
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
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#fff', letterSpacing: 0.4, marginBottom: 5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888', letterSpacing: 0.3 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#88B4FF',
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  list: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  rowText: { flex: 1 },
  rowLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  rowSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#888',
    letterSpacing: 0.2,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
