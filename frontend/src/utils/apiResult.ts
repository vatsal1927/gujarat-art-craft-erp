export type ApiErrorCode =
  | 'ACTOR_NOT_AVAILABLE'
  | 'NETWORK_ERROR'
  | 'CANISTER_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'MALFORMED_DATA'
  | 'METHOD_NOT_SUPPORTED'
  | 'UNKNOWN_ERROR';

export class RepositoryError extends Error {
  readonly code: ApiErrorCode;
  readonly causeDetails?: unknown;

  constructor(message: string, code: ApiErrorCode = 'UNKNOWN_ERROR', causeDetails?: unknown) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.causeDetails = causeDetails;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type ApiResult<T> =
  | {
      success: true;
      data: T;
      error?: undefined;
      code?: undefined;
      causeDetails?: undefined;
    }
  | {
      success: false;
      data?: undefined;
      error: string;
      code: ApiErrorCode;
      causeDetails?: unknown;
    };

export function ok<T>(data: T): ApiResult<T> {
  return {
    success: true,
    data,
  };
}

export function fail<T = never>(
  error: string | Error,
  code: ApiErrorCode = 'UNKNOWN_ERROR',
  causeDetails?: unknown
): ApiResult<T> {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'An unexpected error occurred';
  return {
    success: false,
    error: errorMessage,
    code,
    causeDetails: causeDetails ?? (error instanceof Error ? error.stack : undefined),
  };
}

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (result.success) {
    return result.data;
  }
  throw new RepositoryError(result.error, result.code, result.causeDetails);
}
