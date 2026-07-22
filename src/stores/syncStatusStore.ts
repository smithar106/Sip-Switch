import { create } from 'zustand';
import { getQueueSize, getFailedCount } from '../services/syncQueue';
import { isAuthenticated, isSyncQueuePaused } from '../services/auth';

export interface SyncStatusState {
  pendingCount: number;
  failedCount: number;
  paused: boolean;
  authenticated: boolean;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  paused: false,
  authenticated: false,
  lastUpdated: null,

  refresh: async () => {
    try {
      const [pending, failed] = await Promise.all([
        getQueueSize(),
        getFailedCount(),
      ]);
      set({
        pendingCount: pending,
        failedCount: failed,
        paused: isSyncQueuePaused(),
        authenticated: isAuthenticated(),
        lastUpdated: Date.now(),
      });
    } catch (err) {
      console.error('[syncStatus] refresh error:', err);
    }
  },
}));
