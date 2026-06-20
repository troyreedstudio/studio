import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { addRecurring } from '../state/recurring';
import { usePaymentMethod, type CardBrand, type SavedCard } from '../state/payment-method';
import { createCheck } from '../lib/checks';

type CardOnFile = SavedCard | null;

function formatCardNumber(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function detectBrand(cardNumber: string): CardBrand | null {
  const d = cardNumber.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  return 'Visa';
}

export default function PaymentScreen() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurringTime, setRecurringTime] = useState('08:00');
  const payment = usePaymentMethod();
  const card: CardOnFile = payment.card;
  const [sheetOpen, setSheetOpen] = useState(false);
  const {
    venue = 'Komodo',
    city = 'Miami',
    tier = 'standard',
    price = '$15',
    time = '10 min',
  } = useLocalSearchParams<{
    venue: string;
    city: string;
    tier: string;
    price: string;
    time: string;
  }>();

  const isPriority = tier === 'priority';
  const fee = isPriority ? '$2.00' : '$1.50';
  const total = isPriority ? '$22.00' : '$16.50';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CONFIRM YOUR CHECK</Text>
        <Text style={styles.subtitle}>Review before you pay</Text>
      </View>

      {/* Order Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ORDER SUMMARY</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Venue</Text>
          <Text style={styles.rowValue}>{venue}, {city}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Check Type</Text>
          <View style={[styles.tierBadge, isPriority && styles.tierBadgePriority]}>
            <Text style={[styles.tierBadgeText, isPriority && styles.tierBadgeTextPriority]}>
              {isPriority ? 'PRIORITY' : 'STANDARD'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Check Fee</Text>
          <Text style={styles.rowValue}>{price}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Platform Fee</Text>
          <Text style={styles.rowValue}>{fee}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>
      </View>

      {/* Recurring */}
      <TouchableOpacity
        style={[styles.shareCard, recurring && styles.shareCardActive]}
        activeOpacity={0.85}
        onPress={() => setRecurring(!recurring)}
      >
        <View style={[styles.shareCheck, recurring && styles.shareCheckActive]}>
          {recurring && <Text style={styles.shareCheckGlyph}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.shareTitleRow}>
            <Text style={styles.shareTitle}>Auto-check this location</Text>
            <Text style={styles.recBadge}>PLUS · PRO</Text>
          </View>
          <Text style={styles.shareSub}>
            {recurring
              ? `Auto-dispatch ${recurringFreq} at ${recurringTime}. Cancel anytime.`
              : 'Schedule a Scout to check this location automatically. Daily, weekly, or monthly.'}
          </Text>
          {recurring && (
            <View style={styles.recControls}>
              {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.recChip, recurringFreq === f && styles.recChipActive]}
                  onPress={() => setRecurringFreq(f)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.recChipText,
                      recurringFreq === f && styles.recChipTextActive,
                    ]}
                  >
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.recTimePill}>
                <Text style={styles.recTimeText}>{recurringTime}</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Delivery Time */}
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryIcon}>
          <Text style={styles.deliveryEmoji}>⚡</Text>
        </View>
        <View>
          <Text style={styles.deliveryTitle}>Estimated Delivery</Text>
          <Text style={styles.deliveryTime}>~{time}</Text>
        </View>
        <View style={styles.liveBlipContainer}>
          <View style={styles.liveBlip} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
      </View>

      {/* Payment Method */}
      <TouchableOpacity
        style={styles.paymentMethod}
        activeOpacity={0.85}
        onPress={() => setSheetOpen(true)}
      >
        {card ? (
          <>
            <Text style={styles.paymentMethodLabel}>
              {card.brand === 'ApplePay' ? ' ' : '💳  '}
              {card.brand === 'ApplePay' ? 'Apple Pay' : `${card.brand} •••• ${card.last4}`}
            </Text>
            <Text style={styles.changeText}>Change</Text>
          </>
        ) : (
          <>
            <Text style={styles.paymentMethodLabel}>+ Add payment method</Text>
            <Ionicons name="chevron-forward" size={16} color="#888" />
          </>
        )}
      </TouchableOpacity>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            processing && styles.ctaButtonProcessing,
            !card && styles.ctaButtonNoCard,
          ]}
          disabled={processing}
          onPress={async () => {
            if (!card) {
              setSheetOpen(true);
              return;
            }
            setProcessing(true);
            if (recurring) {
              addRecurring({
                id: `${venue}-${Date.now()}`,
                venueName: String(venue),
                address: String(city),
                freq: recurringFreq,
                time: recurringTime,
                marketId: 'mia',
                coord: [-80.1932, 25.7651],
              });
            }
            // TODO(phase-4): authorize a Stripe hold here (PaymentIntent, manual
            // capture). Money is out of scope for Phase 2 — we create the real
            // check now and capture once a Scout accepts.
            try {
              const checkId = await createCheck({
                tier: tier === 'priority' ? 'priority' : 'standard',
                locationLabel: String(venue),
              });
              setProcessing(false);
              router.replace({
                pathname: '/(seeker)/finding',
                params: {
                  checkId,
                  venue: String(venue),
                  city: String(city),
                  tier: String(tier),
                  time: String(time),
                },
              });
            } catch (e) {
              setProcessing(false);
              Alert.alert(
                "Couldn't start your check",
                e instanceof Error ? e.message : 'Please try again in a moment.',
              );
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaButtonText, !card && styles.ctaButtonTextNoCard]}>
            {processing ? 'AUTHORIZING…' : !card ? 'ADD CARD TO CONTINUE' : 'CONFIRM & FIND MY SCOUT'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          {processing ? 'Authorizing with Stripe…' : 'You’re only charged once a Scout accepts.'}
        </Text>
      </View>

      <PaymentSheet
        visible={sheetOpen}
        total={total}
        onClose={() => setSheetOpen(false)}
        onSaved={(c) => {
          payment.save(c.brand, c.last4);
          setSheetOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

// =========================
// Stripe-style Payment Sheet
// =========================
function PaymentSheet({
  visible,
  total,
  onClose,
  onSaved,
}: {
  visible: boolean;
  total: string;
  onClose: () => void;
  onSaved: (c: { brand: CardBrand; last4: string }) => void;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [zip, setZip] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setZip('');
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim]);

  const digits = cardNumber.replace(/\D/g, '');
  const brand = detectBrand(cardNumber);
  const cardOk = digits.length >= 15 && expiry.replace(/\D/g, '').length === 4 && cvc.length >= 3 && zip.length >= 5;

  const handleApplePay = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSaved({ brand: 'ApplePay', last4: '' });
    }, 700);
  };

  const handleSaveCard = () => {
    if (!cardOk) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSaved({ brand: brand || 'Visa', last4: digits.slice(-4) });
    }, 900);
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={sheetStyles.backdrop}>
        <TouchableOpacity style={sheetStyles.backdropTap} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY }] }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.topRow}>
              <Text style={sheetStyles.sheetTitle}>Payment</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <Text style={sheetStyles.totalLine}>
              Pay <Text style={sheetStyles.totalAmount}>{total}</Text> to Let Me Check
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Apple Pay */}
              <TouchableOpacity
                style={[sheetStyles.applePayBtn, submitting && sheetStyles.btnDim]}
                activeOpacity={0.85}
                onPress={handleApplePay}
                disabled={submitting}
              >
                <Ionicons name="logo-apple" size={16} color="#fff" />
                <Text style={sheetStyles.applePayText}>Pay</Text>
              </TouchableOpacity>

              <View style={sheetStyles.divider}>
                <View style={sheetStyles.dividerLine} />
                <Text style={sheetStyles.dividerText}>OR PAY WITH CARD</Text>
                <View style={sheetStyles.dividerLine} />
              </View>

              {/* Card Number */}
              <View style={sheetStyles.cardField}>
                <Text style={sheetStyles.fieldLabel}>CARD NUMBER</Text>
                <View style={sheetStyles.inputRow}>
                  <TextInput
                    style={sheetStyles.input}
                    value={cardNumber}
                    onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                    placeholder="1234 1234 1234 1234"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="number-pad"
                    maxLength={23}
                  />
                  {brand && digits.length >= 4 && (
                    <View style={sheetStyles.brandBadge}>
                      <Text style={sheetStyles.brandBadgeText}>{brand}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Exp + CVC */}
              <View style={sheetStyles.rowSplit}>
                <View style={[sheetStyles.cardField, { flex: 1, marginRight: 8 }]}>
                  <Text style={sheetStyles.fieldLabel}>EXP</Text>
                  <TextInput
                    style={sheetStyles.input}
                    value={expiry}
                    onChangeText={(v) => setExpiry(formatExpiry(v))}
                    placeholder="MM / YY"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="number-pad"
                    maxLength={7}
                  />
                </View>
                <View style={[sheetStyles.cardField, { flex: 1, marginLeft: 8 }]}>
                  <Text style={sheetStyles.fieldLabel}>CVC</Text>
                  <TextInput
                    style={sheetStyles.input}
                    value={cvc}
                    onChangeText={(v) => setCvc(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="CVC"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              {/* ZIP */}
              <View style={sheetStyles.cardField}>
                <Text style={sheetStyles.fieldLabel}>ZIP / POSTAL CODE</Text>
                <TextInput
                  style={sheetStyles.input}
                  value={zip}
                  onChangeText={(v) => setZip(v.replace(/[^0-9A-Za-z\s-]/g, '').slice(0, 10))}
                  placeholder="33139"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="default"
                  maxLength={10}
                />
              </View>

              {/* Save toggle */}
              <TouchableOpacity
                style={sheetStyles.saveRow}
                activeOpacity={0.75}
                onPress={() => setSaveCard((v) => !v)}
              >
                <View style={[sheetStyles.checkbox, saveCard && sheetStyles.checkboxOn]}>
                  {saveCard && <Ionicons name="checkmark" size={12} color="#000" />}
                </View>
                <Text style={sheetStyles.saveText}>Save card for future checks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[sheetStyles.payBtn, (!cardOk || submitting) && sheetStyles.btnDim]}
                disabled={!cardOk || submitting}
                onPress={handleSaveCard}
                activeOpacity={0.9}
              >
                <Text style={sheetStyles.payBtnText}>
                  {submitting ? 'PROCESSING…' : !cardOk ? 'ENTER CARD DETAILS' : `SAVE & PAY ${total}`}
                </Text>
              </TouchableOpacity>

              <View style={sheetStyles.trustRow}>
                <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.45)" />
                <Text style={sheetStyles.trustText}>Powered by Stripe · 256-bit encryption</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.2,
  },
  totalLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
    marginBottom: 18,
  },
  totalAmount: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },

  applePayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  applePayText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#000',
    letterSpacing: 0.5,
  },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.6,
  },

  cardField: { marginBottom: 12 },
  fieldLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  inputRow: { position: 'relative' },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    letterSpacing: 0.5,
  },
  brandBadge: {
    position: 'absolute',
    right: 10,
    top: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  brandBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.6,
  },

  rowSplit: { flexDirection: 'row' },

  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#fff', borderColor: '#fff' },
  saveText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },

  payBtn: {
    backgroundColor: '#00FF7F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  btnDim: { opacity: 0.4 },
  payBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#000',
    letterSpacing: 2,
  },

  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 4,
  },
  trustText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  header: { paddingTop: 12, paddingBottom: 22 },
  backText: {
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    fontSize: 15,
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#fff',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.3,
  },
  rowValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
  },
  totalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 0.4,
  },
  divider: { height: 1, backgroundColor: '#1a1a1a' },
  tierBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierBadgePriority: { backgroundColor: 'rgba(255,107,0,0.15)' },
  tierBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#fff',
    letterSpacing: 1.5,
  },
  tierBadgeTextPriority: { color: '#FF6B00' },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  shareCardActive: {
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderColor: 'rgba(60,110,200,0.7)',
  },
  shareCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  shareCheckActive: { backgroundColor: '#00FF7F', borderColor: '#00FF7F' },
  shareCheckGlyph: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#000',
  },
  shareTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shareTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
  },
  shareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.45)',
  },
  shareBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00FF7F',
  },
  shareBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: '#00FF7F',
    letterSpacing: 1,
  },
  shareSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  recBadge: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: '#00FF7F',
    letterSpacing: 1.2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,255,127,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.35)',
    overflow: 'hidden',
  },
  recControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  recChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  recChipActive: {
    backgroundColor: '#00FF7F',
    borderColor: '#00FF7F',
  },
  recChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
  },
  recChipTextActive: { color: '#000000' },
  recTimePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(20,55,130,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.5)',
  },
  recTimeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,55,130,0.5)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(60,110,200,0.6)',
    marginBottom: 12,
    gap: 12,
  },
  deliveryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryEmoji: { fontSize: 18 },
  deliveryTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  deliveryTime: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  liveBlipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  liveBlip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF7F' },
  liveLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#00FF7F',
    letterSpacing: 1.5,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 24,
  },
  paymentMethodLabel: {
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    fontSize: 13.5,
    letterSpacing: 0.3,
  },
  changeText: {
    fontFamily: 'Inter_700Bold',
    color: '#00FF7F',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  ctaContainer: { marginTop: 'auto', paddingBottom: 8 },
  ctaButton: {
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonProcessing: {
    backgroundColor: '#cccccc',
    opacity: 0.85,
  },
  ctaButtonNoCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  ctaButtonText: {
    fontFamily: 'Inter_700Bold',
    color: '#000',
    fontSize: 13,
    letterSpacing: 2.5,
  },
  ctaButtonTextNoCard: {
    color: '#fff',
  },
  disclaimer: {
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
