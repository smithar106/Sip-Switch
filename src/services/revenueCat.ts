import { Platform } from 'react-native';

const IS_EXPO_GO = !!(global as any).expo?.modules?.ExpoModulesCore === false 
  || typeof (global as any).__expo !== 'undefined';

export function configureRevenueCat() {
  if (__DEV__) {
    console.log('[RevenueCat] Skipped — dev mode');
    return;
  }
  try {
    const Purchases = require('react-native-purchases').default;
    const { LOG_LEVEL } = require('react-native-purchases');
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ 
      apiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '' 
    });
  } catch (e) {
    console.log('[RevenueCat] Failed to configure:', e);
  }
}

export async function getOfferings() {
  if (__DEV__) return null;
  try {
    const Purchases = require('react-native-purchases').default;
    return await Purchases.getOfferings();
  } catch { return null; }
}

export async function purchasePackage(pkg: any): Promise<boolean> {
  if (__DEV__) return true;
  try {
    const Purchases = require('react-native-purchases').default;
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo.entitlements.active?.premium;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (__DEV__) return true;
  try {
    const Purchases = require('react-native-purchases').default;
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active?.premium;
  } catch { return false; }
}

export async function getCustomerInfo() {
  if (__DEV__) return { entitlements: { active: { premium: true } } };
  try {
    const Purchases = require('react-native-purchases').default;
    return await Purchases.getCustomerInfo();
  } catch { return null; }
}
