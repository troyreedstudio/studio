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

// Source of truth: docs/SCOUT-CONDUCT.md + docs/FILMING-POLICY.md

const WHERE = [
  {
    title: 'Public sidewalks, streets, parking lots',
    why: 'You can always film a venue from a public vantage point — sidewalk, street, public plaza, parking lot.',
  },
  {
    title: 'The line, queue, or entry area',
    why: 'Wide shots of the door, the staff, the wait. Filmed from where the public is allowed to stand.',
  },
  {
    title: 'Public-facing interiors (GREEN venues)',
    why: 'Restaurant dining room, hotel lobby, retail floor, stadium concourse, DMV waiting room, airport check-in lobby. Wide shots only.',
  },
  {
    title: 'Partner Interior (+$5, up to 30s)',
    why: 'Only when the venue is marked PARTNER and the Seeker chose Partner Interior. Otherwise stay outside.',
  },
];

const NEVER_PEOPLE = [
  {
    title: 'No close-ups of strangers’ faces',
    why: 'Wide shots only. If a face fills the frame, the clip won’t deliver.',
  },
  {
    title: 'No children in frame',
    why: 'If kids are visible, reposition or hit TROUBLE HERE and abort.',
  },
  {
    title: 'No one who objects to being filmed',
    why: 'If someone tells you to stop, stop. No argument. Hit TROUBLE HERE if needed.',
  },
];

const NEVER_PLACES = [
  {
    title: 'No "No Photography" zones',
    why: 'If you see a sign, stop. Abort. Hit TROUBLE HERE with reason "Posted no-filming".',
  },
  {
    title: 'No airport security, gates, or customs',
    why: 'TSA forbids it. Curbside drop-off and check-in lobby only. Never past security.',
  },
  {
    title: 'No hospitals, schools, courts, police, military',
    why: 'These are RED venues. Auto-rejected on submission. Refuse the job.',
  },
  {
    title: 'No bathrooms, locker rooms, dressing rooms',
    why: 'Ever. Regardless of venue. Bright privacy line.',
  },
  {
    title: 'No trespassing',
    why: 'No fences. No staff-only doors. No private property. If you can’t get the shot from public access, abort.',
  },
];

const NEVER_AUDIO = [
  {
    title: 'Camera mic stays muted',
    why: 'Florida and many states require two-party consent to record audio. You don’t have it. The mic stays off.',
  },
];

const CONDUCT = [
  {
    title: 'Be unobtrusive',
    why: 'Hold the phone like you’re watching a video, not filming. Stand to the side. Get in, get the shot, get out.',
  },
  {
    title: 'If asked what you’re doing',
    why: 'Say: "I’m using LMC, an app that does location checks. I can leave right now if that’s a problem." Then leave if asked.',
  },
  {
    title: 'If asked to stop',
    why: 'Stop immediately. Hit TROUBLE HERE in the app, pick the right reason, walk away. You’ll still be paid for travel.',
  },
  {
    title: 'Don’t provoke a reaction',
    why: 'Don’t film fights, arguments, intoxicated or distressed people. Aborting is always the right call.',
  },
  {
    title: 'No staging, no re-shoots, no faking',
    why: 'One take, real-time. GPS-stamping verifies you were on-site. Faking a clip is fraud and triggers immediate deactivation + clawback.',
  },
];

const PAY = [
  { title: 'Standard $8', why: 'Clip delivered within the 10-minute window.' },
  { title: 'Priority $12', why: 'Clip delivered within the 7-minute window.' },
  { title: 'Honest abort $3', why: 'TROUBLE HERE with a valid reason + GPS confirms you were inside the geofence.' },
  { title: 'Fake / abandon $0', why: 'Plus possible account suspension.' },
];

const CONTRACTOR = [
  'You are an independent contractor — not an LMC employee.',
  'You set your own hours and choose which checks to accept.',
  'You are responsible for your own taxes. We send a 1099 each January.',
  'You acknowledge LMC is not liable for harm you cause by ignoring this Code.',
  'LMC may deactivate your account at any time for violations. Outstanding earnings paid within 7 business days.',
];

export default function ScoutRulesScreen() {
  const router = useRouter();
  const [consented, setConsented] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const bothGated = consented && agreed;

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
            {[1, 2, 3].map((n) => (
              <View key={n} style={[styles.dot, styles.dotActive]} />
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
          <Text style={styles.title}>The Scout Code</Text>
          <Text style={styles.subtitle}>
            What every Scout agrees to before their first check. Plain English, no legalese — but every line matters.
          </Text>

          <View style={styles.tldrCard}>
            <Text style={styles.tldrLabel}>TL;DR</Text>
            <Text style={styles.tldrText}>
              Film public spaces. Don’t film people’s faces. Don’t record audio. Stop the moment anyone with authority at the venue tells you to.
            </Text>
          </View>

          {/* WHERE YOU CAN FILM */}
          <Text style={styles.sectionLabel}>WHERE YOU CAN FILM</Text>
          {WHERE.map((r, i) => (
            <Row key={i} type="ok" title={r.title} why={r.why} />
          ))}

          {/* PEOPLE */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>PEOPLE — NEVER</Text>
          {NEVER_PEOPLE.map((r, i) => (
            <Row key={i} type="no" title={r.title} why={r.why} />
          ))}

          {/* PLACES */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>PLACES — NEVER</Text>
          {NEVER_PLACES.map((r, i) => (
            <Row key={i} type="no" title={r.title} why={r.why} />
          ))}

          {/* AUDIO */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>AUDIO</Text>
          {NEVER_AUDIO.map((r, i) => (
            <Row key={i} type="no" title={r.title} why={r.why} />
          ))}

          {/* CONDUCT */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>CONDUCT AT THE VENUE</Text>
          {CONDUCT.map((r, i) => (
            <Row key={i} type="info" title={r.title} why={r.why} />
          ))}

          {/* QUALITY STANDARDS — what gets a clip rejected and why pay is conditional */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>QUALITY STANDARDS</Text>
          <View style={styles.qualityCard}>
            <View style={styles.qualityHeader}>
              <Ionicons name="alert-circle" size={16} color="#FFCB47" />
              <Text style={styles.qualityHeaderText}>REJECTION = NO PAYMENT</Text>
            </View>
            <Text style={styles.qualityBody}>
              Seekers and our verification system can reject a clip when the quality or location doesn’t meet the standard. If your clip is rejected, you don’t get paid for it. A clip can be rejected for any of these:
            </Text>
            <View style={styles.qualityList}>
              <QualityRow text="Blurry, shaky, or out-of-focus footage" />
              <QualityRow text="Venue not visible / wrong venue captured" />
              <QualityRow text="GPS doesn’t match the venue’s geofence" />
              <QualityRow text="Lens covered, finger in shot, or framing cropped" />
              <QualityRow text="Faces in frame that couldn’t be auto-blurred" />
              <QualityRow text="Audio detected (mic should always stay muted)" />
              <QualityRow text="Clip shorter than required or cut early" />
            </View>
            <View style={styles.qualityFooter}>
              <Ionicons name="information-circle" size={13} color="#88B4FF" />
              <Text style={styles.qualityFooterText}>
                You get up to 3 takes per check. Use them — review your shot before submitting.
              </Text>
            </View>
          </View>

          {/* PAY */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>PAY</Text>
          <View style={styles.payGrid}>
            {PAY.map((p, i) => (
              <View key={i} style={styles.payCell}>
                <Text style={styles.payAmount}>{p.title}</Text>
                <Text style={styles.payWhy}>{p.why}</Text>
              </View>
            ))}
          </View>

          {/* CLIP HANDLING */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>WHAT HAPPENS TO YOUR FOOTAGE</Text>
          <View style={styles.contractCard}>
            <Bullet text="Every clip uploads directly to LMC. You cannot keep a local copy." />
            <Bullet text="Faces in frame are automatically blurred before delivery." />
            <Bullet text="GPS coordinates and venue signage must match. If they don’t, the clip is rejected and you’re notified." />
            <Bullet text="Once delivered, the clip is private to the Seeker. Not posted, not advertised, not sold." />
            <Bullet text="Clips are deleted from the CDN after 30 days unless flagged for a takedown or legal hold." />
          </View>

          {/* INDEPENDENT CONTRACTOR AGREEMENT */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>
            INDEPENDENT CONTRACTOR AGREEMENT
          </Text>
          <View style={styles.contractCard}>
            {CONTRACTOR.map((b, i) => (
              <Bullet key={i} text={b} />
            ))}
          </View>

          {/* TWO GATES */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>BEFORE YOU CONTINUE</Text>

          <TouchableOpacity
            style={styles.gateRow}
            activeOpacity={0.75}
            onPress={() => setConsented((v) => !v)}
          >
            <View style={[styles.checkbox, consented && styles.checkboxOn]}>
              {consented && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={styles.gateText}>
              <Text style={styles.gateBold}>CONSENT.</Text> I understand the filming rules and I will only film in the ways described above. I will not film faces, children, audio, or anything in a no-go zone.
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
              <Text style={styles.gateBold}>AGREE.</Text> I have read and accept the Independent Contractor Agreement and the Scout Code of Conduct. I am not an employee of LMC.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, !bothGated && styles.primaryBtnDisabled]}
            disabled={!bothGated}
            onPress={() => router.push('/scout/approved')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.primaryBtnText, !bothGated && styles.primaryBtnTextDisabled]}
            >
              {bothGated ? 'I AGREE · CONTINUE' : 'TICK BOTH BOXES TO CONTINUE'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.foot}>
            You can revisit the full Code of Conduct any time from your Scout dashboard.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ type, title, why }: { type: 'ok' | 'no' | 'info'; title: string; why: string }) {
  const icon = type === 'ok' ? 'checkmark' : type === 'no' ? 'close' : 'information';
  const color = type === 'ok' ? '#00FF7F' : type === 'no' ? '#FF3B30' : '#88B4FF';
  const bg = type === 'ok'
    ? 'rgba(0,255,127,0.1)'
    : type === 'no'
    ? 'rgba(255,59,48,0.1)'
    : 'rgba(136,180,255,0.1)';
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

function QualityRow({ text }: { text: string }) {
  return (
    <View style={styles.qualityRow}>
      <Ionicons name="close" size={12} color="#FF6B6B" />
      <Text style={styles.qualityRowText}>{text}</Text>
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
  dot: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
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
  sectionLabelGap: { marginTop: 18 },

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

  payGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  payCell: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
  },
  payAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#00FF7F',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  payWhy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },

  qualityCard: {
    backgroundColor: 'rgba(255,203,71,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,203,71,0.35)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  qualityHeaderText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FFCB47',
    letterSpacing: 1.4,
  },
  qualityBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 10,
  },
  qualityList: { gap: 6, marginBottom: 10 },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  qualityRowText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
  },
  qualityFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  qualityFooterText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.65)',
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
