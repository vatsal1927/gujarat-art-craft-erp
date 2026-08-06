import { describe, it, expect, vi } from 'vitest';
import { createEnterpriseQueryClient } from '../lib/queryClient';
import {
  prefetchEntityQuery,
  invalidateEntity,
  invalidateModule,
  invalidateEverything,
  removeEntity,
  cancelEntityQueries,
  warmCache,
} from './queryHelpers';

describe('queryHelpers unit tests', () => {
  it('prefetches entity query into cache', async () => {
    const qc = createEnterpriseQueryClient();
    const queryFn = vi.fn().mockResolvedValue([{ id: 'INV-1' }]);

    await prefetchEntityQuery(qc, ['testInvoices'], queryFn);
    expect(queryFn).toHaveBeenCalledOnce();

    const data = qc.getQueryData(['testInvoices']);
    expect(data).toEqual([{ id: 'INV-1' }]);
  });

  it('invalidates entity and module queries correctly', async () => {
    const qc = createEnterpriseQueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    await invalidateEntity(qc, ['customers']);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] });

    await invalidateModule(qc, 'dashboard');
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('removes and cancels entity queries without crashing', async () => {
    const qc = createEnterpriseQueryClient();
    qc.setQueryData(['testKey'], 'testData');
    expect(qc.getQueryData(['testKey'])).toBe('testData');

    removeEntity(qc, ['testKey']);
    expect(qc.getQueryData(['testKey'])).toBeUndefined();

    await expect(cancelEntityQueries(qc, ['testKey'])).resolves.not.toThrow();
  });

  it('warms cache with actor without throwing', async () => {
    const qc = createEnterpriseQueryClient();
    const mockActor = {
      getDashboardStats: vi.fn().mockResolvedValue({}),
      getSettings: vi.fn().mockResolvedValue({}),
      getProducts: vi.fn().mockResolvedValue([]),
      getCustomers: vi.fn().mockResolvedValue([]),
      getRawMaterials: vi.fn().mockResolvedValue([]),
      getInvoices: vi.fn().mockResolvedValue([]),
    } as any;

    await warmCache(qc, mockActor);
    expect(mockActor.getDashboardStats).toHaveBeenCalled();
  });
});
