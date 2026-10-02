import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveRiskAdjustmentAssessment,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  projectNewsIssuePointForRiskAdjustment,
} from '../lib/intelligence/riskAdjustmentNewsIssuePointProjection';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';

function productionResult(
  availability: 'available' | 'missing' | 'unavailable' = 'available',
  value: number | null = 42,
): ProductVariableReadModelResult {
  const fact =
    availability === 'available'
      ? { availability: 'available' as const, value: value as number }
      : { availability, value: null };

  return {
    status: 'ok',
    model: {
      identity: {
        sourceArtistId: 'iu',
        variableId: 'newsIssuePoint',
        sourceVariableKey: 'newsIssuePoint',
      },
      definition: {
        variableId: 'newsIssuePoint',
        sourceKey: 'newsIssuePoint',
        displayName: '뉴스/이슈',
        description: 'test',
        relatedSourceMetricKeys: [],
        evidenceRelation: {
          kind: 'legacy-issue-signal-key',
          sourceKey: 'newsIssuePoint',
        },
      },
      fact,
      series: [],
      observationTime: {
        kind: 'period',
        start: '2026-09-30T00:00:00.000Z',
        end: '2026-09-30T07:00:00.000Z',
      },
      presentation: 'standard',
      dataOrigin: 'observed',
      publication: 'production',
      sourceMetadata: {
        sourceKind: 'naver-news-issue-point-frozen-methodology',
        sourceArtistId: 'iu',
        sourceVariableKey: 'newsIssuePoint',
        sourceTimeLabel: '2026-09-30T07:00:00.000Z',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-01T00:00:00.000Z',
        throughSlotStart: '2026-09-30T07:00:00.000Z',
        selectedWindowSlotCount: 8,
        normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        baselineReadinessStatus: 'replicated_cycle_history',
        currentActivityRate: 0.5,
        priorDefinedWindowCount: 12,
        priorLessThanLatestCount: 5,
        priorEqualToLatestCount: 2,
        priorGreaterThanLatestCount: 5,
      },
      evidenceTrace: {
        kind: 'naver-news-issue-point-stored-evidence',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-01T00:00:00.000Z',
        throughSlotStart: '2026-09-30T07:00:00.000Z',
        currentWindow: null,
        eligiblePriorWindows: [],
        storedEvidenceJobIds: ['job-b', 'job-a', 'job-b'],
      },
    },
  } as ProductVariableReadModelResult;
}

test('Production observed newsIssuePoint can be projected without inventing quality states', () => {
  const projected = projectNewsIssuePointForRiskAdjustment(
    productionResult(),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.lifecycleState, 'production');
  assert.equal(projected.input.materialClass, 'real');
  assert.equal(projected.input.identityState, 'resolved');
  assert.equal(projected.input.historyState, 'sufficient');
  assert.equal(projected.input.confidenceState, 'insufficient');
  assert.equal(projected.input.coverageState, 'unknown');
  assert.equal(projected.input.freshnessState, 'unknown');
  assert.equal(projected.input.conflictState, 'unknown');
  assert.equal(projected.input.revisionState, 'unknown');
  assert.equal(projected.input.volatilityState, 'unknown');
  assert.deepEqual(projected.input.evidenceRefs, [
    'naver-news-job:job-a',
    'naver-news-job:job-b',
  ]);
});

test('projected newsIssuePoint remains insufficient for a numeric or categorical-ready adjustment', () => {
  const projected = projectNewsIssuePointForRiskAdjustment(
    productionResult(),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.equal(assessment.status, 'insufficient_data');
  assert.equal(assessment.numericEligible, false);
  assert.equal(assessment.score, null);
  assert.deepEqual(assessment.qualityIssues, [
    'confidence-insufficient',
    'conflict-unknown',
    'coverage-unknown',
    'freshness-unknown',
    'revision-state-unknown',
    'volatility-unknown',
  ]);
});

test('true zero remains true zero and is not interpreted as risk', () => {
  const projected = projectNewsIssuePointForRiskAdjustment(
    productionResult('available', 0),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.availabilityState, 'true-zero');
  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.deepEqual(assessment.trueZeroVariables, ['newsIssuePoint']);
  assert.equal(
    assessment.qualityIssues.includes('source-missing'),
    false,
  );
});

test('generic upstream unavailable is not falsely labeled provider unavailable', () => {
  const projected = projectNewsIssuePointForRiskAdjustment(
    productionResult('unavailable', null),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(
    projected.input.availabilityState,
    'upstream-unavailable-ambiguous',
  );
  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.equal(
    assessment.qualityIssues.includes('availability-unresolved'),
    true,
  );
  assert.equal(
    assessment.qualityIssues.includes('provider-unavailable'),
    false,
  );
});

test('missing remains missing', () => {
  const projected = projectNewsIssuePointForRiskAdjustment(
    productionResult('missing', null),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.availabilityState, 'source-missing');
});

test('shadow source is blocked even when observed', () => {
  const result = productionResult();
  if (result.status !== 'ok') return;
  const shadow = {
    ...result,
    model: {
      ...result.model,
      publication: 'shadow' as const,
    },
  };

  assert.deepEqual(
    projectNewsIssuePointForRiskAdjustment(shadow),
    {
      status: 'blocked',
      contractVersion: 'risk-adjustment-news-issue-projection-v1',
      reason: 'upstream-not-real-production',
    },
  );
});

test('legacy synthetic source is blocked', () => {
  const result = productionResult();
  if (result.status !== 'ok') return;
  const synthetic = {
    ...result,
    model: {
      ...result.model,
      dataOrigin: 'synthetic' as const,
      presentation: 'preview' as const,
    },
  };

  assert.equal(
    projectNewsIssuePointForRiskAdjustment(synthetic).status,
    'blocked',
  );
});

test('historical baseline contract is required before history can be called sufficient', () => {
  const result = productionResult();
  if (result.status !== 'ok') return;
  const badHistory = {
    ...result,
    model: {
      ...result.model,
      sourceMetadata: {
        ...result.model.sourceMetadata,
        baselineReadinessStatus: 'insufficient_history',
        priorDefinedWindowCount: 0,
      },
    },
  } as ProductVariableReadModelResult;

  assert.deepEqual(
    projectNewsIssuePointForRiskAdjustment(badHistory),
    {
      status: 'blocked',
      contractVersion: 'risk-adjustment-news-issue-projection-v1',
      reason: 'upstream-source-contract-mismatch',
    },
  );
});

test('upstream data issue is blocked rather than converted into a risk score', () => {
  const result = {
    status: 'data-issue',
    issues: [
      {
        code: 'real-source-data-issue',
        reason: 'runtime-read-failed',
      },
    ],
    sourceMetadata: {
      sourceArtistId: 'iu',
      rawVariableId: 'newsIssuePoint',
      sourceTimeLabel: null,
    },
  } as ProductVariableReadModelResult;

  assert.deepEqual(
    projectNewsIssuePointForRiskAdjustment(result),
    {
      status: 'blocked',
      contractVersion: 'risk-adjustment-news-issue-projection-v1',
      reason: 'upstream-read-not-ok',
    },
  );
});
