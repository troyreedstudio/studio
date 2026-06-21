import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useScoutEarnings } from '../state/scout-earnings';
import { getCheck } from '../lib/checks';
import { subscribeToCheck } from '../lib/realtime';

// Stage reflects the REAL server-owned state of the clip after upload.
//
// 'processing' — upload PUT returned 2xx (the only state we can be in on
//                arrival here; filming.tsx only routes here on ok===true).
//                Mux is transcoding. The Seeker cannot watch yet.
// 'delivered'  — Mux asset.ready webhook fired → check transitioned to
//                delivered. Wired via Supabase Realtime in a future phase.
// 'accepted'   — Seeker watched + rated. Also webhook/server-owned.
//
// REMOVED: the fake 2.2s/4.4s timers that auto-advanced through all stages
// regardless of reality. They masked upload failures 3× and falsely claimed
// "payment cleared" seconds after submission. Stage advances only happen when
// real server state arrives (Realtime — future phase).
type Stage = 'processing' | 'delivered' | 'accepted' | 'rejected';

export default function SubmittedScreen() {
  const router = useRouter();
  const { checkId, venue = 'Komodo', payout = '10' } = useLocalSearchParams<{
    checkId?: string;
    venue?: string;
    payout?: string;
  }>();

  // Start at 'processing' — the upload PUT succeeded (filming.tsx only routes
  // here after clipUpload.submit() returns true). Future: subscribe to
  // Supabase Realtime on checks row and advance stage when status flips.
  const [stage, setStage] = useState<Stage>('processing');
  const fade = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  // Read-only: the existing running balance is shown in the cleared toast.
  // NO earnings are credited here — money is Phase 4 (see TODO below).
  const earnings = useScoutEarnings();

  useEffect(() => {
    // Fade in the screen — no fake stage timer.
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  // Advance the stage from REAL server state (not a fake timer). Initial fetch
  // then subscribe to the check row via Realtime: delivered -> 'delivered',
  // rated -> 'accepted'. Webhook owns those transitions; we just reflect them.
  useEffect(() => {
    if (!checkId) return;
    const apply = (status?: string) => {
      if (status === 'delivered') setStage('delivered');
      else if (status === 'rated') setStage('accepted');
      // After THIS Scout submitted, a flip back to dispatching (or a terminal
      // no_scout/cancelled) means their clip was rejected at the verify gate
      // (e.g. filmed off-fence) and the job was re-opened. Tell them clearly.
      else if (status === 'dispatching' || status === 'no_scout' || status === 'cancelled') {
        setStage('rejected');
      }
    };
    getCheck(checkId).then((c) => apply(c?.status)).catch(() => {});
    const unsub = subscribeToCheck(
      checkId,
      (c) => apply(c?.status),
      () => getCheck(checkId).then((c) => apply(c?.status)).catch(() => {}),
    );
    return unsub;
  }, [checkId]);

  // When the check reads as delivered/accepted, slide up the confirmation toast.
  // TODO(phase-4): credit the Scout payout on capture/delivery here (real money,
  // server-owned). This phase reflects delivery only — no earnings mutation.
  // TODO(realtime): subscribe to checks row, advance stage to 'delivered' /
  // 'accepted' when Supabase Realtime pushes the real status change.
  useEffect(() => {
    if (stage !== 'accepted') return;
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [stage, toastAnim]);

  // REJECTED: the verify gate couldn't confirm the clip (e.g. filmed off-fence).
  // Tell the Scout clearly + kindly — no payout for this clip, but no penalty.
  if (stage === 'rejected') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.body, { opacity: fade }]}>
              <View style={[styles.heroCheckRing, { borderColor: '#FFCB47' }]}>
                <View style={[styles.heroCheckInner, { backgroundColor: '#FFCB47' }]}>
                  <Ionicons name="alert" size={28} color="#000" />
                </View>
              </View>
              <Text style={styles.title}>This clip couldn’t be verified</Text>
              <Text style={styles.subtitle}>
                We couldn’t confirm this clip was filmed at {venue} — it looks like it was
                recorded too far from the location. Because we can’t verify it, it can’t be
                delivered, and there’s no payout for this one.
              </Text>
              <View style={styles.rejectionNote}>
                <Ionicons name="information-circle" size={14} color="#FFCB47" />
                <Text style={styles.rejectionNoteText}>
                  No worries — you haven’t lost anything. Just make sure you’re at the venue
                  before you start filming.
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  marginTop: 28,
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  alignSelf: 'stretch',
                }}
                onPress={() => router.replace('/(scout)/dashboard')}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}>
                  Back to dashboard
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backFab}
          onPress={() => router.replace('/(scout)/dashboard')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.92)" />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.body, { opacity: fade }]}>
            {/* Hero */}
            <View style={styles.heroCheckRing}>
              <View style={styles.heroCheckInner}>
                <Ionicons name="checkmark" size={28} color="#000" />
              </View>
            </View>

            <Text style={styles.title}>Clip sent</Text>
            <Text style={styles.subtitle}>
              Your 15-second clip of {venue} is on its way to the Seeker.
            </Text>

            {/* Status timeline */}
            <Text style={styles.sectionLabel}>PROGRESS</Text>
            <View style={styles.timeline}>
              <TimelineRow
                label="Clip received"
                detail="We've got your footage"
                state="done"
                isFirst
              />
              <TimelineRow
                label="Getting it ready"
                detail="Preparing your clip to send — takes a moment"
                state={stage === 'processing' ? 'active' : 'done'}
              />
              <TimelineRow
                label="Sent to the Seeker"
                detail="They can watch it as soon as it's ready"
                state={
                  stage === 'processing'
                    ? 'pending'
                    : stage === 'delivered'
                    ? 'active'
                    : 'done'
                }
              />
              <TimelineRow
                label="You get paid"
                detail={`$${payout} clears once the Seeker accepts the clip`}
                state={stage === 'accepted' ? 'done' : 'pending'}
                isLast
              />
            </View>

            {/* Earnings */}
            <View style={styles.earningsCard}>
              <View style={styles.earningsTop}>
                <Text style={styles.earningsLabel}>EARNED THIS CLIP</Text>
                <View
                  style={[
                    styles.earningStatusPill,
                    stage === 'accepted' && styles.earningStatusPillCleared,
                  ]}
                >
                  <View
                    style={[
                      styles.earningStatusDot,
                      stage === 'accepted' && styles.earningStatusDotCleared,
                    ]}
                  />
                  <Text
                    style={[
                      styles.earningStatusText,
                      stage === 'accepted' && styles.earningStatusTextCleared,
                    ]}
                  >
                    {stage === 'accepted' ? 'CLEARED' : 'PENDING'}
                  </Text>
                </View>
              </View>
              <Text style={styles.earningsValue}>${payout}.00</Text>
            </View>

            {/* Quality / rejection note — payment is conditional */}
            <View style={styles.rejectionNote}>
              <Ionicons name="alert-circle" size={14} color="#FFCB47" />
              <Text style={styles.rejectionNoteText}>
                Payment clears once the Seeker accepts the clip. Low-quality footage, wrong venue, or GPS mismatch can lead to rejection — and no payout. See{' '}
                <Text
                  style={styles.rejectionNoteLink}
                  onPress={() => router.push('/legal/code')}
                >
                  Quality Standards
                </Text>{' '}
                in The Scout Code.
              </Text>
            </View>

            {/* Clip stats */}
            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>CLIP DETAILS</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>15s</Text>
                <Text style={styles.statLabel}>LENGTH</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>HD</Text>
                <Text style={styles.statLabel}>QUALITY</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>4:32</Text>
                <Text style={styles.statLabel}>DELIVERY TIME</Text>
              </View>
            </View>

            {/* Compressed rating line */}
            <View style={styles.ratingLine}>
              <Ionicons
                name={stage === 'accepted' ? 'star' : 'star-outline'}
                size={12}
                color={stage === 'accepted' ? '#FFCB47' : 'rgba(255,255,255,0.4)'}
              />
              <Text style={styles.ratingLineText}>
                We’ll notify you when the Seeker rates this clip.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Cleared-payment toast — fades in when stage hits accepted */}
        {stage === 'accepted' && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.toastIconWrap}>
              <Ionicons name="cash" size={14} color="#00FF7F" />
            </View>
            <Text style={styles.toastText}>
              <Text style={styles.toastBold}>${payout}.00 cleared.</Text> Today: ${earnings.earningsToday.toFixed(2)}
            </Text>
          </Animated.View>
        )}

        {/* CTAs */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(scout)/dashboard')}
            activeOpacity={0.85}
          >
            <Ionicons name="radio" size={14} color="#000" />
            <Text style={styles.primaryBtnText}>BACK TO DASHBOARD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(scout)/earnings')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>View earnings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function TimelineRow({
  label,
  detail,
  state,
  isFirst,
  isLast,
}: {
  label: string;
  detail: string;
  state: 'pending' | 'active' | 'done';
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state !== 'active') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulseAnim]);

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <Animated.View
          style={[
            styles.timelineDot,
            state === 'done' && styles.timelineDotDone,
            state === 'active' && styles.timelineDotActive,
            state === 'active' && { opacity: pulseAnim },
          ]}
        >
          {state === 'done' && <Ionicons name="checkmark" size={11} color="#000" />}
          {state === 'active' && <View style={styles.timelineDotPulse} />}
        </Animated.View>
        {!isLast && (
          <View style={[styles.timelineLine, state === 'done' && styles.timelineLineDone]} />
        )}
      </View>
      <View style={[styles.timelineText, isLast && { paddingBottom: 0 }]}>
        <Text
          style={[
            styles.timelineLabel,
            state === 'done' && styles.timelineLabelDone,
            state === 'active' && styles.timelineLabelActive,
          ]}
        >
          {label}
        </Text>
        <Text style={styles.timelineDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  backFab: {
    position: 'absolute',
    top: 6,
    left: 10,
    zIndex: 5,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: 24 },
  body: { paddingHorizontal: 22, paddingTop: 24 },

  heroCheckRing: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,127,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroCheckInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#00FF7F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionLabelGap: { marginTop: 18 },

  timeline: {
    paddingLeft: 4,
    marginBottom: 24,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#00FF7F',
    borderColor: '#00FF7F',
  },
  timelineDotActive: {
    backgroundColor: 'rgba(0,255,127,0.15)',
    borderColor: '#00FF7F',
  },
  timelineDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00FF7F',
  },
  timelineLine: {
    width: 1.5,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 2,
  },
  timelineLineDone: { backgroundColor: '#00FF7F' },
  timelineText: { flex: 1, paddingBottom: 18 },
  timelineLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
    marginBottom: 3,
    paddingTop: 1,
  },
  timelineLabelDone: { color: '#ffffff' },
  timelineLabelActive: { color: '#ffffff' },
  timelineDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
  },

  earningsCard: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.55)',
  },
  earningsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  earningsLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  earningStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,203,71,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.4)',
  },
  earningStatusPillCleared: {
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderColor: 'rgba(0,255,127,0.4)',
  },
  earningStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFCB47',
  },
  earningStatusDotCleared: { backgroundColor: '#00FF7F' },
  earningStatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FFCB47',
    letterSpacing: 1.4,
  },
  earningStatusTextCleared: { color: '#00FF7F' },
  earningsValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 36,
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 0,
  },
  earningsBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  earningsBalanceLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  earningsBalanceValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  rejectionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,203,71,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.3)',
    marginTop: 12,
  },
  rejectionNoteText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  rejectionNoteLink: {
    fontFamily: 'Inter_700Bold',
    color: '#FFCB47',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.1)' },

  ratingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  ratingLineText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  ratingTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  ratingSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,255,127,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.4)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 22,
    marginBottom: 10,
  },
  toastIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,255,127,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  toastBold: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
  },
  ctaWrap: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 17,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
