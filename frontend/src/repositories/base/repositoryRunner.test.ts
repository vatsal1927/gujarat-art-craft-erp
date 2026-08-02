import { describe, it, expect, vi } from 'vitest';
import { executeRepository, executeRepositoryResult, normalizeRepositoryError } from './repositoryRunner';
import { RepositoryError } from '../../utils/apiResult';

describe('Repository Runner unit tests', () => {
  it('Repository Success Path: executes function successfully and returns ApiResult ok', async () => {
    const dummyActor = {} as any;
    const res = await executeRepositoryResult('Invoice', 'getInvoices', dummyActor, async () => [{ id: '1' }]);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual([{ id: '1' }]);
    }
  });

  it('Repository Failure Path: returns ApiResult fail on threw exception', async () => {
    const dummyActor = {} as any;
    const res = await executeRepositoryResult('Invoice', 'getInvoices', dummyActor, async () => {
      throw new Error('Database connection failed');
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('Database connection failed');
    }
  });

  it('Repository Actor Missing Path: returns ACTOR_NOT_AVAILABLE when required actor is null/undefined', async () => {
    const res = await executeRepositoryResult('Invoice', 'getInvoices', null, async () => []);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe('ACTOR_NOT_AVAILABLE');
      expect(res.error).toContain('Backend actor is not initialized');
    }
  });

  it('Repository Canister Error Path: normalizes canister trap and rejection errors', async () => {
    const dummyActor = {} as any;
    const res = await executeRepositoryResult('Inventory', 'getStockMovements', dummyActor, async () => {
      throw new Error('Canister trapped: out of cycles');
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe('CANISTER_ERROR');
      expect(res.error).toContain('Canister Execution Error');
    }
  });

  it('Repository Unknown Error Path: handles unknown unexpected runtime exceptions', async () => {
    const dummyActor = {} as any;
    const res = await executeRepositoryResult('Production', 'getJobWorks', dummyActor, async () => {
      throw 'Something completely unexpected';
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe('UNKNOWN_ERROR');
      expect(res.error).toBe('Something completely unexpected');
    }
  });

  it('Repository Error: throws RepositoryError with preserved code when unwrapApiResult fails', async () => {
    const dummyActor = {} as any;
    await expect(
      executeRepository('Invoice', 'getInvoices', dummyActor, async () => {
        throw new Error('Unauthorized access to invoice');
      })
    ).rejects.toThrow(RepositoryError);
  });
});
