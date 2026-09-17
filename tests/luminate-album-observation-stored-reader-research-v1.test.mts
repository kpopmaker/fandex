import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readStoredIuLuminateNormalizationResearch,
  IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL,
  LUMINATE_ALBUM_OBSERVATION_STORED_READER_RESEARCH_DESCRIPTOR,
  type LuminateAlbumObservationResearchQueryExecutor,
} from '../lib/alternative-evidence/luminateAlbumObservationStoredReaderResearch';
import type { LuminateFandexAuthorizationGrant } from '../lib/alternative-evidence/luminateAlbumAuthorizationResearch';
import {
  buildLuminateObservationStoredRow,
  type LuminateAlbumObservationStoredRow,
} from '../lib/alternative-evidence/luminateAlbumObservationIntakeResearch';
import {
  buildDirectAlbumObservation,
  DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  IU_PIECES_RELEASE_FAMILY_ID,
  IU_PIECES_RELEASE_ID,
} from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import {
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
} from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

function grant(): LuminateFandexAuthorizationGrant {
  return {
    agreementKind: 'order-form',
    agreementEvidenceId: 'test-only-executed-agreement',
    licenseActive: true,
    physicalProductSalesIncluded: 'expressly-allowed',
    authorizedTerritories: ['US', 'CA'],
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
    postTerminationPolicyEvidenceId: 'test-only-post-termination-evidence',
  };
}

function row(input: Readonly<{
  releaseId: string;
  familyId: string;
  releaseDate: string;
  value: number;
  territory?: 'US' | 'CA';
}>): LuminateAlbumObservationStoredRow {
  const territory = input.territory ?? 'US';
  const start = new Date(`${input.releaseDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const observation = buildDirectAlbumObservation({
    contractVersion: DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
    providerId: 'luminate-music',
    providerObservationId: `test:${input.releaseId}:${territory}`,
    providerArtistId: 'test:artist:iu',
    providerReleaseId: `test:provider-release:${input.releaseId}`,
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: 'iu',
    fandexReleaseId: input.releaseId,
    fandexReleaseFamilyId: input.familyId,
    semantic: 'first-week-sale',
    value: input.value,
    unit: 'physical-units',
    territory,
    format: 'physical',
    providerPeriod: `${input.releaseDate}/${end.toISOString().slice(0, 10)}`,
    providerPublishedAt: null,
    observedAt: '2026-09-18T05:00:00.000Z',
    collectedAt: '2026-09-18T05:00:00.000Z',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'release-total',
    parentObservationId: null,
    syntheticFixture: false,
  });

  return buildLuminateObservationStoredRow({
    observation,
    releaseDate: input.releaseDate,
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
    supersedesStoredRecordId: null,
  });
}

test('reader contract performs exactly one read and no write or external call', () => {
  const descriptor = LUMINATE_ALBUM_OBSERVATION_STORED_READER_RESEARCH_DESCRIPTOR;
  assert.equal(descriptor.readOnly, true);
  assert.equal(descriptor.maxDatabaseReadsPerResolution, 1);
  assert.equal(descriptor.databaseReadFailureIsMissing, false);
  assert.equal(descriptor.databaseReadFailureIsZero, false);
  assert.equal(descriptor.databaseReadFailureIsStable, false);
});

test('SQL is bounded to Luminate IU eligible target releases and one territory lane', () => {
  assert.match(IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL, /provider = 'luminate-music'/);
  assert.match(IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL, /fandex_artist_id = 'iu'/);
  assert.match(IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL, /fandex_release_id = ANY\(\$1::text\[\]\)/);
  assert.match(IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL, /observation_payload->>'territory' = \$2/);
  assert.match(IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL, /scopeRole' = 'release-total'/);
});

test('one store read resolves The Winning against Pieces', async () => {
  const rows = [
    row({
      releaseId: IU_THE_WINNING_RELEASE_ID,
      familyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
      releaseDate: '2024-02-20',
      value: 300,
    }),
    row({
      releaseId: IU_PIECES_RELEASE_ID,
      familyId: IU_PIECES_RELEASE_FAMILY_ID,
      releaseDate: '2021-12-29',
      value: 200,
    }),
  ];
  let calls = 0;
  const executor: LuminateAlbumObservationResearchQueryExecutor = {
    async query(sql, params) {
      calls += 1;
      assert.equal(sql, IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL);
      assert.equal(params[1], 'US');
      assert.ok(Array.isArray(params[0]));
      return { rows };
    },
  };

  const result = await readStoredIuLuminateNormalizationResearch(executor, 'US');
  assert.equal(calls, 1);
  assert.equal(result.effects.databaseReads, 1);
  assert.equal(result.effects.databaseWrites, 0);
  assert.equal(result.effects.externalCalls, 0);
  assert.equal(result.rowsRead, 2);
  assert.equal(result.resolution.state, 'available');
  assert.equal(result.resolution.selectedBaselineReleaseId, IU_PIECES_RELEASE_ID);
  assert.equal(result.resolution.reaction?.relativeChange, 0.5);
});

test('zero rows remains current-observation-missing and never becomes zero/stable', async () => {
  const executor: LuminateAlbumObservationResearchQueryExecutor = {
    async query() {
      return { rows: [] };
    },
  };
  const result = await readStoredIuLuminateNormalizationResearch(executor, 'US');
  assert.equal(result.rowsRead, 0);
  assert.equal(result.resolution.state, 'current-observation-missing');
  assert.equal(result.resolution.reaction, null);
});

test('database failure propagates instead of becoming missing evidence', async () => {
  const executor: LuminateAlbumObservationResearchQueryExecutor = {
    async query() {
      throw new Error('database-unavailable');
    },
  };
  await assert.rejects(
    () => readStoredIuLuminateNormalizationResearch(executor, 'US'),
    /database-unavailable/,
  );
});

test('executor returning a row from another territory fails closed even if SQL should have filtered it', async () => {
  const executor: LuminateAlbumObservationResearchQueryExecutor = {
    async query() {
      return {
        rows: [row({
          releaseId: IU_THE_WINNING_RELEASE_ID,
          familyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
          releaseDate: '2024-02-20',
          value: 300,
          territory: 'CA',
        })],
      };
    },
  };
  await assert.rejects(
    () => readStoredIuLuminateNormalizationResearch(executor, 'US'),
    /territory_filter_mismatch/,
  );
});
