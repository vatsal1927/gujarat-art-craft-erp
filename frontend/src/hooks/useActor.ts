import { useInternetIdentity } from './useInternetIdentity';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';
import { MockBackend } from '../mockBackend';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { hexToBuf } from '../utils/credentialDerivation';

const ACTOR_QUERY_KEY = 'actor';

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
            console.error('Failed to reconstruct password-based identity from local storage:', e);
        }
        return undefined;
    })();

    const actorQuery = useQuery<backendInterface>({
        queryKey: [ACTOR_QUERY_KEY, activeIdentity?.getPrincipal().toString()],
        queryFn: async () => {
            try {
                const isAuthenticated = !!activeIdentity;

                if (!isAuthenticated) {
                    // Return anonymous actor if not authenticated
                    const actor = await createActorWithConfig();
                    // Verify if connectivity is working
                    await actor.getSettings();
                    return actor;
                }

                const actorOptions = {
                    agentOptions: {
                        identity: activeIdentity
                    }
                };

                const actor = await createActorWithConfig(actorOptions);
                await actor.getSettings();
                return actor;
            } catch (err) {
                const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
                if (isProduction) {
                    console.error("Critical Production Error: Canister backend is unavailable. Failing safely.", err);
                    throw err;
                } else {
                    console.warn("Unable to connect to canister backend, falling back to local storage mock backend", err);
                    return new MockBackend();
                }
            }
        },
        // Only refetch when identity changes
        staleTime: Infinity,
        // This will cause the actor to be recreated when the identity changes
        enabled: true
    });

    // When the actor changes, invalidate dependent queries
    useEffect(() => {
        if (actorQuery.data) {
            queryClient.invalidateQueries({
                predicate: (query) => {
                    return !query.queryKey.includes(ACTOR_QUERY_KEY);
                }
            });
            queryClient.refetchQueries({
                predicate: (query) => {
                    return !query.queryKey.includes(ACTOR_QUERY_KEY);
                }
            });
        }
    }, [actorQuery.data, queryClient]);

    return {
        actor: actorQuery.data || null,
        isFetching: actorQuery.isFetching
    };
}
