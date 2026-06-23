import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getIntendedRole } from '../state/intended-role';

// Source of truth: docs/FILMING-POLICY.md, mirrored to the Seeker (requester) perspective.
// The binding legal text lives in the full Terms / Privacy / AUP (linked at sign-up);
// these cards are the plain-language summary, so copy is kept short on purpose.

// One place to retune the brand accent. Currently GREEN. Switch to '#F47B20' (+ chip
// 'rgba(244,123,32,0.12)') for the orange variant.
const ACCENT = '#00FF7F';
const ACCENT_CHIP = 'rgba(0,255,127,0.12)';

type IconName = keyof typeof Ionicons.glyphMap;

const WILL_GET: { icon: IconName; title: string; why: string }[] = [
  { icon: 'videocam-outline', title: '15-sec silent clip', why: '30 sec for Partner Interiors (+$5). Always muted.' },
  { icon: 'scan-outline', title: 'The place, not people', why: 'Wide shots, no close-ups of strangers.' },
  { icon: 'eye-off-outline', title: 'Faces auto-blurred', why: 'Anyone in frame is blurred before it reaches you.' },
  { icon: 'location-outline', title: 'GPS-verified', why: 'Filmed on-site, or auto-rejected and refunded.' },
  { icon: 'flash-outline', title: '7–10 min, or refund', why: 'No Scout in 15 min = full refund.' },
];

const WONT_FILM: { icon: IconName; title: string; why: string }[] = [
  { icon: 'person-outline', title: 'A specific person', why: 'We check places, not people.' },
  { icon: 'mic-off-outline', title: 'No audio, ever', why: 'The mic stays off, always.' },
  { icon: 'lock-closed-outline', title: 'Bathrooms & changing rooms', why: 'Never, anywhere. No exceptions.' },
  { icon: 'home-outline', title: 'Homes & private property', why: 'Public access only. No trespass.' },
  { icon: 'business-outline', title: 'Hospitals, schools, courts, police', why: 'Off-limits, declined instantly, refunded.' },
  { icon: 'camera-outline', title: '“No Photography” zones', why: 'Scout stops on sight. You’re refunded.' },
];

const PROMISE: { icon: IconName; text: string }[] = [
  { icon: 'eye-outline', text: 'Track or surveil a person' },
  { icon: 'heart-dislike-outline', text: 'Monitor an ex, family, or coworker' },
  { icon: 'warning-outline', text: 'Scout anything illegal' },
  { icon: 'lock-closed-outline', text: 'Grab footage you’ve no right to' },
];

const REFUNDS: { icon: IconName; text: string }[] = [
  { icon: 'checkmark-circle-outline', text: 'No clip delivered → full refund' },
  { icon: 'checkmark-circle-outline', text: 'Off-target or wrong venue → refunded' },
  { icon: 'remove-circle-outline', text: 'A real result (line short, place empty) → no refund. That’s the product working.' },
];

const TOTAL_CARDS = 4;

export default function SeekerRulesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [understood, setUnderstood] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const bothGated = understood && agreed;

  const goTo = (p: number) => {
    const next = Math.max(0, Math.min(TOTAL_CARDS - 1, p));
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = () => {
    // Both users see the fork screen; everyone else heads to the location step
    // (Scouts/venues are location-driven, so we ask before showing the map).
    const dest = getIntendedRole() === 'both' ? '/onboarding/both-fork' : '/(seeker)/home';
    router.replace({ pathname: '/onboarding/permissions', params: { next: dest } });
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (page === 0 ? router.back() : goTo(page - 1))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === page && styles.dotActive, i < page && styles.dotDone]}
              />
            ))}
          </View>
        </View>

        {/* Swipeable cards */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          style={styles.pager}
        >
          {/* CARD 1 — What you'll get */}
          <Card width={width} title="What you’ll get">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
              {WILL_GET.map((r, i) => (
                <DetailRow key={i} icon={r.icon} title={r.title} why={r.why} />
              ))}
            </ScrollView>
            <NextButton onPress={() => goTo(1)} />
          </Card>

          {/* CARD 2 — What we'll never film */}
          <Card width={width} title="What we’ll never film">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
              {WONT_FILM.map((r, i) => (
                <DetailRow key={i} icon={r.icon} title={r.title} why={r.why} />
              ))}
            </ScrollView>
            <NextButton onPress={() => goTo(2)} />
          </Card>

          {/* CARD 3 — Our promise to each other */}
          <Card width={width} title="Our promise to each other">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.lead}>You agree never to use LMC to:</Text>
              {PROMISE.map((r, i) => (
                <SimpleRow key={i} icon={r.icon} text={r.text} />
              ))}
              <Text style={styles.foot}>
                These keep LMC safe for everyone. Misuse can suspend your account.
              </Text>
            </ScrollView>
            <NextButton onPress={() => goTo(3)} label="ALMOST THERE" />
          </Card>

          {/* CARD 4 — Our promise to you (refunds + consent) */}
          <Card width={width} title="Our promise to you">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContentGate} showsVerticalScrollIndicator={false}>
              <Text style={styles.lead}>Our refund promise:</Text>
              {REFUNDS.map((r, i) => (
                <SimpleRow key={i} icon={r.icon} text={r.text} />
              ))}

              <View style={styles.gateDivider} />

              <TouchableOpacity style={styles.gateRow} activeOpacity={0.75} onPress={() => setUnderstood((v) => !v)}>
                <View style={[styles.checkbox, understood && styles.checkboxOn]}>
                  {understood && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <Text style={styles.gateText}>
                  <Text style={styles.gateBold}>I understand</Text> what I’ll get (a 15-sec silent, face-blurred public clip) and what I won’t.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gateRow} activeOpacity={0.75} onPress={() => setAgreed((v) => !v)}>
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                  {agreed && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <Text style={styles.gateText}>
                  <Text style={styles.gateBold}>I agree</Text> to the promise above and won’t use LMC to track or surveil anyone.
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryBtn, !bothGated && styles.primaryBtnDisabled]}
              disabled={!bothGated}
              onPress={finish}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, !bothGated && styles.primaryBtnTextDisabled]}>
                {bothGated ? 'CONTINUE' : 'TICK BOTH TO CONTINUE'}
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Card({ width, title, children }: { width: number; title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { width }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ icon, title, why }: { icon: IconName; title: string; why: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowWhy}>{why}</Text>
      </View>
    </View>
  );
}

function SimpleRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={ACCENT} />
      </View>
      <Text style={styles.simpleText}>{text}</Text>
    </View>
  );
}

function NextButton({ onPress, label = 'NEXT' }: { onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity style={styles.nextBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.nextBtnText}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color="#ffffff" />
    </TouchableOpacity>
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
    width: 80,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotDone: { backgroundColor: 'rgba(0,255,127,0.5)' },
  dotActive: { backgroundColor: ACCENT },
  pager: { flex: 1 },
  card: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 0.2,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardScroll: { flex: 1 },
  // List cards: spread rows evenly down the page to fill the space.
  cardContent: {
    flexGrow: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 10,
  },
  // Gate card: start right under the title (no top gap), even spacing, button pinned below.
  cardContentGate: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    gap: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Horizontal rows: icon first, text beside it, left-aligned.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: ACCENT_CHIP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  rowWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  simpleText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 21,
    letterSpacing: 0.1,
  },

  lead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  foot: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: ACCENT,
    lineHeight: 17,
    letterSpacing: 0.2,
  },

  gateDivider: {
    height: 1,
    width: 220,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
    marginVertical: 4,
  },
  gateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 8,
    maxWidth: 320,
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
  checkboxOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  gateText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  gateBold: { fontFamily: 'Inter_700Bold', color: '#ffffff' },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 12,
  },
  nextBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 12,
    letterSpacing: 2,
  },

  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  primaryBtnTextDisabled: { color: 'rgba(255,255,255,0.35)', letterSpacing: 2 },
});
