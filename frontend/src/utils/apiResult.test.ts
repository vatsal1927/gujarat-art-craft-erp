import { describe, it, expect } from 'vitest';
import { ok, fail, unwrapApiResult, RepositoryError } from './apiResult';

describe('apiResult unit tests', () => {
  it('creates a success result with ok()', () => {
    const res = ok({ id: '123', name: 'Test' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ id: '123', name: 'Test' });
    }
  });

  it('creates a failure result with fail()', () => {
    const res = fail('Network connection timed out', 'NETWORK_ERROR');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('Network connection timed out');
      expect(res.code).toBe('NETWORK_ERROR');
    }
  });

  it('unwraps successful ApiResult data', () => {
    const res = ok(42);
    const value = unwrapApiResult(res);
    expect(value).toBe(42);
  });

  it('throws RepositoryError when unwrapping failure ApiResult', () => {
    const res = fail('Canister execution trapped', 'CANISTER_ERROR');
    expect(() => unwrapApiResult(res)).toThrow(RepositoryError);
    try {
      unwrapApiResult(res);
    } catch (err: any) {
      expect(err).toBeInstanceOf(RepositoryError);
      expect(err.code).toBe('CANISTER_ERROR');
      expect(err.message).toBe('Canister execution trapped');
    }
  });
});
