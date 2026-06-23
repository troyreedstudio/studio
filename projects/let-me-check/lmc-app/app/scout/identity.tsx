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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IdType = 'license' | 'passport' | 'state' | 'permit';
type SlotKey = 'front' | 'back' | 'selfie';

const ID_TYPES: { id: IdType; label: string; needsBack: boolean }[] = [
  { id: 'license', label: "Driver's license", needsBack: true },
  { id: 'state', label: 'State ID', needsBack: true },
  { id: 'passport', label: 'Passport', needsBack: false },
  { id: 'permit', label: 'Residence permit', needsBack: true },
];

const NEED = [
  { icon: 'camera-outline' as const, text: 'Your phone’s camera' },
  { icon: 'card-outline' as const, text: 'A government-issued photo ID' },
  { icon: 'sunny-outline' as const, text: 'A well-lit space with a plain background' },
  { icon: 'time-outline' as const, text: '2 minutes' },
];

export default function ScoutIdentityScreen() {
  const router = useRouter();
  const [idType, setIdType] = useState<IdType>('license');
  const [slots, setSlots] = useState<Record<SlotKey, boolean>>({
    front: false,
    back: false,
    selfie: false,
  });
  const [consented, setConsented] = useState(false);

  const activeType = ID_TYPES.find((t) => t.id === idType)!;
  const needsBack = activeType.needsBack;

  const requiredSlots: SlotKey[] = needsBack ? ['front', 'back', 'selfie'] : ['front', 'selfie'];
  const allCaptured = requiredSlots.every((k) => slots[k]);
  const canSubmit = allCaptured && consented;

  const handleCapture = (slot: SlotKey, label: string) => {
    Alert.alert(
      `Capture ${label}`,
      'In production this opens the camera with Stripe Identity guidance overlays.\n\nFor the prototype we’ll mark it captured.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark captured',
          onPress: () => setSlots((s) => ({ ...s, [slot]: true })),
        },
      ],
    );
  };

  const handleSubmit = () => {
    Alert.alert(
      'Open Stripe Identity',
      'In production this submits your captures to Stripe Identity for review. Review usually completes within 2 minutes.\n\nFor the prototype, we’ll move you to the next step.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => router.push('/scout/payout') },
      ],
    );
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.push('/scout/become'))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={[styles.dot, n === 1 && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Verify your identity</Text>
          <Text style={styles.subtitle}>
            A quick verification before your first check. Handled by Stripe Identity, encrypted, private, and never shared.
          </Text>

          {/* WHY card */}
          <View style={styles.whyCard}>
            <Text style={styles.whyLabel}>WHY WE VERIFY</Text>
            <Text style={styles.whyText}>
              Every Scout is verified to keep the network trustworthy for venues, Seekers, and each other. One real human, one verified account.
            </Text>
          </View>

          {/* WHAT YOU'LL NEED */}
          <Text style={styles.sectionLabel}>WHAT YOU’LL NEED</Text>
          <View style={styles.needCard}>
            {NEED.map((n, i) => (
              <View key={i} style={styles.needRow}>
                <Ionicons name={n.icon} size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.needText}>{n.text}</Text>
              </View>
            ))}
          </View>

          {/* ID TYPE SELECTOR */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>WHICH ID</Text>
          <View style={styles.typeRow}>
            {ID_TYPES.map((t) => {
              const active = t.id === idType;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typePill, active && styles.typePillActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIdType(t.id);
                    if (!t.needsBack) setSlots((s) => ({ ...s, back: false }));
                  }}
                >
                  <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* UPLOADS */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            CAPTURE · {requiredSlots.length} STEP{requiredSlots.length > 1 ? 'S' : ''}
          </Text>

          <UploadSlot
            n={1}
            label="Front of ID"
            hint={idType === 'passport' ? 'Photo page facing up' : 'Photo side facing up'}
            captured={slots.front}
            onPress={() => handleCapture('front', 'front of ID')}
          />

          {needsBack && (
            <UploadSlot
              n={2}
              label="Back of ID"
              hint="Barcode / mag stripe visible"
              captured={slots.back}
              onPress={() => handleCapture('back', 'back of ID')}
            />
          )}

          <UploadSlot
            n={needsBack ? 3 : 2}
            label="Selfie + liveness check"
            hint="Face camera, follow prompts (blink, turn head)"
            captured={slots.selfie}
            onPress={() => handleCapture('selfie', 'selfie')}
          />

          {/* TIPS */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>TIPS FOR A FAST APPROVAL</Text>
          <View style={styles.tipsCard}>
            <Tip text="Clean, dry, undamaged ID." />
            <Tip text="No glare or reflections, angle the ID slightly if you see one." />
            <Tip text="Whole ID in frame. No fingers covering text or photo." />
            <Tip text="Selfie: plain background, good lighting, no hat or sunglasses." />
          </View>

          {/* CONSENT */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>CONSENT</Text>
          <TouchableOpacity
            style={styles.gateRow}
            activeOpacity={0.75}
            onPress={() => setConsented((v) => !v)}
          >
            <View style={[styles.checkbox, consented && styles.checkboxOn]}>
              {consented && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={styles.gateText}>
              <Text style={styles.gateBold}>I CONSENT.</Text> I authorize Let Me Check + Stripe Identity to process my government ID and a selfie (including biometric facial-match data) to verify my identity. Stripe stores and processes this data; Let Me Check receives only an approved/denied status.
            </Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <View style={styles.primaryBtnInner}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={canSubmit ? '#000' : 'rgba(255,255,255,0.35)'}
              />
              <Text
                style={[styles.primaryBtnText, !canSubmit && styles.primaryBtnTextDisabled]}
              >
                {!allCaptured
                  ? `CAPTURE ${requiredSlots.length} ${requiredSlots.length === 1 ? 'STEP' : 'STEPS'} TO CONTINUE`
                  : !consented
                  ? 'CONSENT TO CONTINUE'
                  : 'VERIFY WITH STRIPE IDENTITY'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.foot}>
            We never see or store your raw ID images. Stripe Identity is BIPA + GDPR compliant.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function UploadSlot({
  n,
  label,
  hint,
  captured,
  onPress,
}: {
  n: number;
  label: string;
  hint: string;
  captured: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.slot, captured && styles.slotDone]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.slotNumWrap}>
        {captured ? (
          <View style={styles.slotCheck}>
            <Ionicons name="checkmark" size={14} color="#000" />
          </View>
        ) : (
          <Text style={styles.slotNum}>{n}</Text>
        )}
      </View>
      <View style={styles.slotBody}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={styles.slotHint}>{hint}</Text>
      </View>
      <View style={styles.slotCameraWrap}>
        <Ionicons
          name={captured ? 'refresh-outline' : 'camera-outline'}
          size={18}
          color={captured ? '#00FF7F' : 'rgba(255,255,255,0.7)'}
        />
      </View>
    </TouchableOpacity>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name="bulb-outline" size={14} color="#FFCB47" />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: '#00FF7F' },
  scroll: { paddingHorizontal: 26, paddingBottom: 64 },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 18,
  },

  whyCard: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  whyLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  whyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.1,
    lineHeight: 20,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 20 },

  needCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  needRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  needText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
  },

  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
  },
  typePillActive: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderColor: 'rgba(60,110,200,0.6)',
  },
  typePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  typePillTextActive: { color: '#ffffff' },

  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  slotDone: {
    backgroundColor: 'rgba(0,255,127,0.08)',
    borderStyle: 'solid',
    borderColor: 'rgba(0,255,127,0.4)',
  },
  slotNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  slotCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF7F',
  },
  slotNum: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  slotBody: { flex: 1 },
  slotLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  slotHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 16,
  },
  slotCameraWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },

  tipsCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },

  gateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  gateText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  gateBold: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    letterSpacing: 1,
  },

  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  primaryBtnTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
