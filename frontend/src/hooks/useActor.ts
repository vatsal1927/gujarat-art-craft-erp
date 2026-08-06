import { useInternetIdentity } from './useInternetIdentity';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type backendInterface } from '../backend';
import { createProductionIcpActor, pingCanisterBackend } from '../services/icpBackendService';
import { MockBackend } from '../mockBackend';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { hexToBuf } from '../utils/credentialDerivation';
import { queryKeys } from './queryKeys';
import { logger } from '../utils/logger';

export function useActor(): { actor: backendInterface | null; isFetching: boolean } {
    const { identity: iiIdentity } = useInternetIdentity();
    const queryClient = useQueryClient();

    // Resolve the active identity: either Internet Identity or derived password identity
    const activeIdentity = (() => {
        if (iiIdentity) return iiIdentity;

        try {
            const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session && session.secretKeyHex) {
                    const seedBytes = hexToBuf(session.secretKeyHex);
                    return Ed25519KeyIdentity.fromSecretKey(seedBytes);
                }
            }
        } catch (e) {
            logger.error('Actor', 'Failed to reconstruct password-based identity from local storage', e);
        }
        return undefined;
    })();

    const actorQuery = useQuery<backendInterface>({
        queryKey: queryKeys.actor(activeIdentity?.getPrincipal().toString()),
        queryFn: async () => {
            try {
                const actor = await createProductionIcpActor(activeIdentity);
                const pingResult = await pingCanisterBackend(actor);
                
                if (!pingResult.success) {
                    const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
                    if (isProduction) {
                        logger.error('Actor', 'Production ICP Canister Ping Failed. Failing safely.', pingResult.error);
                        throw new Error(pingResult.error);
                    } else {
                        logger.warn('Actor', 'Local canister ping failed, using local storage fallback for dev unit testing');
                        return new MockBackend();
                    }
                }

                return actor;
            } catch (err) {
                const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
                if (isProduction) {
                    logger.error('Actor', 'Critical Production Error: Canister backend is unavailable. Failing safely.', err);
                    throw err;
                } else {
                    logger.warn('Actor', 'Unable to connect to canister backend, falling back to local storage backend', err);
                    return new MockBackend();
                }
            }
        },
        staleTime: Infinity,
        enabled: true
    });

    useEffect(() => {
        if (actorQuery.data) {
            const actorKeyRoot = queryKeys.actor()[0];
            queryClient.invalidateQueries({
                predicate: (query) => !query.queryKey.includes(actorKeyRoot)
            });
            queryClient.refetchQueries({
                predicate: (query) => !query.queryKey.includes(actorKeyRoot)
            });
        }
    }, [actorQuery.data, queryClient]);

    return {
        actor: actorQuery.data || null,
        isFetching: actorQuery.isFetching
    };
}
