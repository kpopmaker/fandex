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

const DATABASE_ERROR_CLASSES = Object.freeze({
  '42P01': 'undefined_table',
  '42501': 'insufficient_privilege',
  '3F000': 'invalid_schema',
  '42703': 'undefined_column',
  '28P01': 'authentication_failed',
  '08000': 'connection_exception',
  '08001': 'connection_exception',
  '08003': 'connection_exception',
  '08004': 'connection_exception',
  '08006': 'connection_exception',
  '08007': 'connection_exception',
  '08P01': 'connection_exception',
} as const);

type DatabaseErrorClass =
  | (typeof DATABASE_ERROR_CLASSES)[keyof typeof DATABASE_ERROR_CLASSES]
  | 'other_database_error';

function classifyDatabaseError(error: unknown): DatabaseErrorClass {
  if (!error || typeof error !== 'object' || !('code' in error)) return 'other_database_error';
  const code = String((error as { code?: unknown }).code ?? '');
  return DATABASE_ERROR_CLASSES[code as keyof typeof DATABASE_ERROR_CLASSES]
    ?? 'other_database_error';
}

export async function observeNaverNewsDatabaseOperation<T>(
  operation: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorClass = classifyDatabaseError(error);
    try {
      console.warn(`FANDEX_NAVER_DATABASE_ERROR_CLASS=${errorClass}`);
    } catch {
      // A logging failure must never replace the database failure.
    }
    throw error;
  }
}
