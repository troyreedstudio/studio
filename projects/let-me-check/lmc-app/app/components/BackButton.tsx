import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../lib/theme';

/**
 * Standard iOS-style back affordance used across the app: a red chevron + "Back".
 * Falls back to an explicit route when there's no navigation history (e.g. a
 * screen reached via router.replace), so the user is never stranded.
 *
 * NOTE: this is for plain "go back" navigation only. Screens where the top-left
 * control ABANDONS an in-progress action (payment, searching for a Scout) keep
 * their "Cancel" button — that's a different action, not a back.
 */
export function BackButton({
  fallback,
  label = 'Back',
  style,
}: {
  fallback?: string;
  label?: string;
  style?: ViewStyle;
}) {
  const router = useRouter();
  const onPress = () => {
    if (router.canGoBack()) router.back();
    else if (fallback) router.replace(fallback as never);
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 16 }}
      style={[styles.row, style]}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={22} color={colors.red} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  label: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 15,
    letterSpacing: 0.2,
    marginLeft: -2,
  },
});
