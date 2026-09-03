import { sha256Canonical } from '../../shared/canonicalDigest';

export const ALBUM_PRODUCTION_MIGRATION_GATE_CONTRACT_VERSION =
  'album-production-migration-gate-v1' as const;

export const ALBUM_PRODUCTION_MIGRATION_TARGET = Object.freeze({
  provider: 'neon',
  projectId: 'wild-tree-38937656',
  projectName: 'fandex-managed-postgres',
  branchId: 'br-old-term-azv3tpra',
  branchName: 'main',
  databaseName: 'neondb',
  schemaName: 'fandex',
});

export const ALBUM_PRODUCTION_MIGRATION_FILES = Object.freeze({
  migration: Object.freeze({
    version: 3,
    path: 'database/migrations/003_album_research_observation_persistence.sql',
    sha256: '637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97',
  }),
  grant: Object.freeze({
    version: 2,
    path: 'database/grants/002_album_research_observation_writer.sql',
    sha256: 'a0fc93c537148794dc36182e3a8feb2ce0218c872237a989fa3a0e70fa793244',
  }),
});

export const ALBUM_PRODUCTION_MIGRATION_BASELINE = Object.freeze([
  Object.freeze({
    version: 1,
    sha256: '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a',
  }),
  Object.freeze({
    version: 2,
    sha256: '8951cd9ace8f30a586a23b5b813794560ea916798ae7c64e9542440ff1881aef',
  }),
] as const);

export type AlbumProductionMigrationTargetSnapshot = Readonly<{
  projectId: string;
  branchId: string;
  branchName: string;
  databaseName: string;
  schemaName: string;
}>;

export type AlbumProductionMigrationHistoryRow = Readonly<{
  version: number;
  sha256: string;
}>;

export type AlbumProductionMigrationRoleSnapshot = Readonly<{
  roleName: string;
  login: boolean;
  superuser: boolean;
  createDatabase: boolean;
  createRole: boolean;
  replication: boolean;
  bypassRls: boolean;
}>;

export type AlbumProductionMigrationPreflight = Readonly<{
  target: AlbumProductionMigrationTargetSnapshot;
  migrationSha256: string;
  grantSha256: string;
  migrationHistory: readonly AlbumProductionMigrationHistoryRow[];
  migration3Present: boolean;
  albumResearchTablePresent: boolean;
  schemaOwner: string;
  migrationRole: AlbumProductionMigrationRoleSnapshot;
  migrationConnectionRole: string;
  migrationConnectionMode: 'pooled' | 'unpooled';
}>;

export type AlbumProductionMigrationGateBlocker =
  | 'target-mismatch'
  | 'migration-digest-mismatch'
  | 'grant-digest-mismatch'
  | 'migration-history-mismatch'
  | 'migration-3-already-present'
  | 'album-research-table-already-present'
  | 'schema-owner-mismatch'
  | 'migration-role-state-invalid'
  | 'migration-connection-role-mismatch'
  | 'migration-connection-must-be-unpooled';

export type AlbumProductionMigrationGateResult = Readonly<{
  contractVersion: typeof ALBUM_PRODUCTION_MIGRATION_GATE_CONTRACT_VERSION;
  target: typeof ALBUM_PRODUCTION_MIGRATION_TARGET;
  migration: typeof ALBUM_PRODUCTION_MIGRATION_FILES.migration;
  grant: typeof ALBUM_PRODUCTION_MIGRATION_FILES.grant;
  blockers: readonly AlbumProductionMigrationGateBlocker[];
  eligibleForExplicitApproval: boolean;
  executionAuthorized: false;
  productionDataWriteAuthorized: false;
  productionPublicationAuthorized: false;
  commercialRightsCleared: false;
  gateDigest: string;
}>;

function targetMatches(snapshot: AlbumProductionMigrationTargetSnapshot): boolean {
  return snapshot.projectId === ALBUM_PRODUCTION_MIGRATION_TARGET.projectId
    && snapshot.branchId === ALBUM_PRODUCTION_MIGRATION_TARGET.branchId
    && snapshot.branchName === ALBUM_PRODUCTION_MIGRATION_TARGET.branchName
    && snapshot.databaseName === ALBUM_PRODUCTION_MIGRATION_TARGET.databaseName
    && snapshot.schemaName === ALBUM_PRODUCTION_MIGRATION_TARGET.schemaName;
}

function migrationHistoryMatches(rows: readonly AlbumProductionMigrationHistoryRow[]): boolean {
  const normalized = [...rows]
    .map((row) => ({ version: row.version, sha256: row.sha256 }))
    .sort((left, right) => left.version - right.version);
  return normalized.length === ALBUM_PRODUCTION_MIGRATION_BASELINE.length
    && normalized.every((row, index) => {
      const expected = ALBUM_PRODUCTION_MIGRATION_BASELINE[index];
      return row.version === expected.version && row.sha256 === expected.sha256;
    });
}

function migrationRoleIsSafe(role: AlbumProductionMigrationRoleSnapshot): boolean {
  return role.roleName === 'fandex_migrator'
    && role.login
    && !role.superuser
    && !role.createDatabase
    && !role.createRole
    && !role.replication
    && !role.bypassRls;
}

export function evaluateAlbumProductionMigrationPreflight(
  preflight: AlbumProductionMigrationPreflight,
): AlbumProductionMigrationGateResult {
  const blockers: AlbumProductionMigrationGateBlocker[] = [];
  if (!targetMatches(preflight.target)) blockers.push('target-mismatch');
  if (preflight.migrationSha256 !== ALBUM_PRODUCTION_MIGRATION_FILES.migration.sha256) {
    blockers.push('migration-digest-mismatch');
  }
  if (preflight.grantSha256 !== ALBUM_PRODUCTION_MIGRATION_FILES.grant.sha256) {
    blockers.push('grant-digest-mismatch');
  }
  if (!migrationHistoryMatches(preflight.migrationHistory)) blockers.push('migration-history-mismatch');
  if (preflight.migration3Present) blockers.push('migration-3-already-present');
  if (preflight.albumResearchTablePresent) blockers.push('album-research-table-already-present');
  if (preflight.schemaOwner !== 'fandex_migrator') blockers.push('schema-owner-mismatch');
  if (!migrationRoleIsSafe(preflight.migrationRole)) blockers.push('migration-role-state-invalid');
  if (preflight.migrationConnectionRole !== 'fandex_migrator') {
    blockers.push('migration-connection-role-mismatch');
  }
  if (preflight.migrationConnectionMode !== 'unpooled') {
    blockers.push('migration-connection-must-be-unpooled');
  }

  const gatePayload = Object.freeze({
    contractVersion: ALBUM_PRODUCTION_MIGRATION_GATE_CONTRACT_VERSION,
    target: ALBUM_PRODUCTION_MIGRATION_TARGET,
    migration: ALBUM_PRODUCTION_MIGRATION_FILES.migration,
    grant: ALBUM_PRODUCTION_MIGRATION_FILES.grant,
    baseline: ALBUM_PRODUCTION_MIGRATION_BASELINE,
    blockers: Object.freeze([...blockers].sort()),
    eligibleForExplicitApproval: blockers.length === 0,
    executionAuthorized: false as const,
    productionDataWriteAuthorized: false as const,
    productionPublicationAuthorized: false as const,
    commercialRightsCleared: false as const,
  });

  return Object.freeze({
    contractVersion: gatePayload.contractVersion,
    target: gatePayload.target,
    migration: gatePayload.migration,
    grant: gatePayload.grant,
    blockers: gatePayload.blockers,
    eligibleForExplicitApproval: gatePayload.eligibleForExplicitApproval,
    executionAuthorized: false,
    productionDataWriteAuthorized: false,
    productionPublicationAuthorized: false,
    commercialRightsCleared: false,
    gateDigest: sha256Canonical(gatePayload),
  });
}

export type AlbumProductionMigrationPostcondition = Readonly<{
  target: AlbumProductionMigrationTargetSnapshot;
  migration3Sha256: string | null;
  albumResearchTablePresent: boolean;
  tableOwner: string | null;
  mutationTriggerEnabled: boolean;
  runtimeSelect: boolean;
  runtimeInsert: boolean;
  runtimeUpdate: boolean;
  runtimeDelete: boolean;
  rowCount: number;
}>;

export type AlbumProductionMigrationPostconditionResult = Readonly<{
  valid: boolean;
  issues: readonly string[];
}>;

export function validateAlbumProductionMigrationPostcondition(
  postcondition: AlbumProductionMigrationPostcondition,
): AlbumProductionMigrationPostconditionResult {
  const issues: string[] = [];
  if (!targetMatches(postcondition.target)) issues.push('target-mismatch');
  if (postcondition.migration3Sha256 !== ALBUM_PRODUCTION_MIGRATION_FILES.migration.sha256) {
    issues.push('migration-3-digest-mismatch');
  }
  if (!postcondition.albumResearchTablePresent) issues.push('album-research-table-missing');
  if (postcondition.tableOwner !== 'fandex_migrator') issues.push('table-owner-mismatch');
  if (!postcondition.mutationTriggerEnabled) issues.push('append-only-trigger-missing');
  if (!postcondition.runtimeSelect) issues.push('runtime-select-missing');
  if (!postcondition.runtimeInsert) issues.push('runtime-insert-missing');
  if (postcondition.runtimeUpdate) issues.push('runtime-update-must-be-denied');
  if (postcondition.runtimeDelete) issues.push('runtime-delete-must-be-denied');
  if (!Number.isSafeInteger(postcondition.rowCount) || postcondition.rowCount !== 0) {
    issues.push('migration-must-not-seed-research-records');
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues.sort()) });
}
