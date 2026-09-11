import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HANTEO_PROVIDER_DESCRIPTOR,
  validateDirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  HANTEO_EVIDENCE_DESCRIPTOR,
  HANTEO_PROVIDER_EVIDENCE,
} from '../lib/alternative-evidence/directProviderEvidence';
import { decodeHanteoAlbumResponse } from '../lib/alternative-evidence/hanteoAlbumDiscovery';
import {
  HANTEO_ALBUM_ADAPTER,
  HanteoAlbumLiveGateError,
  adaptHanteoCurrentAlbumResponse,
  validateHanteoCurrentObservations,
} from '../lib/alternative-evidence/hanteoAlbumAdapter';

const response = {
  code: 100,
  message: '성공',
  resultData: {
    resultDatetime: '집계 기준 (KST) : 2026.08.24 ~ 2026.08.30',
    list: [{
      rank: 1,
      targetIdx: '900562834',
      targetName: 'UNBREAKABLE : 少年BEAST',
      value: 1206155.8,
      detail: {
        artistGlobalName: 'ALPHA DRIVE ONE',
        salesVolume: 1139747,
        artistIdx: 76154,
        saleDate: 1787529600000,
      },
      regDate: '2026-08-30T00:00:00.000+00:00',
    }],
  },
};

const resolvedIdentity = () => ({
  fandexArtistId: 'artist-alpha-drive-one',
  fandexReleaseId: 'release-unbreakable',
  fandexReleaseFamilyId: 'release-family-unbreakable',
  artistResolutionState: 'resolved' as const,
  artistReviewState: 'human-reviewed' as const,
  releaseResolutionState: 'resolved' as const,
  releaseReviewState: 'human-reviewed' as const,
  evidenceIds: ['identity-review-1'],
});

function adapt(overrides: Partial<Parameters<typeof adaptHanteoCurrentAlbumResponse>[0]> = {}) {
  return adaptHanteoCurrentAlbumResponse({
    decoded: decodeHanteoAlbumResponse(response),
    timeframe: 'week',
    observedAt: '2026-08-31T18:00:00Z',
    collectedAt: '2026-08-31T18:00:01Z',
    quantityEvidenceId: 'hanteo-official-weekly-2026-08-24-30-crosscheck',
    resolveIdentity: resolvedIdentity,
    ...overrides,
  });
}

test('Hanteo current adapter maps salesVolume, never Album Index, into physical units', () => {
  const result = adapt();
  assert.equal(result.observations.length, 1);
  const observation = result.observations[0];
  assert.equal(observation.value, 1139747);
  assert.notEqual(observation.value, 1206155.8);
  assert.equal(observation.semantic, 'period-sale');
  assert.equal(observation.unit, 'physical-units');
  assert.equal(observation.providerPeriod, 'week:집계 기준 (KST) : 2026.08.24 ~ 2026.08.30');
});

test('Hanteo adapter preserves native target and artist IDs without inventing SKU or edition IDs', () => {
  const observation = adapt().observations[0];
  assert.equal(observation.providerArtistId, '76154');
  assert.equal(observation.providerReleaseId, '900562834');
  assert.equal(observation.providerSkuId, null);
  assert.equal(observation.providerEditionId, null);
  assert.match(observation.providerObservationId ?? '', /900562834/);
});

test('Hanteo adapter requires strongly reviewed FANDEX artist and release identity', () => {
  const result = adapt({
    resolveIdentity: () => ({
      ...resolvedIdentity(),
      fandexReleaseId: null,
      releaseResolutionState: 'unresolved',
      releaseReviewState: 'unreviewed',
    }),
  });
  assert.equal(result.observations.length, 0);
  assert.deepEqual(result.rejections[0].reasons, ['release-identity-unresolved']);
});

test('Hanteo adapter requires identity evidence', () => {
  const result = adapt({ resolveIdentity: () => ({ ...resolvedIdentity(), evidenceIds: [] }) });
  assert.equal(result.observations.length, 0);
  assert.deepEqual(result.rejections[0].reasons, ['identity-evidence-missing']);
});

test('Hanteo adapter rejects source rows whose salesVolume is absent even when Album Index exists', () => {
  const malformed = {
    ...response,
    resultData: {
      ...response.resultData,
      list: [{
        ...response.resultData.list[0],
        value: 999999,
        detail: { ...response.resultData.list[0].detail, salesVolume: undefined },
      }],
    },
  };
  const result = adapt({ decoded: decodeHanteoAlbumResponse(malformed) });
  assert.equal(result.observations.length, 0);
  assert.ok(result.rejections[0].reasons.includes('quantity-invalid'));
});

test('Hanteo evidence descriptor validates real current period-sale while conservative base descriptor remains unknown', () => {
  const observation = adapt().observations[0];
  const evidenceValidation = validateHanteoCurrentObservations([observation]);
  assert.equal(evidenceValidation.valid, true);

  const baseValidation = validateDirectAlbumObservation(observation, HANTEO_PROVIDER_DESCRIPTOR);
  assert.equal(baseValidation.valid, false);
  assert.ok(baseValidation.issues.includes('capability-supportsNativePeriodSales-unknown'));
});

test('Hanteo historical capability remains unresolved after current adapter qualification', () => {
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsNativePeriodSales.state, 'true');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsArtistIdentity.state, 'true');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsHistoricalQueries.state, 'unknown');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsReleaseIdentity.state, 'unknown');
  assert.ok(HANTEO_PROVIDER_EVIDENCE.blockers.includes('historical-exact-copies-public-selector-unverified'));
});

test('Hanteo adapter is secondary current-only and keeps live/feature gates closed', async () => {
  const result = adapt();
  assert.equal(result.historicalExactCopiesEligible, false);
  assert.equal(result.liveEligible, false);
  assert.equal(result.featureBridgeEligible, false);
  assert.equal(HANTEO_ALBUM_ADAPTER.descriptor.defaultOff.liveCallsAllowed, false);
  await assert.rejects(() => HANTEO_ALBUM_ADAPTER.executeLive(), error => error instanceof HanteoAlbumLiveGateError);
});
