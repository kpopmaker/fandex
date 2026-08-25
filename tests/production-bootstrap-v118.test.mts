import assert from 'node:assert/strict';
import test from 'node:test';

import type { Pool } from 'pg';

import {
  applyProductionRoleSchemaBootstrap,
  buildProductionBootstrapExecutionPlan,
  compensatePartialBootstrap,
  configureSensitiveVercelEnvironment,
  buildProductionCredentialRecoveryPlan,
  generateRoleCredentials,
  inspectVercelProductionEnvironment,
  inspectProductionPrestateReadOnly,
  evaluateProductionSchemaState,
  loadOwnerCredentialSource,
  validateProductionBootstrapAuthorization,
  validateProductionRecoveryAuthorization,
  verifyRoleConnection,
  RoleVerificationError,
  recoverProductionRoleCredentials,
  endStdinExact,
  buildProductionBootstrapFinalizationPlan,
  classifyRecordedProductionRecoveryEvidence,
  finalizeProductionBootstrapFromRecordedEvidence,
  RECORDED_RECOVERY_EVIDENCE,
  type ProductionEffects,
  type SafeVercelEnvMetadata,
  type VercelEnvironmentBoundary,
} from '../scripts/database/bootstrap-production-v118.mjs';

const FLAGS = ['--apply','--authorize-production-role-bootstrap','--authorize-production-schema-bootstrap','--authorize-vercel-production-env'];
const RECOVERY_FLAGS = ['--recover-role-credentials','--authorize-production-role-password-rotation','--authorize-vercel-production-env-update'];
const OWNER_SOURCE = [
  'DATABASE_URL=postgresql://neondb_owner:owner-secret@ep-safe-pooler.example.test/neondb?sslmode=require',
  'DATABASE_URL_UNPOOLED=postgresql://neondb_owner:owner-secret@ep-safe.example.test/neondb?sslmode=require',
].join('\n');
const ownerMetadata: SafeVercelEnvMetadata[] = [
  { name: 'DATABASE_URL', scope: ['production'], sensitive: true },
  { name: 'DATABASE_URL_UNPOOLED', scope: ['production'], sensitive: true },
];
const emptyEffects = (): ProductionEffects => ({
  productionConnections: 0, productionReadStatements: 0, productionControlStatements: 0,
  productionRoleCreateStatements: 0, productionTemporaryMembershipStatements: 0,
  productionSchemaWriteBatches: 0, productionMigrationRecordWrites: 0,
  vercelMetadataReads: 0, vercelEnvCreates: 0, vercelEnvUpdates: 0, vercelEnvDeletes: 0,
  ownerCredentialValuesRead: 0, generatedRoleCredentials: 0, businessRowWrites: 0,
  deployments: 0, downstreamCalls: 0, productionPasswordRotationStatements: 0,
});

class MockVercel implements VercelEnvironmentBoundary {
  rows = structuredClone(ownerMetadata);
  added: string[] = [];
  removed: string[] = [];
  updated: string[] = [];
  failOnAdd: string | undefined;
  failOnUpdate: string | undefined;
  async listProduction() { return structuredClone(this.rows); }
  async addSensitiveProduction(name: string, value: string) {
    assert.match(value, /^postgresql:\/\//);
    if (this.failOnAdd === name) throw new Error('hidden provider error');
    this.added.push(name);
    this.rows.push({ name, scope: ['production'], sensitive: true });
  }
  async removeProduction(name: string) {
    this.removed.push(name);
    this.rows = this.rows.filter((row) => row.name !== name);
  }
  async updateSensitiveProduction(name: string, value: string) {
    assert.match(value, /^postgresql:\/\//);
    if (this.failOnUpdate === name) throw new Error('hidden update provider error');
    this.updated.push(name);
  }
}

function runtimeAclRows() {
  const grants: Record<string, string[]> = {
    normalized_sources: ['INSERT','SELECT','UPDATE'], historical_enrichment_requests: ['INSERT','SELECT','UPDATE'],
    source_evidence_provenance: ['INSERT','SELECT'], persistence_transactions: ['INSERT','SELECT','UPDATE'],
    persistence_audit_events: ['INSERT','SELECT'], ingestion_outbox: ['INSERT','SELECT','UPDATE'], schema_migrations: [],
  };
  return Object.entries(grants).flatMap(([table_name, privileges]) => privileges.map((privilege_type) => ({ table_name, privilege_type })));
}

function mockPoolFactory() {
  const calls: string[] = [];
  const connectionStrings: string[] = [];
  let ended = 0;
  const factory = (connectionString: string) => {
    connectionStrings.push(connectionString);
    const role = decodeURIComponent(new URL(connectionString).username);
    const client = {
      connection: { stream: { encrypted: true } },
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("current_user='neondb_owner'")) return { rows: [{ owner_match: true, database_match: true, schema_absent: true, migration_absent: true, create_role_attribute: false, neon_admin_member: true }] };
        if (sql.includes('count(*)::text AS role_count FROM pg_roles')) return { rows: [{ role_count: '0' }] };
        if (sql.includes('SELECT candidate.rolname')) return { rows: [
          { rolname: 'fandex_migrator', rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, neon_member: false },
          { rolname: 'fandex_runtime', rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, neon_member: false },
        ] };
        if (sql.includes("pg_get_userbyid(nspowner)='fandex_migrator'")) return { rows: [{ owner_match: true, runtime_usage: true, runtime_create: false, public_usage: false, public_create: false }] };
        if (sql.includes("c.relname AS table_name") && sql.includes('owner_match')) return { rows: ['historical_enrichment_requests','ingestion_outbox','normalized_sources','persistence_audit_events','persistence_transactions','schema_migrations','source_evidence_provenance'].map((table_name) => ({ table_name, owner_match: true })) };
        if (sql.includes("p.proname='reject_audit_event_mutation'") && sql.includes("owner_match")) return { rows: [{ owner_match: true }] };
        if (sql.includes("granted.rolname='fandex_migrator'") && sql.includes("member.rolname='neondb_owner'")) return { rows: [{ safe: true }] };
        if (sql.includes('runtime_sequence')) return { rows: [{ runtime_sequence: '0', runtime_function: '0', public_table: '0', public_sequence: '0', public_function: '0' }] };
        if (sql.includes("grantee.rolname='fandex_runtime'")) return { rows: runtimeAclRows() };
        if (sql.startsWith('SELECT version::text')) return { rows: [{ version: '1', migration_sha256: '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a' }] };
        if (sql.includes('jsonb_agg(constraint_type')) return { rows: [{ trigger_present: true, constraint_types: ['CHECK','FOREIGN KEY','PRIMARY KEY','UNIQUE'] }] };
        if (sql.includes('AS historical_enrichment_requests') && !sql.includes('table_constraints')) return { rows: [{ historical_enrichment_requests: '0', ingestion_outbox: '0', normalized_sources: '0', persistence_audit_events: '0', persistence_transactions: '0', source_evidence_provenance: '0' }] };
        if (sql.includes('current_user=$1 AS identity_match')) return { rows: [{ identity_match: true, database_match: true, security_match: true, neon_member: false }] };
        if (sql.startsWith('SELECT has_schema_privilege(current_user')) return { rows: [{ schema_usage: true, schema_create: role === 'fandex_migrator' }] };
        if (sql.includes('grantee=current_user')) return { rows: role === 'fandex_runtime' ? runtimeAclRows() : [] };
        if (sql.includes('tables_owned')) return { rows: [{ tables_owned: role === 'fandex_migrator' ? '7' : '0', schema_owned: role === 'fandex_migrator', function_owned: role === 'fandex_migrator' }] };
        if (sql.includes("AS visible_tables") && sql.includes("AS constraints")) return { rows: [{ visible_tables: role === 'fandex_runtime' ? ['historical_enrichment_requests','ingestion_outbox','normalized_sources','persistence_audit_events','persistence_transactions','source_evidence_provenance'] : ['historical_enrichment_requests','ingestion_outbox','normalized_sources','persistence_audit_events','persistence_transactions','schema_migrations','source_evidence_provenance'], constraints: '20', trigger_present: true }] };
        if (sql.includes('bool_and(version=1')) return { rows: [{ matched: true }] };
        return { rows: [] };
      },
      release() {},
    };
    return { async connect() { return client; }, async end() { ended += 1; } } as unknown as Pool;
  };
  return { factory, calls, connectionStrings, ended: () => ended };
}

test('four apply flags are mandatory before any effect', () => {
  assert.deepEqual(validateProductionBootstrapAuthorization(FLAGS), { authorized: true });
  for (const missing of FLAGS) assert.throws(() => validateProductionBootstrapAuthorization(FLAGS.filter((flag) => flag !== missing)), /production_bootstrap_authorization_required/);
});

test('owner source is exact, validated, one-shot, and JSON-redacted', async () => {
  const source = await loadOwnerCredentialSource(async () => OWNER_SOURCE);
  assert.deepEqual(JSON.parse(JSON.stringify(source)), { credentialValues: 'redacted', credentialValueCount: 2 });
  const consumed = source.consumeOnce();
  assert.match(consumed.pooled, /pooler/); assert.doesNotMatch(consumed.unpooled, /pooler/);
  assert.throws(() => source.consumeOnce(), /owner_credential_already_consumed/);
  for (const invalid of [OWNER_SOURCE.replace('neondb_owner','other'), `${OWNER_SOURCE}\nEXTRA=value`, OWNER_SOURCE.replace('-pooler','')]) {
    await assert.rejects(loadOwnerCredentialSource(async () => invalid), /owner_credential_source_invalid/);
  }
});

test('generated credentials are cryptographic-shaped, distinct, one-shot, and redacted', () => {
  const generated = generateRoleCredentials();
  assert.doesNotMatch(JSON.stringify(generated), /fandex_|postgres|[A-Za-z0-9_-]{32}/);
  const values = generated.consumeOnce();
  assert.equal(values.fandex_migrator.length, 64); assert.equal(values.fandex_runtime.length, 64);
  assert.notEqual(values.fandex_migrator, values.fandex_runtime);
  assert.throws(() => generated.consumeOnce(), /generated_credentials_already_consumed/);
});

test('execution plan is deterministic with every effect zero', async () => {
  const first = await buildProductionBootstrapExecutionPlan();
  const replay = await buildProductionBootstrapExecutionPlan();
  assert.equal(JSON.stringify(first), JSON.stringify(replay));
  assert.ok(Object.values(first.effects).every((value) => value === 0));
  assert.equal(first.migrationSha256, '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a');
  assert.equal(first.grantSha256, '05e8eba83f4b88d7d4897b42f4cc62c3cc337dc35f88b8efa618aee8302ba546');
});

test('Production pre-state inspection is read-only and sanitized', async () => {
  const pools = mockPoolFactory();
  const result = await inspectProductionPrestateReadOnly({ ownerSourceReader: async () => OWNER_SOURCE, poolFactory: pools.factory });
  assert.deepEqual(result.prestate, { ownerIdentityMatched: true, databaseMatched: true, tls: true, schemaAbsent: true, migrationRecordAbsent: true, targetRolesAbsent: true, ownerCreateRoleAttribute: false, ownerNeonAdminMember: true });
  assert.ok(pools.calls.includes('BEGIN READ ONLY')); assert.ok(pools.calls.includes('ROLLBACK'));
  assert.equal(pools.calls.some((sql) => /CREATE|INSERT|UPDATE|DELETE|GRANT|REVOKE|ALTER/.test(sql)), false);
  assert.doesNotMatch(JSON.stringify(result), /owner-secret|ep-safe|postgresql:\/\//);
});

test('schema evaluation reports exact named postconditions', () => {
  const state = {
    roleSecurity: [], schemaOwnerMatched: true, tableOwnersMatched: true, functionOwnerMatched: true,
    ownerCreatorMembershipSafe: true, tableNames: ['historical_enrichment_requests','ingestion_outbox','normalized_sources','persistence_audit_events','persistence_transactions','schema_migrations','source_evidence_provenance'],
    constraintTypes: ['CHECK','FOREIGN KEY','PRIMARY KEY','UNIQUE'], auditTriggerPresent: true, migrationRecordMatched: true,
    runtimeSchemaUsage: true, runtimeSchemaCreate: false, runtimeAcl: Object.fromEntries(runtimeAclRows().reduce((map, row) => { const values = map.get(row.table_name) ?? []; values.push(row.privilege_type); map.set(row.table_name, values); return map; }, new Map<string,string[]>())) as Record<string,string[]>,
    runtimeSequenceGrantCount: 0, runtimeFunctionGrantCount: 0, publicSchemaUsage: false, publicSchemaCreate: false,
    publicTableGrantCount: 0, publicSequenceGrantCount: 0, publicFunctionGrantCount: 0,
    businessRows: { historical_enrichment_requests: 0, ingestion_outbox: 0, normalized_sources: 0, persistence_audit_events: 0, persistence_transactions: 0, source_evidence_provenance: 0 },
  };
  state.runtimeAcl.schema_migrations = [];
  assert.equal(evaluateProductionSchemaState(state).valid, true);
  state.publicTableGrantCount = 1;
  const failed = evaluateProductionSchemaState(state);
  assert.equal(failed.valid, false); assert.equal(failed.checks.publicObjectGrantsAbsent, false);
});

test('Vercel creation is exact, sensitive, production-only, and no-overwrite', async () => {
  const boundary = new MockVercel(); const counters = emptyEffects();
  const rows = await configureSensitiveVercelEnvironment(boundary, { runtime: 'postgresql://runtime', migration: 'postgresql://migration' }, counters);
  assert.deepEqual(boundary.added, ['FANDEX_RUNTIME_DATABASE_URL','FANDEX_MIGRATION_DATABASE_URL']);
  assert.ok(rows.every((row) => row.sensitive && row.scope[0] === 'production'));
  assert.equal(counters.vercelEnvCreates, 2);
  await assert.rejects(configureSensitiveVercelEnvironment(boundary, { runtime: 'postgresql://runtime', migration: 'postgresql://migration' }, counters), /vercel_target_env_already_exists/);
});

test('read-only Vercel inspection returns only sanitized owner metadata', async () => {
  const boundary = new MockVercel();
  boundary.rows.push({ name: 'UNRELATED', scope: ['production'], sensitive: false });
  assert.deepEqual(await inspectVercelProductionEnvironment(boundary), ownerMetadata);
  assert.deepEqual(boundary.added, []); assert.deepEqual(boundary.removed, []);
});

test('compensation removes only newly targeted env names and preserves owner env', async () => {
  const boundary = new MockVercel(); const counters = emptyEffects();
  boundary.rows.push({ name: 'FANDEX_RUNTIME_DATABASE_URL', scope: ['production'], sensitive: true });
  const result = await compensatePartialBootstrap(boundary, counters);
  assert.deepEqual(result, { complete: true, removed: ['FANDEX_RUNTIME_DATABASE_URL'] });
  assert.deepEqual(boundary.rows, ownerMetadata);
  assert.equal(counters.vercelEnvDeletes, 1);
});

test('full production orchestration succeeds against DB and Vercel mocks without business writes', async () => {
  const vercel = new MockVercel(); const pools = mockPoolFactory(); let deleted = 0;
  const result = await applyProductionRoleSchemaBootstrap({
    argv: FLAGS, vercel, ownerSourceReader: async () => OWNER_SOURCE, ownerSourceDelete: async () => { deleted += 1; }, poolFactory: pools.factory,
  });
  assert.equal(result.outcome, 'applied_and_verified');
  assert.equal(result.effects.productionRoleCreateStatements, 2);
  assert.equal(result.effects.productionTemporaryMembershipStatements, 2);
  assert.equal(result.effects.productionMigrationRecordWrites, 1);
  assert.equal(result.effects.vercelEnvCreates, 2);
  assert.equal(result.effects.businessRowWrites, 0);
  assert.equal(deleted, 1);
  assert.equal(pools.calls.filter((sql) => sql.startsWith('CREATE ROLE')).length, 2);
  assert.equal(pools.calls.some((sql) => /INSERT INTO fandex\.(normalized_sources|historical_enrichment_requests|source_evidence_provenance|persistence_transactions|persistence_audit_events|ingestion_outbox)/.test(sql)), false);
  const output = JSON.stringify(result);
  for (const forbidden of ['owner-secret','ep-safe','postgresql://']) assert.doesNotMatch(output.toLowerCase(), new RegExp(forbidden));
});

test('Vercel partial failure rolls back DB and compensates only created target env', async () => {
  const vercel = new MockVercel(); vercel.failOnAdd = 'FANDEX_MIGRATION_DATABASE_URL';
  const pools = mockPoolFactory(); let deleted = 0;
  await assert.rejects(applyProductionRoleSchemaBootstrap({
    argv: FLAGS, vercel, ownerSourceReader: async () => OWNER_SOURCE, ownerSourceDelete: async () => { deleted += 1; }, poolFactory: pools.factory,
  }), /production_stage_vercel_environment_failed/);
  assert.ok(pools.calls.includes('ROLLBACK'));
  assert.deepEqual(vercel.rows, ownerMetadata);
  assert.deepEqual(vercel.removed, ['FANDEX_RUNTIME_DATABASE_URL']);
  assert.equal(deleted, 0);
});

test('secret-bearing provider errors are reduced to a fixed code', async () => {
  const vercel = new MockVercel(); vercel.failOnAdd = 'FANDEX_RUNTIME_DATABASE_URL';
  const pools = mockPoolFactory();
  let message = '';
  try {
    await applyProductionRoleSchemaBootstrap({ argv: FLAGS, vercel, ownerSourceReader: async () => OWNER_SOURCE, poolFactory: pools.factory });
  } catch (error) { message = error instanceof Error ? error.message : ''; }
  assert.equal(message, 'production_stage_vercel_environment_failed');
  assert.doesNotMatch(message, /owner-secret|hidden|ep-safe|neondb/);
});

test('credential recovery requires all three flags and plan has zero effects', async () => {
  assert.deepEqual(validateProductionRecoveryAuthorization(RECOVERY_FLAGS), { authorized: true });
  for (const missing of RECOVERY_FLAGS) assert.throws(() => validateProductionRecoveryAuthorization(RECOVERY_FLAGS.filter((flag) => flag !== missing)), /production_recovery_authorization_required/);
  const plan = await buildProductionCredentialRecoveryPlan();
  assert.ok(Object.values(plan.effects).every((value) => value === 0));
  assert.equal(plan.passwordRotationLimit, 2); assert.equal(plan.vercelUpdateLimit, 2);
});

test('sanitized diagnostics preserve role endpoint stage SQLSTATE and retry attempt', async () => {
  let connects = 0;
  const pools = mockPoolFactory();
  const factory = (connectionString: string) => {
    const pool = pools.factory(connectionString);
    return {
      async connect() {
        connects += 1;
        if (connects < 3) throw Object.assign(new Error('contains secret URL and stack'), { code: '28P01' });
        return pool.connect();
      },
      async end() { await pool.end(); },
    } as unknown as Pool;
  };
  const result = await verifyRoleConnection('postgresql://fandex_runtime:synthetic@ep-safe-pooler.example.test/neondb', 'fandex_runtime', true, emptyEffects(), factory, async () => {});
  assert.equal(result.attempt, 3);
  assert.equal(connects, 3);

  const failing = (() => ({ async connect() { throw Object.assign(new Error('secret'), { code: 'ENOTFOUND' }); }, async end() {} })) as unknown as (value: string) => Pool;
  await assert.rejects(
    verifyRoleConnection('postgresql://fandex_migrator:synthetic@ep-safe.example.test/neondb', 'fandex_migrator', false, emptyEffects(), failing, async () => {}),
    (error: unknown) => {
      assert.ok(error instanceof RoleVerificationError);
      assert.deepEqual(error.diagnostic, { role_classification: 'migration', endpoint_classification: 'unpooled', stage: 'connect', category: 'dns', sqlstate: null, node_code: 'ENOTFOUND', attempt: 4, max_attempts: 4, retryable: false, timeout_observed: false });
      assert.doesNotMatch(JSON.stringify(error), /secret|ep-safe|postgresql|stack/i);
      return true;
    },
  );
});

test('timeout is classified and exhausted without unbounded retries', async () => {
  let connects = 0; let sleeps = 0;
  const failing = (() => ({ async connect() { connects += 1; throw Object.assign(new Error('hidden'), { code: 'ETIMEDOUT' }); }, async end() {} })) as unknown as (value: string) => Pool;
  await assert.rejects(
    verifyRoleConnection('postgresql://fandex_runtime:synthetic@ep-safe-pooler.example.test/neondb', 'fandex_runtime', true, emptyEffects(), failing, async () => { sleeps += 1; }),
    (error: unknown) => error instanceof RoleVerificationError && error.diagnostic.category === 'timeout' && error.diagnostic.timeout_observed && error.diagnostic.attempt === 7,
  );
  assert.equal(connects, 7); assert.equal(sleeps, 6);
});

test('postcondition mismatch is non-retryable and keeps runtime classification', async () => {
  const pools = mockPoolFactory(); let connects = 0;
  const factory = (connectionString: string) => {
    const pool = pools.factory(connectionString);
    return {
      async connect() { connects += 1; const client = await pool.connect() as unknown as { connection: { stream: { encrypted: boolean } } }; client.connection.stream.encrypted = false; return client; },
      async end() { await pool.end(); },
    } as unknown as Pool;
  };
  await assert.rejects(
    verifyRoleConnection('postgresql://fandex_runtime:synthetic@ep-safe-pooler.example.test/neondb', 'fandex_runtime', true, emptyEffects(), factory, async () => {}),
    (error: unknown) => error instanceof RoleVerificationError && error.diagnostic.stage === 'postcondition' && error.diagnostic.category === 'postcondition' && !error.diagnostic.retryable,
  );
  assert.equal(connects, 1);
});

test('Vercel stdin boundary sends exact synthetic bytes without newline', () => {
  let received: string | undefined;
  endStdinExact({ end(value?: unknown) { received = String(value); return {} as never; } }, 'synthetic-value');
  assert.equal(received, 'synthetic-value'); assert.equal(received.endsWith('\n'), false); assert.equal(received.endsWith('\r'), false);
});

test('recovery reuses one generated pair for exactly two rotations, two updates, and ordered verification', async () => {
  const vercel = new MockVercel();
  vercel.rows.push(
    { name: 'FANDEX_MIGRATION_DATABASE_URL', scope: ['production'], sensitive: true },
    { name: 'FANDEX_RUNTIME_DATABASE_URL', scope: ['production'], sensitive: true },
  );
  const pools = mockPoolFactory(); let deleted = 0; let consumed = false;
  const result = await recoverProductionRoleCredentials({
    argv: RECOVERY_FLAGS, vercel, ownerSourceReader: async () => OWNER_SOURCE, ownerSourceDelete: async () => { deleted += 1; }, poolFactory: pools.factory, sleeper: async () => {},
    credentialFactory: () => ({ consumeOnce() { assert.equal(consumed, false); consumed = true; return { fandex_migrator: 'synthetic-migration', fandex_runtime: 'synthetic-runtime' }; }, toJSON: () => ({ credentialValues: 'redacted' as const, credentialValueCount: 2 as const }) }),
  });
  assert.equal(result.outcome, 'credentials_recovered_and_verified');
  assert.deepEqual(result.verification.map((row) => [row.role,row.attempt]), [['fandex_migrator',1],['fandex_runtime',1]]);
  assert.equal(pools.calls.filter((sql) => sql.startsWith('ALTER ROLE')).length, 2);
  assert.equal(pools.calls.filter((sql) => /^(CREATE|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE)\b/.test(sql.trim())).length, 0);
  assert.deepEqual(vercel.updated, ['FANDEX_MIGRATION_DATABASE_URL','FANDEX_RUNTIME_DATABASE_URL']);
  const migrationConnection = pools.connectionStrings.find((value) => decodeURIComponent(new URL(value).username) === 'fandex_migrator');
  const runtimeConnection = pools.connectionStrings.find((value) => decodeURIComponent(new URL(value).username) === 'fandex_runtime');
  assert.equal(decodeURIComponent(new URL(migrationConnection as string).password), 'synthetic-migration');
  assert.equal(decodeURIComponent(new URL(runtimeConnection as string).password), 'synthetic-runtime');
  assert.ok(pools.calls.some((sql) => sql.includes("PASSWORD 'synthetic-migration'")));
  assert.ok(pools.calls.some((sql) => sql.includes("PASSWORD 'synthetic-runtime'")));
  assert.equal(result.effects.productionPasswordRotationStatements, 2); assert.equal(result.effects.vercelEnvUpdates, 2);
  assert.equal(result.effects.productionSchemaWriteBatches, 0); assert.equal(result.effects.productionMigrationRecordWrites, 0); assert.equal(result.effects.businessRowWrites, 0);
  assert.equal(deleted, 1);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-|postgresql:\/\//i);
});

test('partial Vercel recovery failure preserves source and performs no second rotation', async () => {
  const vercel = new MockVercel();
  vercel.rows.push(
    { name: 'FANDEX_MIGRATION_DATABASE_URL', scope: ['production'], sensitive: true },
    { name: 'FANDEX_RUNTIME_DATABASE_URL', scope: ['production'], sensitive: true },
  );
  vercel.failOnUpdate = 'FANDEX_RUNTIME_DATABASE_URL';
  const pools = mockPoolFactory(); let deleted = 0; let generations = 0;
  await assert.rejects(recoverProductionRoleCredentials({
    argv: RECOVERY_FLAGS, vercel, ownerSourceReader: async () => OWNER_SOURCE, ownerSourceDelete: async () => { deleted += 1; }, poolFactory: pools.factory,
    credentialFactory: () => { generations += 1; return generateRoleCredentials(); }, sleeper: async () => {},
  }), (error: unknown) => {
    assert.equal((error as { progress: { password_rotations: number; vercel_updates: string[]; db_committed: boolean } }).progress.password_rotations, 2);
    assert.deepEqual((error as { progress: { vercel_updates: string[] } }).progress.vercel_updates, ['FANDEX_MIGRATION_DATABASE_URL']);
    assert.equal((error as { progress: { db_committed: boolean } }).progress.db_committed, false);
    assert.doesNotMatch(JSON.stringify(error), /owner-secret|ep-safe|postgresql:\/\/|hidden/i);
    return true;
  });
  assert.equal(generations, 1); assert.equal(pools.calls.filter((sql) => sql.startsWith('ALTER ROLE')).length, 2); assert.equal(deleted, 0);
});

test('corrected role visibility accepts owner 7, migrator 7, and runtime exact 6 without schema_migrations', async () => {
  const pools = mockPoolFactory();
  const migrator = await verifyRoleConnection('postgresql://fandex_migrator:synthetic@ep-safe.example.test/neondb', 'fandex_migrator', false, emptyEffects(), pools.factory, async () => {});
  const runtime = await verifyRoleConnection('postgresql://fandex_runtime:synthetic@ep-safe-pooler.example.test/neondb', 'fandex_runtime', true, emptyEffects(), pools.factory, async () => {});
  assert.equal(migrator.schemaObjectsMatched, true); assert.equal(runtime.schemaObjectsMatched, true);
  assert.ok(pools.calls.some((sql) => sql.includes('ARRAY(SELECT table_name::text FROM information_schema.tables')));
});

test('runtime unexpected visible table fails after connect identity and privilege queries', async () => {
  const base = mockPoolFactory();
  const factory = (connectionString: string) => {
    const pool = base.factory(connectionString);
    return {
      async connect() {
        const client = await pool.connect(); const query = client.query.bind(client);
        client.query = (async (sql: string, values?: unknown[]) => {
          const result = await query(sql, values);
          if (sql.includes('AS visible_tables')) result.rows[0].visible_tables.push('schema_migrations');
          return result;
        }) as typeof client.query;
        return client;
      },
      async end() { await pool.end(); },
    } as Pool;
  };
  await assert.rejects(verifyRoleConnection('postgresql://fandex_runtime:synthetic@ep-safe-pooler.example.test/neondb', 'fandex_runtime', true, emptyEffects(), factory, async () => {}),
    (error: unknown) => error instanceof RoleVerificationError && error.diagnostic.stage === 'postcondition' && !error.diagnostic.retryable);
  const identityIndex = base.calls.findIndex((sql) => sql.includes('current_user=$1 AS identity_match'));
  const privilegeIndex = base.calls.findIndex((sql) => sql.includes('has_schema_privilege'));
  const postconditionIndex = base.calls.findIndex((sql) => sql.includes('AS visible_tables'));
  assert.ok(identityIndex >= 0 && privilegeIndex > identityIndex && postconditionIndex > privilegeIndex);
});

test('recorded evidence is strictly reclassified without reconnect or additional effects', async () => {
  const classified = classifyRecordedProductionRecoveryEvidence(RECORDED_RECOVERY_EVIDENCE);
  assert.equal(classified.runtime.credential_authentication_verified, true);
  assert.equal(classified.runtime.connection_verified, true);
  assert.equal(classified.runtime.identity_query_verified, true);
  assert.equal(classified.runtime.privilege_query_verified, true);
  assert.equal(classified.runtime.original_postcondition_valid, false);
  assert.equal(classified.runtime.verifier_defect_confirmed, true);
  assert.equal(classified.runtime.fresh_role_reconnect_performed, false);
  assert.equal(classified.runtime.additional_rotation_performed, false);
  const invalid = structuredClone(RECORDED_RECOVERY_EVIDENCE) as unknown as { runtime_diagnostic: { stage: string } };
  invalid.runtime_diagnostic.stage = 'connect';
  assert.throws(() => classifyRecordedProductionRecoveryEvidence(invalid as unknown as typeof RECORDED_RECOVERY_EVIDENCE), /recorded_recovery_evidence_mismatch/);
});

test('finalization plan and recorded-evidence result are deterministic and mutation-free', async () => {
  const firstPlan = await buildProductionBootstrapFinalizationPlan(); const secondPlan = await buildProductionBootstrapFinalizationPlan();
  assert.equal(JSON.stringify(firstPlan), JSON.stringify(secondPlan)); assert.ok(Object.values(firstPlan.effects).every((value) => value === 0));
  const run = async () => {
    const pools = mockPoolFactory(); const vercel = new MockVercel();
    vercel.rows.push({ name: 'FANDEX_MIGRATION_DATABASE_URL', scope: ['production'], sensitive: true }, { name: 'FANDEX_RUNTIME_DATABASE_URL', scope: ['production'], sensitive: true });
    const result = await finalizeProductionBootstrapFromRecordedEvidence({ ownerSourceReader: async () => OWNER_SOURCE, poolFactory: pools.factory, vercel });
    assert.equal(pools.connectionStrings.length, 1); assert.equal(pools.calls.some((sql) => /^(ALTER|CREATE|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE)\b/.test(sql.trim())), false);
    assert.deepEqual(vercel.updated, []); assert.deepEqual(vercel.added, []); assert.deepEqual(vercel.removed, []);
    assert.equal(result.freshRoleReconnects, 0); assert.equal(result.additionalPasswordRotations, 0); assert.equal(result.additionalVercelUpdates, 0);
    return result;
  };
  assert.equal(JSON.stringify(await run()), JSON.stringify(await run()));
});

test('finalization rejects owner catalog object loss and excess runtime ACL', async () => {
  const makeVercel = () => { const vercel = new MockVercel(); vercel.rows.push({ name: 'FANDEX_MIGRATION_DATABASE_URL', scope: ['production'], sensitive: true }, { name: 'FANDEX_RUNTIME_DATABASE_URL', scope: ['production'], sensitive: true }); return vercel; };
  for (const mutation of ['missing-object','excess-acl'] as const) {
    const base = mockPoolFactory();
    const factory = (connectionString: string) => {
      const pool = base.factory(connectionString);
      return {
        async connect() {
          const client = await pool.connect(); const query = client.query.bind(client);
          client.query = (async (sql: string, values?: unknown[]) => {
            const result = await query(sql, values);
            if (mutation === 'missing-object' && sql.includes('c.relname AS table_name') && sql.includes('owner_match')) result.rows.pop();
            if (mutation === 'excess-acl' && sql.includes("grantee.rolname='fandex_runtime'")) result.rows.push({ table_name: 'persistence_audit_events', privilege_type: 'DELETE' });
            return result;
          }) as typeof client.query;
          return client;
        },
        async end() { await pool.end(); },
      } as Pool;
    };
    await assert.rejects(finalizeProductionBootstrapFromRecordedEvidence({ ownerSourceReader: async () => OWNER_SOURCE, poolFactory: factory, vercel: makeVercel() }));
    assert.equal(base.calls.some((sql) => /^(ALTER|CREATE|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE)\b/.test(sql.trim())), false);
  }
});
