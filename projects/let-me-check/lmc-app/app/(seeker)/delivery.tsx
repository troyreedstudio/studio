import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ActivityIndicator, Animated, Easing, Share, StatusBar, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { getCheck, getCheckClip, rateCheck, type CheckRow, type ClipRow } from '../lib/checks';
import { getPlaybackToken } from '../lib/clips';
import { requestRefund, type RefundReason } from '../lib/payments';
import { supabase } from '../lib/supabase';
import { useSavedPlaces } from '../state/saved';
import { colors } from '../lib/theme';

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
  const { toggle, isSaved } = useSavedPlaces();
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [check, setCheck] = useState<CheckRow | null>(null);
  const [clip, setClip] = useState<ClipRow | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scoutProfile, setScoutProfile] = useState<{ display_name: string | null; avg_rating: number | null; clip_count: number | null } | null>(null);

  // Reveal fade — the video + chrome fade in on arrival (the "reveal" moment).
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!checkId) return;
    getCheck(checkId).then(setCheck).catch(() => {});
    getCheckClip(checkId).then(setClip).catch(() => {});
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

  // Autoplay + loop — the video reveals and plays on arrival (no tap-to-play).
  const player = useVideoPlayer(videoSrc, (p) => { p.loop = true; p.muted = false; p.play(); });

  // Fade the whole screen in once the source resolves — the cinematic reveal.
  useEffect(() => {
    if (!videoSrc) return;
    Animated.timing(reveal, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [videoSrc, reveal]);

  const togglePlay = () => {
    try {
      if (paused) player.play(); else player.pause();
    } catch { /* player may not be ready */ }
    setPaused((v) => !v);
  };

  const locationLabel = check?.location_label || `${venue}, ${city}`;
  const filmedLine = formatFilmedAgo(clip?.filmed_at ?? null);
  // Freshness decays: a snapshot older than ~12 min may no longer reflect the
  // place, so the trust badge shifts green→amber and adds an honest "may have
  // changed" nudge (pairs with the real-time expectation set at order time).
  const filmedMins = clip?.filmed_at
    ? Math.max(0, Math.round((Date.now() - new Date(clip.filmed_at).getTime()) / 60000))
    : null;
  const stale = filmedMins != null && filmedMins >= 12;

  const savedLat = check?.requested_lat;
  const savedLng = check?.requested_lng;
  const hasCoord = typeof savedLat === 'number' && typeof savedLng === 'number' && Number.isFinite(savedLat) && Number.isFinite(savedLng);
  const placeKey = hasCoord ? `place-${savedLat.toFixed(5)}_${savedLng.toFixed(5)}` : null;
  const placeSaved = placeKey ? isSaved(placeKey) : false;
  const handleSavePlace = () => {
    if (!hasCoord || !placeKey) return;
    toggle({ id: placeKey, name: locationLabel, coord: [savedLng, savedLat], marketId: check?.market_id ?? '' });
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `I just checked out ${locationLabel} live on Let Me Check 👀 Real eyes, right now, anywhere.` });
    } catch { /* user dismissed the share sheet */ }
  };

  const scoutName = scoutProfile?.display_name ?? 'Your Scout';
  const scoutInitial = (scoutProfile?.display_name?.trim()?.[0] ?? 'S').toUpperCase();
  const ratingPart = scoutProfile?.avg_rating != null ? `★ ${scoutProfile.avg_rating}` : null;
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

      {/* Header — on the white canvas */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backFab} onPress={() => router.replace('/(seeker)/home')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.readyEyebrow}>YOUR CHECK IS READY</Text>
          <Text style={styles.headerVenue} numberOfLines={1}>{locationLabel}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Video card — the only dark surface: a contained rounded player. */}
      <View style={styles.videoCard}>
        {videoSrc ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: reveal }]}>
            <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={togglePlay}>
              <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
            </TouchableOpacity>
            {paused && (
              <View style={styles.pauseOverlay} pointerEvents="none">
                <View style={styles.pausePill}><Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} /></View>
              </View>
            )}
            {/* Trust line floats at the bottom of the video (GPS · faces · filmed-ago) */}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.videoBottomScrim} pointerEvents="none" />
            <View style={styles.trustFloat} pointerEvents="none">
              {clip?.gps_verified === true && (
                <View style={styles.verifiedChip}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.verified} />
                  <Text style={styles.verifiedChipText}>GPS VERIFIED · FACES BLURRED</Text>
                </View>
              )}
              <View style={styles.filmedRow}>
                <View style={[styles.liveBlip, stale && styles.liveBlipStale]} />
                <Text style={[styles.filmedText, stale && styles.filmedTextStale]}>
                  {stale ? `${filmedLine} · conditions may have changed` : filmedLine}
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.processingWrap}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.processingText}>Preparing your video…</Text>
          </View>
        )}
      </View>

      {/* Controls — on the white canvas below the video */}
      <View style={styles.controls}>
        {/* Rate — framed around the Scout's VIDEO (clear? on location? well filmed?),
            NOT the venue's later conditions, so a place changing by the time the
            Seeker arrives can't unfairly tank the Scout or justify a refund. */}
        <Text style={styles.rateLabel}>RATE YOUR SCOUT</Text>
        <Text style={styles.rateSub}>How was the video? Clear, on location, well filmed?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => handleRate(star)} disabled={submitting} activeOpacity={0.7}>
              <Ionicons name="star" size={32} color={star <= rating ? colors.amber : colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Scout row */}
        <View style={styles.scoutRow}>
          <View style={styles.scoutAvatar}><Text style={styles.scoutAvatarText}>{scoutInitial}</Text></View>
          <View style={styles.scoutInfo}>
            <Text style={styles.scoutName} numberOfLines={1}>{scoutName}</Text>
            {scoutMeta ? <Text style={styles.scoutMeta} numberOfLines={1}>{scoutMeta}</Text> : null}
          </View>
        </View>

        {/* Actions: Save · Share · Done */}
        <View style={styles.actionsRow}>
          {hasCoord && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleSavePlace} activeOpacity={0.75}>
              <Ionicons name={placeSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={placeSaved ? colors.red : colors.textPrimary} />
              <Text style={styles.actionLabel}>{placeSaved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.75}>
            <Ionicons name="share-outline" size={19} color={colors.textPrimary} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(seeker)/home')} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>DONE</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.reportLink} onPress={() => setReportOpen(true)} activeOpacity={0.7}>
          <Text style={styles.reportLinkText}>Something wrong with this check?</Text>
        </TouchableOpacity>
      </View>

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

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  backFab: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  readyEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9.5, color: colors.red, letterSpacing: 2.4, marginBottom: 3 },
  headerVenue: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.textPrimary, letterSpacing: 0.2, maxWidth: 240 },

  // Video card — the one dark surface
  videoCard: { flex: 1, marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', backgroundColor: '#000' },
  processingWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 12 },
  processingText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  pausePill: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },

  // Trust line — sits ON the (dark) video, so it stays light-on-dark
  videoBottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 96 },
  trustFloat: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center', gap: 7 },
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 100, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  verifiedChipText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.92)', letterSpacing: 1.2 },
  filmedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveBlip: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.verified },
  liveBlipStale: { backgroundColor: colors.amber },
  filmedText: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, color: 'rgba(255,255,255,0.82)', letterSpacing: 0.4 },
  filmedTextStale: { color: colors.amber },

  // Controls — on the white canvas
  controls: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  rateLabel: { fontFamily: 'Inter_700Bold', fontSize: 10.5, color: colors.textTertiary, letterSpacing: 3, marginBottom: 4, textAlign: 'center' },
  rateSub: { fontFamily: 'Inter_400Regular', fontSize: 11.5, color: colors.textTertiary, letterSpacing: 0.2, textAlign: 'center', marginBottom: 14 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 18, alignSelf: 'center' },

  scoutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  scoutAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  scoutAvatarText: { fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 16 },
  scoutInfo: { flex: 1 },
  scoutName: { fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 16, letterSpacing: 0.2, marginBottom: 2 },
  scoutMeta: { fontFamily: 'Inter_400Regular', color: colors.textSecondary, fontSize: 11.5, letterSpacing: 0.3 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  actionBtn: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionLabel: { fontFamily: 'Inter_600SemiBold', color: colors.textPrimary, fontSize: 11, letterSpacing: 0.3 },
  doneBtn: { flex: 1, backgroundColor: colors.red, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontFamily: 'Inter_700Bold', color: colors.onRed, fontSize: 13, letterSpacing: 2.5 },

  reportLink: { alignItems: 'center', paddingVertical: 10 },
  reportLinkText: { fontFamily: 'Inter_400Regular', color: colors.textTertiary, fontSize: 12, textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
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
