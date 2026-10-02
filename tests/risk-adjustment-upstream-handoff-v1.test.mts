import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  type RiskAdjustmentUpstreamMetadataCapability,
} from '../lib/intelligence/riskAdjustmentUpstreamMetadataRequirements';
import {
  RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS,
  RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_READINESS,
  RISK_ADJUSTMENT_UPSTREAM_HANDOFF_REQUIREMENTS,
  RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE,
  evaluateRiskAdjustmentUpstreamHandoff,
} from '../lib/intelligence/riskAdjustmentUpstreamHandoff';
import type {
  RiskAdjustmentUpstreamVariableId,
} from '../lib/intelligence/riskAdjustmentPointConstruct';

function completeCapability(
  variableId: RiskAdjustmentUpstreamVariableId,
  overrides: Partial<RiskAdjustmentUpstreamMetadataCapability['qualityDimensions']> = {},
): RiskAdjustmentUpstreamMetadataCapability {
  return {
    variableId,
    lifecycleExposed: true,
    materialClassExposed: true,
    qualityDimensions: {
      availability: 'explicit',
      identity: 'explicit',
      confidence: 'explicit',
      coverage: 'explicit',
      freshness: 'explicit',
      conflict: 'explicit',
      revision: 'explicit',
      history: 'explicit',
      volatility: 'absent',
      ...overrides,
    },
  };
}

test('handoff contract requires Production Real and all required quality dimensions', () => {
  assert.equal(
    RISK_ADJUSTMENT_UPSTREAM_HANDOFF_REQUIREMENTS.lifecycleState,
    'production',
  );
  assert.equal(
    RISK_ADJUSTMENT_UPSTREAM_HANDOFF_REQUIREMENTS.materialClass,
    'real',
  );
  assert.deepEqual(
    RISK_ADJUSTMENT_UPSTREAM_HANDOFF_REQUIREMENTS.requiredQualityDimensions,
    [
      'availability',
      'identity',
      'confidence',
      'coverage',
      'freshness',
      'conflict',
      'revision',
      'history',
    ],
  );
  assert.deepEqual(
    RISK_ADJUSTMENT_UPSTREAM_HANDOFF_REQUIREMENTS.optionalQualityDimensions,
    ['volatility'],
  );
});

test('all upstream candidates have a deterministic owner handoff scope', () => {
  assert.deepEqual(RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE, {
    newsIssuePoint: 'news-issue-product-owner',
    comebackActivityPoint: 'activity-exposure-product-owner',
    growthMomentumPoint: 'momentum-product-owner',
    musicAlbumPoint: 'music-album-product-owner',
    snsFandomPoint: 'sns-fandom-product-owner',
    brandFitPoint: 'brand-fit-product-owner',
  });
});

test('current newsIssuePoint is Real Production and accepted at the metadata handoff boundary', () => {
  const result = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  });

  assert.equal(result.status, 'accepted');
  assert.equal(result.acceptedForRiskConsumption, true);
  assert.equal(result.ownerScope, 'news-issue-product-owner');
  assert.deepEqual(result.missingRequiredDimensions, []);
  assert.deepEqual(result.unknownRequiredDimensions, []);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.optionalDimensionsNotExplicit, ['volatility']);
});

test('current Activity Exposure is Real Production and accepted at the metadata handoff boundary', () => {
  const result = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  });

  assert.equal(result.status, 'accepted');
  assert.equal(result.acceptedForRiskConsumption, true);
  assert.equal(result.ownerScope, 'activity-exposure-product-owner');
  assert.deepEqual(result.missingRequiredDimensions, []);
  assert.deepEqual(result.unknownRequiredDimensions, []);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.optionalDimensionsNotExplicit, ['volatility']);
});

test('complete explicit required metadata is accepted without requiring volatility', () => {
  const result = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('newsIssuePoint'),
  });

  assert.equal(result.status, 'accepted');
  assert.equal(result.acceptedForRiskConsumption, true);
  assert.deepEqual(result.missingRequiredDimensions, []);
  assert.deepEqual(result.unknownRequiredDimensions, []);
  assert.deepEqual(result.optionalDimensionsNotExplicit, ['volatility']);
  assert.deepEqual(result.blockers, []);
});

test('unknown required metadata remains blocked even when every other dimension is explicit', () => {
  const result = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('newsIssuePoint', {
      freshness: 'unknown',
    }),
  });

  assert.equal(result.status, 'required-metadata-blocked');
  assert.equal(result.acceptedForRiskConsumption, false);
  assert.deepEqual(result.unknownRequiredDimensions, ['freshness']);
  assert.deepEqual(result.blockers, ['required-quality-metadata-unknown']);
});

test('non-Production upstream stays not-production-eligible before metadata promotion', () => {
  const result = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production-candidate',
    materialClass: 'real',
    capability: completeCapability('growthMomentumPoint'),
  });

  assert.equal(result.status, 'not-production-eligible');
  assert.equal(result.acceptedForRiskConsumption, false);
  assert.deepEqual(result.blockers, ['upstream-not-production']);
  assert.equal(result.ownerScope, 'momentum-product-owner');
});

test('non-Real material can never be accepted even with complete metadata', () => {
  const result = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'shadow',
    materialClass: 'preview',
    capability: completeCapability('musicAlbumPoint'),
  });

  assert.equal(result.status, 'not-production-eligible');
  assert.equal(result.acceptedForRiskConsumption, false);
  assert.deepEqual(result.blockers, [
    'upstream-not-production',
    'upstream-not-real',
  ]);
});

test('metadata blockers do not masquerade as lifecycle blockers', () => {
  const capability = completeCapability('snsFandomPoint', {
    confidence: 'absent',
    history: 'unknown',
  });
  const result = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability,
  });

  assert.equal(result.status, 'required-metadata-blocked');
  assert.deepEqual(result.missingRequiredDimensions, ['confidence']);
  assert.deepEqual(result.unknownRequiredDimensions, ['history']);
  assert.deepEqual(result.blockers, [
    'required-quality-metadata-absent',
    'required-quality-metadata-unknown',
  ]);
});


test('current Real upstream inventory separates Product reality from Risk acceptance', () => {
  assert.deepEqual(
    RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.map(
      (handoff) => handoff.variableId,
    ),
    ['newsIssuePoint', 'comebackActivityPoint'],
  );
  assert.deepEqual(RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_READINESS, {
    candidateCount: 2,
    acceptedCount: 2,
    metadataBlockedCount: 0,
    notProductionEligibleCount: 0,
  });
  const news = RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.find(
    (handoff) => handoff.variableId === 'newsIssuePoint',
  );
  const activity = RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.find(
    (handoff) => handoff.variableId === 'comebackActivityPoint',
  );
  assert.equal(news?.status, 'accepted');
  assert.equal(news?.acceptedForRiskConsumption, true);
  assert.equal(activity?.status, 'accepted');
  assert.equal(activity?.acceptedForRiskConsumption, true);
});
