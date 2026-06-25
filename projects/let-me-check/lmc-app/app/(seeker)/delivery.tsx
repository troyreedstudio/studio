import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Modal, TextInput, ActivityIndicator, Dimensions, Animated, Easing, StatusBar } from 'react-native';

// Hero video height — the clip is portrait, so let it dominate the screen
// (Netflix-style) instead of a small thumbnail. Caps so a sliver of the details
// below peeks to invite scroll.
const HERO_VIDEO_H = Math.round(Dimensions.get('window').height * 0.62);
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getCheck, getCheckClip, rateCheck, type CheckRow, type ClipRow } from '../lib/checks';
import { getPlaybackToken } from '../lib/clips';
import { requestRefund, type RefundReason } from '../lib/payments';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';

const REFUND_REASONS: { code: RefundReason; label: string }[] = [
  { code: 'blurry', label: 'Too blurry to use' },
  { code: 'wrong_location', label: 'Wrong location' },
  { code: 'didnt_show_needed', label: "Didn't show what I needed" },
  { code: 'never_delivered', label: 'Never delivered' },
  { code: 'other', label: 'Something else' },
];

function formatFilmedAgo(filmedAt: string | null): string {
  if (!filmedAt) return 'Filmed moments ago';
  const then = new Date(filmedAt).getTime();
  if (Number.isNaN(then)) return 'Filmed moments ago';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'Filmed just now';
  if (mins === 1) return 'Filmed 1 min ago';
  if (mins < 60) return `Filmed ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? 'Filmed 1 hr ago' : `Filmed ${hrs} hrs ago`;
}

// ── Report sheet (local sub-component) ───────────────────────────────────────
function ReportSheet({ checkId, onClose }: { checkId: string; onClose: () => void }) {
  const [selected, setSelected] = useState<RefundReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<'refunded' | 'under_review' | null>(null);

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const r = await requestRefund(checkId, selected, note || undefined);
      setOutcome(r.status);
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Report a Problem</Text>
      {outcome ? (
        <>
          <Text style={s.outcomeText}>
            {outcome === 'refunded' ? 'Refund issued to your card.' : 'Thanks, our team will review this.'}
          </Text>
          <TouchableOpacity style={s.submitBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.submitTxt}>DONE</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {REFUND_REASONS.map(({ code, label }) => (
            <TouchableOpacity
              key={code}
              style={[s.reasonRow, selected === code && s.reasonRowSel]}
              onPress={() => setSelected(code)}
              activeOpacity={0.75}
            >
              <View style={[s.radio, selected === code && s.radioSel]} />
              <Text style={s.reasonLbl}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={s.noteInput}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={280}
          />
          <View style={s.rowBtns}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, s.submitBtnFlex, (!selected || submitting) && s.disabledBtn]}
              onPress={submit}
              disabled={!selected || submitting}
              activeOpacity={0.8}
            >
              {submitting ? <ActivityIndicator size="small" color={colors.onRed} /> : <Text style={s.submitTxt}>SUBMIT</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DeliveryScreen() {
  const router = useRouter();
  const { checkId, venue = 'Komodo', city = 'Miami' } = useLocalSearchParams<{ checkId: string; venue: string; city: string }>();
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [check, setCheck] = useState<CheckRow | null>(null);
  const [clip, setClip] = useState<ClipRow | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [scoutProfile, setScoutProfile] = useState<{ display_name: string | null; avg_rating: number | null; clip_count: number | null } | null>(null);
  // Branded poster shown over the player until the Seeker taps play — avoids the
  // raw green/blank video surface expo-video shows before the first frame.
  const [showPoster, setShowPoster] = useState(true);
  const posterPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!checkId) return;
    getCheck(checkId)
      .then((c) => { setCheck(c); })
      .catch(() => {});
    getCheckClip(checkId)
      .then((cl) => { setClip(cl); })
      .catch(() => {});
  }, [checkId]);

  useEffect(() => {
    if (!checkId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc('get_check_scout_public', { p_check_id: checkId })
      .then(({ data }: { data: { display_name: string | null; avg_rating: number | null; clip_count: number | null }[] | null }) => {
        if (data?.[0]) setScoutProfile(data[0]);
      })
      .catch(() => {});
  }, [checkId]);

  useEffect(() => {
    if (!checkId || !clip?.mux_playback_id) return;
    let cancelled = false;
    getPlaybackToken(checkId)
      .then((token) => { if (!cancelled) setVideoSrc(`https://stream.mux.com/${clip.mux_playback_id}.m3u8?token=${token}`); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [checkId, clip?.mux_playback_id]);

  const player = useVideoPlayer(videoSrc, (p) => { p.loop = false; });

  // Gentle pulse on the poster play button.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(posterPulse, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(posterPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [posterPulse]);

  const handlePlayPoster = () => {
    try { player.play(); } catch { /* player may not be ready; the tap still reveals controls */ }
    setShowPoster(false);
  };
  const locationLabel = check?.location_label || `${venue}, ${city}`;
  const filmedLine = formatFilmedAgo(clip?.filmed_at ?? null);

  const scoutName = scoutProfile?.display_name ?? 'Your Scout';
  const scoutInitial = (scoutProfile?.display_name?.trim()?.[0] ?? 'S').toUpperCase();
  const ratingPart = scoutProfile?.avg_rating != null ? `⭐ ${scoutProfile.avg_rating}` : null;
  const clipsPart = scoutProfile?.clip_count != null ? `${scoutProfile.clip_count} videos` : null;
  const scoutMeta = [ratingPart, clipsPart].filter(Boolean).join(' · ');

  const handleRate = async (star: number) => {
    if (submitting) return;
    setRating(star);
    if (!checkId) return;
    setSubmitting(true);
    try { await rateCheck(checkId, star); }
    catch (e) { setRating(0); Alert.alert("Couldn't save your rating", e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity style={styles.backFab} onPress={() => router.replace('/(seeker)/home')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}><Text style={styles.checkMark}>✓</Text></View>
          <Text style={styles.readyTitle}>YOUR CHECK IS READY</Text>
          <Text style={styles.venueName}>{locationLabel}</Text>
        </View>

        <View style={[styles.videoBox, { height: HERO_VIDEO_H }]}>
          {videoSrc ? (
            <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="cover" allowsFullscreen nativeControls />
          ) : (
            <View style={styles.processingWrap}>
              <Ionicons name="hourglass-outline" size={28} color="rgba(255,255,255,0.6)" />
              <Text style={styles.processingText}>Processing your video…</Text>
            </View>
          )}
          <View style={styles.videoBadge}><Text style={styles.videoBadgeText}>HD · 15s</Text></View>
          {/* Branded poster over the player until tap — hides the raw green surface. */}
          {videoSrc && showPoster && (
            <TouchableOpacity style={styles.poster} activeOpacity={0.92} onPress={handlePlayPoster}>
              <Text style={styles.posterBrand}>LET ME CHECK</Text>
              <Animated.View style={[styles.posterPlay, { transform: [{ scale: posterPulse }] }]}>
                <Ionicons name="play" size={34} color="#000" style={{ marginLeft: 4 }} />
              </Animated.View>
              <Text style={styles.posterHint}>Tap to play your check</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Filmed-ago moved BELOW the player so it never covers the footage. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, marginBottom: 8 }}>
          <View style={styles.liveBlip} />
          <Text style={styles.liveTime}>{filmedLine}</Text>
        </View>

        <Text style={styles.sectionLabel}>RATE YOUR CHECK</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => handleRate(star)} disabled={submitting} activeOpacity={0.7}>
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && <Text style={styles.ratingFeedback}>{rating >= 4 ? 'Awesome! Thanks for rating 🙌' : 'Thanks for the feedback'}</Text>}

        <View style={styles.scoutCard}>
          <View style={styles.scoutAvatar}><Text style={styles.scoutAvatarText}>{scoutInitial}</Text></View>
          <View style={styles.scoutInfo}>
            <Text style={styles.scoutName}>{scoutName}</Text>
            {scoutMeta ? <Text style={styles.scoutRating}>{scoutMeta}</Text> : null}
          </View>
          {clip?.gps_verified === true && (
            <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
          )}
        </View>

        <TouchableOpacity style={[styles.primaryBtn, ctaGlowShadow]} onPress={() => router.replace('/(seeker)/home')} activeOpacity={0.85}>
          <CtaGlow radius={14} />
          <Text style={styles.primaryBtnText}>DONE · BACK TO HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportLink} onPress={() => setReportOpen(true)} activeOpacity={0.7}>
          <Text style={styles.reportLinkText}>Something wrong with this check?</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.modalOverlay}>
          {checkId ? <ReportSheet checkId={checkId} onClose={() => setReportOpen(false)} /> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backFab: { position: 'absolute', top: 6, left: 6, zIndex: 5, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  successHeader: { alignItems: 'center', marginBottom: 28 },
  // Check circle: verified green — semantic "success / delivered" state
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(22,163,74,0.12)', borderWidth: 2, borderColor: colors.verified, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  checkMark: { fontFamily: 'Inter_700Bold', fontSize: 36, color: colors.verified },
  readyTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: 0.5, marginBottom: 8 },
  venueName: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.textSecondary, letterSpacing: 0.4 },
  // Video box: stays dark — video content looks best on a dark surface
  videoBox: { height: 220, backgroundColor: '#0d0d0d', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 18, position: 'relative', overflow: 'hidden' },
  processingWrap: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  processingText: { fontFamily: 'Inter_500Medium', fontSize: 12.5, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3 },
  videoBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#000000aa', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  // Poster: stays dark (sits over the video surface before play)
  poster: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 22 },
  posterBrand: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 22, letterSpacing: 3, textTransform: 'uppercase' },
  // Poster play button: colors.red — primary action on the branded poster
  posterPlay: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center', shadowColor: colors.red, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  posterHint: { fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)', fontSize: 12.5, letterSpacing: 0.4 },
  videoBadgeText: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 9, letterSpacing: 1.5 },
  liveTimestamp: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  // Filmed-ago blip: colors.verified — "recently delivered" is a success state
  liveBlip: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.verified },
  liveTime: { fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, fontSize: 10.5, letterSpacing: 0.4 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.textTertiary, letterSpacing: 3, marginBottom: 12, marginTop: 6, textTransform: 'uppercase' },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  star: { fontSize: 36, color: colors.border },
  starActive: { color: colors.amber },
  ratingFeedback: { fontFamily: 'Inter_400Regular', color: colors.textSecondary, fontSize: 12.5, marginBottom: 22, letterSpacing: 0.3 },
  scoutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 26, marginTop: 8 },
  scoutAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  scoutAvatarText: { fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 16, letterSpacing: 0.3 },
  scoutInfo: { flex: 1 },
  scoutName: { fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 17, letterSpacing: 0.3, marginBottom: 3 },
  scoutRating: { fontFamily: 'Inter_400Regular', color: colors.textSecondary, fontSize: 11.5, letterSpacing: 0.3 },
  // Verified badge: colors.verified — semantic GPS-verified checkmark
  verifiedBadge: { backgroundColor: 'rgba(22,163,74,0.08)', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(22,163,74,0.35)' },
  verifiedText: { fontFamily: 'Inter_700Bold', color: colors.verified, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  primaryBtn: { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { fontFamily: 'Inter_700Bold', color: colors.onRed, fontSize: 13, letterSpacing: 2.5 },
  reportLink: { alignItems: 'center', paddingVertical: 14 },
  reportLinkText: { fontFamily: 'Inter_400Regular', color: colors.textTertiary, fontSize: 12, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
});

// Sheet-specific styles kept separate so the main StyleSheet stays scannable.
const s = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 16, letterSpacing: 0.3, marginBottom: 18 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  reasonRowSel: { borderColor: colors.red, backgroundColor: 'rgba(218,37,29,0.04)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.borderStrong, marginRight: 12 },
  radioSel: { borderColor: colors.red, backgroundColor: colors.red },
  reasonLbl: { fontFamily: 'Inter_400Regular', color: colors.textPrimary, fontSize: 13.5 },
  noteInput: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 13, padding: 12, minHeight: 64, textAlignVertical: 'top' },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, fontSize: 12.5, letterSpacing: 1 },
  submitBtn: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnFlex: { flex: 2 },
  disabledBtn: { opacity: 0.4 },
  submitTxt: { fontFamily: 'Inter_700Bold', color: colors.onRed, fontSize: 12.5, letterSpacing: 2 },
  outcomeText: { fontFamily: 'Inter_400Regular', color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 8 },
});
