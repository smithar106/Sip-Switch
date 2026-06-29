import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '';

declare const __DEV__: boolean;

export function configureRevenueCat() {
  try {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: API_KEY });
  } catch (e) {
    if (__DEV__) console.log('[RevenueCat] Skipped in Expo Go:', e);
  }
}

export async function getOfferings() {
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo.entitlements.active?.premium;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active?.premium;
  } catch {
    return false;
  }
}

export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}
