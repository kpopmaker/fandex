import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptNewsIssuePointToFandexVariableProduct,
  NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/newsIssuePointFandexVariableProduct';
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

test('real production newsIssuePoint maps into the common Product record without inventing quality states', () => {
  const result = adaptNewsIssuePointToFandexVariableProduct(
    productionResult('available', 42),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.variableId, 'newsIssuePoint');
  assert.equal(result.record.canonicalArtistId, 'iu');
  assert.equal(result.record.lifecycleState, 'production');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.readinessState, 'production');
  assert.equal(result.record.availability, 'available');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'numeric',
    value: 42,
    unit: null,
  });
  assert.equal(result.record.confidence, 'insufficient');
  assert.equal(result.record.coverage, 'unknown');
  assert.equal(result.record.freshness, 'unknown');
  assert.equal(
    result.record.productVersion,
    NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );
});

test('true zero remains an available zero', () => {
  const result = adaptNewsIssuePointToFandexVariableProduct(
    productionResult('available', 0),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.availability, 'available');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'numeric',
    value: 0,
    unit: null,
  });
  assert.equal(result.record.missingReason, null);
});

test('source missing remains missing and is never coerced to zero', () => {
  const result = adaptNewsIssuePointToFandexVariableProduct(
    productionResult('missing', null),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.availability, 'missing');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'numeric',
    value: null,
    unit: null,
  });
  assert.equal(result.record.missingReason, 'source-missing');
});

test('ambiguous unavailable remains unavailable rather than missing or zero', () => {
  const result = adaptNewsIssuePointToFandexVariableProduct(
    productionResult('unavailable', null),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.availability, 'unavailable');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'numeric',
    value: null,
    unit: null,
  });
  assert.equal(result.record.missingReason, null);
});

test('stored evidence and methodology lineage are retained in common evidence refs', () => {
  const result = adaptNewsIssuePointToFandexVariableProduct(
    productionResult(),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(result.record.evidenceRefs, [
    'contract:news-issue-point-risk-quality-metadata-v1',
    'methodology:v1_naver_news_issue_point_real_methodology',
    'naver-news-job:job-a',
    'naver-news-job:job-b',
  ]);
  assert.deepEqual(result.record.observationTime, {
    kind: 'period',
    start: '2026-09-30T00:00:00.000Z',
    end: '2026-09-30T07:00:00.000Z',
  });
  assert.equal(result.record.asOf, '2026-09-30T07:00:00.000Z');
});

test('shadow or synthetic upstream truth fails closed without emitting a common record', () => {
  const shadow = productionResult();
  const synthetic = productionResult();

  if (shadow.status !== 'ok' || synthetic.status !== 'ok') return;

  assert.deepEqual(
    adaptNewsIssuePointToFandexVariableProduct({
      ...shadow,
      model: { ...shadow.model, publication: 'shadow' },
    }),
    {
      status: 'blocked',
      reason: 'upstream-not-real-production',
    },
  );

  assert.deepEqual(
    adaptNewsIssuePointToFandexVariableProduct({
      ...synthetic,
      model: {
        ...synthetic.model,
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
