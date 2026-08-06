import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logger } from '../utils/logger';
import { RepositoryError } from '../utils/apiResult';

/**
 * Enterprise Cache Lifecycle & Duration Policy per Module.
 */
export const MODULE_CACHE_CONFIG = {
  dashboard: {
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 10,   // 10 minutes
  },
  invoices: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15,   // 15 minutes
  },
  customers: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  },
  products: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  },
  inventory: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15,   // 15 minutes
  },
  production: {
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 10,   // 10 minutes
  },
  purchases: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15,   // 15 minutes
  },
  finance: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15,   // 15 minutes
  },
  settings: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60,    // 60 minutes
  },
  reports: {
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
  },
  user: {
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
  },
} as const;

export type ModuleName = keyof typeof MODULE_CACHE_CONFIG;

/**
 * Enterprise QueryClient Factory.
 * Configures global retry limits, exponential backoff, cache garbage collection, and dev logging.
 */
export function createEnterpriseQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const queryKey = JSON.stringify(query.queryKey);
        logger.error('Repository', `Query Cache Error [${queryKey}]`, error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const mutationKey = mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : 'anonymous';
        logger.error('Repository', `Mutation Cache Error [${mutationKey}]`, error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes default
        gcTime: 1000 * 60 * 15,   // 15 minutes default
        retry: (failureCount, error) => {
          if (error instanceof RepositoryError && (error.code === 'UNAUTHORIZED' || error.code === 'ACTOR_NOT_AVAILABLE')) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        networkMode: 'online',
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchOnWindowFocus: false, // Prevents form input interruption
        structuralSharing: true,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
        networkMode: 'online',
      },
    },
  });
}

export const queryClient = createEnterpriseQueryClient();
