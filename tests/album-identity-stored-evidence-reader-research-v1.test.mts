import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIuAlbumIdentityEvidencePersistenceCandidates,
  serializeAlbumIdentityPersistenceRecord,
} from '../lib/alternative-evidence/albumIdentityEvidencePersistenceResearch';
import type { AlbumIdentityResearchStoredRow } from '../lib/alternative-evidence/albumIdentityStoredEvidenceHydrationResearch';
import {
  ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR,
  readStoredAlbumIdentityAndBuildRetailFeaturesResearch,
  type AlbumIdentityResearchQueryExecutor,
} from '../lib/alternative-evidence/albumIdentityStoredEvidenceReaderResearch';
import { buildRetailObservation, RETAIL_OBSERVATION_CONTRACT_VERSION } from '../lib/alternative-evidence/retailObservation';
import { buildYes24ObservationEvidence } from '../lib/alternative-evidence/yes24RetailAdapter';

const authorization = Object.freeze({
  acquisition: 'allowed', automation: 'manual-only', rawStorage: 'not-applicable',
  normalizedStorage: 'allowed', retention: 'allowed', commercialUse: 'unknown',
  derivedPublication: 'unknown', rawRedistribution: 'not-applicable',
});

const allRows = (): readonly AlbumIdentityResearchStoredRow[] =>
  buildIuAlbumIdentityEvidencePersistenceCandidates({
    observedAt: '2026-09-17T00:00:00.000Z',
    collectedAt: '2026-09-17T00:00:01.000Z',
    authorizationSnapshot: authorization,
  }).map(serializeAlbumIdentityPersistenceRecord) as readonly AlbumIdentityResearchStoredRow[];

function lovePoemRows(): readonly AlbumIdentityResearchStoredRow[] {
  return allRows().filter((row) => {
    const payload = row.evidence_payload as { providerEntityId?: string };
    return (row.record_type === 'retail-product-release-mapping' && payload.providerEntityId === '82272556')
      || (row.record_type === 'canonical-release-reference'
        && row.fandex_release_id === 'research:iu:release:love-poem:2019-11-18');
  });
}

function observation() {
  return buildRetailObservation({
    contractVersion: RETAIL_OBSERVATION_CONTRACT_VERSION,
    retailerId: 'yes24', retailerProductId: '82272556',
    productIdentity: Object.freeze({ retailerId: 'yes24', retailerProductId: '82272556', identityState: 'candidate' as const }),
    fandexArtistId: null, fandexReleaseId: null, fandexReleaseFamilyId: null,
    retailerArtistText: 'IU', retailerTitle: 'Love poem', categoryFamily: 'music',
    providerCategoryId: '003001011', categoryResolutionState: 'resolved', chartType: 'daily',
    semantic: 'retail-rank', rank: 2, movement: null, providerIndex: null, providerIndexName: null,
    providerPeriod: '2026-09-17', providerPeriodState: 'resolved',
    providerPublishedAt: '2026-09-17T00:00:00.000Z', observedAt: '2026-09-17T00:00:00.000Z',
    collectedAt: '2026-09-17T00:00:02.000Z', sourceType: 'yes24-official-api',
    missingState: 'observed', syntheticFixture: false,
  });
}

test('reader contract is one-read research-only and does not reinterpret DB failure', () => {
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR.readOnly, true);
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR.maxDatabaseReadsPerBridge, 1);
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR.databaseReadFailureIsMissing, false);
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR.databaseReadFailureIsZero, false);
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR.productionEligible, false);
});

test('one parameterized DB read hydrates exact YES24 identity and builds research-only feature', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const executor: AlbumIdentityResearchQueryExecutor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: lovePoemRows() };
    },
  };
  const input = observation();
  const result = await readStoredAlbumIdentityAndBuildRetailFeaturesResearch(
    executor,
    input,
    buildYes24ObservationEvidence(input),
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, ['yes24', '82272556']);
  assert.match(calls[0].sql, /provider = \$1/);
  assert.match(calls[0].sql, /providerEntityId' = \$2/);
  assert.equal(result.effects.databaseReads, 1);
  assert.equal(result.effects.databaseWrites, 0);
  assert.equal(result.effects.externalCalls, 0);
  assert.equal(result.resolution.state, 'resolved-research');
  assert.equal(result.features[0].releaseId, 'research:iu:release:love-poem:2019-11-18');
  assert.equal(result.features[0].eligibilityState, 'research-only');
});

test('database transport failure is surfaced and never converted to Missing or zero', async () => {
  const executor: AlbumIdentityResearchQueryExecutor = {
    async query() {
      throw new Error('db-transport-failure');
    },
  };
  const input = observation();
  await assert.rejects(
    () => readStoredAlbumIdentityAndBuildRetailFeaturesResearch(
      executor,
      input,
      buildYes24ObservationEvidence(input),
    ),
    /db-transport-failure/,
  );
});

test('invalid stored authorization remains blocked after the DB read', async () => {
  const rows = lovePoemRows().map((row, index) => index === 0
    ? Object.freeze({ ...row, authorization_snapshot: Object.freeze({ ...authorization, retention: 'blocked' }) })
    : row);
  const executor: AlbumIdentityResearchQueryExecutor = {
    async query() { return { rows }; },
  };
  const input = observation();
  const result = await readStoredAlbumIdentityAndBuildRetailFeaturesResearch(
    executor,
    input,
    buildYes24ObservationEvidence(input),
  );
  assert.equal(result.effects.databaseReads, 1);
  assert.equal(result.resolution.state, 'blocked');
  assert.equal(result.features[0].releaseId, null);
  assert.ok(result.resolution.blockers.includes('stored-evidence-integrity-invalid'));
});
