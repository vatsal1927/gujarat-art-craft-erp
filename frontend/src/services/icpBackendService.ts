import { type backendInterface } from '../backend';
import { loadConfig, createActorWithConfig } from '../config';
import { type Identity } from '@icp-sdk/core/agent';
import { logger } from '../utils/logger';
import { ok, fail, type ApiResult } from '../utils/apiResult';

export interface IcpBackendConfig {
  canisterId: string;
  host?: string;
  isMainnet: boolean;
  icpDerivationOrigin?: string;
}

/**
 * Resolves production ICP canister backend configuration parameters.
 */
export async function getProductionCanisterConfig(): Promise<IcpBackendConfig> {
  const config = await loadConfig();
  const canisterId = config.backend_canister_id;
  const isMainnet = Boolean(config.backend_host && !config.backend_host.includes('localhost') && !config.backend_host.includes('127.0.0.1'));

  return {
    canisterId,
    host: config.backend_host,
    isMainnet,
    icpDerivationOrigin: config.ii_derivation_origin,
  };
}

/**
 * Production ICP Actor Factory.
 * Instantiates a real DFINITY agent and connects directly to the Motoko canister backend.
 */
export async function createProductionIcpActor(identity?: Identity): Promise<backendInterface> {
  const config = await loadConfig();
  const canisterId = config.backend_canister_id;

  logger.info('Actor', `Initializing Production ICP Canister Actor [CanisterID: ${canisterId || 'unbound'}]`);

  const agentOptions: Record<string, unknown> = {
    host: config.backend_host,
  };

  if (identity) {
    agentOptions.identity = identity;
  }

  return createActorWithConfig({
    agentOptions,
  });
}

/**
 * Canister Health Verification.
 * Performs a lightweight canister query call to verify Motoko canister connectivity.
 */
export async function pingCanisterBackend(actor: backendInterface): Promise<ApiResult<boolean>> {
  try {
    logger.debug('Actor', 'Pinging Motoko backend canister for health check...');
    await actor.getSettings();
    logger.info('Actor', 'Motoko backend canister health check passed');
    return ok(true);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('Actor', `Motoko backend canister ping failed: ${errorMsg}`, err);
    return fail(`Canister Health Ping Failed: ${errorMsg}`, 'CANISTER_ERROR', err);
  }
}
