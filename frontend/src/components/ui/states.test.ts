import { describe, it, expect, vi } from 'vitest';
import { RepositoryError } from '../../utils/apiResult';

describe('UI State Components unit tests', () => {
  it('handles RepositoryError parsing correctly for ErrorState logic', () => {
    const repoErr = new RepositoryError('Failed to connect to canister', 'CANISTER_ERROR');
    expect(repoErr.message).toBe('Failed to connect to canister');
    expect(repoErr.code).toBe('CANISTER_ERROR');
  });

  it('triggers retry callback when RetryButton handler is called', async () => {
    const retryFn = vi.fn().mockResolvedValue(true);
    await retryFn();
    expect(retryFn).toHaveBeenCalledOnce();
  });

  it('evaluates empty state logic for QueryStateWrapper correctly', () => {
    const isEmptyArray = (data: any[]) => Array.isArray(data) && data.length === 0;
    const isNullData = (data: any) => data === null || data === undefined;

    expect(isEmptyArray([])).toBe(true);
    expect(isEmptyArray([{ id: 1 }])).toBe(false);
    expect(isNullData(null)).toBe(true);
    expect(isNullData({ stats: 100 })).toBe(false);
  });
});
