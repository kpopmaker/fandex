const STAGES = new Set([
  'runtime_oidc', 'scheduler_plan', 'writer_arguments', 'database_config',
  'provider_config', 'pool_create', 'mirror_config', 'database_ensure',
  'database_claim', 'provider_collect', 'response_validate', 'blob_stage',
  'database_complete', 'blob_finalize', 'database_fail', 'pool_close',
] as const);

type DispatchStage = typeof STAGES extends Set<infer Stage> ? Stage : never;

export async function observeNaverNewsDispatchStage<T>(
  stage: DispatchStage,
  operation: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (STAGES.has(stage)) {
      try {
        console.warn(`FANDEX_NAVER_DISPATCH_FAILED_STAGE=${stage}`);
      } catch {
        // A logging failure must not replace the original failure or retry work.
      }
    }
    throw error;
  }
}

const DATABASE_OPERATIONS = new Set([
  'connect', 'begin', 'job_insert', 'job_select', 'audit_insert', 'commit', 'rollback',
] as const);

type DatabaseOperation = typeof DATABASE_OPERATIONS extends Set<infer Operation> ? Operation : never;

const DATABASE_ERROR_CLASSES = Object.freeze({
  '42P01': 'undefined_table',
  '42501': 'insufficient_privilege',
  '3F000': 'invalid_schema',
  '42703': 'undefined_column',
  '23514': 'check_violation',
  '23505': 'unique_violation',
  '23503': 'foreign_key_violation',
  '22001': 'value_too_long',
  '22P02': 'invalid_text_representation',
  '28P01': 'authentication_failed',
  '08000': 'connection_exception',
  '08001': 'connection_exception',
  '08003': 'connection_exception',
  '08004': 'connection_exception',
  '08006': 'connection_exception',
  '08007': 'connection_exception',
  '08P01': 'connection_exception',
  ENOTFOUND: 'dns_failure',
  EAI_AGAIN: 'dns_failure',
  ECONNREFUSED: 'connection_refused',
  ECONNRESET: 'connection_reset',
  EPIPE: 'connection_reset',
  ETIMEDOUT: 'connection_timeout',
  ERR_SOCKET_CONNECTION_TIMEOUT: 'connection_timeout',
  ERR_TLS_HANDSHAKE_TIMEOUT: 'tls_failure',
  ERR_TLS_CERT_ALTNAME_INVALID: 'tls_failure',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'tls_failure',
  SELF_SIGNED_CERT_IN_CHAIN: 'tls_failure',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'tls_failure',
  CERT_HAS_EXPIRED: 'tls_failure',
  '57014': 'query_timeout',
  '57P01': 'server_unavailable',
  '57P02': 'server_unavailable',
  '57P03': 'server_unavailable',
} as const);

type DatabaseErrorClass =
  | (typeof DATABASE_ERROR_CLASSES)[keyof typeof DATABASE_ERROR_CLASSES]
  | 'other_database_error';

function databaseErrorCodes(error: unknown, depth = 0, seen = new Set<object>()): string[] {
  if (!error || typeof error !== 'object' || depth > 3 || seen.has(error)) return [];
  seen.add(error);

  const row = error as {
    code?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  const codes: string[] = [];
  if (typeof row.code === 'string') codes.push(row.code);

  if (Array.isArray(row.errors)) {
    for (const nested of row.errors.slice(0, 8)) {
      codes.push(...databaseErrorCodes(nested, depth + 1, seen));
    }
  }
  if (row.cause !== undefined) {
    codes.push(...databaseErrorCodes(row.cause, depth + 1, seen));
  }
  return codes;
}

function classifyDatabaseError(error: unknown): DatabaseErrorClass {
  for (const code of databaseErrorCodes(error)) {
    const classified = DATABASE_ERROR_CLASSES[code as keyof typeof DATABASE_ERROR_CLASSES];
    if (classified) return classified;
  }
  return 'other_database_error';
}

export async function observeNaverNewsDatabaseOperation<T>(
  operationName: DatabaseOperation,
  operation: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorClass = classifyDatabaseError(error);
    try {
      if (DATABASE_OPERATIONS.has(operationName)) {
        console.warn(`FANDEX_NAVER_DATABASE_FAILED_OPERATION=${operationName}`);
      }
      console.warn(`FANDEX_NAVER_DATABASE_ERROR_CLASS=${errorClass}`);
    } catch {
      // A logging failure must never replace the database failure.
    }
    throw error;
  }
}
