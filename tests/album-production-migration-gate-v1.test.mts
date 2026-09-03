import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALBUM_PRODUCTION_MIGRATION_BASELINE,
  ALBUM_PRODUCTION_MIGRATION_FILES,
  ALBUM_PRODUCTION_MIGRATION_GATE_CONTRACT_VERSION,
  ALBUM_PRODUCTION_MIGRATION_TARGET,
  evaluateAlbumProductionMigrationPreflight,
  validateAlbumProductionMigrationPostcondition,
  type AlbumProductionMigrationPreflight,
} from '../lib/server/ingestion/albumProductionMigrationGate';

const SAFE_MIGRATOR = Object.freeze({
  roleName: 'fandex_migrator',
  login: true,
  superuser: false,
  createDatabase: false,
  createRole: false,
  replication: false,
  bypassRls: false,
});

function preflight(overrides: Partial<AlbumProductionMigrationPreflight> = {}): AlbumProductionMigrationPreflight {
  return Object.freeze({
    target: Object.freeze({
      projectId: ALBUM_PRODUCTION_MIGRATION_TARGET.projectId,
      branchId: ALBUM_PRODUCTION_MIGRATION_TARGET.branchId,
      branchName: ALBUM_PRODUCTION_MIGRATION_TARGET.branchName,
      databaseName: ALBUM_PRODUCTION_MIGRATION_TARGET.databaseName,
      schemaName: ALBUM_PRODUCTION_MIGRATION_TARGET.schemaName,
    }),
    migrationSha256: ALBUM_PRODUCTION_MIGRATION_FILES.migration.sha256,
    grantSha256: ALBUM_PRODUCTION_MIGRATION_FILES.grant.sha256,
    migrationHistory: ALBUM_PRODUCTION_MIGRATION_BASELINE.map((row) => ({
      version: row.version,
      sha256: row.sha256,
    })),
    migration3Present: false,
    albumResearchTablePresent: false,
    schemaOwner: 'fandex_migrator',
    migrationRole: SAFE_MIGRATOR,
    migrationConnectionRole: 'fandex_migrator',
    migrationConnectionMode: 'unpooled',
    ...overrides,
  });
}

test('contract pins target and exact migration/grant digests', () => {
  assert.equal(ALBUM_PRODUCTION_MIGRATION_GATE_CONTRACT_VERSION, 'album-production-migration-gate-v1');
  assert.equal(ALBUM_PRODUCTION_MIGRATION_TARGET.projectName, 'fandex-managed-postgres');
  assert.equal(ALBUM_PRODUCTION_MIGRATION_TARGET.branchName, 'main');
  assert.equal(ALBUM_PRODUCTION_MIGRATION_FILES.migration.version, 3);
  assert.match(ALBUM_PRODUCTION_MIGRATION_FILES.migration.sha256, /^[0-9a-f]{64}$/);
  assert.match(ALBUM_PRODUCTION_MIGRATION_FILES.grant.sha256, /^[0-9a-f]{64}$/);
});

test('exact current production preflight is eligible only for explicit approval', () => {
  const result = evaluateAlbumProductionMigrationPreflight(preflight());
  assert.deepEqual(result.blockers, []);
  assert.equal(result.eligibleForExplicitApproval, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.productionDataWriteAuthorized, false);
  assert.equal(result.productionPublicationAuthorized, false);
  assert.equal(result.commercialRightsCleared, false);
  assert.match(result.gateDigest, /^[0-9a-f]{64}$/);
});

test('wrong migration or grant digest fails closed', () => {
  const migration = evaluateAlbumProductionMigrationPreflight(preflight({ migrationSha256: '0'.repeat(64) }));
  assert.deepEqual(migration.blockers, ['migration-digest-mismatch']);
  const grant = evaluateAlbumProductionMigrationPreflight(preflight({ grantSha256: '0'.repeat(64) }));
  assert.deepEqual(grant.blockers, ['grant-digest-mismatch']);
});

test('unexpected migration history, preexisting migration 3, or table blocks application', () => {
  const history = evaluateAlbumProductionMigrationPreflight(preflight({ migrationHistory: [] }));
  assert.deepEqual(history.blockers, ['migration-history-mismatch']);
  const version3 = evaluateAlbumProductionMigrationPreflight(preflight({ migration3Present: true }));
  assert.deepEqual(version3.blockers, ['migration-3-already-present']);
  const table = evaluateAlbumProductionMigrationPreflight(preflight({ albumResearchTablePresent: true }));
  assert.deepEqual(table.blockers, ['album-research-table-already-present']);
});

test('migration must use exact fandex_migrator unpooled connection', () => {
  const role = evaluateAlbumProductionMigrationPreflight(preflight({ migrationConnectionRole: 'neondb_owner' }));
  assert.deepEqual(role.blockers, ['migration-connection-role-mismatch']);
  const pool = evaluateAlbumProductionMigrationPreflight(preflight({ migrationConnectionMode: 'pooled' }));
  assert.deepEqual(pool.blockers, ['migration-connection-must-be-unpooled']);
});

test('unsafe migrator role or wrong schema owner blocks application', () => {
  const owner = evaluateAlbumProductionMigrationPreflight(preflight({ schemaOwner: 'neondb_owner' }));
  assert.deepEqual(owner.blockers, ['schema-owner-mismatch']);
  const unsafe = evaluateAlbumProductionMigrationPreflight(preflight({
    migrationRole: Object.freeze({ ...SAFE_MIGRATOR, superuser: true }),
  }));
  assert.deepEqual(unsafe.blockers, ['migration-role-state-invalid']);
});

test('equivalent preflights produce deterministic gate digest', () => {
  const left = evaluateAlbumProductionMigrationPreflight(preflight());
  const right = evaluateAlbumProductionMigrationPreflight(preflight({
    migrationHistory: [...ALBUM_PRODUCTION_MIGRATION_BASELINE].reverse().map((row) => ({
      version: row.version,
      sha256: row.sha256,
    })),
  }));
  assert.equal(left.gateDigest, right.gateDigest);
});

test('postcondition requires empty append-only table with least privilege', () => {
  const result = validateAlbumProductionMigrationPostcondition(Object.freeze({
    target: preflight().target,
    migration3Sha256: ALBUM_PRODUCTION_MIGRATION_FILES.migration.sha256,
    albumResearchTablePresent: true,
    tableOwner: 'fandex_migrator',
    mutationTriggerEnabled: true,
    runtimeSelect: true,
    runtimeInsert: true,
    runtimeUpdate: false,
    runtimeDelete: false,
    rowCount: 0,
  }));
  assert.deepEqual(result, { valid: true, issues: [] });
});

test('postcondition rejects data seeding or broadened runtime privilege', () => {
  const result = validateAlbumProductionMigrationPostcondition(Object.freeze({
    target: preflight().target,
    migration3Sha256: ALBUM_PRODUCTION_MIGRATION_FILES.migration.sha256,
    albumResearchTablePresent: true,
    tableOwner: 'fandex_migrator',
    mutationTriggerEnabled: true,
    runtimeSelect: true,
    runtimeInsert: true,
    runtimeUpdate: true,
    runtimeDelete: false,
    rowCount: 1,
  }));
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, [
    'migration-must-not-seed-research-records',
    'runtime-update-must-be-denied',
  ]);
});
