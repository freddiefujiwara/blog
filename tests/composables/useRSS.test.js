import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useRSS } from '../../src/composables/useRSS';
import { flushPromises } from '@vue/test-utils';
import * as api from '../../src/services/api';

vi.mock('../../src/services/api');

describe('useRSS composable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global state if possible, or just be aware of it
    // Since rssXml is outside useRSS, it persists.
    // We might need to handle this in tests if we want clean state.
  });

  it('fetches RSS XML and updates rssXml', async () => {
    const mockXml = '<rss>content</rss>';
    api.fetchRSS.mockResolvedValue(mockXml);

    const { rssXml, fetchRSS } = useRSS();
    // Reset rssXml for test
    rssXml.value = null;

    await fetchRSS();
    expect(api.fetchRSS).toHaveBeenCalledTimes(1);
    expect(rssXml.value).toBe(mockXml);
  });

  it('does not fetch again if already has rssXml', async () => {
    const { rssXml, fetchRSS } = useRSS();
    rssXml.value = '<rss>cached</rss>';

    await fetchRSS();
    expect(api.fetchRSS).not.toHaveBeenCalled();
  });

  it('handles fetch error gracefully', async () => {
    api.fetchRSS.mockRejectedValue(new Error('Fetch failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rssXml, fetchRSS } = useRSS();
    rssXml.value = null;

    await fetchRSS();
    expect(rssXml.value).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch RSS:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
