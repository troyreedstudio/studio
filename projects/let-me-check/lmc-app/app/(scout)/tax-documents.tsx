import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TaxDocumentsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tax Documents</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Your annual tax forms</Text>
        </View>

        {/* Main message card */}
        <View style={styles.infoCard}>
          <Ionicons name="document-text-outline" size={36} color="rgba(255,255,255,0.35)" />
          <Text style={styles.infoTitle}>No documents yet</Text>
          <Text style={styles.infoBody}>
            Your 1099-NEC tax document will appear here after you earn $600 in a calendar year.
          </Text>
        </View>

        {/* Explainer */}
        <Text style={styles.sectionLabel}>HOW TAX FORMS WORK</Text>
        <View style={styles.explainerCard}>
          {[
            {
              icon: 'calendar-outline' as const,
              title: 'Issued each January',
              body: 'If you earn $600 or more as a Scout in a calendar year, a 1099-NEC is generated for that tax year.',
            },
            {
              icon: 'business-outline' as const,
              title: 'Issued by Stripe',
              body: 'Tax forms are prepared and delivered by Stripe Connect, our payment partner. You will receive an email from Stripe when yours is ready.',
            },
            {
              icon: 'person-outline' as const,
              title: 'Independent contractor',
              body: 'As an independent contractor, you are responsible for your own quarterly estimated taxes. The 1099-NEC reports your gross Scout earnings.',
            },
            {
              icon: 'shield-checkmark-outline' as const,
              title: 'W-9 on file',
              body: 'Your W-9 information was collected by Stripe during onboarding. Let Me Check never stores your Social Security Number.',
            },
          ].map((item, i) => (
            <View
              key={i}
              style={[styles.row, i > 0 && styles.rowBorder]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowText}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.foot}>
          Questions about your taxes? Email support@letmecheck.app or consult a tax professional.
        </Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingBottom: 32 },

  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  titleRule: {
    height: 2,
    width: 32,
    backgroundColor: '#00FF7F',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    letterSpacing: 0.2,
  },

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  infoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  infoBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 21,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
    paddingHorizontal: 22,
    marginBottom: 12,
  },

  explainerCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  rowText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
    letterSpacing: 0.2,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
