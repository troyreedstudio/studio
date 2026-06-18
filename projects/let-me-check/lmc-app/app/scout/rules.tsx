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

// Source of truth: docs/SCOUT-CONDUCT.md + docs/FILMING-POLICY.md.
// Binding legal text lives in the full Scout Agreement (/legal/code) — these
// cards are the plain-English summary, so copy is kept short on purpose.

const ACCENT = '#00FF7F';
const ACCENT_CHIP = 'rgba(0,255,127,0.12)';

type IconName = keyof typeof Ionicons.glyphMap;

const WHERE: { icon: IconName; title: string; why: string }[] = [
  { icon: 'walk-outline', title: 'Public ground', why: 'Sidewalks, streets, plazas, parking lots, any public vantage point.' },
  { icon: 'people-outline', title: 'The queue & entrance', why: 'Wide shots of the door, the wait, the staff, from where the public stands.' },
  { icon: 'business-outline', title: 'Public interiors (GREEN venues)', why: 'Dining rooms, lobbies, retail floors, waiting rooms. Wide shots only.' },
  { icon: 'add-circle-outline', title: 'Partner interiors (+$5)', why: 'Only when the venue is a PARTNER and the Seeker paid for it. Otherwise stay outside.' },
];

const NEVER: { icon: IconName; title: string; why: string }[] = [
  { icon: 'eye-off-outline', title: 'Faces & close-ups', why: 'Wide shots only. A face filling the frame won’t deliver.' },
  { icon: 'happy-outline', title: 'Children', why: 'If kids are in shot, reposition, or stop and report it.' },
  { icon: 'hand-left-outline', title: 'Anyone who objects', why: 'Someone says stop? Stop. No argument.' },
  { icon: 'camera-outline', title: '“No Photography” zones', why: 'See a sign, stop and report it.' },
  { icon: 'medkit-outline', title: 'Red venues', why: 'Hospitals, schools, courts, police, military. Refuse the job.' },
  { icon: 'lock-closed-outline', title: 'Bathrooms & changing rooms', why: 'Ever. Any venue. No exceptions.' },
  { icon: 'ban-outline', title: 'Past security / private property', why: 'No airport gates, no trespassing. Public access only.' },
  { icon: 'mic-off-outline', title: 'Audio', why: 'Mic stays muted for two-party consent laws.' },
];

const CONDUCT: { icon: IconName; title: string; why: string }[] = [
  { icon: 'eye-outline', title: 'Be discreet', why: 'Hold the phone like you’re watching a video. In, get the shot, out.' },
  { icon: 'chatbubble-outline', title: 'If asked what you’re doing', why: 'Say you’re doing an LMC location check, and offer to leave.' },
  { icon: 'hand-right-outline', title: 'If asked to stop', why: 'Stop immediately, report it, walk away. You’re still paid for the trip.' },
  { icon: 'warning-outline', title: 'Don’t provoke', why: 'No fights, no drama, no distressed people. When in doubt, stop.' },
  { icon: 'shield-checkmark-outline', title: 'Never fake it', why: 'One real take. Staging or faking = instant removal + clawback.' },
];

const REJECT: { icon: IconName; text: string }[] = [
  { icon: 'close-circle-outline', text: 'Blurry, shaky, or out of focus' },
  { icon: 'close-circle-outline', text: 'Wrong venue, or venue not visible' },
  { icon: 'close-circle-outline', text: 'GPS doesn’t match the venue' },
  { icon: 'close-circle-outline', text: 'Finger or lens blocking the shot' },
  { icon: 'close-circle-outline', text: 'Faces that couldn’t be auto-blurred' },
  { icon: 'close-circle-outline', text: 'Audio detected, or clip cut too short' },
];

const AGREEMENT: { icon: IconName; text: string }[] = [
  { icon: 'cloud-upload-outline', text: 'Clips upload straight to LMC, no local copies you keep.' },
  { icon: 'shield-checkmark-outline', text: 'Faces are auto-blurred, the clip stays private to the Seeker, and it’s deleted after 30 days.' },
  { icon: 'briefcase-outline', text: 'You’re an independent contractor: your own hours, your own taxes (we send a 1099 each January).' },
  { icon: 'time-outline', text: 'LMC can deactivate for violations. Any earnings owed are paid within 7 business days.' },
];

const TOTAL_CARDS = 5;

export default function ScoutRulesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [consented, setConsented] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const bothGated = consented && agreed;

  const goTo = (p: number) => {
    const next = Math.max(0, Math.min(TOTAL_CARDS - 1, p));
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (page === 0 ? (router.canGoBack() ? router.back() : router.push('/scout/become')) : goTo(page - 1))}
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

          <TouchableOpacity
            style={styles.wireframeBadge}
            onPress={() => router.push('/flow-map')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.wireframeBadgeText}>WF</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          style={styles.pager}
        >
          {/* CARD 1 — Where you can film */}
          <Card width={width} title="Where you can film">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
              {WHERE.map((r, i) => (
                <DetailRow key={i} icon={r.icon} title={r.title} why={r.why} />
              ))}
            </ScrollView>
            <NextButton onPress={() => goTo(1)} />
          </Card>

          {/* CARD 2 — What you never film */}
          <Card width={width} title="What you never film">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
              {NEVER.map((r, i) => (
                <DetailRow key={i} icon={r.icon} title={r.title} why={r.why} />
              ))}
            </ScrollView>
            <NextButton onPress={() => goTo(2)} />
          </Card>

          {/* CARD 3 — How to carry yourself */}
          <Card width={width} title="How to carry yourself">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
              {CONDUCT.map((r, i) => (
                <DetailRow key={i} icon={r.icon} title={r.title} why={r.why} />
              ))}
            </ScrollView>
            <NextButton onPress={() => goTo(3)} />
          </Card>

          {/* CARD 4 — Rejection = no pay */}
          <Card width={width} title="Quality standards">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContentGate} showsVerticalScrollIndicator={false}>
              <Text style={styles.subEmphasis}>REJECTION = NO PAYMENT</Text>
              <Text style={styles.lead}>
                A clip that misses the bar gets rejected by the Seeker or our system, and a rejected clip isn’t paid. So nail it. Common reasons:
              </Text>
              {REJECT.map((r, i) => (
                <SimpleRow key={i} icon={r.icon} text={r.text} />
              ))}
              <Text style={styles.foot}>
                You get 3 takes per check, so review your shot before you submit.
              </Text>
            </ScrollView>
            <NextButton onPress={() => goTo(4)} label="ALMOST THERE" />
          </Card>

          {/* CARD 5 — The agreement + consent */}
          <Card width={width} title="The agreement">
            <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContentGate} showsVerticalScrollIndicator={false}>
              {AGREEMENT.map((r, i) => (
                <SimpleRow key={i} icon={r.icon} text={r.text} />
              ))}

              <TouchableOpacity onPress={() => router.push('/legal/code')} activeOpacity={0.7}>
                <Text style={styles.link}>Read the full Scout Agreement →</Text>
              </TouchableOpacity>

              <View style={styles.gateDivider} />

              <TouchableOpacity style={styles.gateRow} activeOpacity={0.75} onPress={() => setConsented((v) => !v)}>
                <View style={[styles.checkbox, consented && styles.checkboxOn]}>
                  {consented && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <Text style={styles.gateText}>
                  <Text style={styles.gateBold}>I understand</Text> the filming rules and will only film as described: no faces, kids, audio, or no-go zones.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gateRow} activeOpacity={0.75} onPress={() => setAgreed((v) => !v)}>
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                  {agreed && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <Text style={styles.gateText}>
                  <Text style={styles.gateBold}>I agree</Text> to the Scout Agreement and confirm I’m an independent contractor, not an employee.
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryBtn, !bothGated && styles.primaryBtnDisabled]}
              disabled={!bothGated}
              onPress={() => router.push('/scout/approved')}
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
  dot: { width: 20, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotDone: { backgroundColor: 'rgba(0,255,127,0.5)' },
  dotActive: { backgroundColor: ACCENT },
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
  cardContent: {
    flexGrow: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 10,
  },
  cardContentGate: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    gap: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },

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

  subEmphasis: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#FFCB47',
    letterSpacing: 2,
    textAlign: 'center',
  },
  lead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  foot: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: ACCENT,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  link: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#00FF7F',
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
    paddingVertical: 4,
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
