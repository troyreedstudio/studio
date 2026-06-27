import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { requestUserLocation, detectCityByIP, getUserCity } from '../state/location';
import { colors } from '../lib/theme';

type PermKey = 'location' | 'notif';
type PermState = 'pending' | 'granted' | 'skipped';

type Perm = {
  key: PermKey;
  required: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  prompt: string;
  why: string;
  ifDenied: string;
  iosDescription: string;
};

const PERMS: Perm[] = [
  {
    key: 'location',
    required: true,
    icon: 'location-outline',
    title: 'Location',
    prompt: 'Allow Let Me Check to use your location?',
    why: 'We use your location to show nearby venues, route Scouts to the right spot, and verify GPS-stamped clips were filmed at the venue.',
    ifDenied: "You can still browse the app, but you can't request a check or accept a check until Location is enabled.",
    iosDescription: "iOS will ask \"Allow While Using App.\" That's the right choice -- we never track you in the background.",
  },
  {
    key: 'notif',
    required: false,
    icon: 'notifications-outline',
    title: 'Notifications',
    prompt: 'Allow Let Me Check to send notifications?',
    why: "We ping you the moment your check is on the way, when it's delivered, and when your Scout earnings hit your bank.",
    ifDenied: "You'll need to open the app to check delivery status. Nothing breaks -- but you'll miss real-time updates.",
    iosDescription: 'iOS will ask for Notifications, Sounds, and Badges. You can fine-tune later in Settings.',
  },
];

const PRIVACY_BULLETS = [
  'Location is used only while the app is open -- no background tracking in v1',
  'Stored encrypted at rest, deleted from servers 30 days after your last activity',
  'You can revoke either permission anytime from iOS Settings',
  'We never sell, rent, or share permission data with third parties',
];

export default function PermissionsScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const continueTo = next || '/(seeker)/home';
  const [states, setStates] = useState<Record<PermKey, PermState>>({
    location: 'pending',
    notif: 'pending',
  });
  const [approxCity, setApproxCity] = useState<string | null>(null);

  const handleAllow = async (perm: Perm) => {
    if (perm.key === 'location') {
      const { status } = await requestUserLocation();
      if (status === 'granted') {
        setApproxCity(null);
        setStates((s) => ({ ...s, location: 'granted' }));
        return;
      }
      const ip = await detectCityByIP();
      if (ip.coords) {
        setApproxCity(ip.city || getUserCity() || 'your area');
        setStates((s) => ({ ...s, location: 'granted' }));
      } else {
        Alert.alert(
          'Set your city',
          "We couldn't detect your location. Pick your city and we'll show that map.",
          [
            { text: 'Choose city', onPress: () => router.push('/onboarding/city') },
            { text: 'Try again', style: 'cancel' },
          ],
        );
      }
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    if (status === 'granted') {
      setStates((s) => ({ ...s, [perm.key]: 'granted' }));
    } else {
      setStates((s) => ({ ...s, [perm.key]: 'skipped' }));
      Alert.alert(
        'Notifications off',
        perm.ifDenied,
        [
          { text: 'OK' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const handleSkip = (perm: Perm) => {
    if (perm.required) {
      Alert.alert(`${perm.title} is required`, perm.ifDenied, [{ text: 'OK' }]);
      return;
    }
    setStates((s) => ({ ...s, [perm.key]: 'skipped' }));
  };

  const canContinue = states.location === 'granted';

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding/role')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View key={i} style={[styles.dot, styles.dotDone]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Two quick permissions</Text>
          <Text style={styles.subtitle}>
            One required, one recommended. iOS will prompt you for each -- here's exactly what we use them for.
          </Text>

          {PERMS.map((p) => {
            const state = states[p.key];
            return (
              <View key={p.key} style={styles.permCard}>
                <View style={styles.permTop}>
                  <View style={[styles.permIcon, state === 'granted' && styles.permIconGranted]}>
                    <Ionicons
                      name={p.icon}
                      size={22}
                      color={state === 'granted' ? colors.white : colors.textPrimary}
                    />
                  </View>
                  <View style={styles.permLabels}>
                    <Text style={styles.permTitle}>{p.title}</Text>
                    <View style={[styles.permTag, p.required ? styles.permTagRequired : styles.permTagOptional]}>
                      <Text style={[styles.permTagText, p.required ? styles.permTagTextRequired : styles.permTagTextOptional]}>
                        {p.required ? 'REQUIRED' : 'RECOMMENDED'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.permWhy}>{p.why}</Text>

                <View style={styles.iosNote}>
                  <Ionicons name="logo-apple" size={12} color={colors.textSecondary} />
                  <Text style={styles.iosNoteText}>{p.iosDescription}</Text>
                </View>

                <View style={styles.deniedNote}>
                  <Ionicons name="alert-circle-outline" size={12} color={colors.danger} />
                  <Text style={styles.deniedText}>{p.ifDenied}</Text>
                </View>

                {state === 'granted' ? (
                  <View style={[styles.permBtn, styles.permBtnGranted]}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                    <Text style={[styles.permBtnText, styles.permBtnTextGranted]}>ALLOWED</Text>
                  </View>
                ) : state === 'skipped' ? (
                  <View style={styles.permActionRow}>
                    <View style={[styles.permBtn, styles.permBtnSkipped]}>
                      <Text style={[styles.permBtnText, styles.permBtnTextSkipped]}>SKIPPED</Text>
                    </View>
                    <TouchableOpacity style={styles.permBtnGhost} onPress={() => handleAllow(p)} activeOpacity={0.85}>
                      <Text style={styles.permBtnGhostText}>CHANGE MY MIND</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.permActionRow}>
                    <TouchableOpacity style={styles.permBtn} onPress={() => handleAllow(p)} activeOpacity={0.85}>
                      <Text style={styles.permBtnText}>ALLOW</Text>
                    </TouchableOpacity>
                    {!p.required && (
                      <TouchableOpacity style={styles.permBtnGhost} onPress={() => handleSkip(p)} activeOpacity={0.7}>
                        <Text style={styles.permBtnGhostText}>NOT NOW</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>WHAT WE DO WITH IT</Text>
          <View style={styles.privacyCard}>
            {PRIVACY_BULLETS.map((b, i) => (
              <View key={i} style={styles.privacyRow}>
                <Ionicons name="shield-checkmark" size={14} color={colors.verified} />
                <Text style={styles.privacyText}>{b}</Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              activeOpacity={0.7}
              style={styles.settingsLinkRow}
            >
              <Ionicons name="settings-outline" size={14} color={colors.red} />
              <Text style={styles.settingsLink}>Open iOS Settings → Let Me Check</Text>
            </TouchableOpacity>
          </View>

          {approxCity && (
            <View style={styles.approxNote}>
              <Ionicons name="navigate-circle-outline" size={14} color={colors.verified} />
              <Text style={styles.approxText}>
                Using your approximate area ({approxCity}) from your connection.{' '}
                <Text style={styles.approxLink} onPress={() => router.push('/onboarding/city')}>
                  Set city manually
                </Text>
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
            disabled={!canContinue}
            onPress={() => router.replace(continueTo as never)}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, !canContinue && styles.primaryBtnTextDisabled]}>
              {canContinue ? 'CONTINUE' : 'ALLOW LOCATION TO CONTINUE'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.foot}>
            You can revoke either permission anytime from iOS Settings.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: colors.red,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: 'rgba(218,37,29,0.4)' },
  scroll: { paddingHorizontal: 26, paddingBottom: 48 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 22,
  },

  permCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  permTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permIconGranted: {
    backgroundColor: colors.verified,
  },
  permLabels: { flex: 1 },
  permTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  permTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  permTagRequired: {
    backgroundColor: 'rgba(218,37,29,0.07)',
    borderColor: 'rgba(218,37,29,0.25)',
  },
  permTagOptional: {
    backgroundColor: 'rgba(22,163,74,0.07)',
    borderColor: 'rgba(22,163,74,0.25)',
  },
  permTagText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
  },
  permTagTextRequired: { color: colors.red },
  permTagTextOptional: { color: colors.verified },

  permWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  iosNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 6,
  },
  iosNoteText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  deniedNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(176,21,27,0.07)',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  deniedText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  permActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.red,
  },
  permBtnGranted: {
    backgroundColor: colors.verified,
  },
  permBtnSkipped: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onRed,
    letterSpacing: 1.5,
  },
  permBtnTextGranted: { color: colors.white },
  permBtnTextSkipped: { color: colors.textTertiary },
  permBtnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  permBtnGhostText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 1.4,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 12 },

  privacyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  privacyText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  settingsLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingsLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    color: colors.red,
    letterSpacing: 0.4,
  },

  primaryBtn: {
    backgroundColor: colors.buttonGrey,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  primaryBtnDisabled: {
    backgroundColor: '#F1F2F4',
    borderColor: colors.border,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.buttonGreyText,
    fontSize: 13,
    letterSpacing: 3,
  },
  primaryBtnTextDisabled: {
    color: colors.buttonGreyText,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },

  approxNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(22,163,74,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  approxText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  approxLink: {
    fontFamily: 'Inter_700Bold',
    color: colors.red,
    textDecorationLine: 'underline',
  },
});
