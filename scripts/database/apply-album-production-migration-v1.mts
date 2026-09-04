import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Pool, type PoolClient } from 'pg';

import { requireMigrationDatabaseUrl } from '../../lib/server/persistence/contracts';

const MIGRATION_PATH = fileURLToPath(new URL('../../database/migrations/003_album_research_observation_persistence.sql', import.meta.url));
const GRANT_PATH = fileURLToPath(new URL('../../database/grants/002_album_research_observation_writer.sql', import.meta.url));

export const EXPECTED_MIGRATION_SHA256 = '637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97' as const;
export const EXPECTED_GRANT_SHA256 = 'a0fc93c537148794dc36182e3a8feb2ce0218c872237a989fa3a0e70fa793244' as const;
export const BASELINE_MIGRATIONS = Object.freeze([
  Object.freeze({ version: 1, sha256: '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a' }),
  Object.freeze({ version: 2, sha256: '8951cd9ace8f30a586a23b5b813794560ea916798ae7c64e9542440ff1881aef' }),
]);

const APPLY_FLAG = '--apply';
const AUTHORIZE_FLAG = '--authorize-production-main-album-migration';
const ADVISORY_LOCK_KEY = 20_260_903_003;

type MigrationRow = { version: number | string; migration_sha256: string };
type IdentityRow = { current_user: string; session_user: string; current_database: string };

function normalizeSql(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function loadExactAlbumProductionSql(): Promise<{ migrationSql: string; grantSql: string }> {
  const migrationSql = normalizeSql(await readFile(MIGRATION_PATH, 'utf8'));
  const grantSql = normalizeSql(await readFile(GRANT_PATH, 'utf8'));
  if (sha256(migrationSql) !== EXPECTED_MIGRATION_SHA256) throw new Error('album_migration_digest_mismatch');
  if (sha256(grantSql) !== EXPECTED_GRANT_SHA256) throw new Error('album_grant_digest_mismatch');
  return { migrationSql, grantSql };
}

function assertBaseline(rows: readonly MigrationRow[]): void {
  if (rows.length !== BASELINE_MIGRATIONS.length) throw new Error('album_migration_history_mismatch');
  for (let index = 0; index < BASELINE_MIGRATIONS.length; index += 1) {
    const expected = BASELINE_MIGRATIONS[index];
    const actual = rows[index];
    if (Number(actual?.version) !== expected.version || actual?.migration_sha256 !== expected.sha256) {
      throw new Error('album_migration_history_mismatch');
    }
  }
}

async function verifyPostconditions(client: Pick<PoolClient, 'query'>): Promise<void> {
  const migration = await client.query<MigrationRow>(
    'SELECT version, migration_sha256 FROM fandex.schema_migrations WHERE version = 3',
  );
  if (migration.rowCount !== 1 || migration.rows[0]?.migration_sha256 !== EXPECTED_MIGRATION_SHA256) {
    throw new Error('album_migration_postcondition_failed');
  }

  const table = await client.query<{ owner_name: string; trigger_enabled: boolean }>(`
    SELECT owner_role.rolname AS owner_name,
      EXISTS (
        SELECT 1 FROM pg_trigger trigger_row
        WHERE trigger_row.tgrelid = target.oid
          AND trigger_row.tgname = 'album_research_observation_records_append_only'
          AND trigger_row.tgenabled <> 'D'
      ) AS trigger_enabled
    FROM pg_class target
    JOIN pg_namespace namespace_row ON namespace_row.oid = target.relnamespace
    JOIN pg_roles owner_role ON owner_role.oid = target.relowner
    WHERE namespace_row.nspname = 'fandex'
      AND target.relname = 'album_research_observation_records'
      AND target.relkind = 'r'
  `);
  if (table.rowCount !== 1 || table.rows[0]?.owner_name !== 'fandex_migrator' || !table.rows[0]?.trigger_enabled) {
    throw new Error('album_table_postcondition_failed');
  }

  const privileges = await client.query<{ can_select: boolean; can_insert: boolean; can_update: boolean; can_delete: boolean }>(`
    SELECT
      has_table_privilege('fandex_runtime', 'fandex.album_research_observation_records', 'SELECT') AS can_select,
      has_table_privilege('fandex_runtime', 'fandex.album_research_observation_records', 'INSERT') AS can_insert,
      has_table_privilege('fandex_runtime', 'fandex.album_research_observation_records', 'UPDATE') AS can_update,
      has_table_privilege('fandex_runtime', 'fandex.album_research_observation_records', 'DELETE') AS can_delete
  `);
  const state = privileges.rows[0];
  if (!state?.can_select || !state.can_insert || state.can_update || state.can_delete) {
    throw new Error('album_runtime_privilege_postcondition_failed');
  }

  const count = await client.query<{ row_count: string }>('SELECT count(*)::text AS row_count FROM fandex.album_research_observation_records');
  if (count.rows[0]?.row_count !== '0') throw new Error('album_table_not_empty_after_schema_apply');
}

export async function applyAlbumProductionMigration(options: {
  argv: readonly string[];
  environment: Readonly<Record<string, string | undefined>>;
  poolOverride?: Pick<Pool, 'connect' | 'end'>;
}): Promise<{ mode: 'applied'; migrationVersion: 3; rowCount: 0 }> {
  if (!options.argv.includes(APPLY_FLAG) || !options.argv.includes(AUTHORIZE_FLAG)) {
    throw new Error('album_production_migration_explicit_authorization_required');
  }
  const connectionString = requireMigrationDatabaseUrl(options.environment);
  const { migrationSql, grantSql } = await loadExactAlbumProductionSql();
  const pool = options.poolOverride ?? new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
    ssl: { rejectUnauthorized: true },
  });
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [ADVISORY_LOCK_KEY]);

    const identity = await client.query<IdentityRow>('SELECT current_user, session_user, current_database() AS current_database');
    const current = identity.rows[0];
    if (current?.current_user !== 'fandex_migrator' || current.session_user !== 'fandex_migrator' || current.current_database !== 'neondb') {
      throw new Error('album_migration_connection_identity_mismatch');
    }

    const owner = await client.query<{ owner_name: string }>(`
      SELECT owner_role.rolname AS owner_name
      FROM pg_namespace namespace_row
      JOIN pg_roles owner_role ON owner_role.oid = namespace_row.nspowner
      WHERE namespace_row.nspname = 'fandex'
    `);
    if (owner.rowCount !== 1 || owner.rows[0]?.owner_name !== 'fandex_migrator') throw new Error('album_schema_owner_mismatch');

    const baseline = await client.query<MigrationRow>(
      'SELECT version, migration_sha256 FROM fandex.schema_migrations ORDER BY version FOR UPDATE',
    );
    assertBaseline(baseline.rows);

    const table = await client.query<{ table_name: string | null }>(
      "SELECT to_regclass('fandex.album_research_observation_records')::text AS table_name",
    );
    if (table.rows[0]?.table_name !== null) throw new Error('album_research_table_already_present');

    await client.query(migrationSql);
    await client.query(
      'INSERT INTO fandex.schema_migrations (version, migration_sha256) VALUES ($1, $2)',
      [3, EXPECTED_MIGRATION_SHA256],
    );
    await client.query(grantSql);
    await verifyPostconditions(client);
    await client.query('COMMIT');
    return { mode: 'applied', migrationVersion: 3, rowCount: 0 };
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
    }
    throw error;
  } finally {
    try { client?.release(); } catch { /* no-op */ }
    await pool.end();
  }
}

export async function main(argv = process.argv.slice(2), environment = process.env): Promise<void> {
  if (!argv.includes(APPLY_FLAG)) {
    const { migrationSql, grantSql } = await loadExactAlbumProductionSql();
    process.stdout.write(`${JSON.stringify({
      mode: 'plan',
      migrationVersion: 3,
      migrationSha256: sha256(migrationSql),
      grantSha256: sha256(grantSql),
      effects: { productionSchemaWrites: 0, productionDataWrites: 0 },
    }, null, 2)}\n`);
    return;
  }
  const result = await applyAlbumProductionMigration({ argv, environment });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    process.stderr.write('Album Production migration failed closed. No credential or database error details were logged.\n');
    process.exitCode = 1;
  });
}
