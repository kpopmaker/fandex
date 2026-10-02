import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNewsIssuePointRiskQualityMetadata,
  NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
} from '../lib/product/adapters/newsIssuePointRiskQualityMetadata';
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

test('producer emits explicit fail-closed quality metadata without inventing resolved states', () => {
  const result = buildNewsIssuePointRiskQualityMetadata(productionResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const metadata = result.metadata;
  assert.equal(
    metadata.contractVersion,
    NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  );
  assert.equal(metadata.variableId, 'newsIssuePoint');
  assert.equal(metadata.lifecycleState, 'production');
  assert.equal(metadata.materialClass, 'real');
  assert.equal(metadata.confidenceContractVersion, 'fandex-confidence-v1');
  assert.equal(metadata.confidencePolicy, 'conservative-floor-v1');
  assert.equal(metadata.confidenceState, 'insufficient');
  assert.equal(metadata.coverageState, 'unknown');
  assert.equal(metadata.freshnessState, 'unknown');
  assert.equal(metadata.conflictState, 'unknown');
  assert.equal(metadata.revisionState, 'unknown');
  assert.equal(metadata.historyState, 'sufficient');
  assert.deepEqual(metadata.evidenceRefs, [
    'naver-news-job:job-a',
    'naver-news-job:job-b',
  ]);
});

test('every required quality semantic is explicit and bound to the emitted state', () => {
  const result = buildNewsIssuePointRiskQualityMetadata(productionResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const metadata = result.metadata;
  const expected = {
    availability: metadata.availabilityState,
    identity: metadata.identityState,
    confidence: metadata.confidenceState,
    coverage: metadata.coverageState,
    freshness: metadata.freshnessState,
    conflict: metadata.conflictState,
    revision: metadata.revisionState,
    history: metadata.historyState,
  };

  for (const [dimension, stateValue] of Object.entries(expected)) {
    const semantic =
      metadata.requiredDimensionSemantics[
        dimension as keyof typeof metadata.requiredDimensionSemantics
      ];
    assert.equal(semantic.stateValue, stateValue);
    assert.equal(semantic.evidenceRefs.length > 0, true);
    assert.equal(
      semantic.semanticVersion,
      NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
    );
  }
});

test('unknown and insufficient remain explicit metadata rather than optimistic defaults', () => {
  const result = buildNewsIssuePointRiskQualityMetadata(productionResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.metadata.requiredDimensionSemantics.coverage.reason,
    'metric-interval-coverage-unproven',
  );
  assert.equal(
    result.metadata.requiredDimensionSemantics.freshness.reason,
    'no-validated-product-freshness-policy',
  );
  assert.equal(
    result.metadata.requiredDimensionSemantics.conflict.reason,
    'no-typed-product-conflict-assessment',
  );
  assert.equal(
    result.metadata.requiredDimensionSemantics.revision.reason,
    'no-product-revision-stability-assessment',
  );
  assert.equal(
    result.metadata.requiredDimensionSemantics.confidence.reason,
    'producer-quality-dimensions-not-fully-explicit',
  );
});

test('true zero remains distinct from missing and unavailable', () => {
  const zero = buildNewsIssuePointRiskQualityMetadata(
    productionResult('available', 0),
  );
  const missing = buildNewsIssuePointRiskQualityMetadata(
    productionResult('missing', null),
  );
  const unavailable = buildNewsIssuePointRiskQualityMetadata(
    productionResult('unavailable', null),
  );

  assert.equal(zero.status, 'ok');
  assert.equal(missing.status, 'ok');
  assert.equal(unavailable.status, 'ok');
  if (
    zero.status !== 'ok'
    || missing.status !== 'ok'
    || unavailable.status !== 'ok'
  ) return;

  assert.equal(zero.metadata.availabilityState, 'true-zero');
  assert.equal(missing.metadata.availabilityState, 'source-missing');
  assert.equal(
    unavailable.metadata.availabilityState,
    'upstream-unavailable-ambiguous',
  );
});

test('shadow or synthetic Product material is blocked', () => {
  const base = productionResult();
  if (base.status !== 'ok') return;

  assert.deepEqual(
    buildNewsIssuePointRiskQualityMetadata({
      ...base,
      model: { ...base.model, publication: 'shadow' },
    }),
    {
      status: 'blocked',
      reason: 'upstream-not-real-production',
    },
  );

  assert.deepEqual(
    buildNewsIssuePointRiskQualityMetadata({
      ...base,
      model: {
        ...base.model,
        dataOrigin: 'synthetic',
        presentation: 'preview',
      },
    }),
    {
      status: 'blocked',
      reason: 'upstream-not-real-production',
    },
  );
});

test('history cannot be called sufficient without the frozen history contract', () => {
  const base = productionResult();
  if (base.status !== 'ok') return;

  const bad = {
    ...base,
    model: {
      ...base.model,
      sourceMetadata: {
        ...base.model.sourceMetadata,
        baselineReadinessStatus: 'insufficient_history',
        priorDefinedWindowCount: 0,
      },
    },
  } as ProductVariableReadModelResult;

  assert.deepEqual(
    buildNewsIssuePointRiskQualityMetadata(bad),
    {
      status: 'blocked',
      reason: 'upstream-source-contract-mismatch',
    },
  );
});

test('producer metadata remains nonnumeric', () => {
  const result = buildNewsIssuePointRiskQualityMetadata(productionResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal('score' in result.metadata, false);
  assert.equal('weight' in result.metadata, false);
  assert.equal('penalty' in result.metadata, false);
});
