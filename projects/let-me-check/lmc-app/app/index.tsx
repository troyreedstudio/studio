import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../assets/splash-assets/miami-night.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.monogramFrame}>
            <View style={styles.ruleLine} />
            <Text style={styles.monogram}>LMC</Text>
            <View style={styles.ruleLine} />
          </View>

          <Text style={styles.brandSerif}>LET ME CHECK</Text>

          <Text style={styles.tagline}>KNOW BEFORE YOU GO</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(seeker)/home')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>I'm a Seeker</Text>
            <Text style={styles.primaryButtonSub}>Order a 30-sec video check</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/(scout)/dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.outlineButtonText}>I'm a Scout</Text>
            <Text style={styles.outlineButtonSub}>Film checks · earn cash</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>REAL EYES   ·   RIGHT NOW   ·   ANYWHERE</Text>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 24,
  },
  hero: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 200,
  },
  monogramFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 35,
  },
  ruleLine: {
    height: 1.5,
    width: 48,
    backgroundColor: '#F47B20',
  },
  monogram: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#F47B20',
    letterSpacing: 8,
    marginHorizontal: 18,
  },
  brandSerif: {
    fontFamily: 'GFSDidot_400Regular',
    fontSize: 40,
    color: '#ffffff',
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 48,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 6,
    textAlign: 'center',
  },
  buttons: {
    gap: 14,
  },
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 4,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  primaryButtonSub: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(0,0,0,0.6)',
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    fontFamily: 'Inter_500Medium',
    color: '#ffffff',
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  outlineButtonSub: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  footer: {
    fontFamily: 'Inter_300Light',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.95)',
    fontSize: 9,
    letterSpacing: 4,
    marginTop: 28,
  },
});
