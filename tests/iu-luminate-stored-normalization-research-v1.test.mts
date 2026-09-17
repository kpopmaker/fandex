import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLuminateObservationStoredRow,
  type LuminateAlbumObservationStoredRow,
} from '../lib/alternative-evidence/luminateAlbumObservationIntakeResearch';
import type { LuminateFandexAuthorizationGrant } from '../lib/alternative-evidence/luminateAlbumAuthorizationResearch';
import {
  buildDirectAlbumObservation,
  DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  resolveIuLuminateStoredNormalization,
  hydrateLuminateObservationResearchStoredRow,
  IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_DESCRIPTOR,
} from '../lib/alternative-evidence/iuLuminateStoredNormalizationResearch';
import { IU_PIECES_RELEASE_FAMILY_ID, IU_PIECES_RELEASE_ID } from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import { IU_RELEASE_FAMILY_IDS, IU_RELEASE_IDS } from '../lib/alternative-evidence/iuCanonicalReleaseReferenceCatalogResearch';
import { IU_THE_WINNING_RELEASE_FAMILY_ID, IU_THE_WINNING_RELEASE_ID } from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

function grant(): LuminateFandexAuthorizationGrant {
  return {
    agreementKind: 'order-form',
    agreementEvidenceId: 'test-only-executed-agreement-evidence',
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
    postTerminationPolicyEvidenceId: 'test-only-post-termination-evidence',
  };
}

function row(input: Readonly<{
  releaseId: string;
  familyId: string;
  releaseDate: string;
  value: number;
  providerReleaseId: string;
  providerObservationId: string;
  supersedesObservationId?: string | null;
  supersedesStoredRecordId?: string | null;
  revisionId?: string | null;
  revisionObservedAt?: string | null;
}>): LuminateAlbumObservationStoredRow {
  const start = new Date(`${input.releaseDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const period = `${input.releaseDate}/${end.toISOString().slice(0, 10)}`;
  const revised = input.supersedesObservationId ?? null;
  const observedAt = input.revisionObservedAt ?? '2026-09-18T01:00:00.000Z';
  const observation = buildDirectAlbumObservation({
    contractVersion: DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
    providerId: 'luminate-music',
    providerObservationId: input.providerObservationId,
    providerArtistId: 'luminate:test:artist:iu',
    providerReleaseId: input.providerReleaseId,
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: 'iu',
    fandexReleaseId: input.releaseId,
    fandexReleaseFamilyId: input.familyId,
    semantic: 'first-week-sale',
    value: input.value,
    unit: 'physical-units',
    territory: 'US',
    format: 'physical',
    providerPeriod: period,
    providerPublishedAt: null,
    observedAt,
    collectedAt: observedAt,
    revisionId: input.revisionId ?? null,
    revisionObservedAt: input.revisionObservedAt ?? null,
    supersedesObservationId: revised,
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
    supersedesStoredRecordId: input.supersedesStoredRecordId ?? null,
  });
}

const current = () => row({
  releaseId: IU_THE_WINNING_RELEASE_ID,
  familyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
  releaseDate: '2024-02-20',
  value: 300,
  providerReleaseId: 'luminate:test:release:the-winning',
  providerObservationId: 'luminate:test:observation:the-winning',
});

const pieces = () => row({
  releaseId: IU_PIECES_RELEASE_ID,
  familyId: IU_PIECES_RELEASE_FAMILY_ID,
  releaseDate: '2021-12-29',
  value: 200,
  providerReleaseId: 'luminate:test:release:pieces',
  providerObservationId: 'luminate:test:observation:pieces',
});

const lilac = () => row({
  releaseId: IU_RELEASE_IDS.lilac,
  familyId: IU_RELEASE_FAMILY_IDS.lilac,
  releaseDate: '2021-03-25',
  value: 150,
  providerReleaseId: 'luminate:test:release:lilac',
  providerObservationId: 'luminate:test:observation:lilac',
});

test('descriptor is research-only and bounded-search exhaustion is not called sufficient history evidence', () => {
  assert.equal(IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_DESCRIPTOR.productionPromotionAllowed, false);
  assert.equal(IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_DESCRIPTOR.exhaustedBoundedSearchMeansInsufficientHistory, false);
  assert.equal(IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_DESCRIPTOR.exhaustedBoundedSearchMeansIdentityExtensionRequired, true);
});

test('stored row hydration verifies payload digest and authorization before feature bridging', () => {
  const stored = current();
  const hydrated = hydrateLuminateObservationResearchStoredRow(stored);
  assert.equal(hydrated.observation.fandexReleaseId, IU_THE_WINNING_RELEASE_ID);
  assert.equal(hydrated.evidence.origin, 'direct-licensed-provider');
  assert.equal(hydrated.evidence.reportedProvider, 'luminate-music');

  const tampered = { ...stored, payload_digest: '0'.repeat(64) };
  assert.throws(() => hydrateLuminateObservationResearchStoredRow(tampered), /payload_digest_mismatch/);
});

test('The Winning uses Pieces when Pieces is present in the same stored US lane', () => {
  const result = resolveIuLuminateStoredNormalization([current(), pieces(), lilac()], 'US');
  assert.equal(result.state, 'available');
  assert.equal(result.selectedBaselineReleaseId, IU_PIECES_RELEASE_ID);
  assert.equal(result.selectedBaselineTitle, 'Pieces');
  assert.deepEqual(result.attemptedBaselineReleaseIds, [IU_PIECES_RELEASE_ID]);
  assert.equal(result.reaction?.relativeChange, 0.5);
});

test('missing Pieces falls through to LILAC without treating missing as zero', () => {
  const result = resolveIuLuminateStoredNormalization([current(), lilac()], 'US');
  assert.equal(result.state, 'available');
  assert.equal(result.selectedBaselineReleaseId, IU_RELEASE_IDS.lilac);
  assert.deepEqual(result.attemptedBaselineReleaseIds, [IU_PIECES_RELEASE_ID, IU_RELEASE_IDS.lilac]);
  assert.equal(result.reaction?.relativeChange, 1);
});

test('no bounded comparable baseline requires identity extension instead of declaring final insufficient history', () => {
  const result = resolveIuLuminateStoredNormalization([current()], 'US');
  assert.equal(result.state, 'identity-extension-required');
  assert.equal(result.reaction, null);
  assert.match(result.blockers.join(','), /identity-extension-required-before-earlier-search/);
});

test('missing current observation remains missing even if baseline rows exist', () => {
  const result = resolveIuLuminateStoredNormalization([pieces(), lilac()], 'US');
  assert.equal(result.state, 'current-observation-missing');
  assert.equal(result.selectedBaselineReleaseId, null);
});

test('revision head supersedes the original and is the only value used', () => {
  const original = pieces();
  const revised = row({
    releaseId: IU_PIECES_RELEASE_ID,
    familyId: IU_PIECES_RELEASE_FAMILY_ID,
    releaseDate: '2021-12-29',
    value: 250,
    providerReleaseId: 'luminate:test:release:pieces',
    providerObservationId: 'luminate:test:observation:pieces:revision-1',
    supersedesObservationId: original.observation_id,
    supersedesStoredRecordId: original.record_id,
    revisionId: 'revision-1',
    revisionObservedAt: '2026-09-18T02:00:00.000Z',
  });
  const result = resolveIuLuminateStoredNormalization([current(), original, revised], 'US');
  assert.equal(result.state, 'available');
  assert.equal(result.selectedBaselineReleaseId, IU_PIECES_RELEASE_ID);
  assert.equal(result.reaction?.baselinePhysicalUnits, 250);
  assert.equal(result.reaction?.relativeChange, 0.2);
});

test('cross-territory rows cannot satisfy the requested lane', () => {
  const caCurrent = {
    ...current(),
    observation_payload: { ...current().observation_payload, territory: 'CA' },
  };
  const result = resolveIuLuminateStoredNormalization([caCurrent as LuminateAlbumObservationStoredRow, pieces()], 'US');
  assert.equal(result.state, 'blocked');
});
