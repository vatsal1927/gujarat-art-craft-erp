import { QueryClient, QueryKey } from '@tanstack/react-query';
import { logger } from './logger';

export interface OptimisticMutationConfig<TData, TVariables> {
  queryKey: QueryKey;
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
  onSuccessInvalidateKeys?: QueryKey[];
}

/**
 * Creates standardized onMutate, onError, and onSettled options for optimistic cache updates.
 */
export function createOptimisticMutationOptions<TData, TVariables, TContext = { previousData?: TData }>(
  qc: QueryClient,
  config: OptimisticMutationConfig<TData, TVariables>
) {
  return {
    onMutate: async (variables: TVariables): Promise<TContext> => {
      // 1. Cancel any outgoing refetches so they don't overwrite optimistic update
      await qc.cancelQueries({ queryKey: config.queryKey });

      // 2. Snapshot current state
      const previousData = qc.getQueryData<TData>(config.queryKey);

      // 3. Optimistically update the cache with new value
      if (previousData !== undefined) {
        const optimisticData = config.updateFn(previousData, variables);
        qc.setQueryData<TData>(config.queryKey, optimisticData);
        logger.debug('Repository', `Applied optimistic update for [${JSON.stringify(config.queryKey)}]`);
      }

      // 4. Return context with snapshot
      return { previousData } as TContext;
    },

    onError: (err: unknown, _variables: TVariables, context: TContext | undefined) => {
      // Rollback to previous snapshot if available
      const ctx = context as { previousData?: TData } | undefined;
      if (ctx?.previousData !== undefined) {
        qc.setQueryData<TData>(config.queryKey, ctx.previousData);
        logger.warn('Repository', `Rolled back optimistic update for [${JSON.stringify(config.queryKey)}]`, err);
      }
    },

    onSettled: () => {
      // Sync cache with backend by invalidating query keys
      qc.invalidateQueries({ queryKey: config.queryKey });
      if (config.onSuccessInvalidateKeys) {
        config.onSuccessInvalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      }
    },
  };
}
