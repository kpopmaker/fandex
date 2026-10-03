import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDirectAlbumObservation,
  type DirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  appendAlbumObservationHistory,
  readAlbumObservationHistoryAsOf,
} from '../lib/product/contracts/albumObservationHistory';

function baseObservation(
  overrides: Partial<DirectAlbumObservation> = {},
): DirectAlbumObservation {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000001',
    fandexArtistId: 'iu',
    fandexReleaseId: 'iu-release-1',
    fandexReleaseFamilyId: 'iu-release-family-1',
    semantic: 'period-sale',
    value: 100,
    unit: 'physical-units',
    territory: 'Korea',
    format: 'physical',
    providerPeriod: 'day:20261001',
    providerPublishedAt: '2026-10-01T12:00:00+09:00',
    observedAt: '2026-10-01T13:00:00+09:00',
    collectedAt: '2026-10-01T13:01:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'as-known-at-collection',
    scopeRole: 'child-sku',
    parentObservationId: null,
    syntheticFixture: false,
    ...overrides,
  });
}

function revision(
  previous: DirectAlbumObservation,
  value: number,
  collectedAt: string,
  revisionId = 'revision-1',
): DirectAlbumObservation {
  return buildDirectAlbumObservation({
    ...previous,
    observationId: undefined,
    evidenceDigest: undefined,
    value,
    observedAt: collectedAt,
    collectedAt,
    revisionId,
    revisionObservedAt: collectedAt,
    supersedesObservationId: previous.observationId,
  });
}

test('Production history stores a real as-known-at-collection observation without any score surface', () => {
  const original = baseObservation();
  const history = appendAlbumObservationHistory({
    observations: [original],
  });

  assert.equal(history.entries.length, 1);
  assert.equal(history.historyClass, 'production-observation-history');
  assert.equal(history.revisionAware, true);
  assert.equal(history.asKnownAtCollectionOnly, true);
  assert.equal(history.syntheticAllowed, false);
  assert.equal(history.additiveRevisionCountingAllowed, false);
  assert.equal(history.scoreFieldsPresent, false);

  const read = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-01T14:00:00+09:00',
  );
  assert.equal(read.status, 'ok');
  if (read.status !== 'ok') return;
  assert.equal(read.activeRows.length, 1);
  assert.equal(read.activeRows[0].value, 100);
  assert.equal(read.supersededRows.length, 0);
  assert.equal(read.additiveRevisionCountingAllowed, false);
  assert.equal(read.scoreFieldsPresent, false);
});

test('reacquiring the same observation appends acquisition time only and never duplicates the physical quantity', () => {
  const original = baseObservation();
  const reacquired = buildDirectAlbumObservation({
    ...original,
    observationId: undefined,
    evidenceDigest: undefined,
    observedAt: '2026-10-01T15:00:00+09:00',
    collectedAt: '2026-10-01T15:01:00+09:00',
  });

  assert.equal(
    original.observationId,
    reacquired.observationId,
  );

  const history = appendAlbumObservationHistory({
    observations: [original, reacquired, reacquired],
  });

  assert.equal(history.entries.length, 1);
  assert.equal(history.entries[0].acquisitionCount, 2);
  assert.deepEqual(
    history.entries[0].acquisitionTimes,
    [
      '2026-10-01T13:01:00+09:00',
      '2026-10-01T15:01:00+09:00',
    ],
  );

  const read = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-01T16:00:00+09:00',
  );
  assert.equal(read.status, 'ok');
  if (read.status !== 'ok') return;
  assert.equal(read.activeRows.length, 1);
  assert.equal(read.activeRows[0].value, 100);
});

test('as-of read returns the original before revision collection and only the revision after FANDEX actually collected it', () => {
  const original = baseObservation();
  const revised = revision(
    original,
    110,
    '2026-10-02T09:01:00+09:00',
  );

  const history = appendAlbumObservationHistory({
    observations: [original, revised],
  });

  const before = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-02T09:00:59+09:00',
  );
  assert.equal(before.status, 'ok');
  if (before.status !== 'ok') return;
  assert.equal(before.activeRows.length, 1);
  assert.equal(before.activeRows[0].observationId, original.observationId);
  assert.equal(before.activeRows[0].value, 100);
  assert.equal(before.supersededRows.length, 0);

  const after = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-02T09:01:00+09:00',
  );
  assert.equal(after.status, 'ok');
  if (after.status !== 'ok') return;
  assert.equal(after.activeRows.length, 1);
  assert.equal(after.activeRows[0].observationId, revised.observationId);
  assert.equal(after.activeRows[0].value, 110);
  assert.deepEqual(
    after.supersededRows.map(row => row.observationId),
    [original.observationId],
  );
});

test('provider revision observation time does not retroactively supersede data before collection time', () => {
  const original = baseObservation();
  const revised = buildDirectAlbumObservation({
    ...original,
    observationId: undefined,
    evidenceDigest: undefined,
    value: 110,
    observedAt: '2026-10-02T10:00:00+09:00',
    collectedAt: '2026-10-02T10:05:00+09:00',
    revisionId: 'revision-1',
    revisionObservedAt: '2026-10-02T09:30:00+09:00',
    supersedesObservationId: original.observationId,
  });

  const history = appendAlbumObservationHistory({
    observations: [original, revised],
  });

  const beforeCollection = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-02T10:04:59+09:00',
  );
  assert.equal(beforeCollection.status, 'ok');
  if (beforeCollection.status !== 'ok') return;
  assert.equal(beforeCollection.activeRows.length, 1);
  assert.equal(
    beforeCollection.activeRows[0].observationId,
    original.observationId,
  );

  const afterCollection = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-02T10:05:00+09:00',
  );
  assert.equal(afterCollection.status, 'ok');
  if (afterCollection.status !== 'ok') return;
  assert.equal(afterCollection.activeRows.length, 1);
  assert.equal(
    afterCollection.activeRows[0].observationId,
    revised.observationId,
  );
});

test('multi-step revision chains expose only the latest revision as active', () => {
  const original = baseObservation();
  const revision1 = revision(
    original,
    110,
    '2026-10-02T09:01:00+09:00',
    'revision-1',
  );
  const revision2 = revision(
    revision1,
    105,
    '2026-10-03T09:01:00+09:00',
    'revision-2',
  );

  const history = appendAlbumObservationHistory({
    observations: [original, revision1, revision2],
  });

  const read = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-03T10:00:00+09:00',
  );
  assert.equal(read.status, 'ok');
  if (read.status !== 'ok') return;

  assert.equal(read.rows.length, 3);
  assert.equal(read.activeRows.length, 1);
  assert.equal(read.activeRows[0].value, 105);
  assert.deepEqual(
    new Set(read.supersededRows.map(row => row.value)),
    new Set([100, 110]),
  );
});

test('revision parent must already exist in Production history', () => {
  const missingParent = baseObservation();
  const orphan = buildDirectAlbumObservation({
    ...missingParent,
    observationId: undefined,
    evidenceDigest: undefined,
    value: 110,
    revisionId: 'revision-orphan',
    revisionObservedAt: '2026-10-02T09:00:00+09:00',
    supersedesObservationId: 'missing-parent',
    collectedAt: '2026-10-02T09:01:00+09:00',
  });

  assert.throws(
    () => appendAlbumObservationHistory({
      observations: [orphan],
    }),
    /revision_parent_missing/,
  );
});

test('branched revisions fail closed instead of arbitrarily selecting a current value', () => {
  const original = baseObservation();
  const revisionA = revision(
    original,
    110,
    '2026-10-02T09:01:00+09:00',
    'revision-a',
  );
  const revisionB = revision(
    original,
    120,
    '2026-10-02T10:01:00+09:00',
    'revision-b',
  );

  assert.throws(
    () => appendAlbumObservationHistory({
      observations: [original, revisionA, revisionB],
    }),
    /revision_branch_conflict/,
  );
});

test('revision cannot cross provider/release/SKU/period series', () => {
  const original = baseObservation();
  const differentSku = buildDirectAlbumObservation({
    ...original,
    observationId: undefined,
    evidenceDigest: undefined,
    providerSkuId: '8800000000999',
    value: 110,
    revisionId: 'revision-wrong-series',
    revisionObservedAt: '2026-10-02T09:00:00+09:00',
    supersedesObservationId: original.observationId,
    collectedAt: '2026-10-02T09:01:00+09:00',
  });

  assert.throws(
    () => appendAlbumObservationHistory({
      observations: [original, differentSku],
    }),
    /revision_series_mismatch/,
  );
});

test('Production history rejects synthetic and current-research observations', () => {
  const synthetic = baseObservation({
    syntheticFixture: true,
  });
  assert.throws(
    () => appendAlbumObservationHistory({
      observations: [synthetic],
    }),
    /synthetic_forbidden/,
  );

  const research = baseObservation({
    knowledgeMode: 'current-research',
  });
  assert.throws(
    () => appendAlbumObservationHistory({
      observations: [research],
    }),
    /requires_as_known_at_collection/,
  );
});

test('as-of before first collection has no active or superseded rows', () => {
  const history = appendAlbumObservationHistory({
    observations: [baseObservation()],
  });

  const read = readAlbumObservationHistoryAsOf(
    history,
    '2026-10-01T13:00:59+09:00',
  );
  assert.equal(read.status, 'ok');
  if (read.status !== 'ok') return;
  assert.equal(read.rows.length, 0);
  assert.equal(read.activeRows.length, 0);
  assert.equal(read.supersededRows.length, 0);
});
