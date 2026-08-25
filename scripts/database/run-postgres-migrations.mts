import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Pool } from 'pg';

import { requireMigrationDatabaseUrl } from '../../lib/server/persistence/contracts';

const MIGRATION_DIRECTORY = fileURLToPath(new URL('../../database/migrations/', import.meta.url));
const APPLY_APPROVAL_KEY = 'FANDEX_APPROVE_V114_MIGRATION';
const APPLY_APPROVAL_VALUE = 'approved-v114-managed-postgres';
const ADVISORY_LOCK_KEY = 11_420_260_825;

type Migration = { version: number; fileName: string; sha256: string; sql: string };

function normalizeMigrationSql(bytes: Buffer): string {
  return bytes.toString('utf8').replace(/\r\n/g, '\n');
}

function migrationDigest(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export async function loadMigrationPlan(): Promise<Migration[]> {
  const fileNames = (await readdir(MIGRATION_DIRECTORY))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
  return Promise.all(fileNames.map(async (fileName) => {
    const bytes = await readFile(join(MIGRATION_DIRECTORY, fileName));
    const sql = normalizeMigrationSql(bytes);
    return {
      version: Number.parseInt(fileName.split('_', 1)[0], 10),
      fileName,
      sha256: migrationDigest(sql),
      sql,
    };
  }));
}

export async function applyMigrationPlan(
  migrations: Migration[],
  environment: NodeJS.ProcessEnv,
  onQuery: (sql: string) => void = () => {},
): Promise<void> {
  if (environment[APPLY_APPROVAL_KEY] !== APPLY_APPROVAL_VALUE) throw new Error('migration_apply_approval_required');
  const pool = new Pool({
    connectionString: requireMigrationDatabaseUrl(environment),
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
    ssl: { rejectUnauthorized: true },
  });
  try {
    for (const migration of migrations) {
      const client = await pool.connect();
      try {
        onQuery('BEGIN'); await client.query('BEGIN');
        onQuery('SELECT pg_advisory_xact_lock'); await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [ADVISORY_LOCK_KEY]);
        onQuery('CREATE SCHEMA'); await client.query('CREATE SCHEMA IF NOT EXISTS fandex');
        onQuery('CREATE TABLE schema_migrations'); await client.query(`CREATE TABLE IF NOT EXISTS fandex.schema_migrations (
          version bigint PRIMARY KEY CHECK (version > 0),
          migration_sha256 char(64) NOT NULL CHECK (migration_sha256 ~ '^[0-9a-f]{64}$'),
          applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        onQuery('SELECT schema_migrations');
        const existing = await client.query<{ migration_sha256: string }>(
          'SELECT migration_sha256 FROM fandex.schema_migrations WHERE version = $1 FOR UPDATE',
          [migration.version],
        );
        if (existing.rowCount) {
          if (existing.rows[0].migration_sha256 !== migration.sha256) throw new Error('migration_version_digest_conflict');
          onQuery('ROLLBACK'); await client.query('ROLLBACK');
          continue;
        }
        onQuery('APPLY MIGRATION'); await client.query(migration.sql);
        onQuery('INSERT schema_migrations'); await client.query(
          'INSERT INTO fandex.schema_migrations (version, migration_sha256) VALUES ($1, $2)',
          [migration.version, migration.sha256],
        );
        onQuery('COMMIT'); await client.query('COMMIT');
      } catch (error) {
        onQuery('ROLLBACK'); await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

export async function main(argv = process.argv.slice(2), environment = process.env): Promise<void> {
  const migrations = await loadMigrationPlan();
  const apply = argv.includes('--apply');
  if (!apply) {
    console.log(JSON.stringify({ mode: 'plan', migrationCount: migrations.length, migrations: migrations.map(({ version, fileName, sha256 }) => ({ version, fileName: basename(fileName), sha256 })) }, null, 2));
    return;
  }
  await applyMigrationPlan(migrations, environment);
  console.log(JSON.stringify({ mode: 'applied', migrationCount: migrations.length }));
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('Migration failed closed. No credential or database error details were logged.');
    process.exitCode = 1;
  });
}
