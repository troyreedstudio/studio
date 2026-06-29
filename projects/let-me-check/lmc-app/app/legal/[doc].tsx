import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { recordDocConsent } from '../lib/consent';
import { colors } from '../lib/theme';
import { CtaGlow, ctaGlowShadow } from '../components/CtaGlow';
import { BackButton } from '../components/BackButton';

type DocKey = 'terms' | 'privacy' | 'aup' | 'code';

type DocContent = {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

const DOCS: Record<DocKey, DocContent> = {
  terms: {
    title: 'Terms of Service',
    effectiveDate: 'Effective 2026-06-08',
    intro:
      'These terms govern your use of Let Me Check. By using the app you agree to them. Plain English, no legalese.',
    sections: [
      {
        heading: '1. The Service',
        body:
          'Let Me Check connects Seekers (people who pay for a location check) with Scouts (people on the ground who film a 15-second video). Let Me Check operates the platform; we do not own the venues filmed and do not employ Scouts as staff.',
      },
      {
        heading: '2. Eligibility',
        body:
          'You must be 18 or older to use Let Me Check. You agree to the Acceptable Use Policy and Privacy Policy. We may suspend accounts that violate these terms.',
      },
      {
        heading: '3. Pricing + Fees',
        body:
          'Standard checks are $15 + $1.50 platform fee. Priority checks are $20 + $2.00 platform fee. Optional Partner Interior adds $5. Payment processed via Stripe.',
      },
      {
        heading: '4. Refunds',
        body:
          'Auto-refund: no video delivered, Scout off-fence, venue closed, GPS failure, wrong venue. Partial refund: video missing a key flagged element. No refund: video is legitimate and shows reality.',
      },
      {
        heading: '5. Scout Independent Contractor',
        body:
          'Scouts are independent contractors, not Let Me Check employees. Scouts set their own hours, choose which checks to accept, and are responsible for their own taxes. Let Me Check issues a 1099-NEC each January for Scouts earning $600+ in a calendar year.',
      },
      {
        heading: '6. Liability',
        body:
          'Let Me Check is not liable for venue access disputes, third-party privacy claims arising from misuse, or losses incurred by Scouts performing checks. Use the app at your own risk.',
      },
      {
        heading: '7. Changes',
        body:
          'We may update these terms. We will notify you in-app for material changes. Continued use after changes constitutes acceptance.',
      },
      {
        heading: '8. Contact',
        body: 'Questions? Email legal@letmecheck.app.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    effectiveDate: 'Effective 2026-06-08',
    intro:
      'This explains what data Let Me Check collects, how we use it, and what control you have over it.',
    sections: [
      {
        heading: '1. What we collect',
        body:
          'Account: name, email, phone, auth credential. Scouts also: full DOB, SSN (via Stripe, never on our servers), bank info (via Stripe Connect Express), home address (for 1099 mailing), gov ID (via Stripe Identity).',
      },
      {
        heading: '2. What we capture from videos',
        body:
          'GPS coordinates of where the video was filmed (verification). Venue metadata (OCR + signage match). Video itself (encrypted, delivered via Mux). No audio is ever recorded, the camera mic is muted by default.',
      },
      {
        heading: '3. How we use it',
        body:
          'Account: deliver service, send receipts, comply with law. Scout payouts: file 1099 with IRS. Videos: deliver to the Seeker who paid, then auto-delete from CDN after 30 days unless flagged for legal hold.',
      },
      {
        heading: '4. Who sees it',
        body:
          'Seeker who requested the check sees the delivered video. Let Me Check ops sees venue metadata for dispatch and verification. Stripe holds payment and identity data. We do not sell or rent personal data to advertisers.',
      },
      {
        heading: '5. Your rights',
        body:
          'You can request a copy of your data, request deletion, or withdraw consent at any time. Email privacy@letmecheck.app.',
      },
      {
        heading: '6. Cookies + tracking',
        body:
          "In-app: minimal analytics for product reliability. No third-party advertising trackers. iOS App Tracking Transparency: we don't request the IDFA.",
      },
      {
        heading: '7. Security',
        body:
          'All sensitive data (SSN, bank) is held by Stripe, not Let Me Check. Our servers store auth tokens and video metadata only, all at rest encrypted (AES-256).',
      },
      {
        heading: '8. Contact',
        body: 'Privacy questions: privacy@letmecheck.app.',
      },
    ],
  },
  aup: {
    title: 'Acceptable Use Policy',
    effectiveDate: 'Effective 2026-06-08',
    intro:
      'Rules for how you can, and cannot, use Let Me Check. Violations lead to account suspension or termination.',
    sections: [
      {
        heading: '1. What Let Me Check IS for',
        body:
          "Knowing what's happening at a public-facing location right now: line length, wait time, vibe, queue status, opening status. Public venues, public-facing interiors (with venue policy), public events.",
      },
      {
        heading: '2. What Let Me Check IS NOT for',
        body:
          'Stalking. Surveilling. Tracking a specific person. Monitoring an ex-partner, family member, coworker, or anyone you have no public-access right to observe. Planning or scouting for illegal activity.',
      },
      {
        heading: '3. As a Seeker',
        body:
          'You may not request videos that target a specific individual. You may not request videos of private property without permission. You may not use delivered videos for advertising, public broadcast, or commercial use without Let Me Check authorization.',
      },
      {
        heading: '4. As a Scout',
        body:
          'You agree to The Scout Code in full: no faces, no audio, no private property, no children, no hospitals/schools/courts/police, no staging. Quality Standards apply, rejection means no payment.',
      },
      {
        heading: '5. Violations',
        body:
          'First violation: warning. Second: 7-day suspension. Third: permanent account termination. Severe violations (stalking, illegal use, fake videos): immediate permanent termination and we may cooperate with law enforcement.',
      },
      {
        heading: '6. Reporting',
        body:
          'See something? Report via the in-app TROUBLE HERE button or email abuse@letmecheck.app. We investigate within 24 hours.',
      },
    ],
  },
  code: {
    title: 'The Scout Code',
    effectiveDate: 'Effective 2026-06-08',
    intro:
      'The full Code of Conduct every Scout signs at onboarding. Reproduced here as a readable reference.',
    sections: [
      {
        heading: 'What you can film',
        body:
          'Public sidewalks, streets, parking lots, plazas. The line, queue, or entry area of a venue from a public vantage point. Public-facing interiors (GREEN-tier venues) per category guidelines. Partner Interior (+$5) when the venue is marked PARTNER.',
      },
      {
        heading: "What we don't capture",
        body:
          "Close-ups of strangers' faces (auto-blurred regardless). Children in frame. Anyone who explicitly objects. Areas marked \"No Photography\". Airport security, gates, customs. Hospitals, schools, courts, police, military. Bathrooms, locker rooms, dressing rooms, ever. Private homes / private property. Audio of any kind (mic stays muted).",
      },
      {
        heading: 'Quality standards',
        body:
          "Rejection = no payment. A video can be rejected for: blurry/shaky/out-of-focus footage, venue not visible, GPS mismatch, lens covered, faces in frame that couldn't be auto-blurred, audio detected, video shorter than required. You get up to 3 takes per check, use them.",
      },
      {
        heading: 'Conduct',
        body:
          'Be unobtrusive. If asked what you\'re doing: "I\'m using Let Me Check, an app that does location checks. I can leave right now if that\'s a problem." If asked to stop, stop immediately and hit TROUBLE HERE. Do not provoke a reaction. No staging or re-shoots, one take, real-time.',
      },
      {
        heading: 'Pay',
        body:
          'Standard $8 (10-min window). Priority $12 (7-min window). Honest abort $3 (TROUBLE HERE + GPS proof). Fake/abandon $0 plus possible account suspension.',
      },
      {
        heading: 'Independent Contractor',
        body:
          "You're an independent contractor, not a Let Me Check employee. You set your own hours, choose which checks to accept, and are responsible for your own taxes. 1099-NEC mailed each January if you earn $600+. Let Me Check may deactivate your account at any time for violations.",
      },
    ],
  },
};

export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const key = (doc as DocKey) in DOCS ? (doc as DocKey) : 'terms';
  const content = DOCS[key];
  const [accepted, setAccepted] = useState(false);

  // SAFE-02: tapping Accept records a versioned consent row + a consent.accepted
  // event for this specific document.
  const handleAccept = () => {
    setAccepted(true);
    void recordDocConsent(key);
  };

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton fallback="/welcome" />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.docLabel}>LEGAL</Text>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.effective}>{content.effectiveDate}</Text>

          <Text style={styles.intro}>{content.intro}</Text>

          {content.sections.map((s, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.heading}>{s.heading}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.acceptBtn, accepted && styles.acceptBtnDone, !accepted && ctaGlowShadow]}
            onPress={handleAccept}
            disabled={accepted}
            activeOpacity={0.85}
          >
            {!accepted && <CtaGlow radius={14} />}
            <Text style={[styles.acceptBtnText, accepted && styles.acceptBtnTextDone]}>
              {accepted ? '✓ ACCEPTED' : 'I ACCEPT'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.foot}>
            Questions about this document? Email legal@letmecheck.app.
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
    paddingBottom: 12,
  },
  scroll: { paddingHorizontal: 26, paddingBottom: 48 },

  docLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  effective: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  intro: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 21,
    letterSpacing: 0.2,
    marginBottom: 24,
  },

  section: {
    marginBottom: 18,
  },
  heading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 19,
    letterSpacing: 0.2,
  },

  acceptBtn: {
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  acceptBtnDone: {
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.35)',
  },
  acceptBtnText: {
    fontFamily: 'Inter_700Bold',
    color: colors.onRed,
    fontSize: 12,
    letterSpacing: 2.5,
  },
  acceptBtnTextDone: {
    color: colors.verified,
  },

  foot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textTertiary,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
});
