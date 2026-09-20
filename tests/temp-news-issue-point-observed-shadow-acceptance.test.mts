import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptNaverNewsIssuePointProductCandidate,
} from '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter';
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
  PRODUCT_SAFE_VARIABLE_IDS,
} from '../lib/product/variables/productVariableDefinitions';

const METHOD_VERSION = 'v1_naver_news_issue_point_real_methodology';
const PROTOCOL_START = '2026-09-15T16:00:00.000Z';
const PRIOR_START = '2026-09-18T18:00:00.000Z';
const CURRENT_START = '2026-09-19T02:00:00.000Z';
const CURRENT_END = '2026-09-19T09:00:00.000Z';

function makeWindow(
  start: string,
  firstSeen: number,
  prefix: string,
): NaverNewsIssuePointWindowEvidence {
  const startMs = Date.parse(start);
  const slots = Array.from({ length: 8 }, (_, index) => Object.freeze({
    slotStart: new Date(startMs + index * 60 * 60 * 1_000).toISOString(),
    jobId: `${prefix}-${index}`,
    observedObservationCount: 100,
    firstSeenObservationCount: index === 7 ? firstSeen : 0,
    firstSeenObservationIds: Object.freeze(
      index === 7
        ? Array.from({ length: firstSeen }, (__, item) => `${prefix}-obs-${item}`)
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

function methodology(
  priorFirstSeen = 1,
  currentFirstSeen = 2,
): NaverNewsIssuePointFrozenMethodologyResult {
  const prior = makeWindow(PRIOR_START, priorFirstSeen, 'prior-job');
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

function syntheticAvailableForTarget() {
  const source = getArtistProductVariable({
    artistId: 'aespa',
    variableId: 'newsIssuePoint',
  });
  assert.equal(source.status, 'ok');
  if (source.status !== 'ok') throw new Error('synthetic fixture unavailable');
  assert.equal(source.model.fact.availability, 'available');

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      ...source.model,
      identity: Object.freeze({
        ...source.model.identity,
        sourceArtistId: 'iu',
      }),
      sourceMetadata: Object.freeze({
        ...source.model.sourceMetadata,
        sourceArtistId: 'iu',
      }),
    }),
  });
}

test('observed-shadow boundary preserves candidate fact exactly without additional score transformation', async () => {
  const source = methodology(1, 2);
  const candidate = adaptNaverNewsIssuePointProductCandidate(source);
  assert.equal(candidate.status, 'ok');
  if (candidate.status !== 'ok') return;

  const result = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => source,
    },
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.model.fact, candidate.candidate.fact);
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.publication, 'shadow');
  assert.equal(result.model.presentation, 'standard');
  assert.deepEqual(result.model.observationTime, candidate.candidate.observationTime);
  assert.equal(result.model.evidenceTrace.kind, 'naver-news-issue-point-stored-evidence');
});

test('contract-mismatched frozen result fails closed and never returns injected Synthetic fallback', async () => {
  const legacy = syntheticAvailableForTarget();
  const corrupted = {
    ...methodology(1, 2),
    contractVersion: 'corrupted-contract',
  } as unknown as NaverNewsIssuePointFrozenMethodologyResult;

  const result = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => corrupted,
      readLegacyProductVariable: () => legacy,
    },
  );

  assert.deepEqual(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.deepEqual(result.issues, [
    { code: 'real-source-data-issue', reason: 'selector-data-issue' },
  ]);
});

test('comparison-corrupted frozen result fails closed and never returns injected Synthetic fallback', async () => {
  const legacy = syntheticAvailableForTarget();
  const source = methodology(1, 2);
  const corrupted = {
    ...source,
    priorEqualToLatestCount: source.priorEqualToLatestCount + 1,
  } as NaverNewsIssuePointFrozenMethodologyResult;

  const result = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => corrupted,
      readLegacyProductVariable: () => legacy,
    },
  );

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.deepEqual(result.issues, [
    { code: 'real-source-data-issue', reason: 'selector-data-issue' },
  ]);
});

test('the other six Product Variables remain exact legacy Preview/Synthetic and never invoke Real runtime', async () => {
  const otherVariables = PRODUCT_SAFE_VARIABLE_IDS.filter(
    (variableId) => variableId !== 'newsIssuePoint',
  );
  assert.equal(otherVariables.length, 6);

  let realRuntimeCalls = 0;
  for (const variableId of otherVariables) {
    const legacy = getArtistProductVariable({
      artistId: 'iu',
      variableId,
    });
    const result = await getArtistProductVariableRealReadModel(
      {
        artistId: 'iu',
        variableId,
        throughSlotStart: CURRENT_END,
      },
      {
        readNewsIssuePointFrozenMethodology: async () => {
          realRuntimeCalls += 1;
          throw new Error('non-target Real runtime invoked');
        },
      },
    );
    assert.deepEqual(result, legacy);
    if (result.status === 'ok') {
      assert.equal(result.model.dataOrigin, 'synthetic');
      assert.equal(result.model.presentation, 'preview');
    }
  }

  assert.equal(realRuntimeCalls, 0);
});

test('Real runtime failure in target scope fails closed rather than falling back to Synthetic', async () => {
  const legacy = syntheticAvailableForTarget();
  const result = await getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: CURRENT_END,
    },
    {
      readNewsIssuePointFrozenMethodology: async () => {
        throw new Error('stored-evidence-unavailable');
      },
      readLegacyProductVariable: () => legacy,
    },
  );

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.deepEqual(result.issues, [
    { code: 'real-source-data-issue', reason: 'runtime-read-failed' },
  ]);
});
