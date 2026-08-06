import { describe, it, expect } from 'vitest';
import { createEnterpriseQueryClient, MODULE_CACHE_CONFIG } from './queryClient';

describe('Enterprise QueryClient unit tests', () => {
  it('creates QueryClient with enterprise default options', () => {
    const qc = createEnterpriseQueryClient();
    const defaultOptions = qc.getDefaultOptions();

    expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 2);
    expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 15);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
    expect(defaultOptions.queries?.structuralSharing).toBe(true);
  });

  it('defines valid module cache configuration policies', () => {
    expect(MODULE_CACHE_CONFIG.dashboard.staleTime).toBeGreaterThan(0);
    expect(MODULE_CACHE_CONFIG.customers.staleTime).toBeGreaterThan(0);
    expect(MODULE_CACHE_CONFIG.products.staleTime).toBeGreaterThan(0);
    expect(MODULE_CACHE_CONFIG.inventory.staleTime).toBeGreaterThan(0);
    expect(MODULE_CACHE_CONFIG.settings.staleTime).toBeGreaterThan(0);
  });
});
