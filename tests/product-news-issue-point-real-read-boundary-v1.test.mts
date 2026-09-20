import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  NaverNewsIssuePointFrozenMethodologyResult,
  NaverNewsIssuePointWindowEvidence,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  getArtistProductVariable,
} from '../lib/product/queries/getArtistProductVariable';
import {
  getArtistProductVariableRealReadModel,
} from '../lib/product/queries/getArtistProductVariableRealReadModel';
import {
  getArtistProductStoredEvidenceJob,
} from '../lib/product/queries/getArtistProductStoredEvidenceJob';
import type {
  NaverNewsCanonicalJobEvidenceAssembly,
} from '../lib/server/ingestion/naverNewsCanonicalJobEvidence';

const METHOD_VERSION = 'v1_naver_news_issue_point_real_methodology';
const PROTOCOL_START = '2026-09-15T16:00:00.000Z';
const CURRENT_START = '2026-09-19T02:00:00.000Z';
const CURRENT_END = '2026-09-19T09:00:00.000Z';

function makeWindow(
  start: string,
  firstSeen: number,
  jobPrefix: string,
): NaverNewsIssuePointWindowEvidence {
  const startMs = Date.parse(start);
  const slots = Array.from({ length: 8 }, (_, index) => Object.freeze({
    slotStart: new Date(startMs + index * 60 * 60 * 1_000).toISOString(),
    jobId: `${jobPrefix}-${index}`,
    observedObservationCount: 100,
    firstSeenObservationCount: index === 7 ? firstSeen : 0,
    firstSeenObservationIds: Object.freeze(
      index === 7
        ? Array.from({ length: firstSeen }, (__, item) =>
            `${jobPrefix}-obs-${item}`)
        : [],
    ),
    bootstrap: false,
  }));

  return Object.freeze({
    methodologyVersion: METHOD_VERSION,
    canonicalArtistId: 'iu',
    protocolStart: PROTOCOL_START,
    windowSlotCount: 8,
    startSlotStart: slots[0].slotStart,
    endSlotStart: slots[7].slotStart,
    firstSeenObservationCount: firstSeen,
    observedObservationCount: 800,
    activityRate: firstSeen / 800,
    slotEvidence: Object.freeze(slots),
  });
}

function availableMethodology(
  priorFirstSeen = 1,
  currentFirstSeen = 2,
): NaverNewsIssuePointFrozenMethodologyResult {
  const prior = makeWindow(
    '2026-09-18T18:00:00.000Z',
    priorFirstSeen,
    'prior-job',
  );
  const current = makeWindow(CURRENT_START, currentFirstSeen, 'current-job');
  const priorRate = prior.activityRate as number;
  const currentRate = current.activityRate as number;
  const lower = priorRate < currentRate ? 1 : 0;
  const equal = priorRate === currentRate ? 1 : 0;
  const greater = 1 - lower - equal;

  return Object.freeze({
    contractVersion: 'v1_naver_news_issue_point_frozen_methodology',
    methodologyVersion: METHOD_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    variableId: 'newsIssuePoint',
    canonicalArtistId: 'iu',
    protocolStart: PROTOCOL_START,
    throughSlotStart: CURRENT_END,
    selectedWindowSlotCount: 8,
    rollingWindowSemantics: 'overlapping',
    baselineScope: 'same_artist_same_official_shadow_epoch',
    baselineReadiness: Object.freeze({
      cycleSlotCount: 24,
      utcHourCoverageCount: 24,
      completeCycleCount: 3,
      sameUtcHourReplicationFloor: 3,
      sameUtcHourReplicationCeiling: 4,
      status: 'replicated_cycle_history',
    }),
    normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
    status: 'available',
    reason: 'frozen_methodology_value_available',
    score: 100 * lower,
    currentActivityRate: currentRate,
    priorDefinedWindowCount: 1,
    priorLessThanLatestCount: lower,
    priorEqualToLatestCount: equal,
    priorGreaterThanLatestCount: greater,
    currentWindow: current,
    eligiblePriorWindows: Object.freeze([prior]),
    excludedWindows: Object.freeze([]),
    evidenceTrace: Object.freeze({
      windows: Object.freeze([prior, current]),
      storedEvidenceJobIds: Object.freeze([
        ...prior.slotEvidence.map((slot) => slot.jobId),
        ...current.slotEvidence.map((slot) => slot.jobId),
      ]),
    }),
  });
}

function unavailableMethodology(): NaverNewsIssuePointFrozenMethodologyResult {
  const available = availableMethodology();
  return Object.freeze({
    ...available,
    status: 'unavailable',
    reason: 'current_window_undefined',
    score: null,
    currentActivityRate: null,
    priorDefinedWindowCount: 0,
    priorLessThanLatestCount: 0,
    priorEqualToLatestCount: 0,
    priorGreaterThanLatestCount: 0,
    currentWindow: null,
    eligiblePriorWindows: Object.freeze([]),
    evidenceTrace: Object.freeze({
      windows: Object.freeze([]),
      storedEvidenceJobIds: Object.freeze([]),
    }),
  });
}

test('non-target Product variables never call the Real runtime and preserve legacy publication', async () => {
  let calls = 0;
  const result = await getArtistProductVariableRealReadModel(
    {
      artistId: 'aespa',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => {
        calls += 1;
        throw new Error('non-target-runtime-call');
      },
    },
  );

  assert.equal(calls, 0);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.model.dataOrigin, 'synthetic');
  assert.equal(result.model.presentation, 'preview');
  assert.equal(result.model.publication, 'production');
  assert.equal(result.model.evidenceTrace.kind, 'legacy-issue-signal-key');
});

test('IU newsIssuePoint Real read preserves observed shadow time and valid zero', async () => {
  const methodology = availableMethodology(3, 2);
  assert.equal(methodology.score, 0);

  const result = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => methodology,
    },
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.model.fact, {
    availability: 'available',
    value: 0,
  });
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.publication, 'shadow');
  assert.deepEqual(result.model.observationTime, {
    kind: 'period',
    start: CURRENT_START,
    end: CURRENT_END,
  });
  assert.equal(result.model.sourceMetadata.sourceKind,
    'naver-news-issue-point-frozen-methodology');
  assert.equal(result.model.sourceMetadata.sourceTimeLabel, CURRENT_END);
  assert.equal(result.model.series.length, 1);
  assert.deepEqual(result.model.series[0]?.fact, {
    availability: 'available',
    value: 0,
  });

  assert.equal(
    result.model.evidenceTrace.kind,
    'naver-news-issue-point-stored-evidence',
  );
  if (
    result.model.evidenceTrace.kind
    !== 'naver-news-issue-point-stored-evidence'
  ) {
    return;
  }
  assert.equal(result.model.evidenceTrace.currentWindow?.startSlotStart,
    CURRENT_START);
  assert.equal(result.model.evidenceTrace.currentWindow?.endSlotStart,
    CURRENT_END);
  assert.equal(result.model.evidenceTrace.eligiblePriorWindows.length, 1);
  assert.equal(result.model.evidenceTrace.storedEvidenceJobIds.length, 16);
});

test('Real unavailable stays unavailable/null even when legacy synthetic value exists', async () => {
  const legacy = getArtistProductVariable({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });
  assert.equal(legacy.status, 'ok');
  if (legacy.status !== 'ok') return;
  assert.equal(legacy.model.fact.availability, 'available');

  const result = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => unavailableMethodology(),
    },
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.model.fact, {
    availability: 'unavailable',
    value: null,
  });
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.publication, 'shadow');
  assert.equal(result.model.series.length, 0);
});

test('historical revision can change score without creating a new current observation', async () => {
  const before = availableMethodology(1, 2);
  const revised = availableMethodology(3, 2);

  const beforeResult = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => before,
    },
  );
  const revisedResult = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => revised,
    },
  );

  assert.equal(beforeResult.status, 'ok');
  assert.equal(revisedResult.status, 'ok');
  if (beforeResult.status !== 'ok' || revisedResult.status !== 'ok') return;

  assert.deepEqual(beforeResult.model.fact, {
    availability: 'available',
    value: 100,
  });
  assert.deepEqual(revisedResult.model.fact, {
    availability: 'available',
    value: 0,
  });
  assert.equal(
    beforeResult.model.series[0]?.sourceTimeLabel,
    revisedResult.model.series[0]?.sourceTimeLabel,
  );

  const beforeTrace = beforeResult.model.evidenceTrace;
  const revisedTrace = revisedResult.model.evidenceTrace;
  assert.equal(beforeTrace.kind, 'naver-news-issue-point-stored-evidence');
  assert.equal(revisedTrace.kind, 'naver-news-issue-point-stored-evidence');
  if (
    beforeTrace.kind !== 'naver-news-issue-point-stored-evidence'
    || revisedTrace.kind !== 'naver-news-issue-point-stored-evidence'
  ) {
    return;
  }

  assert.deepEqual(
    beforeTrace.currentWindow?.slotEvidence.map((slot) => slot.jobId),
    revisedTrace.currentWindow?.slotEvidence.map((slot) => slot.jobId),
  );
  assert.deepEqual(
    beforeTrace.storedEvidenceJobIds,
    revisedTrace.storedEvidenceJobIds,
  );
});

test('Product Stored Evidence query reverse-traces an authorized job to canonical and raw evidence IDs', async () => {
  const variableResult = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () =>
        availableMethodology(1, 2),
    },
  );
  assert.equal(variableResult.status, 'ok');
  if (variableResult.status !== 'ok') return;

  const jobId = 'current-job-7';
  let calls = 0;
  const result = await getArtistProductStoredEvidenceJob(
    {
      variableResult,
      jobId,
    },
    {
      readCanonicalJobEvidence: async () => {
        calls += 1;
        return {
          canonicalArtistId: 'iu',
          jobId,
          eligibleNormalizedRecordIds: ['record-1'],
          observations: [
            {
              observationId: 'observation-1',
              canonicalSourceUrl: 'https://example.com/news/1',
              observedAt: '2026-09-19T08:30:00.000Z',
              collectedAt: CURRENT_END,
              title: 'Observed title',
              summary: 'Observed summary',
              sourceRecordIds: ['record-1'],
              rawEvidenceIds: ['raw-1'],
            },
          ],
        } as unknown as NaverNewsCanonicalJobEvidenceAssembly;
      },
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.model.identity.jobId, jobId);
  assert.equal(result.model.publication, 'shadow');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.lineage.slotStart, CURRENT_END);
  assert.deepEqual(result.model.lineage.windowMemberships, [
    {
      role: 'current',
      startSlotStart: CURRENT_START,
      endSlotStart: CURRENT_END,
    },
  ]);
  assert.deepEqual(
    result.model.storedEvidence.eligibleNormalizedRecordIds,
    ['record-1'],
  );
  assert.deepEqual(
    result.model.storedEvidence.canonicalObservations[0]?.rawEvidenceIds,
    ['raw-1'],
  );
});

test('Product Stored Evidence query rejects job IDs outside the exact variable trace before runtime read', async () => {
  const variableResult = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () =>
        availableMethodology(1, 2),
    },
  );

  let calls = 0;
  const result = await getArtistProductStoredEvidenceJob(
    {
      variableResult,
      jobId: 'not-in-trace',
    },
    {
      readCanonicalJobEvidence: async () => {
        calls += 1;
        throw new Error('unreachable');
      },
    },
  );

  assert.equal(calls, 0);
  assert.deepEqual(result, {
    status: 'data-issue',
    issues: [{ code: 'job-not-in-variable-evidence-trace' }],
  });
});
