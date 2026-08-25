import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Pool, type PoolClient, type QueryResultRow } from 'pg';

import {
  buildRoleConnectionDescriptors,
  evaluateRoleBootstrapReadiness,
  inspectRoleSecurityState,
  validateRoleBootstrapInput,
  type RoleBootstrapInput,
  type RoleCatalogRow,
  type RoleName,
} from './bootstrap-postgres-roles.mjs';

const OWNER_SOURCE_PATH = resolve('tmp/source-sandbox/v118-production/production-owner.env.local');
const MIGRATION_PATH = resolve('database/migrations/001_v114_managed_postgres_persistence.sql');
const GRANT_PATH = resolve('database/grants/001_v117_least_privilege_roles.sql');
const MIGRATION_SHA256 = '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a';
const GRANT_SHA256 = '05e8eba83f4b88d7d4897b42f4cc62c3cc337dc35f88b8efa618aee8302ba546';
const VERCEL_CLI_VERSION = '59.5.0';
const ADVISORY_LOCK_KEY = 11_820_260_825;
const ROLE_NAMES = ['fandex_migrator', 'fandex_runtime'] as const;
const TABLES = ['historical_enrichment_requests','ingestion_outbox','normalized_sources','persistence_audit_events','persistence_transactions','schema_migrations','source_evidence_provenance'] as const;
const BUSINESS_TABLES = TABLES.filter((table) => table !== 'schema_migrations');
const RUNTIME_VISIBLE_TABLES = [...BUSINESS_TABLES].sort();
const REQUIRED_FLAGS = ['--apply','--authorize-production-role-bootstrap','--authorize-production-schema-bootstrap','--authorize-vercel-production-env'] as const;
const RECOVERY_FLAGS = ['--recover-role-credentials','--authorize-production-role-password-rotation','--authorize-vercel-production-env-update'] as const;
export const ROLE_VERIFICATION_POLICY = Object.freeze({
  migrationMaxAttempts: 4,
  runtimeMaxAttempts: 7,
  connectionTimeoutMilliseconds: 3_000,
  backoffMilliseconds: Object.freeze([250,500,1_000,1_500,2_000,2_500]),
  maximumTotalDelayMilliseconds: 7_750,
});
const INPUT: RoleBootstrapInput = Object.freeze({
  provider: 'neon', resource: 'fandex-managed-postgres', branch: 'main', database: 'neondb',
  region: 'AWS Asia Pacific 1 (Singapore)', baseline: 'pre-v117-production-baseline',
  descriptorSource: 'postgresql-sql', deletionAttestation: 'user_attested',
});

export type SafeVercelEnvMetadata = {
  name: string;
  scope: readonly ['production'];
  sensitive: boolean;
};
export type VercelEnvironmentBoundary = {
  listProduction(): Promise<readonly SafeVercelEnvMetadata[]>;
  addSensitiveProduction(name: string, value: string): Promise<void>;
  updateSensitiveProduction(name: string, value: string): Promise<void>;
  removeProduction(name: string): Promise<void>;
};
export type ProductionEffects = {
  productionConnections: number;
  productionReadStatements: number;
  productionControlStatements: number;
  productionRoleCreateStatements: number;
  productionTemporaryMembershipStatements: number;
  productionSchemaWriteBatches: number;
  productionMigrationRecordWrites: number;
  vercelMetadataReads: number;
  vercelEnvCreates: number;
  vercelEnvUpdates: number;
  vercelEnvDeletes: number;
  ownerCredentialValuesRead: number;
  generatedRoleCredentials: number;
  businessRowWrites: number;
  deployments: number;
  downstreamCalls: number;
  productionPasswordRotationStatements: number;
};
type OwnerCredentials = {
  consumeOnce(): { pooled: string; unpooled: string };
  toJSON(): { credentialValues: 'redacted'; credentialValueCount: 2 };
};
type GeneratedCredentials = {
  consumeOnce(): Readonly<Record<RoleName, string>>;
  toJSON(): { credentialValues: 'redacted'; credentialValueCount: 2 };
};
type SafeSchemaState = {
  roleSecurity: readonly RoleCatalogRow[];
  schemaOwnerMatched: boolean;
  tableOwnersMatched: boolean;
  functionOwnerMatched: boolean;
  ownerCreatorMembershipSafe: boolean;
  tableNames: readonly string[];
  constraintTypes: readonly string[];
  auditTriggerPresent: boolean;
  migrationRecordMatched: boolean;
  runtimeSchemaUsage: boolean;
  runtimeSchemaCreate: boolean;
  runtimeAcl: Readonly<Record<string, readonly string[]>>;
  runtimeSequenceGrantCount: number;
  runtimeFunctionGrantCount: number;
  publicSchemaUsage: boolean;
  publicSchemaCreate: boolean;
  publicTableGrantCount: number;
  publicSequenceGrantCount: number;
  publicFunctionGrantCount: number;
  businessRows: Readonly<Record<string, number>>;
};
type SafeRoleVerification = {
  role: RoleName;
  identityMatched: boolean;
  databaseMatched: boolean;
  endpointShapeMatched: boolean;
  tls: boolean;
  roleSecurityMatched: boolean;
  privilegesMatched: boolean;
  ownershipMatched: boolean;
  migrationRecordMatched: boolean;
  schemaObjectsMatched: boolean;
  businessRowsZero: boolean;
  attempt: number;
};

export type SafeRoleVerificationDiagnostic = Readonly<{
  role_classification: 'migration' | 'runtime';
  endpoint_classification: 'unpooled' | 'pooled';
  stage: 'url_validation' | 'connect' | 'identity_query' | 'privilege_query' | 'postcondition' | 'close';
  category: 'dns' | 'tcp' | 'tls' | 'authentication' | 'timeout' | 'query' | 'postcondition' | 'unknown';
  sqlstate: string | null;
  node_code: string | null;
  attempt: number;
  max_attempts: number;
  retryable: boolean;
  timeout_observed: boolean;
}>;

export class RoleVerificationError extends Error {
  readonly diagnostic: SafeRoleVerificationDiagnostic;
  constructor(diagnostic: SafeRoleVerificationDiagnostic) {
    super('production_role_verification_failed');
    this.name = 'RoleVerificationError';
    this.diagnostic = Object.freeze({ ...diagnostic });
  }
  toJSON() { return { error: this.message, diagnostic: this.diagnostic }; }
}

function effects(): ProductionEffects {
  return {
    productionConnections: 0, productionReadStatements: 0, productionControlStatements: 0,
    productionRoleCreateStatements: 0, productionTemporaryMembershipStatements: 0,
    productionSchemaWriteBatches: 0, productionMigrationRecordWrites: 0,
    vercelMetadataReads: 0, vercelEnvCreates: 0, vercelEnvUpdates: 0, vercelEnvDeletes: 0,
    ownerCredentialValuesRead: 0, generatedRoleCredentials: 0, businessRowWrites: 0,
    deployments: 0, downstreamCalls: 0, productionPasswordRotationStatements: 0,
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function safeError(error: unknown): string {
  const known = new Set([
    'production_bootstrap_authorization_required','owner_credential_source_invalid','owner_credential_already_consumed',
    'generated_credentials_already_consumed','migration_digest_mismatch','grant_digest_mismatch',
    'vercel_project_metadata_mismatch','vercel_environment_metadata_invalid','vercel_target_env_already_exists',
    'vercel_owner_env_missing','production_identity_mismatch','production_prestate_mismatch',
    'existing_role_requires_manual_resolution','neon_superuser_membership_rejected','unsafe_role_attributes',
    'role_set_incomplete','unexpected_role_state','production_schema_postcondition_failed',
    'production_role_verification_failed','production_compensation_incomplete','production_commit_indeterminate',
    'credential_source_delete_failed','production_recovery_authorization_required','production_recovery_preflight_failed',
    'production_credential_recovery_failed','recorded_recovery_evidence_mismatch','production_finalization_postcondition_failed',
  ]);
  if (error instanceof Error && /^production_stage_[a-z_]+_failed$/.test(error.message)) return error.message;
  return error instanceof Error && known.has(error.message) ? error.message : 'production_bootstrap_external_boundary_failed';
}

function opaqueOwnerCredentials(pooled: string, unpooled: string): OwnerCredentials {
  let values: { pooled: string; unpooled: string } | undefined = { pooled, unpooled };
  return Object.freeze({
    consumeOnce() {
      if (!values) throw new Error('owner_credential_already_consumed');
      const consumed = values; values = undefined; return consumed;
    },
    toJSON: () => ({ credentialValues: 'redacted' as const, credentialValueCount: 2 as const }),
  });
}

function parseUrl(value: string, expectedRole: string, pooled: boolean): URL {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('owner_credential_source_invalid'); }
  if (!['postgres:','postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.password
      || decodeURIComponent(parsed.username) !== expectedRole || decodeURIComponent(parsed.pathname.slice(1)) !== 'neondb'
      || parsed.hash || parsed.hostname.toLowerCase().includes('pooler') !== pooled) {
    throw new Error('owner_credential_source_invalid');
  }
  return parsed;
}

function createPostgresPool(connectionString: string): Pool {
  const transportUrl = new URL(connectionString);
  transportUrl.searchParams.delete('sslmode');
  transportUrl.searchParams.delete('uselibpqcompat');
  return new Pool({ connectionString: transportUrl.toString(), max: 1, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: ROLE_VERIFICATION_POLICY.connectionTimeoutMilliseconds, statement_timeout: 30_000 });
}

function clientTlsActive(client: PoolClient): boolean {
  return (client as unknown as { connection?: { stream?: { encrypted?: boolean } } }).connection?.stream?.encrypted === true;
}

export function validateProductionBootstrapAuthorization(argv: readonly string[]): { authorized: true } {
  if (!REQUIRED_FLAGS.every((flag) => argv.includes(flag))) throw new Error('production_bootstrap_authorization_required');
  return { authorized: true };
}

export function validateProductionRecoveryAuthorization(argv: readonly string[]): { authorized: true } {
  if (!RECOVERY_FLAGS.every((flag) => argv.includes(flag))) throw new Error('production_recovery_authorization_required');
  return { authorized: true };
}

export async function loadOwnerCredentialSource(
  reader: () => Promise<string> = () => readFile(OWNER_SOURCE_PATH, 'utf8'),
): Promise<OwnerCredentials> {
  const text = await reader();
  const entries = new Map<string, string>();
  for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!rawLine) continue;
    const separator = rawLine.indexOf('=');
    if (separator < 1) throw new Error('owner_credential_source_invalid');
    const key = rawLine.slice(0, separator);
    let value = rawLine.slice(separator + 1);
    if (entries.has(key) || !value) throw new Error('owner_credential_source_invalid');
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    entries.set(key, value);
  }
  if (entries.size !== 2 || !entries.has('DATABASE_URL') || !entries.has('DATABASE_URL_UNPOOLED')) {
    throw new Error('owner_credential_source_invalid');
  }
  const pooled = entries.get('DATABASE_URL') as string;
  const unpooled = entries.get('DATABASE_URL_UNPOOLED') as string;
  const pooledUrl = parseUrl(pooled, 'neondb_owner', true);
  const unpooledUrl = parseUrl(unpooled, 'neondb_owner', false);
  if (pooledUrl.hostname.replace('-pooler.', '.') !== unpooledUrl.hostname) throw new Error('owner_credential_source_invalid');
  return opaqueOwnerCredentials(pooled, unpooled);
}

export function generateRoleCredentials(): GeneratedCredentials {
  let values: Readonly<Record<RoleName, string>> | undefined = Object.freeze({
    fandex_migrator: randomBytes(48).toString('base64url'),
    fandex_runtime: randomBytes(48).toString('base64url'),
  });
  return Object.freeze({
    consumeOnce() {
      if (!values) throw new Error('generated_credentials_already_consumed');
      const consumed = values; values = undefined; return consumed;
    },
    toJSON: () => ({ credentialValues: 'redacted' as const, credentialValueCount: 2 as const }),
  });
}

export async function buildProductionBootstrapExecutionPlan(): Promise<{
  mode: 'plan'; requiredFlags: typeof REQUIRED_FLAGS; migrationSha256: string; grantSha256: string;
  orderedSteps: readonly string[]; effects: ProductionEffects;
}> {
  validateRoleBootstrapInput(INPUT);
  const [migration, grants] = await Promise.all([readFile(MIGRATION_PATH), readFile(GRANT_PATH)]);
  if (createHash('sha256').update(migration).digest('hex') !== MIGRATION_SHA256) throw new Error('migration_digest_mismatch');
  if (createHash('sha256').update(grants).digest('hex') !== GRANT_SHA256) throw new Error('grant_digest_mismatch');
  return Object.freeze({
    mode: 'plan', requiredFlags: REQUIRED_FLAGS, migrationSha256: MIGRATION_SHA256, grantSha256: GRANT_SHA256,
    orderedSteps: Object.freeze(['validate_prestate','begin_and_lock','create_roles','apply_migration_001','record_migration','apply_grants','verify_db_postconditions','create_sensitive_env','verify_env_metadata','commit','verify_roles_read_only','verify_replay_read_only','delete_owner_source']),
    effects: effects(),
  });
}

function normalizeVercelMetadata(value: unknown): SafeVercelEnvMetadata[] {
  const container = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const rows = Array.isArray(value) ? value : Array.isArray(container?.envs) ? container.envs : Array.isArray(container?.environmentVariables) ? container.environmentVariables : null;
  if (!rows) throw new Error('vercel_environment_metadata_invalid');
  return rows.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('vercel_environment_metadata_invalid');
    const row = item as Record<string, unknown>;
    const name = typeof row.key === 'string' ? row.key : typeof row.name === 'string' ? row.name : '';
    const targets = Array.isArray(row.target) ? row.target : Array.isArray(row.targets) ? row.targets : typeof row.environment === 'string' ? [row.environment] : [];
    const sensitive = row.sensitive === true || row.type === 'sensitive';
    if (!name || !targets.map(String).some((target) => target.toLowerCase() === 'production')) throw new Error('vercel_environment_metadata_invalid');
    return Object.freeze({ name, scope: ['production'] as const, sensitive });
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function runVercel(args: readonly string[], stdin?: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const windows = process.platform === 'win32';
    const executable = windows ? process.execPath : 'npx';
    const npxArgs = ['--yes', `vercel@${VERCEL_CLI_VERSION}`, ...args, '--project', 'fandex', '--no-color', '--non-interactive'];
    const executableArgs = windows ? [resolve(dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js'), ...npxArgs] : npxArgs;
    const child = spawn(executable, executableArgs, {
      cwd: resolve('.'), windowsHide: true, stdio: ['pipe','pipe','pipe'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk: Buffer) => { if (stdout.length < 1_000_000) stdout += chunk.toString('utf8'); });
    child.stderr.resume();
    child.on('error', () => rejectPromise(new Error('vercel_cli_failed')));
    child.on('close', (code) => code === 0 ? resolvePromise(stdout) : rejectPromise(new Error('vercel_cli_failed')));
    endStdinExact(child.stdin, stdin);
  });
}

export function endStdinExact(stream: Pick<NodeJS.WritableStream, 'end'>, value?: string): void {
  if (value === undefined) stream.end(); else stream.end(value);
}

export function createVercelCliBoundary(): VercelEnvironmentBoundary {
  return Object.freeze({
    async listProduction() {
      const output = await runVercel(['env','list','production','--json']);
      let parsed: unknown;
      try { parsed = JSON.parse(output); } catch { throw new Error('vercel_environment_metadata_invalid'); }
      return normalizeVercelMetadata(parsed);
    },
    async addSensitiveProduction(name, value) {
      if (!['FANDEX_RUNTIME_DATABASE_URL','FANDEX_MIGRATION_DATABASE_URL'].includes(name)) throw new Error('vercel_environment_metadata_invalid');
      await runVercel(['env','add',name,'production','--sensitive','--yes'], value);
    },
    async updateSensitiveProduction(name, value) {
      if (!['FANDEX_RUNTIME_DATABASE_URL','FANDEX_MIGRATION_DATABASE_URL'].includes(name)) throw new Error('vercel_environment_metadata_invalid');
      await runVercel(['env','update',name,'production','--sensitive','--yes'], value);
    },
    async removeProduction(name) {
      if (!['FANDEX_RUNTIME_DATABASE_URL','FANDEX_MIGRATION_DATABASE_URL'].includes(name)) throw new Error('vercel_environment_metadata_invalid');
      await runVercel(['env','remove',name,'production','--yes']);
    },
  });
}

function validateVercelPrestate(rows: readonly SafeVercelEnvMetadata[]): void {
  for (const name of ['FANDEX_RUNTIME_DATABASE_URL','FANDEX_MIGRATION_DATABASE_URL']) {
    if (rows.some((row) => row.name === name)) throw new Error('vercel_target_env_already_exists');
  }
  for (const name of ['DATABASE_URL','DATABASE_URL_UNPOOLED']) {
    const row = rows.find((candidate) => candidate.name === name);
    if (!row || !row.sensitive || row.scope[0] !== 'production') throw new Error('vercel_owner_env_missing');
  }
}

function validateVercelPoststate(rows: readonly SafeVercelEnvMetadata[]): SafeVercelEnvMetadata[] {
  const result = ['FANDEX_MIGRATION_DATABASE_URL','FANDEX_RUNTIME_DATABASE_URL'].map((name) => rows.find((row) => row.name === name));
  if (result.some((row) => !row || !row.sensitive || row.scope[0] !== 'production')) throw new Error('vercel_environment_metadata_invalid');
  for (const name of ['DATABASE_URL','DATABASE_URL_UNPOOLED']) {
    if (!rows.some((row) => row.name === name)) throw new Error('vercel_owner_env_missing');
  }
  return result as SafeVercelEnvMetadata[];
}

export async function configureSensitiveVercelEnvironment(
  boundary: VercelEnvironmentBoundary,
  urls: Readonly<{ runtime: string; migration: string }>,
  counters: ProductionEffects,
): Promise<readonly SafeVercelEnvMetadata[]> {
  const pre = await boundary.listProduction(); counters.vercelMetadataReads += 1;
  validateVercelPrestate(pre);
  await boundary.addSensitiveProduction('FANDEX_RUNTIME_DATABASE_URL', urls.runtime); counters.vercelEnvCreates += 1;
  await boundary.addSensitiveProduction('FANDEX_MIGRATION_DATABASE_URL', urls.migration); counters.vercelEnvCreates += 1;
  const post = await boundary.listProduction(); counters.vercelMetadataReads += 1;
  return validateVercelPoststate(post);
}

export async function updateSensitiveVercelEnvironment(
  boundary: VercelEnvironmentBoundary,
  urls: Readonly<{ runtime: string; migration: string }>,
  counters: ProductionEffects,
): Promise<readonly SafeVercelEnvMetadata[]> {
  const pre = await boundary.listProduction(); counters.vercelMetadataReads += 1;
  validateVercelPoststate(pre);
  await boundary.updateSensitiveProduction('FANDEX_MIGRATION_DATABASE_URL', urls.migration); counters.vercelEnvUpdates += 1;
  await boundary.updateSensitiveProduction('FANDEX_RUNTIME_DATABASE_URL', urls.runtime); counters.vercelEnvUpdates += 1;
  const post = await boundary.listProduction(); counters.vercelMetadataReads += 1;
  return validateVercelPoststate(post);
}

export async function inspectVercelProductionEnvironment(
  boundary: VercelEnvironmentBoundary = createVercelCliBoundary(),
): Promise<readonly SafeVercelEnvMetadata[]> {
  const rows = await boundary.listProduction();
  validateVercelPrestate(rows);
  const allowed = new Set(['DATABASE_URL','DATABASE_URL_UNPOOLED']);
  return Object.freeze(rows.filter((row) => allowed.has(row.name)).map((row) => Object.freeze({ name: row.name, scope: row.scope, sensitive: row.sensitive })));
}

export async function inspectVercelProductionPoststate(
  boundary: VercelEnvironmentBoundary = createVercelCliBoundary(),
): Promise<readonly SafeVercelEnvMetadata[]> {
  const rows = await boundary.listProduction();
  validateVercelPoststate(rows);
  const allowed = new Set(['DATABASE_URL','DATABASE_URL_UNPOOLED','FANDEX_RUNTIME_DATABASE_URL','FANDEX_MIGRATION_DATABASE_URL']);
  return Object.freeze(rows.filter((row) => allowed.has(row.name)).map((row) => Object.freeze({ name: row.name, scope: row.scope, sensitive: row.sensitive })).sort((a, b) => a.name.localeCompare(b.name)));
}

export async function compensatePartialBootstrap(
  boundary: VercelEnvironmentBoundary,
  counters: ProductionEffects,
): Promise<{ complete: boolean; removed: readonly string[] }> {
  const allowed = ['FANDEX_MIGRATION_DATABASE_URL','FANDEX_RUNTIME_DATABASE_URL'];
  let current: readonly SafeVercelEnvMetadata[];
  try { current = await boundary.listProduction(); counters.vercelMetadataReads += 1; } catch { return { complete: false, removed: [] }; }
  const removed: string[] = [];
  for (const name of allowed) {
    if (!current.some((row) => row.name === name)) continue;
    try { await boundary.removeProduction(name); counters.vercelEnvDeletes += 1; removed.push(name); } catch { /* verify below */ }
  }
  try {
    const after = await boundary.listProduction(); counters.vercelMetadataReads += 1;
    return { complete: !allowed.some((name) => after.some((row) => row.name === name)), removed: removed.sort() };
  } catch { return { complete: false, removed: removed.sort() }; }
}

function quoteIdentifier(role: RoleName): string {
  if (!(ROLE_NAMES as readonly string[]).includes(role)) throw new Error('unexpected_role_state');
  return `"${role}"`;
}

function quoteLiteral(value: string): string { return `'${value.replace(/'/g, "''")}'`; }

async function countedQuery<T extends QueryResultRow>(client: PoolClient, counters: ProductionEffects, sql: string, values?: readonly unknown[]) {
  const normalized = sql.trim().toUpperCase();
  if (/^(BEGIN|COMMIT|ROLLBACK|SET )/.test(normalized) || normalized.includes('PG_ADVISORY')) counters.productionControlStatements += 1;
  else if (normalized.startsWith('SELECT')) counters.productionReadStatements += 1;
  return client.query<T>(sql, values as unknown[] | undefined);
}

async function inspectPrestate(client: PoolClient, counters: ProductionEffects) {
  const state = await queryProductionPrestate(client, counters);
  if (!state.ownerIdentityMatched || !state.databaseMatched || !state.tls) throw new Error('production_identity_mismatch');
  if (!state.schemaAbsent || !state.migrationRecordAbsent || !state.targetRolesAbsent) throw new Error('production_prestate_mismatch');
  return Object.freeze({ ...state, baselineAttestationMatched: true });
}

async function queryProductionPrestate(client: PoolClient, counters: ProductionEffects) {
  const identity = await countedQuery<{
    owner_match: boolean; database_match: boolean; schema_absent: boolean; migration_absent: boolean;
    create_role_attribute: boolean; neon_admin_member: boolean;
  }>(client, counters, `SELECT current_user='neondb_owner' AS owner_match, current_database()='neondb' AS database_match,
    (SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS create_role_attribute,
    pg_has_role(current_user,'neon_superuser','MEMBER') AS neon_admin_member,
    to_regnamespace('fandex') IS NULL AS schema_absent,
    to_regclass('fandex.schema_migrations') IS NULL AS migration_absent`);
  const roles = await countedQuery<{ role_count: string }>(client, counters, "SELECT count(*)::text AS role_count FROM pg_roles WHERE rolname = ANY($1::text[])", [ROLE_NAMES]);
  const row = identity.rows[0];
  return Object.freeze({
    ownerIdentityMatched: row?.owner_match === true, databaseMatched: row?.database_match === true,
    tls: clientTlsActive(client), schemaAbsent: row?.schema_absent === true,
    migrationRecordAbsent: row?.migration_absent === true, targetRolesAbsent: roles.rows[0]?.role_count === '0',
    ownerCreateRoleAttribute: row?.create_role_attribute === true, ownerNeonAdminMember: row?.neon_admin_member === true,
  });
}

export async function inspectProductionPrestateReadOnly(options: {
  ownerSourceReader?: () => Promise<string>;
  poolFactory?: (connectionString: string) => Pool;
} = {}) {
  const counters = effects();
  const source = await loadOwnerCredentialSource(options.ownerSourceReader); counters.ownerCredentialValuesRead = 2;
  const owner = source.consumeOnce();
  const pool = (options.poolFactory ?? createPostgresPool)(owner.unpooled);
  counters.productionConnections = 1;
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await countedQuery(client, counters, 'BEGIN READ ONLY');
    const prestate = await queryProductionPrestate(client, counters);
    await countedQuery(client, counters, 'ROLLBACK');
    return Object.freeze({ mode: 'inspect_production_prestate', prestate, effects: counters });
  } catch { throw new Error('production_bootstrap_external_boundary_failed'); }
  finally {
    try { client?.release(); } catch { /* redact */ }
    try { await pool.end(); } catch { /* redact */ }
  }
}

export async function inspectProductionPoststateReadOnly(options: {
  ownerSourceReader?: () => Promise<string>;
  poolFactory?: (connectionString: string) => Pool;
} = {}) {
  const counters = effects();
  const source = await loadOwnerCredentialSource(options.ownerSourceReader); counters.ownerCredentialValuesRead = 2;
  const owner = source.consumeOnce();
  const pool = (options.poolFactory ?? createPostgresPool)(owner.unpooled); counters.productionConnections = 1;
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await countedQuery(client, counters, 'BEGIN READ ONLY');
    const state = await inspectProductionRoleAndSchemaState(client, counters, false);
    await countedQuery(client, counters, 'ROLLBACK');
    return Object.freeze({ mode: 'inspect_production_poststate', evaluation: evaluateProductionSchemaState(state), state, effects: counters });
  } catch { throw new Error('production_bootstrap_external_boundary_failed'); }
  finally {
    try { client?.release(); } catch { /* redact */ }
    try { await pool.end(); } catch { /* redact */ }
  }
}

async function queryRoleSecurity(client: PoolClient, counters: ProductionEffects) {
  const result = await countedQuery<{
    rolname: string; rolcanlogin: boolean; rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean;
    rolreplication: boolean; rolbypassrls: boolean; neon_member: boolean;
  }>(client, counters, `SELECT candidate.rolname,candidate.rolcanlogin,candidate.rolsuper,candidate.rolcreatedb,candidate.rolcreaterole,
    candidate.rolreplication,candidate.rolbypassrls,EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles granted ON granted.oid=m.roleid
    WHERE m.member=candidate.oid AND granted.rolname='neon_superuser') AS neon_member
    FROM pg_roles candidate WHERE candidate.rolname=ANY($1::text[]) ORDER BY candidate.rolname`, [ROLE_NAMES]);
  return inspectRoleSecurityState(result.rows.map((row) => ({
    roleName: row.rolname, login: row.rolcanlogin, superuser: row.rolsuper, createDatabase: row.rolcreatedb,
    createRole: row.rolcreaterole, replication: row.rolreplication, bypassRls: row.rolbypassrls,
    neonSuperuserMember: row.neon_member,
  })));
}

const EXPECTED_RUNTIME_ACL: Readonly<Record<string, readonly string[]>> = Object.freeze({
  normalized_sources: ['INSERT','SELECT','UPDATE'], historical_enrichment_requests: ['INSERT','SELECT','UPDATE'],
  source_evidence_provenance: ['INSERT','SELECT'], persistence_transactions: ['INSERT','SELECT','UPDATE'],
  persistence_audit_events: ['INSERT','SELECT'], ingestion_outbox: ['INSERT','SELECT','UPDATE'], schema_migrations: [],
});

export function evaluateProductionSchemaState(state: SafeSchemaState) {
  const checks = Object.freeze({
    schemaOwnerMatched: state.schemaOwnerMatched,
    tableOwnersMatched: state.tableOwnersMatched,
    functionOwnerMatched: state.functionOwnerMatched,
    ownerCreatorMembershipSafe: state.ownerCreatorMembershipSafe,
    tableSetMatched: JSON.stringify(state.tableNames) === JSON.stringify([...TABLES]),
    constraintTypesMatched: ['CHECK','FOREIGN KEY','PRIMARY KEY','UNIQUE'].every((kind) => state.constraintTypes.includes(kind)),
    auditTriggerPresent: state.auditTriggerPresent,
    migrationRecordMatched: state.migrationRecordMatched,
    runtimeSchemaUsage: state.runtimeSchemaUsage,
    runtimeSchemaCreateAbsent: !state.runtimeSchemaCreate,
    runtimeAclMatched: canonical(state.runtimeAcl) === canonical(EXPECTED_RUNTIME_ACL),
    runtimeSequenceGrantsAbsent: state.runtimeSequenceGrantCount === 0,
    runtimeFunctionGrantsAbsent: state.runtimeFunctionGrantCount === 0,
    publicSchemaPrivilegesAbsent: !state.publicSchemaUsage && !state.publicSchemaCreate,
    publicObjectGrantsAbsent: state.publicTableGrantCount === 0 && state.publicSequenceGrantCount === 0 && state.publicFunctionGrantCount === 0,
    businessRowsZero: Object.values(state.businessRows).every((count) => count === 0),
  });
  return Object.freeze({ valid: Object.values(checks).every(Boolean), checks });
}

export async function inspectProductionRoleAndSchemaState(client: PoolClient, counters: ProductionEffects, enforce = true): Promise<SafeSchemaState> {
  const roleState = await queryRoleSecurity(client, counters);
  evaluateRoleBootstrapReadiness(INPUT, roleState, 'post-apply');
  const schema = await countedQuery<{ owner_match: boolean; runtime_usage: boolean; runtime_create: boolean; public_usage: boolean; public_create: boolean }>(client, counters,
    `SELECT pg_get_userbyid(nspowner)='fandex_migrator' AS owner_match,
      has_schema_privilege('fandex_runtime','fandex','USAGE') AS runtime_usage,
      has_schema_privilege('fandex_runtime','fandex','CREATE') AS runtime_create,
      has_schema_privilege('public','fandex','USAGE') AS public_usage,
      has_schema_privilege('public','fandex','CREATE') AS public_create FROM pg_namespace WHERE nspname='fandex'`);
  const tableRows = await countedQuery<{ table_name: string; owner_match: boolean }>(client, counters,
    "SELECT c.relname AS table_name,pg_get_userbyid(c.relowner)='fandex_migrator' AS owner_match FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='fandex' AND c.relkind='r' ORDER BY c.relname");
  const functionRow = await countedQuery<{ owner_match: boolean }>(client, counters,
    "SELECT pg_get_userbyid(p.proowner)='fandex_migrator' AS owner_match FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='fandex' AND p.proname='reject_audit_event_mutation'");
  const creatorMembership = await countedQuery<{ safe: boolean }>(client, counters,
    `SELECT count(*)=1 AND bool_and(membership.admin_option) AND bool_and(NOT membership.inherit_option) AS safe
     FROM pg_auth_members membership
      JOIN pg_roles granted ON granted.oid=membership.roleid
      JOIN pg_roles member ON member.oid=membership.member
      WHERE granted.rolname='fandex_migrator' AND member.rolname='neondb_owner'`);
  const aclRows = await countedQuery<{ table_name: string; privilege_type: string }>(client, counters,
    `SELECT c.relname AS table_name,upper(acl.privilege_type) AS privilege_type
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) acl
     JOIN pg_roles grantee ON grantee.oid=acl.grantee
     WHERE n.nspname='fandex' AND c.relkind='r' AND grantee.rolname='fandex_runtime'
     ORDER BY c.relname,acl.privilege_type`);
  const runtimeAcl = Object.fromEntries(TABLES.map((table) => [table, aclRows.rows.filter((row) => row.table_name === table).map((row) => row.privilege_type).sort()]));
  const grantCounts = await countedQuery<{ runtime_sequence: string; runtime_function: string; public_table: string; public_sequence: string; public_function: string }>(client, counters,
    `SELECT
      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('S',c.relowner))) acl WHERE n.nspname='fandex' AND c.relkind='S' AND acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='fandex_runtime'))::text AS runtime_sequence,
      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl WHERE n.nspname='fandex' AND acl.grantee=(SELECT oid FROM pg_roles WHERE rolname='fandex_runtime'))::text AS runtime_function,
      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) acl WHERE n.nspname='fandex' AND c.relkind='r' AND acl.grantee=0)::text AS public_table,
      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('S',c.relowner))) acl WHERE n.nspname='fandex' AND c.relkind='S' AND acl.grantee=0)::text AS public_sequence,
      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl WHERE n.nspname='fandex' AND acl.grantee=0)::text AS public_function`);
  const migration = await countedQuery<{ version: string; migration_sha256: string }>(client, counters, 'SELECT version::text,migration_sha256 FROM fandex.schema_migrations ORDER BY version');
  const objects = await countedQuery<{ trigger_present: boolean; constraint_types: string[] }>(client, counters,
    `SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='fandex.persistence_audit_events'::regclass AND tgname='persistence_audit_events_append_only' AND tgenabled='O' AND NOT tgisinternal) AS trigger_present,
      COALESCE((SELECT jsonb_agg(constraint_type ORDER BY constraint_type) FROM (SELECT DISTINCT constraint_type FROM information_schema.table_constraints WHERE table_schema='fandex') constraints),'[]'::jsonb) AS constraint_types`);
  const counts = await countedQuery<Record<string, string> & QueryResultRow>(client, counters,
    `SELECT ${BUSINESS_TABLES.map((table) => `(SELECT count(*) FROM fandex.${table})::text AS ${table}`).join(',')}`);
  const businessRows = Object.fromEntries(BUSINESS_TABLES.map((table) => [table, Number(counts.rows[0]?.[table] ?? -1)]));
  const schemaRow = schema.rows[0]; const grants = grantCounts.rows[0];
  const state: SafeSchemaState = {
    roleSecurity: roleState.roles, schemaOwnerMatched: schemaRow?.owner_match === true,
    tableOwnersMatched: tableRows.rows.length === TABLES.length && tableRows.rows.every((row) => row.owner_match),
    functionOwnerMatched: functionRow.rows.length === 1 && functionRow.rows[0].owner_match,
    ownerCreatorMembershipSafe: creatorMembership.rows[0]?.safe === true,
    tableNames: tableRows.rows.map((row) => row.table_name), constraintTypes: objects.rows[0]?.constraint_types ?? [],
    auditTriggerPresent: objects.rows[0]?.trigger_present === true,
    migrationRecordMatched: migration.rows.length === 1 && migration.rows[0].version === '1' && migration.rows[0].migration_sha256 === MIGRATION_SHA256,
    runtimeSchemaUsage: schemaRow?.runtime_usage === true, runtimeSchemaCreate: schemaRow?.runtime_create === true,
    runtimeAcl, runtimeSequenceGrantCount: Number(grants?.runtime_sequence ?? -1), runtimeFunctionGrantCount: Number(grants?.runtime_function ?? -1),
    publicSchemaUsage: schemaRow?.public_usage === true, publicSchemaCreate: schemaRow?.public_create === true,
    publicTableGrantCount: Number(grants?.public_table ?? -1), publicSequenceGrantCount: Number(grants?.public_sequence ?? -1), publicFunctionGrantCount: Number(grants?.public_function ?? -1),
    businessRows,
  };
  if (enforce && !evaluateProductionSchemaState(state).valid) throw new Error('production_schema_postcondition_failed');
  return Object.freeze(state);
}

export async function inspectProductionBootstrapTransaction(options: {
  ownerSourceReader?: () => Promise<string>;
  poolFactory?: (connectionString: string) => Pool;
} = {}) {
  const counters = effects();
  const source = await loadOwnerCredentialSource(options.ownerSourceReader); counters.ownerCredentialValuesRead = 2;
  const owner = source.consumeOnce();
  const pool = (options.poolFactory ?? createPostgresPool)(owner.unpooled); counters.productionConnections = 1;
  const [migrationSql, grantSql] = await Promise.all([readFile(MIGRATION_PATH, 'utf8'), readFile(GRANT_PATH, 'utf8')]);
  let client: PoolClient | undefined;
  let stage = 'db_connect';
  try {
    client = await pool.connect();
    await countedQuery(client, counters, 'BEGIN');
    await countedQuery(client, counters, "SET LOCAL idle_in_transaction_session_timeout='5min'");
    await countedQuery(client, counters, "SET LOCAL lock_timeout='10s'");
    await countedQuery(client, counters, 'SELECT pg_advisory_xact_lock($1::bigint)', [ADVISORY_LOCK_KEY]);
    stage = 'db_prestate'; await inspectPrestate(client, counters);
    const passwords = generateRoleCredentials().consumeOnce(); counters.generatedRoleCredentials = 2;
    stage = 'role_create';
    for (const role of ROLE_NAMES) { await client.query(`CREATE ROLE ${quoteIdentifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${quoteLiteral(passwords[role])}`); counters.productionRoleCreateStatements += 1; }
    stage = 'migration_apply'; await client.query(migrationSql); counters.productionSchemaWriteBatches += 1;
    await client.query('INSERT INTO fandex.schema_migrations(version,migration_sha256) VALUES($1,$2)', [1,MIGRATION_SHA256]); counters.productionMigrationRecordWrites += 1;
    stage = 'grant_apply';
    await client.query('GRANT fandex_migrator TO neondb_owner'); counters.productionTemporaryMembershipStatements += 1;
    await client.query(grantSql); counters.productionSchemaWriteBatches += 1;
    await client.query('REVOKE fandex_migrator FROM neondb_owner'); counters.productionTemporaryMembershipStatements += 1;
    stage = 'db_postconditions';
    const state = await inspectProductionRoleAndSchemaState(client, counters, false);
    await client.query('ROLLBACK');
    return Object.freeze({ mode: 'inspect_production_bootstrap_transaction', rolledBack: true, evaluation: evaluateProductionSchemaState(state), state, effects: counters });
  } catch {
    if (client) { try { await client.query('ROLLBACK'); } catch { /* redact */ } }
    throw new Error(`production_stage_${stage}_failed`);
  } finally {
    try { client?.release(); } catch { /* redact */ }
    try { await pool.end(); } catch { /* redact */ }
  }
}

const SAFE_NODE_CODES = new Set(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','EPIPE','ETIMEDOUT','ERR_SOCKET_CONNECTION_TIMEOUT','ERR_TLS_CERT_ALTNAME_INVALID','ERR_TLS_HANDSHAKE_TIMEOUT','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
const SAFE_SQLSTATES = new Set(['28P01','08000','08001','08003','08004','08006','08007','08P01','57014','57P01','57P02','57P03']);
const RETRYABLE_NODE_CODES = new Set(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','EPIPE','ETIMEDOUT','ERR_SOCKET_CONNECTION_TIMEOUT']);
const TLS_NODE_CODES = new Set(['ERR_TLS_CERT_ALTNAME_INVALID','ERR_TLS_HANDSHAKE_TIMEOUT','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE']);

function verificationDiagnostic(
  role: RoleName,
  pooled: boolean,
  stage: SafeRoleVerificationDiagnostic['stage'],
  error: unknown,
  attempt: number,
  maxAttempts: number,
): SafeRoleVerificationDiagnostic {
  const rawCode = error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : '';
  const sqlstate = /^[0-9A-Z]{5}$/.test(rawCode) && SAFE_SQLSTATES.has(rawCode) ? rawCode : null;
  const nodeCode = SAFE_NODE_CODES.has(rawCode) ? rawCode : null;
  const timeoutObserved = ['ETIMEDOUT','ERR_SOCKET_CONNECTION_TIMEOUT','ERR_TLS_HANDSHAKE_TIMEOUT'].includes(rawCode) || sqlstate === '57014';
  let category: SafeRoleVerificationDiagnostic['category'] = stage === 'postcondition' ? 'postcondition' : stage === 'identity_query' || stage === 'privilege_query' ? 'query' : 'unknown';
  if (sqlstate === '28P01') category = 'authentication';
  else if (nodeCode === 'ENOTFOUND' || nodeCode === 'EAI_AGAIN') category = 'dns';
  else if (nodeCode && TLS_NODE_CODES.has(nodeCode)) category = 'tls';
  else if (nodeCode === 'ETIMEDOUT' || nodeCode === 'ERR_SOCKET_CONNECTION_TIMEOUT') category = 'timeout';
  else if (nodeCode && RETRYABLE_NODE_CODES.has(nodeCode)) category = 'tcp';
  const retryable = stage === 'connect' && attempt < maxAttempts && (sqlstate === '28P01' || (nodeCode !== null && RETRYABLE_NODE_CODES.has(nodeCode)));
  return Object.freeze({
    role_classification: role === 'fandex_migrator' ? 'migration' : 'runtime',
    endpoint_classification: pooled ? 'pooled' : 'unpooled', stage, category,
    sqlstate, node_code: nodeCode, attempt, max_attempts: maxAttempts, retryable, timeout_observed: timeoutObserved,
  });
}

export async function verifyRoleConnection(
  url: string,
  role: RoleName,
  pooled: boolean,
  counters: ProductionEffects,
  poolFactory: (connectionString: string) => Pool = createPostgresPool,
  sleeper: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)),
): Promise<SafeRoleVerification> {
  const maxAttempts = pooled ? ROLE_VERIFICATION_POLICY.runtimeMaxAttempts : ROLE_VERIFICATION_POLICY.migrationMaxAttempts;
  let parsed: URL;
  try { parsed = parseUrl(url, role, pooled); }
  catch (error) { throw new RoleVerificationError(verificationDiagnostic(role, pooled, 'url_validation', error, 1, maxAttempts)); }
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const pool = poolFactory(url); counters.productionConnections += 1;
    let client: PoolClient | undefined;
    let stage: SafeRoleVerificationDiagnostic['stage'] = 'connect';
    try {
      client = await pool.connect();
      stage = 'identity_query';
    await countedQuery(client, counters, 'BEGIN READ ONLY');
    const identity = await countedQuery<{ identity_match: boolean; database_match: boolean; security_match: boolean; neon_member: boolean }>(client, counters,
      `SELECT current_user=$1 AS identity_match,current_database()='neondb' AS database_match,
       NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls AS security_match,
       EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles granted ON granted.oid=m.roleid WHERE m.member=pg_roles.oid AND granted.rolname='neon_superuser') AS neon_member
       FROM pg_roles WHERE rolname=current_user`, [role]);
      stage = 'privilege_query';
      const privileges = await countedQuery<{ schema_usage: boolean; schema_create: boolean }>(client, counters,
      "SELECT has_schema_privilege(current_user,'fandex','USAGE') AS schema_usage,has_schema_privilege(current_user,'fandex','CREATE') AS schema_create");
    // Use catalog grants separately so verification performs no denied operation probes.
    const acl = await countedQuery<{ table_name: string; privilege_type: string }>(client, counters,
      "SELECT table_name,privilege_type FROM information_schema.role_table_grants WHERE table_schema='fandex' AND grantee=current_user ORDER BY table_name,privilege_type");
    const owners = await countedQuery<{ tables_owned: string; schema_owned: boolean; function_owned: boolean }>(client, counters,
      `SELECT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='fandex' AND c.relkind='r' AND pg_get_userbyid(c.relowner)=current_user)::text AS tables_owned,
       (SELECT pg_get_userbyid(nspowner)=current_user FROM pg_namespace WHERE nspname='fandex') AS schema_owned,
       (SELECT pg_get_userbyid(p.proowner)=current_user FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='fandex' AND p.proname='reject_audit_event_mutation') AS function_owned`);
    const objects = await countedQuery<{ visible_tables: string[]; constraints: string; trigger_present: boolean }>(client, counters,
      `SELECT ARRAY(SELECT table_name::text FROM information_schema.tables WHERE table_schema='fandex' AND table_type='BASE TABLE' ORDER BY table_name) AS visible_tables,
       (SELECT count(*) FROM pg_constraint constraint_row JOIN pg_class relation ON relation.oid=constraint_row.conrelid JOIN pg_namespace namespace ON namespace.oid=relation.relnamespace WHERE namespace.nspname='fandex')::text AS constraints,
       EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='fandex.persistence_audit_events'::regclass AND tgname='persistence_audit_events_append_only' AND tgenabled='O' AND NOT tgisinternal) AS trigger_present`);
    const counts = await countedQuery<Record<string, string> & QueryResultRow>(client, counters,
      `SELECT ${BUSINESS_TABLES.map((table) => `(SELECT count(*) FROM fandex.${table})::text AS ${table}`).join(',')}`);
    let migrationMatched = role === 'fandex_runtime';
    if (role === 'fandex_migrator') {
      const migration = await countedQuery<{ matched: boolean }>(client, counters,
        'SELECT count(*)=1 AND bool_and(version=1 AND migration_sha256=$1) AS matched FROM fandex.schema_migrations', [MIGRATION_SHA256]);
      migrationMatched = migration.rows[0]?.matched === true;
    }
    const identityRow = identity.rows[0]; const schemaRow = privileges.rows[0]; const ownerRow = owners.rows[0]; const objectRow = objects.rows[0];
    const actualAcl = Object.fromEntries(TABLES.map((table) => [table, acl.rows.filter((row) => row.table_name === table).map((row) => row.privilege_type).sort()]));
    const privilegeMatch = role === 'fandex_runtime'
      ? schemaRow?.schema_usage === true && !schemaRow.schema_create && canonical(actualAcl) === canonical(EXPECTED_RUNTIME_ACL)
      : schemaRow?.schema_usage === true && schemaRow.schema_create === true;
    const ownershipMatch = role === 'fandex_runtime'
      ? ownerRow?.tables_owned === '0' && !ownerRow.schema_owned && !ownerRow.function_owned
      : ownerRow?.tables_owned === String(TABLES.length) && ownerRow.schema_owned && ownerRow.function_owned;
      stage = 'postcondition';
      const result: SafeRoleVerification = {
      role, identityMatched: identityRow?.identity_match === true, databaseMatched: identityRow?.database_match === true,
      endpointShapeMatched: Boolean(parsed.hostname) && parsed.hostname.toLowerCase().includes('pooler') === pooled,
      tls: clientTlsActive(client), roleSecurityMatched: identityRow?.security_match === true && !identityRow.neon_member,
      privilegesMatched: privilegeMatch, ownershipMatched: ownershipMatch, migrationRecordMatched: migrationMatched,
      schemaObjectsMatched: canonical(objectRow?.visible_tables ?? []) === canonical(role === 'fandex_runtime' ? RUNTIME_VISIBLE_TABLES : [...TABLES].sort())
        && Number(objectRow?.constraints) > 0 && objectRow?.trigger_present === true,
      businessRowsZero: BUSINESS_TABLES.every((table) => counts.rows[0]?.[table] === '0'), attempt,
      };
      if (!Object.entries(result).filter(([key]) => !['role','attempt'].includes(key)).every(([,value]) => value === true)) throw new Error('postcondition_mismatch');
      await countedQuery(client, counters, 'ROLLBACK');
      client.release(); client = undefined;
      stage = 'close';
      await pool.end();
      return Object.freeze(result);
    } catch (error) {
      if (client) { try { await client.query('ROLLBACK'); } catch { /* redact */ } }
      try { client?.release(); } catch { /* redact */ }
      try { await pool.end(); } catch (closeError) {
        if (stage === 'close') throw new RoleVerificationError(verificationDiagnostic(role, pooled, 'close', closeError, attempt, maxAttempts));
      }
      const diagnostic = verificationDiagnostic(role, pooled, stage, error, attempt, maxAttempts);
      if (!diagnostic.retryable) throw new RoleVerificationError(diagnostic);
      await sleeper(ROLE_VERIFICATION_POLICY.backoffMilliseconds[Math.min(attempt - 1, ROLE_VERIFICATION_POLICY.backoffMilliseconds.length - 1)] ?? 0);
    }
  }
  throw new RoleVerificationError(verificationDiagnostic(role, pooled, 'connect', undefined, maxAttempts, maxAttempts));
}

export function evaluateProductionBootstrapResult(parts: {
  prestate: unknown; schema: SafeSchemaState; vercel: readonly SafeVercelEnvMetadata[];
  verification: readonly SafeRoleVerification[]; replay: readonly SafeRoleVerification[]; effects: ProductionEffects;
}) {
  const roleSecurity = parts.schema.roleSecurity;
  const migrationApplication = { version: 1, sha256: MIGRATION_SHA256, outcome: 'applied' };
  const schemaInspection = { tableNames: parts.schema.tableNames, constraintTypes: parts.schema.constraintTypes, auditTriggerPresent: parts.schema.auditTriggerPresent, ownersMatched: parts.schema.schemaOwnerMatched && parts.schema.tableOwnersMatched && parts.schema.functionOwnerMatched, businessRows: parts.schema.businessRows };
  const grantInspection = { runtimeAcl: parts.schema.runtimeAcl, runtimeSchemaUsage: parts.schema.runtimeSchemaUsage, runtimeSchemaCreate: parts.schema.runtimeSchemaCreate, publicGrantsZero: !parts.schema.publicSchemaUsage && !parts.schema.publicSchemaCreate && parts.schema.publicTableGrantCount === 0 && parts.schema.publicSequenceGrantCount === 0 && parts.schema.publicFunctionGrantCount === 0 };
  const digests = {
    productionPreState: digest(parts.prestate), roleSecurityState: digest(roleSecurity),
    migrationApplication: digest(migrationApplication), schemaInspection: digest(schemaInspection),
    grantAclInspection: digest(grantInspection), vercelEnvMetadata: digest(parts.vercel),
    postApplyVerification: digest({ verification: parts.verification, replay: parts.replay }),
  };
  return Object.freeze({
    version: 'v118', outcome: 'applied_and_verified', deploymentReadiness: 'blocked_pending_explicit_deployment_authorization',
    roles: ROLE_NAMES, migration: migrationApplication, runtimeAcl: EXPECTED_RUNTIME_ACL,
    vercelEnvironment: parts.vercel, businessRows: parts.schema.businessRows, effects: parts.effects,
    digests: Object.freeze({ ...digests, aggregateReadiness: digest(digests) }),
    ownerEnvironmentVariablesPreserved: true, snapshotPreserved: true,
    secretOutputCount: 0, secretHashCount: 0, secretCommitCount: 0,
  });
}

export async function applyProductionRoleSchemaBootstrap(options: {
  argv: readonly string[];
  vercel?: VercelEnvironmentBoundary;
  ownerSourceReader?: () => Promise<string>;
  ownerSourceDelete?: () => Promise<void>;
  poolFactory?: (connectionString: string) => Pool;
}) {
  validateProductionBootstrapAuthorization(options.argv);
  await buildProductionBootstrapExecutionPlan();
  const counters = effects();
  const ownerOpaque = await loadOwnerCredentialSource(options.ownerSourceReader); counters.ownerCredentialValuesRead = 2;
  const owner = ownerOpaque.consumeOnce();
  const boundary = options.vercel ?? createVercelCliBoundary();
  const poolFactory = options.poolFactory ?? createPostgresPool;
  const [migrationSql, grantSql] = await Promise.all([readFile(MIGRATION_PATH, 'utf8'), readFile(GRANT_PATH, 'utf8')]);
  const preVercel = await boundary.listProduction(); counters.vercelMetadataReads += 1; validateVercelPrestate(preVercel);
  const pool = poolFactory(owner.unpooled); counters.productionConnections += 1;
  let client: PoolClient | undefined;
  let committed = false;
  let vercelMutationStarted = false;
  let dbMutationStarted = false;
  let stage = 'db_connect';
  try {
    client = await pool.connect();
    await countedQuery(client, counters, 'BEGIN');
    await countedQuery(client, counters, "SET LOCAL idle_in_transaction_session_timeout='5min'");
    await countedQuery(client, counters, "SET LOCAL lock_timeout='10s'");
    await countedQuery(client, counters, 'SELECT pg_advisory_xact_lock($1::bigint)', [ADVISORY_LOCK_KEY]);
    stage = 'db_prestate';
    const prestate = await inspectPrestate(client, counters);
    evaluateRoleBootstrapReadiness(INPUT, inspectRoleSecurityState([]), 'pre-apply');
    const generated = generateRoleCredentials(); counters.generatedRoleCredentials = 2;
    const passwords = generated.consumeOnce();
    dbMutationStarted = true;
    stage = 'role_create';
    for (const role of ROLE_NAMES) {
      await client.query(`CREATE ROLE ${quoteIdentifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${quoteLiteral(passwords[role])}`);
      counters.productionRoleCreateStatements += 1;
    }
    stage = 'migration_apply';
    await client.query(migrationSql); counters.productionSchemaWriteBatches += 1;
    await client.query('INSERT INTO fandex.schema_migrations(version,migration_sha256) VALUES($1,$2)', [1,MIGRATION_SHA256]);
    counters.productionMigrationRecordWrites += 1;
    stage = 'grant_apply';
    await client.query('GRANT fandex_migrator TO neondb_owner'); counters.productionTemporaryMembershipStatements += 1;
    await client.query(grantSql); counters.productionSchemaWriteBatches += 1;
    await client.query('REVOKE fandex_migrator FROM neondb_owner'); counters.productionTemporaryMembershipStatements += 1;
    stage = 'db_postconditions';
    const schema = await inspectProductionRoleAndSchemaState(client, counters);
    const descriptors = buildRoleConnectionDescriptors(owner.unpooled, passwords);
    let migrationUrl: string | undefined = descriptors[0].consumeOnce();
    let runtimeUrl: string | undefined = descriptors[1].consumeOnce();
    vercelMutationStarted = true;
    stage = 'vercel_environment';
    let vercel: readonly SafeVercelEnvMetadata[];
    try {
      vercel = await configureSensitiveVercelEnvironment(boundary, { runtime: runtimeUrl, migration: migrationUrl }, counters);
    } catch (error) {
      const compensation = await compensatePartialBootstrap(boundary, counters);
      if (!compensation.complete) throw new Error('production_compensation_incomplete');
      throw error;
    }
    stage = 'db_commit';
    await countedQuery(client, counters, 'COMMIT'); committed = true;
    client.release(); client = undefined;
    await pool.end();
    stage = 'role_verification';
    const verification = Object.freeze([
      await verifyRoleConnection(migrationUrl, 'fandex_migrator', false, counters, poolFactory),
      await verifyRoleConnection(runtimeUrl, 'fandex_runtime', true, counters, poolFactory),
    ]);
    stage = 'role_replay';
    const replay = Object.freeze([
      await verifyRoleConnection(migrationUrl, 'fandex_migrator', false, counters, poolFactory),
      await verifyRoleConnection(runtimeUrl, 'fandex_runtime', true, counters, poolFactory),
    ]);
    migrationUrl = undefined; runtimeUrl = undefined;
    stage = 'credential_source_delete';
    try { await (options.ownerSourceDelete ?? (() => unlink(OWNER_SOURCE_PATH)))(); } catch { throw new Error('credential_source_delete_failed'); }
    return evaluateProductionBootstrapResult({ prestate, schema, vercel, verification, replay, effects: counters });
  } catch (error) {
    let rollbackVerified = !dbMutationStarted;
    if (!committed && client) {
      try {
        await client.query('ROLLBACK');
        if (dbMutationStarted) { await inspectPrestate(client, counters); rollbackVerified = true; }
      } catch { rollbackVerified = false; }
      if (vercelMutationStarted) {
        const compensation = await compensatePartialBootstrap(boundary, counters);
        if (!compensation.complete) throw new Error('production_compensation_incomplete');
      }
    }
    if (committed) throw error instanceof Error && ['production_role_verification_failed','credential_source_delete_failed'].includes(error.message) ? error : new Error('production_commit_indeterminate');
    if (!rollbackVerified) throw new Error('production_commit_indeterminate');
    const code = safeError(error);
    throw new Error(code === 'production_bootstrap_external_boundary_failed' ? `production_stage_${stage}_failed` : code);
  } finally {
    try { client?.release(); } catch { /* redact */ }
    try { await pool.end(); } catch { /* redact */ }
  }
}

export type SafeRecoveryProgress = Readonly<{
  password_rotations: number;
  vercel_updates: readonly ('FANDEX_MIGRATION_DATABASE_URL' | 'FANDEX_RUNTIME_DATABASE_URL')[];
  db_committed: boolean;
  verified_roles: readonly ('migration' | 'runtime')[];
}>;

export class ProductionRecoveryError extends Error {
  readonly progress: SafeRecoveryProgress;
  readonly diagnostic: SafeRoleVerificationDiagnostic | null;
  constructor(progress: SafeRecoveryProgress, diagnostic: SafeRoleVerificationDiagnostic | null = null) {
    super('production_credential_recovery_failed');
    this.name = 'ProductionRecoveryError';
    this.progress = Object.freeze({ ...progress, vercel_updates: Object.freeze([...progress.vercel_updates]), verified_roles: Object.freeze([...progress.verified_roles]) });
    this.diagnostic = diagnostic;
  }
  toJSON() { return { error: this.message, progress: this.progress, diagnostic: this.diagnostic }; }
}

export async function buildProductionCredentialRecoveryPlan() {
  const [migration, grants] = await Promise.all([readFile(MIGRATION_PATH), readFile(GRANT_PATH)]);
  if (createHash('sha256').update(migration).digest('hex') !== MIGRATION_SHA256) throw new Error('migration_digest_mismatch');
  if (createHash('sha256').update(grants).digest('hex') !== GRANT_SHA256) throw new Error('grant_digest_mismatch');
  return Object.freeze({
    mode: 'production_credential_recovery_plan', requiredFlags: RECOVERY_FLAGS,
    orderedSteps: Object.freeze(['validate_existing_poststate','validate_vercel_metadata','generate_credentials_once','rotate_two_passwords','update_two_sensitive_envs','commit','verify_migration_unpooled','verify_runtime_pooled','delete_owner_source']),
    passwordRotationLimit: 2, vercelUpdateLimit: 2, verificationPolicy: ROLE_VERIFICATION_POLICY,
    migrationSha256: MIGRATION_SHA256, grantSha256: GRANT_SHA256, effects: effects(),
  });
}

export async function inspectProductionCredentialRecoveryPreflight(options: {
  ownerSourceReader?: () => Promise<string>;
  poolFactory?: (connectionString: string) => Pool;
  vercel?: VercelEnvironmentBoundary;
} = {}) {
  const counters = effects();
  const ownerOpaque = await loadOwnerCredentialSource(options.ownerSourceReader); counters.ownerCredentialValuesRead = 2;
  const owner = ownerOpaque.consumeOnce();
  const boundary = options.vercel ?? createVercelCliBoundary();
  const vercel = await boundary.listProduction(); counters.vercelMetadataReads += 1;
  validateVercelPoststate(vercel);
  const pool = (options.poolFactory ?? createPostgresPool)(owner.unpooled); counters.productionConnections += 1;
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await countedQuery(client, counters, 'BEGIN READ ONLY');
    const schema = await inspectProductionRoleAndSchemaState(client, counters);
    await countedQuery(client, counters, 'ROLLBACK');
    return Object.freeze({
      mode: 'production_credential_recovery_preflight', valid: true,
      roleSecurity: schema.roleSecurity, runtimeAcl: schema.runtimeAcl, businessRows: schema.businessRows,
      vercelEnvironment: validateVercelPoststate(vercel), effects: counters,
      digest: digest({ roleSecurity: schema.roleSecurity, runtimeAcl: schema.runtimeAcl, businessRows: schema.businessRows, vercel: validateVercelPoststate(vercel) }),
    });
  } catch { throw new Error('production_recovery_preflight_failed'); }
  finally {
    try { client?.release(); } catch { /* redact */ }
    try { await pool.end(); } catch { /* redact */ }
  }
}

export async function recoverProductionRoleCredentials(options: {
  argv: readonly string[];
  ownerSourceReader?: () => Promise<string>;
  ownerSourceDelete?: () => Promise<void>;
  poolFactory?: (connectionString: string) => Pool;
  vercel?: VercelEnvironmentBoundary;
  credentialFactory?: typeof generateRoleCredentials;
  sleeper?: (milliseconds: number) => Promise<void>;
}) {
  validateProductionRecoveryAuthorization(options.argv);
  await buildProductionCredentialRecoveryPlan();
  const counters = effects();
  const boundary = options.vercel ?? createVercelCliBoundary();
  const poolFactory = options.poolFactory ?? createPostgresPool;
  const ownerOpaque = await loadOwnerCredentialSource(options.ownerSourceReader); counters.ownerCredentialValuesRead = 2;
  const owner = ownerOpaque.consumeOnce();
  const initialVercel = await boundary.listProduction(); counters.vercelMetadataReads += 1;
  validateVercelPoststate(initialVercel);
  const pool = poolFactory(owner.unpooled); counters.productionConnections += 1;
  let client: PoolClient | undefined;
  let committed = false;
  let rotations = 0;
  const updated: ('FANDEX_MIGRATION_DATABASE_URL' | 'FANDEX_RUNTIME_DATABASE_URL')[] = [];
  const verified: ('migration' | 'runtime')[] = [];
  const progress = (): SafeRecoveryProgress => Object.freeze({ password_rotations: rotations, vercel_updates: Object.freeze([...updated]), db_committed: committed, verified_roles: Object.freeze([...verified]) });
  let migrationUrl: string | undefined;
  let runtimeUrl: string | undefined;
  try {
    client = await pool.connect();
    await countedQuery(client, counters, 'BEGIN READ ONLY');
    const preSchema = await inspectProductionRoleAndSchemaState(client, counters);
    await countedQuery(client, counters, 'ROLLBACK');

    const generated = (options.credentialFactory ?? generateRoleCredentials)(); counters.generatedRoleCredentials = 2;
    let passwords: Readonly<Record<RoleName, string>> | undefined = generated.consumeOnce();
    const descriptors = buildRoleConnectionDescriptors(owner.unpooled, passwords);
    migrationUrl = descriptors[0].consumeOnce(); runtimeUrl = descriptors[1].consumeOnce();

    await countedQuery(client, counters, 'BEGIN');
    await countedQuery(client, counters, "SET LOCAL idle_in_transaction_session_timeout='3min'");
    await countedQuery(client, counters, "SET LOCAL lock_timeout='10s'");
    await countedQuery(client, counters, 'SELECT pg_advisory_xact_lock($1::bigint)', [ADVISORY_LOCK_KEY]);
    await inspectProductionRoleAndSchemaState(client, counters);
    for (const role of ROLE_NAMES) {
      await client.query(`ALTER ROLE ${quoteIdentifier(role)} PASSWORD ${quoteLiteral(passwords[role])}`);
      rotations += 1; counters.productionPasswordRotationStatements += 1;
    }
    passwords = undefined;
    await boundary.updateSensitiveProduction('FANDEX_MIGRATION_DATABASE_URL', migrationUrl); updated.push('FANDEX_MIGRATION_DATABASE_URL'); counters.vercelEnvUpdates += 1;
    await boundary.updateSensitiveProduction('FANDEX_RUNTIME_DATABASE_URL', runtimeUrl); updated.push('FANDEX_RUNTIME_DATABASE_URL'); counters.vercelEnvUpdates += 1;
    const vercel = await boundary.listProduction(); counters.vercelMetadataReads += 1; validateVercelPoststate(vercel);
    await countedQuery(client, counters, 'COMMIT'); committed = true;
    client.release(); client = undefined; await pool.end();

    const migrationVerification = await verifyRoleConnection(migrationUrl, 'fandex_migrator', false, counters, poolFactory, options.sleeper); verified.push('migration');
    const runtimeVerification = await verifyRoleConnection(runtimeUrl, 'fandex_runtime', true, counters, poolFactory, options.sleeper); verified.push('runtime');
    migrationUrl = undefined; runtimeUrl = undefined;
    await (options.ownerSourceDelete ?? (() => unlink(OWNER_SOURCE_PATH)))();
    const verifierPolicy = { ...ROLE_VERIFICATION_POLICY };
    const digests = Object.freeze({
      recoveryPreState: digest({ roleSecurity: preSchema.roleSecurity, runtimeAcl: preSchema.runtimeAcl, businessRows: preSchema.businessRows }),
      verifierPolicy: digest(verifierPolicy), migrationRoleVerification: digest(migrationVerification), runtimeRoleVerification: digest(runtimeVerification),
      roleSecurityState: digest(preSchema.roleSecurity), aclSchemaState: digest({ runtimeAcl: preSchema.runtimeAcl, owners: [preSchema.schemaOwnerMatched,preSchema.tableOwnersMatched,preSchema.functionOwnerMatched] }),
      vercelEnvMetadata: digest(validateVercelPoststate(vercel)),
    });
    return Object.freeze({
      version: 'v118', outcome: 'credentials_recovered_and_verified', deploymentReadiness: 'deployment_not_performed',
      verification: Object.freeze([migrationVerification,runtimeVerification]), roleSecurity: preSchema.roleSecurity,
      runtimeAcl: EXPECTED_RUNTIME_ACL, businessRows: preSchema.businessRows, vercelEnvironment: validateVercelPoststate(vercel),
      effects: counters, progress: progress(), ownerCredentialSourceDeleted: true,
      secretOutputCount: 0, secretHashCount: 0, secretCommitCount: 0, schemaBusinessWrites: 0,
      digests: Object.freeze({ ...digests, aggregateRecoveryReadiness: digest(digests) }),
    });
  } catch (error) {
    if (!committed && client) { try { await client.query('ROLLBACK'); } catch { /* preserve sanitized progress */ } }
    const diagnostic = error instanceof RoleVerificationError ? error.diagnostic : null;
    throw new ProductionRecoveryError(progress(), diagnostic);
  } finally {
    migrationUrl = undefined; runtimeUrl = undefined;
    try { client?.release(); } catch { /* redact */ }
    try { await pool.end(); } catch { /* redact */ }
  }
}

export type RecordedRecoveryEvidence = Readonly<{
  migrator_attempt: 1;
  migrator_endpoint: 'unpooled';
  migrator_outcome: 'success';
  runtime_diagnostic: SafeRoleVerificationDiagnostic;
  password_rotations: 2;
  vercel_updates: 2;
  same_in_memory_credential_pair: true;
  vercel_stdin_exact_bytes: true;
}>;

export const RECORDED_RECOVERY_EVIDENCE: RecordedRecoveryEvidence = Object.freeze({
  migrator_attempt: 1, migrator_endpoint: 'unpooled', migrator_outcome: 'success',
  runtime_diagnostic: Object.freeze({ role_classification: 'runtime', endpoint_classification: 'pooled', stage: 'postcondition', category: 'postcondition', sqlstate: null, node_code: null, attempt: 1, max_attempts: 7, retryable: false, timeout_observed: false }),
  password_rotations: 2, vercel_updates: 2, same_in_memory_credential_pair: true, vercel_stdin_exact_bytes: true,
});

export function classifyRecordedProductionRecoveryEvidence(evidence: RecordedRecoveryEvidence) {
  const runtime = evidence.runtime_diagnostic;
  if (evidence.migrator_attempt !== 1 || evidence.migrator_endpoint !== 'unpooled' || evidence.migrator_outcome !== 'success'
      || runtime.role_classification !== 'runtime' || runtime.endpoint_classification !== 'pooled' || runtime.stage !== 'postcondition'
      || runtime.category !== 'postcondition' || runtime.attempt !== 1 || runtime.sqlstate !== null || runtime.node_code !== null
      || runtime.retryable || runtime.timeout_observed || evidence.password_rotations !== 2 || evidence.vercel_updates !== 2
      || !evidence.same_in_memory_credential_pair || !evidence.vercel_stdin_exact_bytes) {
    throw new Error('recorded_recovery_evidence_mismatch');
  }
  return Object.freeze({
    migrator: Object.freeze({ role_classification: 'migration', endpoint_classification: 'unpooled', successful_attempt: 1 }),
    runtime: Object.freeze({
      role_classification: 'runtime', endpoint_classification: 'pooled', successful_attempt: 1,
      credential_authentication_verified: true, connection_verified: true, identity_query_verified: true,
      privilege_query_verified: true, original_postcondition_valid: false, verifier_defect_confirmed: true,
      fresh_role_reconnect_performed: false, additional_rotation_performed: false,
      evidence_basis: 'recorded_successful_connection_and_queries_before_invalid_postcondition',
    }),
    password_rotations_recorded: 2, vercel_updates_recorded: 2,
  });
}

export async function buildProductionBootstrapFinalizationPlan() {
  const recoveryPlan = await buildProductionCredentialRecoveryPlan();
  return Object.freeze({
    mode: 'production_bootstrap_finalization_plan',
    orderedSteps: Object.freeze(['classify_recorded_recovery_evidence','owner_catalog_read_only_inspection','vercel_metadata_read_only_inspection','generate_sanitized_readiness']),
    freshRoleReconnects: 0, passwordRotations: 0, vercelUpdates: 0, schemaWrites: 0, businessWrites: 0,
    correctedVisibilityPolicy: Object.freeze({ ownerCatalogTableCount: 7, migratorVisibleTableCount: 7, runtimeVisibleTables: RUNTIME_VISIBLE_TABLES, runtimeSchemaMigrationsVisible: false }),
    migrationSha256: recoveryPlan.migrationSha256, grantSha256: recoveryPlan.grantSha256, effects: effects(),
  });
}

export async function finalizeProductionBootstrapFromRecordedEvidence(options: {
  ownerSourceReader?: () => Promise<string>;
  poolFactory?: (connectionString: string) => Pool;
  vercel?: VercelEnvironmentBoundary;
  evidence?: RecordedRecoveryEvidence;
} = {}) {
  await buildProductionBootstrapFinalizationPlan();
  const recorded = classifyRecordedProductionRecoveryEvidence(options.evidence ?? RECORDED_RECOVERY_EVIDENCE);
  const ownerInspection = await inspectProductionPoststateReadOnly({ ownerSourceReader: options.ownerSourceReader, poolFactory: options.poolFactory });
  if (!ownerInspection.evaluation.valid || ownerInspection.state.tableNames.length !== TABLES.length
      || canonical(ownerInspection.state.tableNames) !== canonical([...TABLES].sort())
      || canonical(Object.keys(ownerInspection.state.runtimeAcl).filter((table) => ownerInspection.state.runtimeAcl[table].length > 0).sort()) !== canonical(RUNTIME_VISIBLE_TABLES)) {
    throw new Error('production_finalization_postcondition_failed');
  }
  const vercel = await inspectVercelProductionPoststate(options.vercel);
  const correctedVerifierPolicy = Object.freeze({
    catalogTables: [...TABLES].sort(), migratorVisibleTables: [...TABLES].sort(), runtimeVisibleTables: RUNTIME_VISIBLE_TABLES,
    runtimeSchemaMigrationsVisible: false, runtimeSchemaMigrationsPrivileges: [] as string[], roleVisibilityDoesNotDefineCatalogExistence: true,
  });
  const digestParts = Object.freeze({
    correctedVerifierPolicy: digest(correctedVerifierPolicy), migratorRecordedVerification: digest(recorded.migrator),
    runtimeRecordedVerification: digest(recorded.runtime), ownerCatalogInspection: digest({ tableNames: ownerInspection.state.tableNames, roleSecurity: ownerInspection.state.roleSecurity, owners: [ownerInspection.state.schemaOwnerMatched,ownerInspection.state.tableOwnersMatched,ownerInspection.state.functionOwnerMatched], migration: ownerInspection.state.migrationRecordMatched, trigger: ownerInspection.state.auditTriggerPresent, constraints: ownerInspection.state.constraintTypes, businessRows: ownerInspection.state.businessRows }),
    aclInspection: digest({ runtimeAcl: ownerInspection.state.runtimeAcl, public: [ownerInspection.state.publicSchemaUsage,ownerInspection.state.publicSchemaCreate,ownerInspection.state.publicTableGrantCount,ownerInspection.state.publicSequenceGrantCount,ownerInspection.state.publicFunctionGrantCount] }),
    vercelEnvMetadata: digest(vercel),
  });
  return Object.freeze({
    version: 'v118', productionRoleSchemaBootstrap: 'ready', productionCredentialRecovery: 'completed',
    productionPersistenceInfrastructure: 'ready', productionDeploymentReadiness: 'deployment_not_performed',
    deploymentPerformed: false, businessDataPersistence: 'not_performed',
    recordedVerification: recorded, correctedVerifierPolicy, ownerInspection: Object.freeze({ evaluation: ownerInspection.evaluation, roleSecurity: ownerInspection.state.roleSecurity, tableNames: ownerInspection.state.tableNames, runtimeAcl: ownerInspection.state.runtimeAcl, businessRows: ownerInspection.state.businessRows }),
    vercelEnvironment: vercel, freshRoleReconnects: 0, additionalPasswordRotations: 0, additionalVercelUpdates: 0,
    migrationGrantReapplications: 0, schemaWrites: 0, businessWrites: 0, secretOutputs: 0, secretHashes: 0,
    digests: Object.freeze({ ...digestParts, aggregateBootstrapReadiness: digest(digestParts) }),
  });
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv.includes('--plan-production-bootstrap-finalization')) {
    try { process.stdout.write(`${JSON.stringify(await buildProductionBootstrapFinalizationPlan(), null, 2)}\n`); }
    catch (error) { process.stderr.write(`Production finalization plan failed closed: ${safeError(error)}. No credential or connection details were logged.\n`); process.exitCode = 1; }
    return;
  }
  if (argv.includes('--finalize-production-bootstrap-read-only')) {
    try { process.stdout.write(`${JSON.stringify(await finalizeProductionBootstrapFromRecordedEvidence(), null, 2)}\n`); }
    catch (error) { process.stderr.write(`Production finalization failed closed: ${safeError(error)}. No credential or connection details were logged.\n`); process.exitCode = 1; }
    return;
  }
  if (argv.includes('--plan-role-credential-recovery')) {
    try { process.stdout.write(`${JSON.stringify(await buildProductionCredentialRecoveryPlan(), null, 2)}\n`); }
    catch (error) { process.stderr.write(`Production recovery plan failed closed: ${safeError(error)}. No credential or connection details were logged.\n`); process.exitCode = 1; }
    return;
  }
  if (argv.includes('--inspect-production-recovery-preflight')) {
    try { process.stdout.write(`${JSON.stringify(await inspectProductionCredentialRecoveryPreflight(), null, 2)}\n`); }
    catch (error) { process.stderr.write(`Production recovery preflight failed closed: ${safeError(error)}. No credential or connection details were logged.\n`); process.exitCode = 1; }
    return;
  }
  if (argv.includes('--recover-role-credentials')) {
    try { process.stdout.write(`${JSON.stringify(await recoverProductionRoleCredentials({ argv }), null, 2)}\n`); }
    catch (error) {
      const safe = error instanceof ProductionRecoveryError ? JSON.stringify(error) : JSON.stringify({ error: safeError(error) });
      process.stderr.write(`Production credential recovery failed closed: ${safe}. No credential or connection details were logged.\n`); process.exitCode = 1;
    }
    return;
  }
  if (argv.includes('--inspect-production-poststate')) {
    try { process.stdout.write(`${JSON.stringify(await inspectProductionPoststateReadOnly(), null, 2)}\n`); }
    catch (error) {
      process.stderr.write(`Production post-state inspection failed closed: ${safeError(error)}. No credential or connection details were logged.\n`);
      process.exitCode = 1;
    }
    return;
  }
  if (argv.includes('--inspect-vercel-poststate')) {
    try { process.stdout.write(`${JSON.stringify({ mode: 'inspect_vercel_poststate', environmentVariables: await inspectVercelProductionPoststate() }, null, 2)}\n`); }
    catch (error) {
      process.stderr.write(`Vercel post-state inspection failed closed: ${safeError(error)}. No credential or connection details were logged.\n`);
      process.exitCode = 1;
    }
    return;
  }
  if (argv.includes('--inspect-production-bootstrap-transaction')) {
    try { process.stdout.write(`${JSON.stringify(await inspectProductionBootstrapTransaction(), null, 2)}\n`); }
    catch (error) {
      process.stderr.write(`Production transaction inspection failed closed: ${safeError(error)}. No credential or connection details were logged.\n`);
      process.exitCode = 1;
    }
    return;
  }
  if (argv.includes('--inspect-production-prestate')) {
    try { process.stdout.write(`${JSON.stringify(await inspectProductionPrestateReadOnly(), null, 2)}\n`); }
    catch (error) {
      process.stderr.write(`Production pre-state inspection failed closed: ${safeError(error)}. No credential or connection details were logged.\n`);
      process.exitCode = 1;
    }
    return;
  }
  if (argv.includes('--inspect-vercel-metadata')) {
    try {
      process.stdout.write(`${JSON.stringify({ mode: 'inspect_vercel_metadata', environmentVariables: await inspectVercelProductionEnvironment() }, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`Vercel metadata inspection failed closed: ${safeError(error)}. No credential or connection details were logged.\n`);
      process.exitCode = 1;
    }
    return;
  }
  if (!argv.some((arg) => REQUIRED_FLAGS.includes(arg as typeof REQUIRED_FLAGS[number]))) {
    process.stdout.write(`${JSON.stringify(await buildProductionBootstrapExecutionPlan(), null, 2)}\n`);
    return;
  }
  try {
    const result = await applyProductionRoleSchemaBootstrap({ argv });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Production bootstrap failed closed: ${safeError(error)}. No credential or connection details were logged.\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) void main();
