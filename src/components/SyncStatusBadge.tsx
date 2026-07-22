import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSyncStatusStore } from '@/src/stores/syncStatusStore';
import { useSessionStore } from '@/src/stores/sessionStore';

export function SyncStatusBadge() {
  const refresh = useSyncStatusStore((s) => s.refresh);
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);
  const failedCount = useSyncStatusStore((s) => s.failedCount);
  const paused = useSyncStatusStore((s) => s.paused);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!isAuthenticated && pendingCount === 0 && failedCount === 0) {
    return (
      <View style={styles.badge}>
        <Text style={styles.text}>Local mode</Text>
      </View>
    );
  }

  if (paused) {
    return (
      <View style={styles.badge}>
        <Text style={styles.text}>Sync paused</Text>
      </View>
    );
  }

  if (failedCount > 0) {
    return (
      <View style={styles.badgeError}>
        <Text style={styles.text}>{failedCount} failed</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={styles.badge}>
        <Text style={styles.text}>{pendingCount} pending</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
});
