import './lib/hermes-fix'; // MUST be first: unmasks the device-release Hermes crash + logs fatals
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Mapbox from '@rnmapbox/maps';
import { useEffect } from 'react';
import { SessionProvider, useSession, hubRouteForRole } from './lib/session';
import { MAPBOX_TOKEN, STRIPE_PUBLISHABLE_KEY } from './lib/config';
import { StripeProvider } from '@stripe/stripe-react-native';

// Token comes from the always-bundled config module (Release builds do NOT inline
// .env, and ExponentConstants is unreliable on device-release — see config.ts).
Mapbox.setAccessToken(MAPBOX_TOKEN);

import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Italiana_400Regular } from '@expo-google-fonts/italiana';
import { CormorantGaramond_300Light, CormorantGaramond_400Regular, CormorantGaramond_500Medium, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Cinzel_400Regular, Cinzel_500Medium, Cinzel_600SemiBold, Cinzel_700Bold, Cinzel_800ExtraBold, Cinzel_900Black } from '@expo-google-fonts/cinzel';
import { TenorSans_400Regular } from '@expo-google-fonts/tenor-sans';
import { JosefinSans_300Light, JosefinSans_400Regular, JosefinSans_500Medium, JosefinSans_600SemiBold } from '@expo-google-fonts/josefin-sans';
import { BodoniModa_400Regular, BodoniModa_700Bold } from '@expo-google-fonts/bodoni-moda';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { LibreCaslonDisplay_400Regular } from '@expo-google-fonts/libre-caslon-display';
import { GFSDidot_400Regular } from '@expo-google-fonts/gfs-didot';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Orbitron_400Regular, Orbitron_500Medium, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Rajdhani_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SairaCondensed_500Medium, SairaCondensed_700Bold, SairaCondensed_900Black } from '@expo-google-fonts/saira-condensed';
import { HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk';
import { View, Text, TouchableOpacity, LogBox } from 'react-native';

// TEMP design-review: silence the on-screen warning banner so it stops covering
// bottom-anchored buttons. Remove with the rest of the review scaffolding.
LogBox.ignoreAllLogs();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Italiana_400Regular,
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_700Bold,
    Cinzel_400Regular,
    Cinzel_500Medium,
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Cinzel_800ExtraBold,
    Cinzel_900Black,
    TenorSans_400Regular,
    JosefinSans_300Light,
    JosefinSans_400Regular,
    JosefinSans_500Medium,
    JosefinSans_600SemiBold,
    BodoniModa_400Regular,
    BodoniModa_700Bold,
    Anton_400Regular,
    DMSerifDisplay_400Regular,
    LibreCaslonDisplay_400Regular,
    GFSDidot_400Regular,
    AbrilFatface_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    Orbitron_400Regular,
    Orbitron_500Medium,
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    SairaCondensed_500Medium,
    SairaCondensed_700Bold,
    SairaCondensed_900Black,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.blackmalibuinc.letmecheck"
      urlScheme="lmc"
    >
      <SessionProvider>
        <StatusBar style="dark" />
        <BootGate />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FFFFFF' },
          }}
        />
        {/* TEMP: visible in this build so Troy can jump to post-match pages (filming,
            delivery, completion) for design review on a Release build. Re-gate to
            `{__DEV__ && ...}` (or remove) before any public/launch build. */}
        <DesignNavOverlay />
      </SessionProvider>
    </StripeProvider>
  );
}

// Routes a signed-in user to their role hub once the session has loaded.
// Signed-out users fall through to the normal entry flow (splash, welcome,
// onboarding, auth). We only redirect INTO a hub from a non-hub group, so we
// never trap the user or fight their in-app navigation.
function BootGate() {
  const { session, profile, loading } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    if (!session) return; // signed out: entry flow owns routing

    const group = segments[0]; // e.g. '(seeker)', '(scout)', 'auth', 'onboarding'
    const inHub = group === '(seeker)' || group === '(scout)';
    // Let the AUTH + ONBOARDING flows own their own routing — otherwise BootGate
    // races the sign-up screen's post-sign-in navigation and both get dropped
    // (Face ID succeeds but nothing happens). BootGate still routes on a cold
    // relaunch (splash/index group), which is the case it's for.
    const inEntryFlow = group === 'onboarding' || group === 'auth';
    // TEMP: don't bounce the design-review Index/jumps back to the hub.
    const inDesignReview = group === 'design-index';
    if (!inHub && !inEntryFlow && !inDesignReview) {
      router.replace(hubRouteForRole(profile?.current_role) as never);
    }
  }, [loading, session, profile, segments, router]);

  return null;
}

// TEMP: design-review only — a floating "Index" button on every screen so Troy can
// always return to /design-index while walking the design. Remove with design-index
// before launch. Hidden on the index screen itself.
function DesignNavOverlay() {
  const router = useRouter();
  const segments = useSegments();
  if (segments[0] === 'design-index') return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, bottom: 34, zIndex: 9999 }}>
      <TouchableOpacity
        onPress={() => router.replace('/design-index')}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(10,10,10,0.82)',
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' }}>☰ Index</Text>
      </TouchableOpacity>
    </View>
  );
}
