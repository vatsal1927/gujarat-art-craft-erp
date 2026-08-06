import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { MODULE_CACHE_CONFIG, type ModuleName } from '../lib/queryClient';
import { invalidateModule, warmCache, type ModuleCategory } from '../utils/queryHelpers';
import { useActor } from './useActor';

export interface EnterpriseQueryOptions<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>
  extends Omit<UseQueryOptions<TQueryFnData, TError, TData>, 'staleTime' | 'gcTime'> {
  module?: ModuleName;
  customStaleTime?: number;
  customGcTime?: number;
}

/**
 * Enterprise Query Hook applying per-module cache duration policy.
 */
export function useEnterpriseQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
  options: EnterpriseQueryOptions<TQueryFnData, TError, TData>
) {
  const moduleConfig = options.module ? MODULE_CACHE_CONFIG[options.module] : undefined;
  const staleTime = options.customStaleTime ?? moduleConfig?.staleTime ?? 1000 * 60 * 2;
  const gcTime = options.customGcTime ?? moduleConfig?.gcTime ?? 1000 * 60 * 15;

  return useQuery<TQueryFnData, TError, TData>({
    ...options,
    staleTime,
    gcTime,
  });
}

/**
 * Enterprise Mutation Hook wrapper.
 */
export function useEnterpriseMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  return useMutation<TData, TError, TVariables, TContext>(options);
}

/**
 * Hook exposing module invalidation methods.
 */
export function useInvalidateModule() {
  const queryClient = useQueryClient();
  return {
    invalidate: (moduleName: ModuleCategory) => invalidateModule(queryClient, moduleName),
  };
}

/**
 * Hook to warm Dashboard and core entity caches when actor is ready.
 */
export function useWarmDashboard() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (actor) {
      warmCache(queryClient, actor);
    }
  }, [actor, queryClient]);
}
