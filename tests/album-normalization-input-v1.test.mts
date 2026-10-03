import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDirectAlbumObservation,
  type DirectAlbumObservation,
  type DirectAlbumObservationDraft,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  HANTEO_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildAlbumNormalizationInput,
} from '../lib/product/contracts/albumNormalizationInput';

function observation(
  providerId: 'circle-chart' | 'hanteo-chart',
  overrides: Partial<DirectAlbumObservationDraft> = {},
): DirectAlbumObservation {
  const circle = providerId === 'circle-chart';
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId,
    providerObservationId: circle ? null : 'target-1|day:20261001',
    providerArtistId: circle ? null : 'artist-target-1',
    providerReleaseId: circle ? null : 'target-1',
    providerEditionId: null,
    providerSkuId: circle ? '8800000000001' : null,
    fandexArtistId: 'iu',
    fandexReleaseId: 'iu-release-1',
    fandexReleaseFamilyId: 'iu-release-family-1',
    semantic: 'period-sale',
    value: circle ? 100 : 95,
    unit: 'physical-units',
    territory: 'Korea',
    format: 'physical',
    providerPeriod: 'day:20261001',
    providerPublishedAt: null,
    observedAt: '2026-10-01T13:00:00+09:00',
    collectedAt: '2026-10-01T13:01:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: false,
    ...overrides,
  });
}

const providers = Object.freeze([
  CIRCLE_EVIDENCE_DESCRIPTOR,
  HANTEO_EVIDENCE_DESCRIPTOR,
]);

test('Circle stays primary while overlapping Hanteo evidence is corroboration only', () => {
  const circle = observation('circle-chart');
  const hanteo = observation('hanteo-chart');

  const result = buildAlbumNormalizationInput({
    observations: [circle, hanteo],
    providers,
  });

  const circleEntry = result.entries.find(
    entry => entry.observationId === circle.observationId,
  );
  const hanteoEntry = result.entries.find(
    entry => entry.observationId === hanteo.observationId,
  );

  assert.equal(circleEntry?.providerRole, 'primary-historical');
  assert.equal(
    circleEntry?.disposition,
    'primary-normalization-candidate',
  );
  assert.equal(
    hanteoEntry?.providerRole,
    'secondary-current-corroboration',
  );
  assert.equal(
    hanteoEntry?.disposition,
    'secondary-corroboration',
  );
  assert.ok(
    hanteoEntry?.blockers.includes(
      'primary-provider-prevents-secondary-contribution',
    ),
  );

  assert.deepEqual(
    result.primaryCandidateObservationIds,
    [circle.observationId],
  );
  assert.deepEqual(
    result.secondaryCorroborationObservationIds,
    [hanteo.observationId],
  );
  assert.equal(result.inputSetUsable, true);
  assert.equal(result.rawProviderAdditionAllowed, false);
  assert.equal(result.crossProviderAdditionAllowed, false);
  assert.equal(result.normalizedValue, null);
});

test('Circle Barcode rows remain SKU scope and are never silently promoted to release totals', () => {
  const skuA = observation('circle-chart', {
    providerSkuId: '8800000000001',
    value: 100,
  });
  const skuB = observation('circle-chart', {
    providerSkuId: '8800000000002',
    value: 50,
  });

  const result = buildAlbumNormalizationInput({
    observations: [skuA, skuB],
    providers,
  });

  assert.equal(result.primaryCandidateObservationIds.length, 2);
  assert.ok(
    result.entries.every(entry => entry.scopeKind === 'sku'),
  );
  assert.equal(result.skuAdditionToReleaseAllowed, false);
  assert.equal(result.parentChildAdditionAllowed, false);
  assert.equal(result.numericNormalizationDefined, false);
});

test('release total excludes overlapping child SKU from additive contribution without failing the input set', () => {
  const releaseTotal = observation('circle-chart', {
    providerSkuId: null,
    scopeRole: 'release-total',
    value: 150,
  });
  const child = observation('circle-chart', {
    providerSkuId: '8800000000001',
    scopeRole: 'child-sku',
    value: 100,
    parentObservationId: releaseTotal.observationId,
  });

  const result = buildAlbumNormalizationInput({
    observations: [releaseTotal, child],
    providers,
  });

  const childEntry = result.entries.find(
    entry => entry.observationId === child.observationId,
  );

  assert.equal(
    childEntry?.disposition,
    'scope-detail-only',
  );
  assert.ok(
    childEntry?.blockers.includes(
      'release-total-overlaps-child-scope',
    ),
  );
  assert.deepEqual(
    result.excludedDetailObservationIds,
    [child.observationId],
  );
  assert.equal(result.blockedObservationIds.length, 0);
  assert.equal(result.inputSetUsable, true);
});

test('a valid revision supersedes the previous Circle observation instead of adding both values', () => {
  const original = observation('circle-chart', {
    providerSkuId: '8800000000001',
    value: 100,
  });
  const revised = observation('circle-chart', {
    providerSkuId: '8800000000001',
    value: 110,
    revisionId: 'revision-1',
    revisionObservedAt: '2026-10-01T14:00:00+09:00',
    supersedesObservationId: original.observationId,
  });

  const result = buildAlbumNormalizationInput({
    observations: [original, revised],
    providers,
  });

  const originalEntry = result.entries.find(
    entry => entry.observationId === original.observationId,
  );
  const revisedEntry = result.entries.find(
    entry => entry.observationId === revised.observationId,
  );

  assert.equal(originalEntry?.disposition, 'superseded');
  assert.equal(
    revisedEntry?.disposition,
    'primary-normalization-candidate',
  );
  assert.deepEqual(
    result.supersededObservationIds,
    [original.observationId],
  );
  assert.deepEqual(
    result.primaryCandidateObservationIds,
    [revised.observationId],
  );
  assert.equal(result.rawProviderAdditionAllowed, false);
});

test('branched revisions fail closed instead of picking a winner', () => {
  const original = observation('circle-chart', {
    value: 100,
  });
  const revisionA = observation('circle-chart', {
    value: 110,
    revisionId: 'revision-a',
    supersedesObservationId: original.observationId,
  });
  const revisionB = observation('circle-chart', {
    value: 120,
    revisionId: 'revision-b',
    supersedesObservationId: original.observationId,
  });

  const result = buildAlbumNormalizationInput({
    observations: [original, revisionA, revisionB],
    providers,
  });

  assert.equal(result.inputSetUsable, false);
  assert.equal(result.blockedObservationIds.length, 3);
  assert.ok(
    result.entries.every(entry =>
      entry.blockers.includes('revision-branch-conflict'),
    ),
  );
});

test('parallel same-scope different values without revision lineage are a conflict', () => {
  const first = observation('circle-chart', {
    value: 100,
  });
  const second = observation('circle-chart', {
    value: 101,
    providerObservationId: 'parallel-2',
  });

  const result = buildAlbumNormalizationInput({
    observations: [first, second],
    providers,
  });

  assert.equal(result.inputSetUsable, false);
  assert.deepEqual(
    new Set(result.blockedObservationIds),
    new Set([first.observationId, second.observationId]),
  );
  assert.ok(
    result.entries.every(entry =>
      entry.blockers.includes(
        'parallel-observation-value-conflict',
      ),
    ),
  );
});

test('Hanteo-only evidence cannot replace the selected primary provider family', () => {
  const hanteo = observation('hanteo-chart');

  const result = buildAlbumNormalizationInput({
    observations: [hanteo],
    providers,
  });

  assert.equal(result.primaryCandidateObservationIds.length, 0);
  assert.deepEqual(
    result.secondaryCorroborationObservationIds,
    [hanteo.observationId],
  );
  assert.equal(result.providerPolicy.secondaryMayReplacePrimary, false);
  assert.equal(result.inputSetUsable, false);
});

test('synthetic Album evidence is blocked from normalization input', () => {
  const synthetic = observation('circle-chart', {
    syntheticFixture: true,
  });

  const result = buildAlbumNormalizationInput({
    observations: [synthetic],
    providers,
  });

  assert.equal(result.inputSetUsable, false);
  assert.deepEqual(
    result.blockedObservationIds,
    [synthetic.observationId],
  );
  assert.equal(
    result.entries[0].disposition,
    'blocked-synthetic',
  );
});

test('unknown provider cannot become a normalization contributor', () => {
  const circle = observation('circle-chart');

  const result = buildAlbumNormalizationInput({
    observations: [circle],
    providers: [HANTEO_EVIDENCE_DESCRIPTOR],
  });

  assert.equal(result.entries[0].providerRole, 'unsupported');
  assert.equal(result.entries[0].disposition, 'blocked-provider');
  assert.equal(result.inputSetUsable, false);
});
