import { describe, it, expect, vi } from 'vitest';
import { createEnterpriseQueryClient } from '../lib/queryClient';
import { createOptimisticMutationOptions } from './mutationOptimizations';

describe('mutationOptimizations unit tests', () => {
  it('applies optimistic update onMutate and rolls back on error', async () => {
    const qc = createEnterpriseQueryClient();
    const queryKey = ['testItems'];
    qc.setQueryData(queryKey, ['item1']);

    const options = createOptimisticMutationOptions<string[], string>(qc, {
      queryKey,
      updateFn: (old, newItem) => [...(old || []), newItem],
    });

    // 1. Run onMutate
    const context = await options.onMutate('item2');
    expect(qc.getQueryData(queryKey)).toEqual(['item1', 'item2']);
    expect(context.previousData).toEqual(['item1']);

    // 2. Trigger onError (rollback)
    options.onError(new Error('Mutation failed'), 'item2', context);
    expect(qc.getQueryData(queryKey)).toEqual(['item1']);
  });
});
