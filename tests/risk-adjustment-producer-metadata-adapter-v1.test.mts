import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptRiskAdjustmentProducerQualityMetadata,
  RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS,
} from '../lib/intelligence/riskAdjustmentProducerMetadataAdapter';
import {
  NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
} from '../lib/product/adapters/newsIssuePointRiskQualityMetadata';
import {
  ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION,
} from '../lib/product/adapters/activityExposureRiskQualityMetadata';
import {
  BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
} from '../lib/product/adapters/brandFitPointRiskQualityMetadata';
import {
  assembleRiskAdjustmentFromQualityEnvelopes,
} from '../lib/intelligence/riskAdjustmentQualityEnvelopeAssembly';

const semantic = (
  prefix: string,
  dimension: string,
  stateValue: string,
) => ({
  semanticId: prefix + ':' + dimension,
  semanticVersion: prefix + '-risk-quality-metadata-v1',
  stateValue,
  evidenceRefs: ['contract:' + prefix + ':' + dimension],
});

function newsMetadata() {
  const prefix = 'news-issue-point';
  return {
    contractVersion: 'news-issue-point-risk-quality-metadata-v1',
    producerContractVersion: 'v1_naver_news_issue_point_real_methodology',
    variableId: 'newsIssuePoint',
    lifecycleState: 'production',
    materialClass: 'real',
    confidenceState: 'insufficient',
    availabilityState: 'available-nonzero',
    identityState: 'resolved',
    coverageState: 'unknown',
    freshnessState: 'unknown',
    conflictState: 'unknown',
    revisionState: 'unknown',
    historyState: 'sufficient',
    evidenceRefs: ['naver-news-job:job-a'],
    requiredDimensionSemantics: {
      availability: semantic(prefix, 'availability', 'available-nonzero'),
      identity: semantic(prefix, 'identity', 'resolved'),
      confidence: semantic(prefix, 'confidence', 'insufficient'),
      coverage: semantic(prefix, 'coverage', 'unknown'),
      freshness: semantic(prefix, 'freshness', 'unknown'),
      conflict: semantic(prefix, 'conflict', 'unknown'),
      revision: semantic(prefix, 'revision', 'unknown'),
      history: semantic(prefix, 'history', 'sufficient'),
    },
  };
}

function activityMetadata() {
  const prefix = 'activity-exposure';
  return {
    contractVersion: 'activity-exposure-risk-quality-metadata-v1',
    producerContractVersion: 'product-activity-exposure-v1',
    variableId: 'comebackActivityPoint',
    lifecycleState: 'production',
    materialClass: 'real',
    confidenceState: 'insufficient',
    availabilityState: 'available',
    identityState: 'resolved',
    coverageState: 'complete',
    freshnessState: 'unknown',
    conflictState: 'unknown',
    revisionState: 'unknown',
    historyState: 'unknown',
    evidenceRefs: [
      'activity-exposure-provider-coverage:musicbrainz:2026-09-30:succeeded:covered',
      'activity-exposure-provider-coverage:youtube:2026-09-30:succeeded:covered',
    ],
    requiredDimensionSemantics: {
      availability: semantic(prefix, 'availability', 'available'),
      identity: semantic(prefix, 'identity', 'resolved'),
      confidence: semantic(prefix, 'confidence', 'insufficient'),
      coverage: semantic(prefix, 'coverage', 'complete'),
      freshness: semantic(prefix, 'freshness', 'unknown'),
      conflict: semantic(prefix, 'conflict', 'unknown'),
      revision: semantic(prefix, 'revision', 'unknown'),
      history: semantic(prefix, 'history', 'unknown'),
    },
  };
}

test('known producer contract identities are explicit and Variable-bound', () => {
  assert.deepEqual(RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS, {
    newsIssuePoint: 'news-issue-point-risk-quality-metadata-v1',
    comebackActivityPoint: 'activity-exposure-risk-quality-metadata-v1',
    brandFitPoint: 'brand-fit-point-risk-quality-metadata-v1',
  });
  assert.equal(
    RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS.newsIssuePoint,
    NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  );
  assert.equal(
    RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS.comebackActivityPoint,
    ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  );
  assert.equal(
    RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS.brandFitPoint,
    BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  );
});

test('newsIssuePoint producer metadata adapts directly to an accepted Risk envelope', () => {
  const result = adaptRiskAdjustmentProducerQualityMetadata(newsMetadata());

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.envelope.variableId, 'newsIssuePoint');
  assert.equal(
    result.envelope.producerContractVersion,
    'news-issue-point-risk-quality-metadata-v1',
  );
  assert.equal(result.assessment.status, 'accepted');
  assert.equal(
    result.assessment.handoff.acceptedForRiskConsumption,
    true,
  );
  assert.equal(result.envelope.input.volatilityState, 'unknown');
});

test('Activity Exposure producer metadata adapts directly to an accepted Risk envelope', () => {
  const result = adaptRiskAdjustmentProducerQualityMetadata(
    activityMetadata(),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(
    result.envelope.variableId,
    'comebackActivityPoint',
  );
  assert.equal(
    result.envelope.producerContractVersion,
    'activity-exposure-risk-quality-metadata-v1',
  );
  assert.equal(result.assessment.status, 'accepted');
  assert.equal(
    result.assessment.handoff.acceptedForRiskConsumption,
    true,
  );
});

test('both known producer metadata payloads are consumed but Product remains insufficient-data', () => {
  const news = adaptRiskAdjustmentProducerQualityMetadata(newsMetadata());
  const activity =
    adaptRiskAdjustmentProducerQualityMetadata(activityMetadata());

  assert.equal(news.status, 'ok');
  assert.equal(activity.status, 'ok');
  if (news.status !== 'ok' || activity.status !== 'ok') return;

  const assembly = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [news.envelope, activity.envelope],
  });

  assert.deepEqual(
    assembly.productDependencyAssembly.consumedVariableIds,
    ['comebackActivityPoint', 'newsIssuePoint'],
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

  assert.ok(
    product.assessment.qualityIssues.includes('confidence-insufficient'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('coverage-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('freshness-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('conflict-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('revision-state-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('history-unknown'),
  );
});

test('recognized Variable cannot substitute a different producer contract version', () => {
  const result = adaptRiskAdjustmentProducerQualityMetadata({
    ...newsMetadata(),
    contractVersion: 'activity-exposure-risk-quality-metadata-v1',
  });

  assert.deepEqual(result, {
    status: 'blocked',
    adapterVersion: 'risk-adjustment-producer-metadata-adapter-v1',
    reason: 'producer-contract-version-mismatch',
  });
});

test('unknown upstream Variable has no implicit producer acceptance', () => {
  const result = adaptRiskAdjustmentProducerQualityMetadata({
    ...newsMetadata(),
    variableId: 'growthMomentumPoint',
  });

  assert.deepEqual(result, {
    status: 'blocked',
    adapterVersion: 'risk-adjustment-producer-metadata-adapter-v1',
    reason: 'producer-contract-not-recognized',
  });
});

test('invalid producer state fails before envelope consumption', () => {
  const result = adaptRiskAdjustmentProducerQualityMetadata({
    ...newsMetadata(),
    freshnessState: 'current-ish',
  });

  assert.deepEqual(result, {
    status: 'blocked',
    adapterVersion: 'risk-adjustment-producer-metadata-adapter-v1',
    reason: 'producer-metadata-shape-invalid',
  });
});

test('semantic state mismatch remains an invalid producer envelope', () => {
  const metadata = newsMetadata();
  const result = adaptRiskAdjustmentProducerQualityMetadata({
    ...metadata,
    requiredDimensionSemantics: {
      ...metadata.requiredDimensionSemantics,
      freshness: semantic(
        'news-issue-point',
        'freshness',
        'current',
      ),
    },
  });

  assert.deepEqual(result, {
    status: 'blocked',
    adapterVersion: 'risk-adjustment-producer-metadata-adapter-v1',
    reason: 'producer-envelope-invalid',
  });
});

test('malformed producer metadata fails closed without throwing', () => {
  for (const value of [
    null,
    [],
    { contractVersion: 7 },
    {
      ...newsMetadata(),
      requiredDimensionSemantics: null,
    },
  ]) {
    assert.deepEqual(
      adaptRiskAdjustmentProducerQualityMetadata(value),
      {
        status: 'blocked',
        adapterVersion: 'risk-adjustment-producer-metadata-adapter-v1',
        reason: 'producer-metadata-shape-invalid',
      },
    );
  }
});
