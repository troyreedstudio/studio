import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { BackButton } from '../components/BackButton';

export default function TaxDocumentsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <BackButton fallback="/(scout)/profile" />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tax Documents</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Your annual tax forms</Text>
        </View>

        {/* Main message card */}
        <View style={styles.infoCard}>
          <Ionicons name="document-text-outline" size={36} color={colors.textTertiary} />
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
                <Ionicons name={item.icon} size={18} color={colors.red} />
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
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },

  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  titleRule: {
    height: 2,
    width: 32,
    backgroundColor: colors.red,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 22,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  infoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  infoBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    paddingHorizontal: 22,
    marginBottom: 12,
  },

  explainerCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(218,37,29,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(218,37,29,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  rowText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 19,
    letterSpacing: 0.2,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
