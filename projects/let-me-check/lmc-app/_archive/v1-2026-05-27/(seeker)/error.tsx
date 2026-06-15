import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

type ErrorType = 'no-scouts' | 'payment-declined' | 'connection' | 'missed-window';

const ERRORS: Record<ErrorType, {
  emoji: string;
  title: string;
  message: string;
  primaryLabel: string;
  primaryRoute: string;
  secondaryLabel: string;
}> = {
  'no-scouts': {
    emoji: '🔍',
    title: 'No Scouts Available',
    message: "We couldn't find a Scout near this location right now. You haven't been charged. Try again in a few minutes or pick a different place.",
    primaryLabel: 'TRY AGAIN',
    primaryRoute: '/(seeker)/home',
    secondaryLabel: 'Back to Home',
  },
  'payment-declined': {
    emoji: '💳',
    title: 'Payment Declined',
    message: 'Your card was declined. No charge was made. Try a different card or contact your bank.',
    primaryLabel: 'TRY ANOTHER CARD',
    primaryRoute: '/(seeker)/payment-methods',
    secondaryLabel: 'Back to Home',
  },
  'connection': {
    emoji: '📡',
    title: 'Connection Lost',
    message: "Looks like you're offline. Check your connection and try again.",
    primaryLabel: 'RETRY',
    primaryRoute: '/(seeker)/home',
    secondaryLabel: 'Back to Home',
  },
  'missed-window': {
    emoji: '⏱️',
    title: 'Scout Missed the Window',
    message: 'Your Scout did not deliver in time. You have been refunded automatically and the Scout has been warned. Sorry about that.',
    primaryLabel: 'REQUEST AGAIN',
    primaryRoute: '/(seeker)/home',
    secondaryLabel: 'Back to Home',
  },
};

export default function ErrorScreen() {
  const router = useRouter();
  const { type = 'no-scouts' } = useLocalSearchParams<{ type: ErrorType }>();
  const err = ERRORS[type as ErrorType] || ERRORS['no-scouts'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.emoji}>{err.emoji}</Text>
        </View>

        <Text style={styles.title}>{err.title}</Text>
        <Text style={styles.message}>{err.message}</Text>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace(err.primaryRoute as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{err.primaryLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(seeker)/home')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>{err.secondaryLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  emoji: { fontSize: 44 },
  title: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 26,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
    marginBottom: 38,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  secondaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Inter_500Medium',
    color: '#888',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
