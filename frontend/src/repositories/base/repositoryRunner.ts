import type { backendInterface } from '../../backend';
import { ok, fail, unwrapApiResult, type ApiResult, type ApiErrorCode, RepositoryError } from '../../utils/apiResult';
import { logger, type LogCategory } from '../../utils/logger';

export interface RepositoryExecutionOptions {
  requiresActor?: boolean;
  allowNull?: boolean;
  fallbackValue?: any;
}

/**
 * Normalizes unknown thrown errors into standardized ApiErrorCode and message.
 */
export function normalizeRepositoryError(err: unknown): { message: string; code: ApiErrorCode } {
  if (err instanceof RepositoryError) {
    return { message: err.message, code: err.code };
  }

  const message = err instanceof Error ? err.message : String(err || 'Unknown error occurred');
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('networkerror') || lowerMsg.includes('timed out')) {
    return { message: `Network Error: ${message}`, code: 'NETWORK_ERROR' };
  }

  if (lowerMsg.includes('canister') || lowerMsg.includes('reject') || lowerMsg.includes('trapped')) {
    return { message: `Canister Execution Error: ${message}`, code: 'CANISTER_ERROR' };
  }

  if (lowerMsg.includes('unauthorized') || lowerMsg.includes('anonymous')) {
    return { message: `Authentication Error: ${message}`, code: 'UNAUTHORIZED' };
  }

  if (lowerMsg.includes('not found')) {
    return { message: `Resource Not Found: ${message}`, code: 'NOT_FOUND' };
  }

  if (err instanceof TypeError || lowerMsg.includes('cannot read properties')) {
    return { message: `Data Parsing Error: ${message}`, code: 'MALFORMED_DATA' };
  }

  return { message, code: 'UNKNOWN_ERROR' };
}

/**
 * Centralized repository execution runner returning an ApiResult<T>.
 */
export async function executeRepositoryResult<T>(
  category: LogCategory,
  methodName: string,
  actor: backendInterface | null | undefined,
  fn: () => Promise<T>,
  options?: RepositoryExecutionOptions
): Promise<ApiResult<T>> {
  const requiresActor = options?.requiresActor ?? true;

  if (requiresActor && !actor) {
    const errorMsg = `[${category}.${methodName}] Backend actor is not initialized or unavailable`;
    logger.error(category, errorMsg);
    return fail(errorMsg, 'ACTOR_NOT_AVAILABLE');
  }

  try {
    logger.debug(category, `Executing ${methodName}`);
    const result = await fn();

    if (result === undefined || result === null) {
      if (options?.allowNull) {
        logger.info(category, `${methodName} completed with null/undefined result (allowed)`);
        return ok(result as T);
      }
      if (options?.fallbackValue !== undefined) {
        logger.warn(category, `${methodName} returned null/undefined; using provided fallback`);
        return ok(options.fallbackValue as T);
      }
    }

    logger.info(category, `Successfully executed ${methodName}`);
    return ok(result);
  } catch (err: unknown) {
    const { message, code } = normalizeRepositoryError(err);
    logger.error(category, `Failed to execute ${methodName}: ${message}`, err);
    return fail(message, code, err);
  }
}

/**
 * Centralized repository execution runner returning unwrapped data T or throwing RepositoryError.
 * Ensures 100% backward compatibility for promise-based call sites.
 */
export async function executeRepository<T>(
  category: LogCategory,
  methodName: string,
  actor: backendInterface | null | undefined,
  fn: () => Promise<T>,
  options?: RepositoryExecutionOptions
): Promise<T> {
  const result = await executeRepositoryResult(category, methodName, actor, fn, options);
  return unwrapApiResult(result);
}
