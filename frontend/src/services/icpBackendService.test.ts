import { describe, it, expect, vi } from 'vitest';
import { pingCanisterBackend, getProductionCanisterConfig } from './icpBackendService';
import type { backendInterface } from '../backend';

describe('icpBackendService unit tests', () => {
  it('pingCanisterBackend returns success ok(true) when getSettings succeeds', async () => {
    const mockActor = {
      getSettings: vi.fn().mockResolvedValue({ businessInfo: 'Gujarat Art' }),
    } as unknown as backendInterface;

    const res = await pingCanisterBackend(mockActor);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toBe(true);
    }
  });

  it('pingCanisterBackend returns failure result when getSettings fails', async () => {
    const mockActor = {
      getSettings: vi.fn().mockRejectedValue(new Error('Canister trapped')),
    } as unknown as backendInterface;

    const res = await pingCanisterBackend(mockActor);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe('CANISTER_ERROR');
      expect(res.error).toContain('Canister trapped');
    }
  });

  it('getProductionCanisterConfig returns canister config parameters', async () => {
    const config = await getProductionCanisterConfig();
    expect(config).toHaveProperty('canisterId');
    expect(config).toHaveProperty('isMainnet');
  });
});
