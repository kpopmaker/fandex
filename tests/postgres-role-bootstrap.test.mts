import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { requireMigrationDatabaseUrl, requireRuntimeDatabaseUrl } from '../lib/server/persistence/contracts';
import {
  applyRoleBootstrap,
  buildRoleBootstrapPlan,
  buildRoleBootstrapReadinessReport,
  buildRoleConnectionDescriptors,
  evaluateRoleBootstrapReadiness,
  inspectRoleSecurityState,
  main,
  validateRoleBootstrapInput,
  type RoleBootstrapInput,
  type RoleCatalogRow,
} from '../scripts/database/bootstrap-postgres-roles.mjs';

const input: RoleBootstrapInput = Object.freeze({
  provider: 'neon', resource: 'fandex-managed-postgres', branch: 'main', database: 'neondb',
  region: 'AWS Asia Pacific 1 (Singapore)', baseline: 'pre-v117-production-baseline',
  descriptorSource: 'postgresql-sql', deletionAttestation: 'user_attested',
});
const safeRole = (roleName: string): RoleCatalogRow => ({
  roleName, login: true, superuser: false, createDatabase: false, createRole: false,
  replication: false, bypassRls: false, neonSuperuserMember: false,
});
const migration001 = new URL('../database/migrations/001_v114_managed_postgres_persistence.sql', import.meta.url);
const grantPlan = new URL('../database/grants/001_v117_least_privilege_roles.sql', import.meta.url);
const v116Doc = new URL('../docs/managed-postgres-staging-migration-validation-v116.md', import.meta.url);

test('pinned metadata and SQL-only descriptor source fail closed', () => {
  assert.deepEqual(validateRoleBootstrapInput(input), { valid: true });
  for (const key of ['provider','resource','branch','database','region'] as const) {
    assert.throws(() => validateRoleBootstrapInput({ ...input, [key]: 'wrong' }), /target_metadata_mismatch/);
  }
  for (const descriptorSource of ['console','api','cli'] as const) {
    assert.throws(() => validateRoleBootstrapInput({ ...input, descriptorSource }), /role_descriptor_source_rejected/);
  }
});

test('role catalog rejects unexpected, missing, privileged, and neon_superuser states', () => {
  assert.throws(() => inspectRoleSecurityState([safeRole('unexpected')]), /unexpected_role_state/);
  assert.throws(() => evaluateRoleBootstrapReadiness(input, inspectRoleSecurityState([]), 'post-apply'), /role_set_incomplete/);
  const roles = ['fandex_migrator','fandex_runtime'].map(safeRole);
  for (const attribute of ['superuser','createDatabase','createRole','replication','bypassRls'] as const) {
    const changed = roles.map((role) => ({ ...role }));
    changed[0][attribute] = true;
    assert.throws(() => evaluateRoleBootstrapReadiness(input, inspectRoleSecurityState(changed), 'post-apply'), /unsafe_role_attributes/);
  }
  const member = roles.map((role) => ({ ...role })); member[1].neonSuperuserMember = true;
  assert.throws(() => evaluateRoleBootstrapReadiness(input, inspectRoleSecurityState(member), 'post-apply'), /neon_superuser_membership_rejected/);
  assert.throws(() => evaluateRoleBootstrapReadiness(input, inspectRoleSecurityState([safeRole('fandex_runtime')]), 'pre-apply'), /existing_role_requires_manual_resolution/);
});

test('runtime and migration URLs are role- and pooling-specific without legacy fallback', () => {
  const runtime = 'postgresql://fandex_runtime:runtime-secret@ep-safe-pooler.example.test/neondb?sslmode=require';
  const migration = 'postgresql://fandex_migrator:migration-secret@ep-safe.example.test/neondb?sslmode=require';
  const owner = 'postgresql://owner:owner-secret@ep-safe.example.test/neondb?sslmode=require';
  assert.equal(requireRuntimeDatabaseUrl({ FANDEX_RUNTIME_DATABASE_URL: runtime }), runtime);
  assert.equal(requireMigrationDatabaseUrl({ FANDEX_MIGRATION_DATABASE_URL: migration }), migration);
  assert.throws(() => requireMigrationDatabaseUrl({ FANDEX_MIGRATION_DATABASE_URL: runtime }), /migration_database_url_invalid/);
  assert.throws(() => requireMigrationDatabaseUrl({ FANDEX_MIGRATION_DATABASE_URL: migration.replace('ep-safe.', 'ep-safe-pooler.') }), /migration_database_url_invalid/);
  assert.throws(() => requireRuntimeDatabaseUrl({ FANDEX_RUNTIME_DATABASE_URL: owner }), /runtime_database_url_invalid/);
  assert.throws(() => requireRuntimeDatabaseUrl({ DATABASE_URL: runtime }), /runtime_database_url_invalid/);
  assert.throws(() => requireMigrationDatabaseUrl({ DATABASE_URL_UNPOOLED: migration }), /migration_database_url_invalid/);
  for (const value of ['', 'not-a-url', 'postgresql://fandex_runtime@ep-safe-pooler.example.test/neondb']) {
    assert.throws(() => requireRuntimeDatabaseUrl({ FANDEX_RUNTIME_DATABASE_URL: value }), /runtime_database_url_invalid/);
  }
});

test('one apply flag never reads credentials or opens a pool', async () => {
  let poolCalls = 0;
  for (const argv of [['--apply'], ['--authorize-production-role-bootstrap']]) {
    await assert.rejects(applyRoleBootstrap({
      input, argv, environment: {},
      poolFactory: () => { poolCalls += 1; throw new Error('must_not_open'); },
    }), /dual_apply_authorization_required/);
    await assert.rejects(main(argv), /dual_apply_authorization_required/);
  }
  assert.equal(poolCalls, 0);
});

test('authorized apply is transactional with mocked SQL and JSON-redacted results', async () => {
  const calls: string[] = [];
  let inspection = 0;
  let released = false;
  let ended = false;
  const client = {
    async query(sql: string) {
      calls.push(sql);
      if (sql.startsWith('SELECT candidate.rolname')) {
        inspection += 1;
        return inspection === 1 ? { rows: [] } : { rows: [
          { rolname: 'fandex_migrator', rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, neon_member: false },
          { rolname: 'fandex_runtime', rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, neon_member: false },
        ] };
      }
      return { rows: [] };
    },
    release() { released = true; },
  };
  const result = await applyRoleBootstrap({
    input, argv: ['--apply','--authorize-production-role-bootstrap'],
    environment: { DATABASE_URL_UNPOOLED: 'postgresql://owner:owner-secret@ep-private.example.test/neondb?sslmode=require' },
    poolFactory: () => ({ async connect() { return client; }, async end() { ended = true; } }) as never,
  });
  assert.equal(calls[0], 'BEGIN');
  assert.equal(calls.at(-1), 'COMMIT');
  assert.equal(calls.filter((sql) => sql.startsWith('CREATE ROLE')).length, 2);
  for (const sql of calls.filter((value) => value.startsWith('CREATE ROLE'))) {
    assert.match(sql, /LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD/);
  }
  assert.ok(calls.some((sql) => sql.includes('GRANT SELECT, INSERT ON TABLE fandex.persistence_audit_events')));
  assert.equal(released, true); assert.equal(ended, true);
  const json = JSON.stringify(result);
  for (const forbidden of ['owner-secret','ep-private','neondb','PASSWORD ']) assert.doesNotMatch(json, new RegExp(forbidden));
  assert.match(result.descriptors[0].consumeOnce(), /^postgresql:\/\/fandex_migrator:/);
  assert.match(result.descriptors[1].consumeOnce(), /^postgresql:\/\/fandex_runtime:[^@]+@ep-private-pooler\./);
});

test('pre-existing role aborts mocked apply without mutation and rolls back', async () => {
  const calls: string[] = [];
  const client = {
    async query(sql: string) {
      calls.push(sql);
      if (sql.startsWith('SELECT candidate.rolname')) return { rows: [
        { rolname: 'fandex_runtime', rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, neon_member: false },
      ] };
      return { rows: [] };
    },
    release() {},
  };
  await assert.rejects(applyRoleBootstrap({
    input, argv: ['--apply','--authorize-production-role-bootstrap'],
    environment: { DATABASE_URL_UNPOOLED: 'postgresql://owner:owner-secret@ep-private.example.test/neondb' },
    poolFactory: () => ({ async connect() { return client; }, async end() {} }) as never,
  }), /existing_role_requires_manual_resolution/);
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.some((sql) => sql.startsWith('CREATE ROLE')), false);
});

test('connection failures are redacted and still close the pool', async () => {
  let ended = false;
  let caught: unknown;
  try {
    await applyRoleBootstrap({
      input, argv: ['--apply','--authorize-production-role-bootstrap'],
      environment: { DATABASE_URL_UNPOOLED: 'postgresql://owner:owner-secret@ep-private.example.test/neondb' },
      poolFactory: () => ({
        async connect() { throw new Error('owner-secret ep-private neondb'); },
        async end() { ended = true; },
      }) as never,
    });
  } catch (error) { caught = error; }
  assert.equal(ended, true);
  assert.equal(caught instanceof Error ? caught.message : '', 'role_bootstrap_database_operation_failed');
});

test('connection descriptors are one-shot and JSON-redacted', () => {
  const owner = 'postgresql://owner:owner-secret@ep-private.example.test/neondb?sslmode=require';
  const descriptors = buildRoleConnectionDescriptors(owner, { fandex_migrator: 'migration-secret', fandex_runtime: 'runtime-secret' });
  const json = JSON.stringify(descriptors);
  for (const forbidden of ['owner-secret','migration-secret','runtime-secret','ep-private','owner@','neondb']) assert.doesNotMatch(json, new RegExp(forbidden));
  assert.match(descriptors[0].consumeOnce(), /^postgresql:\/\/fandex_migrator:/);
  assert.throws(() => descriptors[0].consumeOnce(), /connection_descriptor_already_consumed/);
});

test('grant plan exactly matches the runtime adapter allowlist', async () => {
  const sql = (await readFile(grantPlan, 'utf8')).replace(/\r\n/g, '\n');
  const grants = [...sql.matchAll(/GRANT ([A-Z, ]+) ON TABLE fandex\.([a-z_]+) TO fandex_runtime;/g)]
    .map((match) => [match[2], match[1].split(',').map((value) => value.trim()).sort()] as const);
  assert.deepEqual(Object.fromEntries(grants), {
    normalized_sources: ['INSERT','SELECT','UPDATE'],
    historical_enrichment_requests: ['INSERT','SELECT','UPDATE'],
    source_evidence_provenance: ['INSERT','SELECT'],
    persistence_transactions: ['INSERT','SELECT','UPDATE'],
    persistence_audit_events: ['INSERT','SELECT'],
    ingestion_outbox: ['INSERT','SELECT','UPDATE'],
  });
  assert.doesNotMatch(sql, /GRANT[^;]*(ALL|DELETE|TRUNCATE|REFERENCES|TRIGGER)/);
  assert.doesNotMatch(sql, /GRANT[^;]*schema_migrations[^;]*fandex_runtime/);
  assert.match(sql, /REVOKE ALL ON ALL TABLES IN SCHEMA fandex FROM PUBLIC/);
  assert.match(sql, /ALTER TABLE fandex\.schema_migrations OWNER TO fandex_migrator/);
});

test('plan and replay are byte-deterministic and preserve v116 lineage', async () => {
  const first = await buildRoleBootstrapPlan(input);
  const replay = await buildRoleBootstrapPlan(structuredClone(input));
  assert.equal(JSON.stringify(first), JSON.stringify(replay));
  const migrationBytes = await readFile(migration001);
  assert.equal(createHash('sha256').update(migrationBytes).digest('hex'), '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a');
  const doc = await readFile(v116Doc, 'utf8');
  for (const digest of [
    'baa2c06e72bb71b5bb4ce273bdbd2c9c2fe075b6a08db363cbe1e0278eaed587',
    'bbdda3a60c905a9b1857753dd5d8bd2f7a58fa08681f2c03d5987fdb6e6d58b3',
    '76b47b25c4fa565f9f18ab2f83f1354e40ad050550ad891ff943dd2ce45f02b5',
    '0782b703fa8afead0d8e4dd5a3ff11d9611fa1a25fcaba228d239314726c322f',
    'b74df457f27c1d18053e83715f9c902e8ad29a576ded9d636679789a51fb29e0',
    '8c9ac21be21cc461ecd4b9eec0d0ef49bc2dca62002be876f0f8e767a60513c7',
    'afc06c7d53bcc4a93156e5046102a54861b79f2c1f0f2218a294896c848625e8',
    'e9d526e3b26133cb18d891425b9938d6826790660e5536383e0f35af2d0680ef',
  ]) assert.match(doc, new RegExp(digest));
});

test('plan output contains zero effects and no secret or connection components', async () => {
  const output = JSON.stringify(await buildRoleBootstrapReadinessReport(input));
  const result = JSON.parse(output) as { effects: Record<string, number> };
  assert.ok(Object.values(result.effects).every((count) => count === 0));
  for (const forbidden of ['password','connectionstring','hostname','username','urlhash','neondb','ep-private']) {
    assert.doesNotMatch(output.toLowerCase(), new RegExp(forbidden));
  }
});
