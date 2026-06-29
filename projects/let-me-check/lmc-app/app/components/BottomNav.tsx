import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../lib/theme';

/**
 * Persistent bottom navigation for the hub screens. Tapping a tab replaces the
 * stack to that hub so the user can always reach Home / Activity / Profile
 * (Seeker) or Dashboard / Earnings / Profile (Scout) from anywhere on a hub.
 *
 * Rendered per-hub (not a router Tabs layout) to avoid restructuring the route
 * groups + the many existing deep links. Focused task flows (search, payment,
 * filming, …) are pushed on top and simply don't render this bar.
 */
type TabKey = string;
type Tab = { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; route: string };

const SEEKER_TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'map-outline', route: '/(seeker)/home' },
  { key: 'activity', label: 'Activity', icon: 'time-outline', route: '/(seeker)/history' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', route: '/(seeker)/profile' },
];

const SCOUT_TABS: Tab[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', route: '/(scout)/dashboard' },
  { key: 'earnings', label: 'Earnings', icon: 'cash-outline', route: '/(scout)/earnings' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', route: '/(scout)/profile' },
];

export function BottomNav({
  variant,
  active,
  floating = false,
  onActivePress,
}: {
  variant: 'seeker' | 'scout';
  active: TabKey;
  /** floating=true adds a translucent shadow so it reads over a map. */
  floating?: boolean;
  /** Called when the ALREADY-active tab is tapped (e.g. tap Home on Home to reset it). */
  onActivePress?: () => void;
}) {
  const router = useRouter();
  const tabs = variant === 'seeker' ? SEEKER_TABS : SCOUT_TABS;
  return (
    <View style={[styles.bar, floating && styles.barFloating]}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        const tint = isActive ? colors.red : colors.textTertiary;
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => {
              if (!isActive) router.replace(t.route as never);
              else onActivePress?.();
            }}
          >
            <Ionicons name={t.icon} size={23} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
    paddingBottom: 30, // clears the home indicator / safe area
    paddingHorizontal: 6,
  },
  barFloating: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
