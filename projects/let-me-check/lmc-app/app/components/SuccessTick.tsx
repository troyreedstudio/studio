import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

export default function SuccessTick() {
  return (
    <View style={styles.ring}>
      <View style={styles.circle}>
        <Ionicons name="checkmark" size={32} color={colors.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(22,163,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
