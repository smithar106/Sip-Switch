import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '@/src/stores/sessionStore';
import { getOfferings, purchasePackage, restorePurchases } from '@/src/services/revenueCat';

const PLANS = [
  {
    id: 'annual',
    label: 'Annual · Best Value',
    price: '$29.99/yr',
    sub: '$2.49/mo · 14 days free',
    billingNote: 'Free for 14 days, then $29.99/yr · Cancel anytime in Settings',
    badge: 'BEST VALUE',
    isTrial: true,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99/mo',
    sub: 'Cancel anytime',
    billingNote: '$4.99/mo billed monthly · Cancel anytime in Settings',
    isTrial: false,
  },
];

const BENEFITS = [
  'Unlimited personalised NA drink recommendations',
  'Full swap engine — every classic drink mapped to its NA match',
  'Taste profile that learns with every rating',
  'New drops every week matched to your archetype',
];

export default function Paywall() {
  const [selected, setSelected] = useState('annual');
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  const setIsPremium = useSessionStore((s) => s.setIsPremium);
  const setTrialStartDate = useSessionStore((s) => s.setTrialStartDate);
  const setHasOnboarded = useSessionStore((s) => s.setHasOnboarded);

  useEffect(() => {
    getOfferings().then((o) => {
      setPackages(o?.current?.availablePackages ?? []);
    });
  }, []);

  const selectedPkg = packages.find((p) =>
    selected === 'annual'
      ? p.packageType === 'ANNUAL' || p.identifier.includes('annual')
      : p.packageType === 'MONTHLY' || p.identifier.includes('monthly')
  ) ?? packages[0];

  const handlePurchase = async () => {
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
        if (selected === 'annual') {
          setTrialStartDate(new Date().toISOString().slice(0, 10));
        }
        router.replace('/(tabs)/feed');
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert('Purchase Failed', 'Unable to complete your purchase. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const granted = await restorePurchases();
      if (granted) {
        setIsPremium(true);
        setHasOnboarded(true);
        router.replace('/(tabs)/feed');
      } else {
        Alert.alert('Nothing to Restore', 'No active subscription found for this Apple ID.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ctaText = () => {
    if (loading) return '';
    if (selected === 'annual') return 'Start My 14-Day Free Trial →';
    return 'Subscribe Now →';
  };

  const plan = PLANS.find((p) => p.id === selected)!;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>SIP SWITCH PRO</Text>
        <Text style={styles.headline}>Make the switch{'\n'}for good.</Text>

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

        <TouchableOpacity style={styles.cta} onPress={handlePurchase} activeOpacity={0.9} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0A0A0A" />
            : <Text style={styles.ctaTxt}>{ctaText()}</Text>}
        </TouchableOpacity>

        <Text style={styles.trialNote}>
          {selected === 'annual' ? 'Try free for 14 days · No charge until trial ends' : '$4.99/mo · Cancel anytime'}
        </Text>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
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
  eyebrow:       { color: '#C8A96E', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  headline:      { color: '#FFF', fontSize: 38, fontWeight: '800', lineHeight: 44, letterSpacing: -1, textAlign: 'center' },
  benefits:      { gap: 12 },
  benefitRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8A96E', flexShrink: 0 },
  benefitTxt:    { color: '#DDD', fontSize: 15, fontWeight: '500', flex: 1 },
  plans:         { gap: 10 },
  planCard:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  planCardActive:{ backgroundColor: 'rgba(200,169,110,0.1)', borderColor: '#C8A96E' },
  badge:         { position: 'absolute', top: -8, right: 10, backgroundColor: '#C8A96E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:      { color: '#0A0A0A', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#555', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioActive:   { borderColor: '#C8A96E' },
  radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C8A96E' },
  planInfo:      { flex: 1, gap: 2 },
  planLabel:     { color: '#CCC', fontSize: 14, fontWeight: '700' },
  planLabelActive:{ color: '#FFF' },
  planSub:       { color: '#666', fontSize: 12 },
  planPrice:     { color: '#CCC', fontSize: 15, fontWeight: '800', flexShrink: 0 },
  planPriceActive:{ color: '#C8A96E' },
  billingNote:   { color: '#555', fontSize: 11, textAlign: 'center' },
  cta:           { backgroundColor: '#C8A96E', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ctaTxt:        { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  trialNote:     { color: '#C8A96E', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  restoreBtn:    { alignItems: 'center', paddingVertical: 8 },
  restoreTxt:    { color: '#555', fontSize: 14 },
  legalRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  legalLink:     { color: '#444', fontSize: 12, textDecorationLine: 'underline' },
  legalSep:      { color: '#444', fontSize: 12 },
});
