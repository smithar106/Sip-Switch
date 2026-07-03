import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '@/src/stores/sessionStore';
import { ARCHETYPES } from '@/src/constants/archetypes';
import { getOfferings, purchasePackage, restorePurchases } from '@/src/services/revenueCat';

const PLANS = [
  {
    id: 'annual',
    label: 'Annual · Best Value',
    price: '$29.99/yr',
    sub: '$2.49/mo · 7 days free',
    billingNote: 'Free for 7 days, then $29.99/yr · Cancel anytime in Settings',
    badge: 'BEST VALUE',
    isTrial: true,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99/mo',
    sub: 'Cancel anytime',
    billingNote: '$4.99/month billed monthly · Cancel anytime in Settings',
    badge: null,
    isTrial: false,
  },
  {
    id: 'weekly',
    label: 'Weekly',
    price: '$1.99/wk',
    sub: 'Try it this week',
    billingNote: '$1.99/week billed weekly · Cancel anytime in Settings',
    badge: null,
    isTrial: false,
  },
];

const BENEFITS = [
  "Never waste $12 on an NA drink you won't finish — matched to your taste",
  "Walk into any bar knowing exactly what to order — no trial and error",
  'Full swap engine — every classic drink mapped',
  'Taste profile that learns with every rating',
];

export default function Paywall() {
  const [selected, setSelected] = useState('annual');
  const [loading, setLoading] = useState(false);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [rcTimedOut, setRcTimedOut] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  const setIsPremium = useSessionStore((s) => s.setIsPremium);
  const setTrialStartDate = useSessionStore((s) => s.setTrialStartDate);
  const setHasOnboarded = useSessionStore((s) => s.setHasOnboarded);
  const archetypeId = useSessionStore((s) => s.archetypeId);
  const archetype = archetypeId ? ARCHETYPES[archetypeId] : null;
  const headlineText = archetype
    ? `Your ${archetype.name} matches are ready — drinks you'll love, no more guessing.`
    : "Your matches are ready — drinks you'll love, no more guessing.";

  useEffect(() => {
    const timer = setTimeout(() => setRcTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setOfferingsLoading(true);
    getOfferings().then((o) => {
      setPackages(o?.current?.availablePackages ?? []);
    }).finally(() => {
      setOfferingsLoading(false);
    });
  }, []);

  const selectedPkg = packages.find((p) => {
    if (selected === 'annual')
      return p.packageType === 'ANNUAL' || p.identifier.includes('annual');
    if (selected === 'weekly')
      return p.packageType === 'WEEKLY' || p.identifier.includes('weekly');
    return p.packageType === 'MONTHLY' || p.identifier.includes('monthly');
  }) ?? packages[0];

  const handlePurchase = async () => {
    if (__DEV__) {
      setIsPremium(true);
      setHasOnboarded(true);
      if (selected === 'annual') {
        setTrialStartDate(new Date().toISOString().slice(0, 10));
      }
      router.replace('/(tabs)/feed');
      return;
    }
    if (!selectedPkg) {
      Alert.alert('Connection Error', 'Unable to load subscription options. Please check your connection and try again.');
      return;
    }
    setLoading(true);
    try {
      const granted = await purchasePackage(selectedPkg);
      if (granted) {
        setIsPremium(true);
        setHasOnboarded(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (selected === 'annual') {
          setTrialStartDate(new Date().toISOString().slice(0, 10));
        }
        router.replace('/(tabs)/feed');
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert('Purchase Failed', 'Your payment could not be processed. Check your payment method and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (__DEV__) {
      setIsPremium(true);
      setHasOnboarded(true);
      router.replace('/(tabs)/feed');
      return;
    }
    setLoading(true);
    try {
      const granted = await restorePurchases();
      if (granted) {
        setIsPremium(true);
        setHasOnboarded(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace('/(tabs)/feed');
      } else {
        Alert.alert('Nothing to Restore', 'No active subscription found for this Apple ID.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Could not connect to the App Store. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS.find((p) => p.id === selected) ?? PLANS[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>SIP SWITCH PRO</Text>
        <Text style={styles.headline}>{headlineText}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <View style={styles.dot} />
              <Text style={styles.benefitTxt}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {PLANS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.planCard, selected === p.id && styles.planCardActive]}
              onPress={() => setSelected(p.id)}
              activeOpacity={0.85}
            >
              {p.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{p.badge}</Text>
                </View>
              )}
              <View style={[styles.radio, selected === p.id && styles.radioActive]}>
                {selected === p.id && <View style={styles.radioDot} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planLabel, selected === p.id && styles.planLabelActive]}>{p.label}</Text>
                <Text style={styles.planSub}>{p.sub}</Text>
              </View>
              <Text style={[styles.planPrice, selected === p.id && styles.planPriceActive]}>{p.price}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.billingNote}>{plan.billingNote}</Text>
        </View>

        <View style={styles.valueMath}>
          <Text style={styles.valueMathLine}>
            💸 Premium NA drinks run $8–15 at a bar, $3–6 a can. A few disappointing ones cost more than a month of Sip Switch.
          </Text>
          <Text style={styles.valueMathLine}>
            ⏳ Skip months of trial-and-error buying NA drinks that miss — know what you'll love before you spend.
          </Text>
        </View>

        <TouchableOpacity style={styles.cta} onPress={handlePurchase} activeOpacity={0.9} disabled={loading || (offeringsLoading && !rcTimedOut)}>
          {loading ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <Text style={styles.ctaTxt}>
              {selected === 'annual' ? 'Start my 7-day free trial →' : 'Subscribe →'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.reminder}>
          🔔 We'll remind you 2 days before your trial ends.
        </Text>

        <Text style={styles.trialNote}>
          {selected === 'annual'
            ? 'Try free for 7 days · No charge until trial ends'
            : selected === 'weekly'
            ? '$1.99/week · Cancel anytime in Settings'
            : '$4.99/mo · Cancel anytime'}
        </Text>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading || (offeringsLoading && !rcTimedOut)}>
          <Text style={styles.restoreTxt}>Restore Purchases</Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://sipswitch.app/terms')}>
            <Text style={styles.legalLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://sipswitch.app/privacy')}>
            <Text style={styles.legalLink}>Privacy</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:        { flex: 1 },
  wrap:          { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 52, gap: 20 },
  eyebrow:       { color: '#C8A96E', fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  headline:      { color: '#FFF', fontSize: 28, fontWeight: '800', lineHeight: 36, letterSpacing: -0.5, textAlign: 'center' },
  benefits:      { gap: 12 },
  benefitRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8A96E', flexShrink: 0 },
  benefitTxt:    { color: '#EEEEEE', fontSize: 15, fontWeight: '500', flex: 1 },
  plans:         { gap: 10 },
  planCard:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  planCardActive:{ backgroundColor: 'rgba(200,169,110,0.1)', borderColor: '#C8A96E' },
  badge:         { position: 'absolute', top: -8, right: 10, backgroundColor: '#C8A96E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:      { color: '#0A0A0A', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  radio:         { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#888888', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioActive:   { borderColor: '#C8A96E' },
  radioDot:      { width: 12, height: 12, borderRadius: 6, backgroundColor: '#C8A96E' },
  planInfo:      { flex: 1, gap: 2 },
  planLabel:     { color: '#E5E5E5', fontSize: 14, fontWeight: '700' },
  planLabelActive:{ color: '#FFF' },
  planSub:       { color: '#AAAAAA', fontSize: 12 },
  planPrice:     { color: '#E5E5E5', fontSize: 15, fontWeight: '800', flexShrink: 0 },
  planPriceActive:{ color: '#C8A96E' },
  billingNote:   { color: '#888888', fontSize: 11, textAlign: 'center' },
  valueMath:     { gap: 10, marginTop: 4, paddingHorizontal: 4 },
  valueMathLine: { color: '#888888', fontSize: 12, lineHeight: 18 },
  cta:           { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ctaTxt:        { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  reminder:      { color: '#888888', fontSize: 12, textAlign: 'center', marginTop: 8 },
  trialNote:     { color: '#C8A96E', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  restoreBtn:    { alignItems: 'center', paddingVertical: 8 },
  restoreTxt:    { color: '#888888', fontSize: 14 },
  legalRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legalLink:     { color: '#888888', fontSize: 12, textDecorationLine: 'underline' },
  legalSep:      { color: '#888888', fontSize: 12 },
});
