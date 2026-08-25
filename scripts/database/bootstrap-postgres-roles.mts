import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Pool, type PoolClient } from 'pg';

const GRANT_PLAN_PATH = fileURLToPath(new URL('../../database/grants/001_v117_least_privilege_roles.sql', import.meta.url));
const ROLE_NAMES = ['fandex_migrator', 'fandex_runtime'] as const;
const PINNED = Object.freeze({
  provider: 'neon',
  resource: 'fandex-managed-postgres',
  branch: 'main',
  database: 'neondb',
  region: 'AWS Asia Pacific 1 (Singapore)',
  baseline: 'pre-v117-production-baseline',
});

export type RoleName = typeof ROLE_NAMES[number];
export type RoleBootstrapInput = typeof PINNED & {
  descriptorSource: 'postgresql-sql' | 'console' | 'api' | 'cli';
  deletionAttestation: 'user_attested';
};
export type RoleCatalogRow = {
  roleName: string;
  login: boolean;
  superuser: boolean;
  createDatabase: boolean;
  createRole: boolean;
  replication: boolean;
  bypassRls: boolean;
  neonSuperuserMember: boolean;
};
export type RoleSecurityState = { roles: readonly RoleCatalogRow[] };
type Queryable = Pick<PoolClient, 'query'>;
const SAFE_APPLY_ERRORS = new Set([
  'target_metadata_mismatch', 'role_descriptor_source_rejected', 'deletion_attestation_required',
  'dual_apply_authorization_required', 'single_owner_database_url_required', 'owner_database_url_invalid',
  'unexpected_role_state', 'neon_superuser_membership_rejected', 'existing_role_requires_manual_resolution',
  'role_set_incomplete', 'unsafe_role_attributes', 'role_identifier_rejected',
]);

export function validateRoleBootstrapInput(input: RoleBootstrapInput): { valid: true } {
  for (const key of Object.keys(PINNED) as (keyof typeof PINNED)[]) {
    if (input[key] !== PINNED[key]) throw new Error('target_metadata_mismatch');
  }
  if (input.descriptorSource !== 'postgresql-sql') throw new Error('role_descriptor_source_rejected');
  if (input.deletionAttestation !== 'user_attested') throw new Error('deletion_attestation_required');
  return { valid: true };
}

export async function buildRoleBootstrapPlan(input: RoleBootstrapInput): Promise<{
  mode: 'plan'; roleCount: 2; grantPlanVersion: 1; grantPlanSha256: string;
  applyRequirements: readonly ['--apply', '--authorize-production-role-bootstrap'];
}> {
  validateRoleBootstrapInput(input);
  const grantSql = (await readFile(GRANT_PLAN_PATH, 'utf8')).replace(/\r\n/g, '\n');
  return Object.freeze({
    mode: 'plan', roleCount: 2, grantPlanVersion: 1,
    grantPlanSha256: createHash('sha256').update(grantSql, 'utf8').digest('hex'),
    applyRequirements: ['--apply', '--authorize-production-role-bootstrap'] as const,
  });
}

export function inspectRoleSecurityState(rows: readonly RoleCatalogRow[]): RoleSecurityState {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!(ROLE_NAMES as readonly string[]).includes(row.roleName) || seen.has(row.roleName)) {
      throw new Error('unexpected_role_state');
    }
    seen.add(row.roleName);
  }
  const roles = [...rows].sort((a, b) => a.roleName.localeCompare(b.roleName)).map((row): RoleCatalogRow => Object.freeze(row));
  return Object.freeze({ roles: Object.freeze(roles) });
}

export function evaluateRoleBootstrapReadiness(
  input: RoleBootstrapInput,
  state: RoleSecurityState,
  phase: 'pre-apply' | 'post-apply',
): { ready: true; phase: 'pre-apply' | 'post-apply' } {
  validateRoleBootstrapInput(input);
  if (state.roles.some((role) => role.neonSuperuserMember)) throw new Error('neon_superuser_membership_rejected');
  if (phase === 'pre-apply') {
    if (state.roles.length !== 0) throw new Error('existing_role_requires_manual_resolution');
  } else {
    if (state.roles.length !== ROLE_NAMES.length) throw new Error('role_set_incomplete');
    for (const role of state.roles) {
      if (!role.login || role.superuser || role.createDatabase || role.createRole || role.replication || role.bypassRls) {
        throw new Error('unsafe_role_attributes');
      }
    }
  }
  return { ready: true, phase };
}

function quoteIdentifier(role: RoleName): string {
  if (!(ROLE_NAMES as readonly string[]).includes(role)) throw new Error('role_identifier_rejected');
  return `"${role.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function parseOwnerUrl(value: string | undefined): URL {
  if (!value || value.trim() !== value) throw new Error('owner_database_url_invalid');
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('owner_database_url_invalid'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.username || !parsed.password
      || decodeURIComponent(parsed.pathname.slice(1)) !== PINNED.database || parsed.hostname.toLowerCase().includes('pooler')
      || (ROLE_NAMES as readonly string[]).includes(decodeURIComponent(parsed.username)) || parsed.hash) {
    throw new Error('owner_database_url_invalid');
  }
  return parsed;
}

export type RoleConnectionDescriptor = {
  readonly environmentVariable: 'FANDEX_MIGRATION_DATABASE_URL' | 'FANDEX_RUNTIME_DATABASE_URL';
  readonly connectionMode: 'unpooled' | 'pooled';
  consumeOnce(): string;
  toJSON(): { environmentVariable: string; connectionMode: string; secret: 'redacted' };
};

function descriptor(environmentVariable: RoleConnectionDescriptor['environmentVariable'], connectionMode: RoleConnectionDescriptor['connectionMode'], value: string): RoleConnectionDescriptor {
  let secret: string | undefined = value;
  return Object.freeze({
    environmentVariable, connectionMode,
    consumeOnce() {
      if (!secret) throw new Error('connection_descriptor_already_consumed');
      const consumed = secret;
      secret = undefined;
      return consumed;
    },
    toJSON: () => ({ environmentVariable, connectionMode, secret: 'redacted' as const }),
  });
}

export function buildRoleConnectionDescriptors(ownerUrl: string, passwords: Readonly<Record<RoleName, string>>): readonly RoleConnectionDescriptor[] {
  const owner = parseOwnerUrl(ownerUrl);
  const migration = new URL(owner);
  migration.username = ROLE_NAMES[0]; migration.password = passwords.fandex_migrator;
  const runtime = new URL(owner);
  runtime.hostname = runtime.hostname.replace(/^([^.]+)/, '$1-pooler');
  runtime.username = ROLE_NAMES[1]; runtime.password = passwords.fandex_runtime;
  return Object.freeze([
    descriptor('FANDEX_MIGRATION_DATABASE_URL', 'unpooled', migration.toString()),
    descriptor('FANDEX_RUNTIME_DATABASE_URL', 'pooled', runtime.toString()),
  ]);
}

async function queryRoleState(client: Queryable): Promise<RoleSecurityState> {
  const result = await client.query<{
    rolname: string; rolcanlogin: boolean; rolsuper: boolean; rolcreatedb: boolean;
    rolcreaterole: boolean; rolreplication: boolean; rolbypassrls: boolean; neon_member: boolean;
  }>(`SELECT candidate.rolname, candidate.rolcanlogin, candidate.rolsuper, candidate.rolcreatedb,
      candidate.rolcreaterole, candidate.rolreplication, candidate.rolbypassrls,
      EXISTS (SELECT 1 FROM pg_auth_members membership JOIN pg_roles granted ON granted.oid=membership.roleid
        WHERE membership.member=candidate.oid AND granted.rolname='neon_superuser') AS neon_member
    FROM pg_roles candidate WHERE candidate.rolname = ANY($1::text[]) ORDER BY candidate.rolname`, [ROLE_NAMES]);
  return inspectRoleSecurityState(result.rows.map((row) => ({
    roleName: row.rolname, login: row.rolcanlogin, superuser: row.rolsuper,
    createDatabase: row.rolcreatedb, createRole: row.rolcreaterole,
    replication: row.rolreplication, bypassRls: row.rolbypassrls,
    neonSuperuserMember: row.neon_member,
  })));
}

export async function applyRoleBootstrap(options: {
  input: RoleBootstrapInput;
  argv: readonly string[];
  environment: Readonly<Record<string, string | undefined>>;
  poolFactory?: (connectionString: string) => Pick<Pool, 'connect' | 'end'>;
}): Promise<{ mode: 'applied'; roleCount: 2; descriptors: readonly RoleConnectionDescriptor[] }> {
  validateRoleBootstrapInput(options.input);
  if (!options.argv.includes('--apply') || !options.argv.includes('--authorize-production-role-bootstrap')) {
    throw new Error('dual_apply_authorization_required');
  }
  const legacyCandidates = [options.environment.DATABASE_URL, options.environment.DATABASE_URL_UNPOOLED].filter(Boolean);
  if (legacyCandidates.length !== 1) throw new Error('single_owner_database_url_required');
  const ownerUrl = legacyCandidates[0] as string;
  parseOwnerUrl(ownerUrl);
  const pool = (options.poolFactory ?? ((connectionString) => new Pool({ connectionString, max: 1, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 5_000, statement_timeout: 30_000 })))(ownerUrl);
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    evaluateRoleBootstrapReadiness(options.input, await queryRoleState(client), 'pre-apply');
    const passwords = Object.freeze({ fandex_migrator: randomBytes(48).toString('base64url'), fandex_runtime: randomBytes(48).toString('base64url') });
    for (const role of ROLE_NAMES) {
      await client.query(`CREATE ROLE ${quoteIdentifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${quoteLiteral(passwords[role])}`);
    }
    const grantSql = await readFile(GRANT_PLAN_PATH, 'utf8');
    await client.query(grantSql);
    evaluateRoleBootstrapReadiness(options.input, await queryRoleState(client), 'post-apply');
    const descriptors = buildRoleConnectionDescriptors(ownerUrl, passwords);
    await client.query('COMMIT');
    return { mode: 'applied', roleCount: 2, descriptors };
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* original fail-closed error wins */ }
    }
    if (error instanceof Error && SAFE_APPLY_ERRORS.has(error.message)) throw error;
    throw new Error('role_bootstrap_database_operation_failed');
  } finally {
    try { client?.release(); } catch { /* never expose connection details */ }
    try { await pool.end(); } catch { /* COMMIT or original failure remains authoritative */ }
  }
}

const DEFAULT_INPUT: RoleBootstrapInput = Object.freeze({ ...PINNED, descriptorSource: 'postgresql-sql', deletionAttestation: 'user_attested' });

export async function buildRoleBootstrapReadinessReport(input: RoleBootstrapInput = DEFAULT_INPUT) {
  const plan = await buildRoleBootstrapPlan(input);
  return Object.freeze({ ...plan, readiness: 'plan_only' as const, effects: Object.freeze({
    productionDatabaseConnections: 0, productionQueries: 0, productionWrites: 0,
    roleCreations: 0, roleDeletions: 0, roleChanges: 0, migrationApplies: 0,
    persistenceWrites: 0, credentialReads: 0, secretExposures: 0, vercelEnvironmentChanges: 0,
    deployments: 0, externalCalls: 0,
  }) });
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const applyFlags = argv.filter((arg) => arg === '--apply' || arg === '--authorize-production-role-bootstrap');
  if (applyFlags.length) {
    if (!argv.includes('--apply') || !argv.includes('--authorize-production-role-bootstrap')) throw new Error('dual_apply_authorization_required');
    throw new Error('secure_credential_consumer_required');
  }
  process.stdout.write(`${JSON.stringify(await buildRoleBootstrapReadinessReport(DEFAULT_INPUT), null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    process.stderr.write('Role bootstrap failed closed. No credential or target details were logged.\n');
    process.exitCode = 1;
  });
}
