import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDirectAlbumObservation,
  DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
  type DirectAlbumObservationDraft,
} from '../lib/alternative-evidence/directAlbumProvider';
import type { LuminateFandexAuthorizationGrant } from '../lib/alternative-evidence/luminateAlbumAuthorizationResearch';
import {
  ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION,
  buildLuminateObservationStoredRow,
  buildLuminateObservationStoreProviderConstraintMigrationSql,
  evaluateLuminateObservationIntake,
  LUMINATE_ALBUM_OBSERVATION_STORE_SCHEMA_RESEARCH,
} from '../lib/alternative-evidence/luminateAlbumObservationIntakeResearch';

function grant(overrides: Partial<LuminateFandexAuthorizationGrant> = {}): LuminateFandexAuthorizationGrant {
  return {
    agreementKind: 'order-form',
    agreementEvidenceId: 'licensed-order-form-evidence',
    licenseActive: true,
    physicalProductSalesIncluded: 'expressly-allowed',
    authorizedTerritories: ['US'],
    apiOrDataShareAccess: 'expressly-allowed',
    recurringProgrammaticCollection: 'expressly-allowed',
    normalizedStorage: 'expressly-allowed',
    retentionDuringLicense: 'expressly-allowed',
    commercialProductUse: 'expressly-allowed',
    publicOutputMode: 'derived-metric-only',
    publicDerivedMetricPublication: 'expressly-allowed',
    publicRankingOrBenchmarking: 'not-addressed',
    rawRedistribution: 'not-addressed',
    postTerminationPolicy: 'delete-source-and-retract-provider-derived-output',
    postTerminationPolicyEvidenceId: 'licensed-termination-policy-evidence',
    ...overrides,
  };
}

function observation(overrides: Partial<DirectAlbumObservationDraft> = {}) {
  return buildDirectAlbumObservation({
    contractVersion: DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
    providerId: 'luminate-music',
    providerObservationId: 'luminate:test:iu:the-winning:us:first-week',
    providerArtistId: 'luminate:artist:iu',
    providerReleaseId: 'luminate:release:the-winning',
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: 'iu',
    fandexReleaseId: 'research:iu:release:the-winning:2024-02-20',
    fandexReleaseFamilyId: 'research:iu:release-family:the-winning',
    semantic: 'first-week-sale',
    value: 250000,
    unit: 'physical-units',
    territory: 'US',
    format: 'physical',
    providerPeriod: '2024-02-20/2024-02-26',
    providerPublishedAt: null,
    observedAt: '2026-09-17T12:00:00.000Z',
    collectedAt: '2026-09-17T12:00:00.000Z',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'release-total',
    parentObservationId: null,
    syntheticFixture: false,
    ...overrides,
  });
}

test('main Neon provider allowlist now includes Luminate and no further provider extension is required', () => {
  const schema = LUMINATE_ALBUM_OBSERVATION_STORE_SCHEMA_RESEARCH;
  assert.deepEqual(schema.observedMainSchemaProviderConstraint, [
    'circle-chart',
    'hanteo-chart',
    'luminate-music',
  ]);
  assert.equal(schema.requiredProviderId, 'luminate-music');
  assert.equal(schema.providerConstraintExtensionRequired, false);
  assert.equal(schema.mainDatabaseProviderConstraintVerified, true);
  assert.equal(schema.mainDatabaseProviderConstraintMigrationApplied, true);
  assert.equal(schema.mainDatabaseMutatedByThisContract, false);
  assert.equal(schema.migrationApplicationRequiresExplicitApproval, false);
  assert.equal(schema.historicalMigrationSqlRetainedForAudit, true);

  const sql = buildLuminateObservationStoreProviderConstraintMigrationSql();
  assert.match(sql, /DROP CONSTRAINT album_research_observation_records_provider_check/);
  assert.match(sql, /'circle-chart'/);
  assert.match(sql, /'hanteo-chart'/);
  assert.match(sql, /'luminate-music'/);
});

test('an explicit schema-state mismatch remains fail-closed even though main is now migrated', () => {
  const assessment = evaluateLuminateObservationIntake({
    observation: observation(),
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: false,
  });

  assert.equal(assessment.authorizationState, 'eligible-for-provider-onboarding-review');
  assert.equal(assessment.schemaState, 'migration-required');
  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('luminate-provider-not-allowed-by-observation-store-schema'));
});

test('authorized exact-scope Luminate first-week observation becomes store-write-review eligible with schema support', () => {
  const input = {
    observation: observation(),
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
  } as const;
  const assessment = evaluateLuminateObservationIntake(input);
  assert.equal(assessment.state, 'eligible-for-research-store-write-review');
  assert.equal(assessment.schemaState, 'ready');
  assert.equal(assessment.expectedProviderPeriod, '2024-02-20/2024-02-26');
  assert.deepEqual(assessment.blockers, []);

  const row = buildLuminateObservationStoredRow(input);
  assert.equal(row.record_version, ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION);
  assert.equal(row.provider, 'luminate-music');
  assert.equal(row.provider_period, '2024-02-20/2024-02-26');
  assert.equal(row.record_state, 'original');
  assert.equal(row.supersedes_record_id, null);
  assert.equal(row.authorization_snapshot.agreementEvidenceId, 'licensed-order-form-evidence');
  assert.equal(row.authorization_snapshot.derivedPublication, 'allowed');
  for (const digest of [
    row.record_id,
    row.source_entity_id,
    row.source_record_id,
    row.observation_id,
    row.payload_digest,
    row.intake_plan_digest,
    row.write_grant_digest,
  ]) {
    assert.match(digest, /^[0-9a-f]{64}$/);
  }
});

test('territory and release-relative provider period must match the executed grant and Luminate period contract', () => {
  const unauthorizedTerritory = evaluateLuminateObservationIntake({
    observation: observation({ territory: 'CA' }),
    releaseDate: '2024-02-20',
    grant: grant({ authorizedTerritories: ['US'] }),
    schemaProviderConstraintIncludesLuminate: true,
  });
  assert.ok(unauthorizedTerritory.blockers.includes('luminate-observation-territory-not-authorized'));

  const wrongPeriod = evaluateLuminateObservationIntake({
    observation: observation({ providerPeriod: '2024-02-19/2024-02-25' }),
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
  });
  assert.ok(wrongPeriod.blockers.includes('luminate-provider-period-mismatch'));
});

test('release-total lineage and non-synthetic evidence are required for a first-week absolute store candidate', () => {
  const child = evaluateLuminateObservationIntake({
    observation: observation({ scopeRole: 'child-sku', parentObservationId: 'parent-observation' }),
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
  });
  assert.ok(child.blockers.includes('luminate-release-total-scope-required'));
  assert.ok(child.blockers.includes('luminate-release-total-parent-must-be-null'));

  const synthetic = evaluateLuminateObservationIntake({
    observation: observation({ syntheticFixture: true }),
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
  });
  assert.ok(synthetic.blockers.includes('luminate-synthetic-fixture-not-store-write-eligible'));
});

test('revision observation lineage and stored-record lineage remain distinct', () => {
  const original = observation();
  const revised = observation({
    providerObservationId: 'luminate:test:iu:the-winning:us:first-week:revision-1',
    value: 249500,
    revisionId: 'luminate-revision-1',
    revisionObservedAt: '2026-09-18T12:00:00.000Z',
    supersedesObservationId: original.observationId,
    observedAt: '2026-09-18T12:00:00.000Z',
    collectedAt: '2026-09-18T12:00:00.000Z',
  });
  const missingStoredLineage = evaluateLuminateObservationIntake({
    observation: revised,
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
  });
  assert.ok(missingStoredLineage.blockers.includes('luminate-superseded-stored-record-id-required'));

  const previousStoredRecordId = 'a'.repeat(64);
  const row = buildLuminateObservationStoredRow({
    observation: revised,
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
    supersedesStoredRecordId: previousStoredRecordId,
  });
  assert.equal(row.record_state, 'revised');
  assert.equal(row.supersedes_record_id, previousStoredRecordId);
  assert.equal(row.observation_payload.supersedesObservationId, original.observationId);
  assert.notEqual(row.supersedes_record_id, row.observation_payload.supersedesObservationId);
});
