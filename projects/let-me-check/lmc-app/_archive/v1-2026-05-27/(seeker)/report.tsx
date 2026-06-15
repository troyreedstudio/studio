import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

const REASONS = [
  { id: 'wrong-place', label: 'Scout filmed the wrong place' },
  { id: 'bad-quality', label: 'Video quality is bad / unusable' },
  { id: 'no-show', label: 'Scout never delivered' },
  { id: 'late', label: 'Delivered way past the time window' },
  { id: 'privacy', label: 'Privacy concern (faces, home, etc.)' },
  { id: 'other', label: 'Something else' },
];

export default function ReportIssueScreen() {
  const router = useRouter();
  const { venue = 'this check' } = useLocalSearchParams<{ venue: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => router.back(), 1500);
    }, 1200);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successSub}>Our team will review within 24 hours</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Report Issue</Text>
          <Text style={styles.subtitle}>Help us improve · {venue}</Text>
        </View>

        {/* Reasons */}
        <Text style={styles.sectionLabel}>WHAT HAPPENED</Text>
        <View style={styles.reasonList}>
          {REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[styles.reasonRow, selected === reason.id && styles.reasonRowActive]}
              onPress={() => setSelected(reason.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, selected === reason.id && styles.radioActive]}>
                {selected === reason.id && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.reasonLabel, selected === reason.id && styles.reasonLabelActive]}>
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional details */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ADDITIONAL DETAILS · OPTIONAL</Text>
        <TextInput
          style={styles.detailsInput}
          placeholder="Tell us more about what happened..."
          placeholderTextColor="#555"
          value={details}
          onChangeText={setDetails}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{details.length} / 500</Text>

        <View style={{ height: 24 }} />

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!selected || submitting) && styles.submitBtnDisabled,
          ]}
          disabled={!selected || submitting}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Reports are reviewed by our team. If your check qualifies for a refund, we'll process it automatically.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    fontSize: 15,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 28,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FF8533',
    letterSpacing: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  reasonList: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  reasonRowActive: {
    backgroundColor: 'rgba(255,133,51,0.06)',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#FF8533',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8533',
  },
  reasonLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#cccccc',
    letterSpacing: 0.2,
  },
  reasonLabelActive: { color: '#fff' },
  detailsInput: {
    fontFamily: 'Inter_400Regular',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    marginHorizontal: 20,
    padding: 14,
    minHeight: 110,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  charCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#555',
    paddingHorizontal: 22,
    marginTop: 6,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  submitBtn: {
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#2a2a2a',
    shadowOpacity: 0,
  },
  submitBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 2,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  successCheck: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: '#22c55e',
  },
  successTitle: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  successSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
