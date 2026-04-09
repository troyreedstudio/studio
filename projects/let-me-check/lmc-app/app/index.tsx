import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>LMC</Text>
        <Text style={styles.brand}>Let Me Check</Text>
        <Text style={styles.tagline}>Know Before You Go</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(user)/home')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>I'm a User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.push('/(checker)/dashboard')}
          activeOpacity={0.85}
        >
          <Text style={styles.outlineButtonText}>I'm a Checker</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Powered by real humans, in real time</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 88,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 8,
    marginBottom: 8,
  },
  brand: {
    fontSize: 18,
    color: '#888888',
    letterSpacing: 3,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 14,
    color: '#555555',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttons: {
    gap: 14,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footer: {
    textAlign: 'center',
    color: '#333333',
    fontSize: 12,
    marginTop: 24,
  },
});
