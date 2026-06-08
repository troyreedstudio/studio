import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getIntendedRole } from '../state/intended-role';

// Source of truth: docs/FILMING-POLICY.md, mirrored to the Seeker (requester) perspective.

const WILL_GET = [
  {
    title: '15-second silent video',
    why: 'Or 30 seconds for Partner Interior checks (+$5). Always silent — no audio is ever recorded.',
  },
  {
    title: 'Wide shots only',
    why: 'The Scout films the scene, not individuals. No close-ups of strangers.',
  },
  {
    title: 'Faces auto-blurred',
    why: 'Any faces detected in frame are blurred before delivery. We don\'t deliver clips with identifiable people.',
  },
  {
    title: 'GPS-verified delivery',
    why: 'The Scout had to be inside the venue\'s geofence to deliver. Off-target clips are auto-rejected and refunded.',
  },
  {
    title: 'Delivered in 7–10 minutes',
    why: 'Once a Scout accepts. If no Scout accepts in 15 minutes, you get a full refund.',
  },
];

const WONT_FILM = [
  {
    title: 'A specific person',
    why: 'Even if you name them in the request. LMC is a place-checking service, not a people-finding service.',
  },
  {
    title: 'Areas marked "No Photography"',
    why: 'If a venue posts a No Photography sign, Scouts stop and abort. You get a refund, the Scout gets travel pay.',
  },
  {
    title: 'Bathrooms, locker rooms, dressing rooms',
    why: 'Ever. Regardless of venue. Bright privacy line.',
  },
  {
    title: 'Hospitals, schools, courts, police, military',
    why: 'These venues are RED-tier — dispatch is declined at request time and you\'re refunded immediately.',
  },
  {
    title: 'Private homes or private property',
    why: 'No trespassing. No fences. No staff-only areas. The Scout films from public access only.',
  },
  {
    title: 'Audio of any kind',
    why: 'The camera mic stays muted. Two-party-consent laws prevent recording conversations.',
  },
];

const DONT_USE = [
  'Stalk, surveil, or track a specific person',
  'Monitor an ex-partner, family member, or coworker',
  'Plan or scout for any illegal activity',
  'Capture footage you don\'t have the right to obtain via public access',
];

export default function SeekerRulesScreen() {
  const router = useRouter();
  const [understood, setUnderstood] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const bothGated = understood && agreed;

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Flow Map</Text>
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < 2 && styles.dotDone,
                  i === 2 && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.wireframeBadge}
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.wireframeBadgeText}>WF</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>How LMC works</Text>
          <Text style={styles.subtitle}>
            A quick read before your first check. Here&apos;s what your clip will look like, the boundaries we honor, and how we keep the service respectful for everyone involved.
          </Text>

          {/* TL;DR */}
          <View style={styles.tldrCard}>
            <Text style={styles.tldrLabel}>TL;DR</Text>
            <Text style={styles.tldrText}>
              LMC deploys a real person to film a 15-second silent clip of a public-facing place. We never film specific people, audio, or private spaces. Some venues may be off-limits entirely.
            </Text>
          </View>

          {/* WHAT YOU'LL GET */}
          <Text style={styles.sectionLabel}>WHAT YOU&apos;LL GET</Text>
          {WILL_GET.map((row, i) => (
            <Row key={i} type="ok" title={row.title} why={row.why} />
          ))}

          {/* WHAT WE DON'T CAPTURE */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            WHAT WE DON&apos;T CAPTURE
          </Text>
          {WONT_FILM.map((row, i) => (
            <Row key={i} type="no" title={row.title} why={row.why} />
          ))}

          {/* AVOID USING LMC TO */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            AVOID USING LMC TO
          </Text>
          <View style={styles.warnCard}>
            {DONT_USE.map((t, i) => (
              <View key={i} style={styles.warnRow}>
                <Ionicons name="close" size={14} color="#FF6B6B" />
                <Text style={styles.warnText}>{t}</Text>
              </View>
            ))}
            <View style={styles.warnFoot}>
              <Ionicons name="alert-circle" size={14} color="#FFCB47" />
              <Text style={styles.warnFootText}>
                These boundaries keep LMC safe for everyone. Misuse may result in account suspension, and we cooperate with law enforcement when warranted.
              </Text>
            </View>
          </View>

          {/* REFUND POLICY (mini) */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>REFUNDS</Text>
          <View style={styles.contractCard}>
            <Bullet text="Auto-refund: No clip delivered · Scout off-fence · venue closed · GPS failure · wrong venue." />
            <Bullet text="Partial refund: Clip delivered but missing a key requested element you flagged in advance." />
            <Bullet text="No refund: Clip is legitimate and shows reality (line was short, place was empty, your friend wasn&apos;t there). That&apos;s the product working." />
          </View>

          {/* DUAL GATE */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>BEFORE YOU CONTINUE</Text>

          <TouchableOpacity
            style={styles.gateRow}
            activeOpacity={0.75}
            onPress={() => setUnderstood((v) => !v)}
          >
            <View style={[styles.checkbox, understood && styles.checkboxOn]}>
              {understood && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={styles.gateText}>
              <Text style={styles.gateBold}>I UNDERSTAND.</Text> I know what I&apos;ll receive (a 15-second silent public-facing clip with faces blurred) and what I won&apos;t (specific people, audio, private spaces, no-go venues).
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gateRow}
            activeOpacity={0.75}
            onPress={() => setAgreed((v) => !v)}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={styles.gateText}>
              <Text style={styles.gateBold}>I AGREE.</Text> I won&apos;t use LMC to stalk, surveil, monitor a specific individual, or do anything on the prohibited list above.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, !bothGated && styles.primaryBtnDisabled]}
            disabled={!bothGated}
            onPress={() => {
              // Both users see the fork screen so they can choose to activate
              // Scout setup now (preferred) or start as Seeker first.
              const next =
                getIntendedRole() === 'both' ? '/onboarding/both-fork' : '/(seeker)/home';
              router.replace(next);
            }}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.primaryBtnText, !bothGated && styles.primaryBtnTextDisabled]}
            >
              {bothGated ? 'I AGREE · CONTINUE' : 'TICK BOTH BOXES TO CONTINUE'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.foot}>
            You can revisit these rules any time from your profile.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ type, title, why }: { type: 'ok' | 'no'; title: string; why: string }) {
  const icon = type === 'ok' ? 'checkmark' : 'close';
  const color = type === 'ok' ? '#00FF7F' : '#FF6B6B';
  const bg =
    type === 'ok'
      ? 'rgba(0,255,127,0.1)'
      : 'rgba(255,107,107,0.1)';
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowWhy}>{why}</Text>
      </View>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.contractRow}>
      <Text style={styles.contractBullet}>·</Text>
      <Text style={styles.contractText}>{text}</Text>
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
  dotDone: { backgroundColor: 'rgba(0,255,127,0.55)' },
  dotActive: { backgroundColor: '#00FF7F' },
  wireframeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,107,0,0.18)',
  },
  wireframeBadgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#FF6B00',
    fontSize: 9,
    letterSpacing: 1.4,
  },

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
    marginBottom: 20,
  },

  tldrCard: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  tldrLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  tldrText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.1,
    lineHeight: 21,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 20 },

  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  rowWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },

  warnCard: {
    backgroundColor: 'rgba(255,107,107,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  warnText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  warnFoot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,107,0.2)',
  },
  warnFootText: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    color: '#FFCB47',
    lineHeight: 16,
    letterSpacing: 0.2,
  },

  contractCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  contractRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  contractBullet: {
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 18,
  },
  contractText: {
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
    marginBottom: 4,
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
    marginTop: 16,
    marginBottom: 14,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  primaryBtnTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
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
