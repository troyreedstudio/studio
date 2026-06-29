import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getProfile, updateProfile } from '../lib/api';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';
import { BackButton } from '../components/BackButton';

export default function PersonalInfoScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  // Email is read-only — controlled by Supabase auth, not editable here
  const [email, setEmail] = useState('');

  // Track initial values to detect changes
  const [initName, setInitName] = useState('');
  const [initPhone, setInitPhone] = useState('');

  const isDirty = displayName !== initName || phone !== initPhone;

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profile, { data: authData }] = await Promise.all([
        getProfile(),
        supabase.auth.getUser(),
      ]);
      const name = profile?.display_name ?? '';
      const ph = profile?.phone ?? '';
      const em = authData?.user?.email ?? '';
      setDisplayName(name);
      setInitName(name);
      setPhone(ph);
      setInitPhone(ph);
      setEmail(em);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your display name.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        displayName: trimmedName,
        phone: phone.trim() || undefined,
      });
      setInitName(trimmedName);
      setInitPhone(phone.trim());
      setDisplayName(trimmedName);
      setPhone(phone.trim());
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <BackButton fallback="/(scout)/profile" />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Personal Info</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>Your name and contact details</Text>
          </View>

          {loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator color={colors.red} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.centerWrap}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
                <Text style={styles.retryBtnText}>RETRY</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Form fields */}
              <View style={styles.fieldsCard}>
                {/* Display name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldDivider} />

                {/* Phone */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PHONE</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 555 000 0000"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>

                <View style={styles.fieldDivider} />

                {/* Email — read only */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>EMAIL</Text>
                    <View style={styles.readOnlyBadge}>
                      <Ionicons name="lock-closed-outline" size={10} color={colors.textTertiary} />
                      <Text style={styles.readOnlyText}>READ ONLY</Text>
                    </View>
                  </View>
                  <Text style={styles.fieldInputReadOnly}>{email || 'Not available'}</Text>
                  <Text style={styles.fieldNote}>
                    Email is managed by your sign-in method (Apple or Google) and cannot be changed here.
                  </Text>
                </View>
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!isDirty || saving) && styles.saveBtnDisabled,
                  isDirty && !saving && ctaGlowShadow,
                ]}
                onPress={() => void handleSave()}
                disabled={!isDirty || saving}
                activeOpacity={0.85}
              >
                {isDirty && !saving && <CtaGlow radius={14} />}
                {saving ? (
                  <ActivityIndicator color={colors.onRed} size="small" />
                ) : (
                  <Text style={[styles.saveBtnText, !isDirty && styles.saveBtnTextDim]}>
                    {isDirty ? 'SAVE CHANGES' : 'NO CHANGES'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },

  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  titleRule: {
    height: 2,
    width: 32,
    backgroundColor: colors.red,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  centerWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 22,
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 2,
  },

  fieldsCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    marginBottom: 22,
  },
  fieldGroup: {
    paddingVertical: 14,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readOnlyText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  fieldInput: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    padding: 0,
  },
  fieldInputReadOnly: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  fieldNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 6,
  },

  saveBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    marginHorizontal: 22,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  saveBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 12.5,
    letterSpacing: 2.5,
  },
  saveBtnTextDim: {
    color: colors.textTertiary,
  },
});
