import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  NaverNewsIssuePointFrozenMethodologyResult,
  NaverNewsIssuePointWindowEvidence,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  adaptNaverNewsIssuePointProductCandidate,
} from '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter';
import {
  getArtistProductVariable,
} from '../lib/product/queries/getArtistProductVariable';

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
        ? Array.from({ length: firstSeen }, (__, item) => `${jobPrefix}-obs-${item}`)
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

function availableResult(): NaverNewsIssuePointFrozenMethodologyResult {
  const prior = makeWindow('2026-09-18T18:00:00.000Z', 1, 'prior-job');
  const current = makeWindow(CURRENT_START, 2, 'current-job');

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
    score: 100,
    currentActivityRate: 0.0025,
    priorDefinedWindowCount: 1,
    priorLessThanLatestCount: 1,
    priorEqualToLatestCount: 0,
    priorGreaterThanLatestCount: 0,
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

function unavailableResult(): NaverNewsIssuePointFrozenMethodologyResult {
  const result = availableResult();
  return Object.freeze({
    ...result,
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

test('available frozen methodology becomes an observed shadow Product candidate without publication eligibility', () => {
  const source = availableResult();
  const result = adaptNaverNewsIssuePointProductCandidate(source);

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(result.candidate.fact, {
    availability: 'available',
    value: 100,
  });
  assert.equal(result.candidate.variableId, 'newsIssuePoint');
  assert.equal(result.candidate.canonicalArtistId, 'iu');
  assert.equal(result.candidate.dataOrigin, 'observed');
  assert.equal(result.candidate.publication, 'shadow');
  assert.equal(result.candidate.presentation, 'standard');
  assert.deepEqual(result.candidate.observationTime, {
    kind: 'period',
    start: CURRENT_START,
    end: CURRENT_END,
  });
  assert.equal(
    result.candidate.sourceMetadata.normalizationType,
    'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
  );
  assert.equal(
    result.candidate.sourceMetadata.baselineReadinessStatus,
    'replicated_cycle_history',
  );
  assert.deepEqual(
    result.candidate.evidenceTrace.storedEvidenceJobIds,
    source.evidenceTrace.storedEvidenceJobIds,
  );
  assert.deepEqual(result.candidate.productPolicy, {
    directProductContributionEligible: false,
    productScorePublished: false,
    realVariablePromotionEligible: false,
  });
});

test('unavailable frozen methodology remains unavailable instead of becoming zero', () => {
  const result = adaptNaverNewsIssuePointProductCandidate(unavailableResult());

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.candidate.fact, {
    availability: 'unavailable',
    value: null,
  });
  assert.deepEqual(result.candidate.observationTime, { kind: 'unknown' });
  assert.equal(result.candidate.dataOrigin, 'observed');
  assert.equal(result.candidate.publication, 'shadow');
});

test('candidate adapter fails closed on score and comparison invariant corruption', () => {
  const source = availableResult();

  const invalidScore = adaptNaverNewsIssuePointProductCandidate({
    ...source,
    score: 101,
  } as NaverNewsIssuePointFrozenMethodologyResult);
  assert.deepEqual(invalidScore, {
    status: 'data-issue',
    reason: 'invalid-available-result',
  });

  const invalidCounts = adaptNaverNewsIssuePointProductCandidate({
    ...source,
    priorEqualToLatestCount: 1,
  } as NaverNewsIssuePointFrozenMethodologyResult);
  assert.deepEqual(invalidCounts, {
    status: 'data-issue',
    reason: 'invalid-available-result',
  });
});

test('candidate adapter independently verifies score formula, classification, frozen contract, and exact evidence lineage', () => {
  const source = availableResult();

  const wrongFormula = adaptNaverNewsIssuePointProductCandidate({
    ...source,
    score: 50,
  } as NaverNewsIssuePointFrozenMethodologyResult);
  assert.deepEqual(wrongFormula, {
    status: 'data-issue',
    reason: 'invalid-available-result',
  });

  const wrongClassification = adaptNaverNewsIssuePointProductCandidate({
    ...source,
    score: 0,
    priorLessThanLatestCount: 0,
    priorEqualToLatestCount: 1,
    priorGreaterThanLatestCount: 0,
  } as NaverNewsIssuePointFrozenMethodologyResult);
  assert.deepEqual(wrongClassification, {
    status: 'data-issue',
    reason: 'invalid-available-result',
  });

  const wrongTrace = adaptNaverNewsIssuePointProductCandidate({
    ...source,
    evidenceTrace: Object.freeze({
      ...source.evidenceTrace,
      storedEvidenceJobIds: Object.freeze([
        ...source.evidenceTrace.storedEvidenceJobIds.slice(0, -1),
        'corrupted-job-id',
      ]),
    }),
  } as NaverNewsIssuePointFrozenMethodologyResult);
  assert.deepEqual(wrongTrace, {
    status: 'data-issue',
    reason: 'invalid-available-result',
  });

  const wrongMethodology = adaptNaverNewsIssuePointProductCandidate({
    ...source,
    methodologyVersion: 'unexpected-methodology-version',
  } as unknown as NaverNewsIssuePointFrozenMethodologyResult);
  assert.deepEqual(wrongMethodology, {
    status: 'data-issue',
    reason: 'frozen-methodology-contract-mismatch',
  });

  const wrongContract = adaptNaverNewsIssuePointProductCandidate({
    ...source,
    contractVersion: 'unexpected-contract-version',
  } as unknown as NaverNewsIssuePointFrozenMethodologyResult);
  assert.deepEqual(wrongContract, {
    status: 'data-issue',
    reason: 'frozen-methodology-contract-mismatch',
  });
});

test('legacy Product variable route remains preview synthetic and is not activated by the candidate adapter', () => {
  const legacy = getArtistProductVariable({
    artistId: 'aespa',
    variableId: 'newsIssuePoint',
  });

  assert.equal(legacy.status, 'ok');
  if (legacy.status !== 'ok') return;
  assert.equal(legacy.model.dataOrigin, 'synthetic');
  assert.equal(legacy.model.presentation, 'preview');
});

test('candidate adapter does not use providerTotal, Stage 1 transforms, or Product routing', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /providerTotal/);
  assert.doesNotMatch(source, /legacy-derived-index-point/);
  assert.doesNotMatch(source, /getArtistProductVariable\s*\(/);
  assert.doesNotMatch(source, /Math\.round/);
});
