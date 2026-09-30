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
  '53000': 'insufficient_resources',
  '53100': 'disk_full',
  '53200': 'out_of_memory',
  '53300': 'too_many_connections',
  '53400': 'configuration_limit_exceeded',
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
  ENETRESET: 'connection_reset',
  ECONNABORTED: 'connection_aborted',
  ENETUNREACH: 'network_unreachable',
  EHOSTUNREACH: 'host_unreachable',
  EHOSTDOWN: 'host_unreachable',
  ENETDOWN: 'network_unavailable',
  EADDRNOTAVAIL: 'address_unavailable',
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

const DATABASE_ERROR_MESSAGES = Object.freeze({
  'timeout exceeded when trying to connect': 'connection_timeout',
  'timeout expired': 'connection_timeout',
  'Connection terminated due to connection timeout': 'connection_timeout',
  'Connection terminated unexpectedly': 'connection_reset',
  'Connection terminated': 'connection_reset',
  'The server does not support SSL connections': 'tls_failure',
  'There was an error establishing an SSL connection': 'tls_failure',
  'sslnegotiation=direct requires SSL to be enabled': 'ssl_negotiation_invalid',
  'Password must be a string': 'credential_material_invalid',
} as const);

const DATABASE_ERROR_MESSAGE_PREFIXES = Object.freeze([
  ['SASL:', 'sasl_failure'],
  ['Invalid sslnegotiation value:', 'ssl_negotiation_invalid'],
] as const);

type DatabaseErrorClass =
  | (typeof DATABASE_ERROR_CLASSES)[keyof typeof DATABASE_ERROR_CLASSES]
  | (typeof DATABASE_ERROR_MESSAGES)[keyof typeof DATABASE_ERROR_MESSAGES]
  | (typeof DATABASE_ERROR_MESSAGE_PREFIXES)[number][1]
  | 'connection_aborted'
  | 'network_unreachable'
  | 'host_unreachable'
  | 'network_unavailable'
  | 'address_unavailable'
  | 'other_database_error';

function classifyDatabaseCodeFamily(code: string): DatabaseErrorClass | null {
  if (code.startsWith('ERR_SSL_')) return 'tls_failure';
  if (/^[0-9A-Z]{5}$/.test(code)) {
    if (code.startsWith('08')) return 'connection_exception';
    if (code.startsWith('28')) return 'authentication_failed';
  }
  return null;
}

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

function databaseErrorMessages(error: unknown, depth = 0, seen = new Set<object>()): string[] {
  if (!error || typeof error !== 'object' || depth > 3 || seen.has(error)) return [];
  seen.add(error);

  const row = error as {
    message?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  const messages: string[] = [];
  if (typeof row.message === 'string') messages.push(row.message);

  if (Array.isArray(row.errors)) {
    for (const nested of row.errors.slice(0, 8)) {
      messages.push(...databaseErrorMessages(nested, depth + 1, seen));
    }
  }
  if (row.cause !== undefined) {
    messages.push(...databaseErrorMessages(row.cause, depth + 1, seen));
  }
  return messages;
}

type DatabaseErrorShape = Readonly<{
  root: 'aggregate_error' | 'type_error' | 'error' | 'object' | 'string' | 'primitive' | 'nullish';
  code: 'string' | 'other' | 'absent';
  message: 'string' | 'other' | 'absent';
  cause: 'present' | 'absent';
  errors: 'array' | 'other' | 'absent';
}>;

type DatabaseErrorCodeFamilyShape =
  | 'sqlstate_like'
  | 'node_tls_like'
  | 'node_ossl_like'
  | 'node_error_like'
  | 'node_errno_like'
  | 'upper_token_like'
  | 'other_string'
  | 'other'
  | 'absent';

const DATABASE_SQLSTATE_CLASSES = Object.freeze({
  '00': 'successful_completion',
  '01': 'warning',
  '02': 'no_data',
  '03': 'sql_statement_not_yet_complete',
  '08': 'connection_exception',
  '09': 'triggered_action_exception',
  '0A': 'feature_not_supported',
  '0B': 'invalid_transaction_initiation',
  '0F': 'locator_exception',
  '0L': 'invalid_grantor',
  '0P': 'invalid_role_specification',
  '0Z': 'diagnostics_exception',
  '10': 'xquery_error',
  '20': 'case_not_found',
  '21': 'cardinality_violation',
  '22': 'data_exception',
  '23': 'integrity_constraint_violation',
  '24': 'invalid_cursor_state',
  '25': 'invalid_transaction_state',
  '26': 'invalid_sql_statement_name',
  '27': 'triggered_data_change_violation',
  '28': 'invalid_authorization_specification',
  '2B': 'dependent_privilege_descriptors_still_exist',
  '2D': 'invalid_transaction_termination',
  '2F': 'sql_routine_exception',
  '34': 'invalid_cursor_name',
  '38': 'external_routine_exception',
  '39': 'external_routine_invocation_exception',
  '3B': 'savepoint_exception',
  '3D': 'invalid_catalog_name',
  '3F': 'invalid_schema_name',
  '40': 'transaction_rollback',
  '42': 'syntax_error_or_access_rule_violation',
  '44': 'with_check_option_violation',
  '53': 'insufficient_resources',
  '54': 'program_limit_exceeded',
  '55': 'object_not_in_prerequisite_state',
  '57': 'operator_intervention',
  '58': 'system_error',
  F0: 'configuration_file_error',
  HV: 'foreign_data_wrapper_error',
  P0: 'plpgsql_error',
  XX: 'internal_error',
} as const);

type DatabaseSqlstateClass =
  | (typeof DATABASE_SQLSTATE_CLASSES)[keyof typeof DATABASE_SQLSTATE_CLASSES]
  | 'unknown_sqlstate_class';

function classifyDatabaseSqlstateClass(error: unknown): DatabaseSqlstateClass | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string' || !/^[0-9A-Z]{5}$/.test(code)) return null;
  return DATABASE_SQLSTATE_CLASSES[code.slice(0, 2) as keyof typeof DATABASE_SQLSTATE_CLASSES]
    ?? 'unknown_sqlstate_class';
}

function classifyDatabaseErrorCodeFamilyShape(error: unknown): DatabaseErrorCodeFamilyShape {
  if (!error || typeof error !== 'object') return 'absent';
  const code = (error as { code?: unknown }).code;
  if (code === undefined) return 'absent';
  if (typeof code !== 'string') return 'other';
  if (/^[0-9A-Z]{5}$/.test(code)) return 'sqlstate_like';
  if (code.startsWith('ERR_TLS_')) return 'node_tls_like';
  if (code.startsWith('ERR_OSSL_')) return 'node_ossl_like';
  if (code.startsWith('ERR_')) return 'node_error_like';
  if (/^E[A-Z0-9_]+$/.test(code)) return 'node_errno_like';
  if (/^[A-Z][A-Z0-9_]+$/.test(code)) return 'upper_token_like';
  return 'other_string';
}

function classifyDatabaseErrorShape(error: unknown): DatabaseErrorShape {
  let root: DatabaseErrorShape['root'];
  if (error === null || error === undefined) root = 'nullish';
  else if (error instanceof AggregateError) root = 'aggregate_error';
  else if (error instanceof TypeError) root = 'type_error';
  else if (error instanceof Error) root = 'error';
  else if (typeof error === 'object') root = 'object';
  else if (typeof error === 'string') root = 'string';
  else root = 'primitive';

  if (!error || typeof error !== 'object') {
    return Object.freeze({
      root,
      code: 'absent',
      message: typeof error === 'string' ? 'string' : 'absent',
      cause: 'absent',
      errors: 'absent',
    });
  }

  const row = error as {
    code?: unknown;
    message?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  return Object.freeze({
    root,
    code: row.code === undefined ? 'absent' : typeof row.code === 'string' ? 'string' : 'other',
    message: row.message === undefined ? 'absent' : typeof row.message === 'string' ? 'string' : 'other',
    cause: row.cause === undefined ? 'absent' : 'present',
    errors: row.errors === undefined ? 'absent' : Array.isArray(row.errors) ? 'array' : 'other',
  });
}

type DatabaseInsufficientResourceCause =
  | 'compute_time_quota_exceeded'
  | 'data_transfer_quota_exceeded'
  | 'other_quota_exceeded'
  | 'other_insufficient_resources'
  | 'message_absent';

type DatabaseQuotaResource =
  | 'compute'
  | 'network_transfer'
  | 'storage'
  | 'branch'
  | 'endpoint'
  | 'other';

function classifyDatabaseQuotaResource(error: unknown): DatabaseQuotaResource {
  for (const message of databaseErrorMessages(error)) {
    const normalized = message.toLowerCase();
    if (!normalized.includes('quota')) continue;
    if (normalized.includes('compute')) return 'compute';
    if (normalized.includes('transfer') || normalized.includes('egress') || normalized.includes('network')) {
      return 'network_transfer';
    }
    if (normalized.includes('storage') || normalized.includes('disk')) return 'storage';
    if (normalized.includes('branch')) return 'branch';
    if (normalized.includes('endpoint')) return 'endpoint';
  }
  return 'other';
}

function classifyDatabaseInsufficientResourceCause(error: unknown): DatabaseInsufficientResourceCause {
  const messages = databaseErrorMessages(error);
  if (messages.length === 0) return 'message_absent';
  for (const message of messages) {
    const normalized = message.toLowerCase();
    if (normalized.includes('compute time quota')) return 'compute_time_quota_exceeded';
    if (normalized.includes('data transfer quota') || normalized.includes('network transfer quota')) {
      return 'data_transfer_quota_exceeded';
    }
    if (normalized.includes('quota')) return 'other_quota_exceeded';
  }
  return 'other_insufficient_resources';
}

function classifyDatabaseError(error: unknown): DatabaseErrorClass {
  for (const code of databaseErrorCodes(error)) {
    const classified = DATABASE_ERROR_CLASSES[code as keyof typeof DATABASE_ERROR_CLASSES];
    if (classified) return classified;
    const family = classifyDatabaseCodeFamily(code);
    if (family) return family;
  }
  for (const message of databaseErrorMessages(error)) {
    const classified = DATABASE_ERROR_MESSAGES[message as keyof typeof DATABASE_ERROR_MESSAGES];
    if (classified) return classified;
    for (const [prefix, prefixClass] of DATABASE_ERROR_MESSAGE_PREFIXES) {
      if (message.startsWith(prefix)) return prefixClass;
    }
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
      if (errorClass === 'insufficient_resources') {
        const insufficientResourceCause = classifyDatabaseInsufficientResourceCause(error);
        console.warn(`FANDEX_NAVER_DATABASE_INSUFFICIENT_RESOURCE_CAUSE=${insufficientResourceCause}`);
        if (insufficientResourceCause === 'other_quota_exceeded') {
          console.warn(`FANDEX_NAVER_DATABASE_QUOTA_RESOURCE=${classifyDatabaseQuotaResource(error)}`);
        }
      }
      if (errorClass === 'other_database_error') {
        const shape = classifyDatabaseErrorShape(error);
        console.warn(`FANDEX_NAVER_DATABASE_ERROR_ROOT=${shape.root}`);
        console.warn(`FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=${shape.code}`);
        const codeFamilyShape = classifyDatabaseErrorCodeFamilyShape(error);
        console.warn(`FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=${codeFamilyShape}`);
        if (codeFamilyShape === 'sqlstate_like') {
          const sqlstateClass = classifyDatabaseSqlstateClass(error);
          if (sqlstateClass) {
            console.warn(`FANDEX_NAVER_DATABASE_SQLSTATE_CLASS=${sqlstateClass}`);
          }
        }
        console.warn(`FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=${shape.message}`);
        console.warn(`FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=${shape.cause}`);
        console.warn(`FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=${shape.errors}`);
      }
    } catch {
      // A logging failure must never replace the database failure.
    }
    throw error;
  }
}
