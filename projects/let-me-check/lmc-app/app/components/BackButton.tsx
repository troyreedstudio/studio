import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
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
  style,
}: {
  fallback?: string;
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
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 18 }}
      style={[styles.btn, style]}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={26} color={colors.red} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // arrow-only: a clean red chevron, no "Back" label (modern, compact, consistent)
  btn: { alignSelf: 'flex-start', marginLeft: -4 },
});
