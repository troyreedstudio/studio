import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { View } from 'react-native';

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
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
        }}
      />
    </>
  );
}
