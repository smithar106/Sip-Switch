import { isAuthenticated, isSyncQueuePaused } from '../auth';

describe('auth identity state', () => {
  it('isAuthenticated returns false before init', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isSyncQueuePaused returns false before init', () => {
    expect(isSyncQueuePaused()).toBe(false);
  });
});
