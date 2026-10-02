import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNewsIssuePointRiskQualityMetadata,
} from '../lib/product/adapters/newsIssuePointRiskQualityMetadata';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../lib/intelligence/riskAdjustmentProducerMetadataAdapter';
import {
  assembleRiskAdjustmentFromQualityEnvelopes,
} from '../lib/intelligence/riskAdjustmentQualityEnvelopeAssembly';

function productionResult(): ProductVariableReadModelResult {
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
        description: 'current-main Risk integration',
        relatedSourceMetricKeys: [],
        evidenceRelation: {
          kind: 'legacy-issue-signal-key',
          sourceKey: 'newsIssuePoint',
        },
      },
      fact: { availability: 'available', value: 42 },
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
        storedEvidenceJobIds: ['job-b', 'job-a'],
      },
    },
  } as ProductVariableReadModelResult;
}

test('current-main newsIssuePoint producer is accepted by the Risk producer adapter', () => {
  const producer =
    buildNewsIssuePointRiskQualityMetadata(productionResult());

  assert.equal(producer.status, 'ok');
  if (producer.status !== 'ok') return;

  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(producer.metadata);

  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') return;

  assert.equal(adapted.envelope.variableId, 'newsIssuePoint');
  assert.equal(
    adapted.envelope.producerContractVersion,
    'news-issue-point-risk-quality-metadata-v1',
  );
  assert.equal(adapted.assessment.status, 'accepted');
  assert.equal(
    adapted.assessment.handoff.acceptedForRiskConsumption,
    true,
  );
});

test('current-main newsIssuePoint is consumable but remains insufficient-data', () => {
  const producer =
    buildNewsIssuePointRiskQualityMetadata(productionResult());

  assert.equal(producer.status, 'ok');
  if (producer.status !== 'ok') return;

  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(producer.metadata);
  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') return;

  const assembly = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [adapted.envelope],
  });

  assert.deepEqual(
    assembly.productDependencyAssembly.consumedVariableIds,
    ['newsIssuePoint'],
  );
  assert.deepEqual(
    assembly.productDependencyAssembly.blockedVariableIds,
    [],
  );

  const product =
    assembly.productDependencyAssembly.productCandidate;
  assert.equal(product.readinessState, 'insufficient-data');
  assert.equal(product.assessment.status, 'insufficient_data');
  assert.equal(product.numericEligible, false);
  assert.equal(product.score, null);
  assert.equal(product.penalty, null);
  assert.equal(product.weight, null);
  assert.equal(product.activationAuthorized, false);
  assert.equal(product.publicationAuthorized, false);
  assert.equal(product.publicRouteAuthorized, false);

  assert.deepEqual(
    product.assessment.qualityIssues,
    [
      'confidence-insufficient',
      'conflict-unknown',
      'coverage-unknown',
      'freshness-unknown',
      'revision-state-unknown',
      'volatility-unknown',
    ],
  );
});
