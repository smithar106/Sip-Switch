import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@ss_device_id';
const LEGACY_MIGRATED_KEY = '@ss_legacy_migrated';

export async function migrateLegacyDeviceId(userId: string): Promise<string | null> {
  try {
    const migrated = await AsyncStorage.getItem(LEGACY_MIGRATED_KEY);
    if (migrated) return null;

    const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) return null;

    // Store the legacy device ID as migration metadata
    // This is purely informational — never used for auth
    await AsyncStorage.setItem('@ss_legacy_device_id', deviceId);
    await AsyncStorage.setItem(LEGACY_MIGRATED_KEY, 'true');

    console.log('[legacyMigration] Legacy device ID preserved as metadata:', deviceId);
    return deviceId;
  } catch (err) {
    console.error('[legacyMigration] Error:', err);
    return null;
  }
}

export async function getLegacyDeviceId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('@ss_legacy_device_id');
  } catch {
    return null;
  }
}
