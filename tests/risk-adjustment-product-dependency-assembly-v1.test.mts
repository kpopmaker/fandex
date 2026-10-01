import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assembleRiskAdjustmentProductDependencies,
} from '../lib/intelligence/riskAdjustmentProductDependencyAssembly';
import type {
  RiskAdjustmentUpstreamInput,
  RiskAdjustmentUpstreamVariableId,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  type RiskAdjustmentUpstreamMetadataCapability,
} from '../lib/intelligence/riskAdjustmentUpstreamMetadataRequirements';
import {
  evaluateRiskAdjustmentUpstreamHandoff,
} from '../lib/intelligence/riskAdjustmentUpstreamHandoff';

function projectedInput(
  variableId: RiskAdjustmentUpstreamVariableId,
  overrides: Partial<RiskAdjustmentUpstreamInput> = {},
): RiskAdjustmentUpstreamInput {
  return {
    variableId,
    lifecycleState: 'production',
    materialClass: 'real',
    confidenceState: 'high',
    availabilityState: 'available',
    identityState: 'resolved',
    coverageState: 'complete',
    freshnessState: 'current',
    conflictState: 'none',
    revisionState: 'stable',
    volatilityState: 'unknown',
    historyState: 'sufficient',
    evidenceRefs: [`evidence:${variableId}:1`],
    ...overrides,
  };
}

function completeCapability(
  variableId: RiskAdjustmentUpstreamVariableId,
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
    },
  };
}

test('current Real upstream projections are not consumed while handoffs are metadata-blocked', () => {
  const newsHandoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  });
  const activityHandoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  });

  const result = assembleRiskAdjustmentProductDependencies({
    artistId: 'iu',
    dependencies: [
      {
        handoff: newsHandoff,
        projectedInput: projectedInput('newsIssuePoint', {
          confidenceState: 'insufficient',
          coverageState: 'unknown',
          freshnessState: 'unknown',
          conflictState: 'unknown',
          revisionState: 'unknown',
        }),
      },
      {
        handoff: activityHandoff,
        projectedInput: projectedInput('comebackActivityPoint', {
          confidenceState: 'insufficient',
          freshnessState: 'unknown',
          conflictState: 'unknown',
          revisionState: 'unknown',
          historyState: 'unknown',
        }),
      },
    ],
  });

  assert.deepEqual(result.consumedVariableIds, []);
  assert.deepEqual(result.blockedVariableIds, [
    'comebackActivityPoint',
    'newsIssuePoint',
  ]);
  assert.equal(result.dependencies.every((entry) => !entry.consumed), true);
  assert.equal(
    result.dependencies.every((entry) => entry.projectionPresent),
    true,
  );
  assert.equal(
    result.productCandidate.readinessState,
    'insufficient-data',
  );
  assert.equal(result.productCandidate.numericEligible, false);
  assert.equal(result.productCandidate.score, null);
});

test('accepted handoffs are the only inputs consumed by Product assembly', () => {
  const newsHandoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('newsIssuePoint'),
  });
  const activityHandoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('comebackActivityPoint'),
  });

  const result = assembleRiskAdjustmentProductDependencies({
    artistId: 'iu',
    dependencies: [
      {
        handoff: newsHandoff,
        projectedInput: projectedInput('newsIssuePoint'),
      },
      {
        handoff: activityHandoff,
        projectedInput: projectedInput('comebackActivityPoint', {
          coverageState: 'incomplete',
        }),
      },
    ],
  });

  assert.deepEqual(result.consumedVariableIds, [
    'comebackActivityPoint',
    'newsIssuePoint',
  ]);
  assert.deepEqual(result.blockedVariableIds, []);
  assert.equal(
    result.productCandidate.readinessState,
    'categorical-contract-ready',
  );
  assert.deepEqual(
    result.productCandidate.assessment.qualityIssues,
    ['incomplete-coverage', 'volatility-unknown'],
  );
  assert.deepEqual(
    result.productCandidate.categoricalState.states,
    ['coverage-limited'],
  );
  assert.equal(result.productCandidate.activationAuthorized, false);
  assert.equal(result.productCandidate.score, null);
});

test('non-Production handoff is never consumed even when a projection is present', () => {
  const handoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production-candidate',
    materialClass: 'real',
    capability: completeCapability('growthMomentumPoint'),
  });

  const result = assembleRiskAdjustmentProductDependencies({
    artistId: 'iu',
    dependencies: [
      {
        handoff,
        projectedInput: projectedInput('growthMomentumPoint', {
          lifecycleState: 'production-candidate',
        }),
      },
    ],
  });

  assert.deepEqual(result.consumedVariableIds, []);
  assert.deepEqual(result.blockedVariableIds, ['growthMomentumPoint']);
  assert.equal(
    result.productCandidate.readinessState,
    'insufficient-data',
  );
});

test('accepted handoff without a matching projection fails closed', () => {
  const handoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('newsIssuePoint'),
  });

  assert.throws(
    () =>
      assembleRiskAdjustmentProductDependencies({
        artistId: 'iu',
        dependencies: [{ handoff, projectedInput: null }],
      }),
    /accepted_dependency_projection_missing/,
  );
});

test('handoff and projection variable identity mismatch fails closed', () => {
  const handoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('newsIssuePoint'),
  });

  assert.throws(
    () =>
      assembleRiskAdjustmentProductDependencies({
        artistId: 'iu',
        dependencies: [
          {
            handoff,
            projectedInput: projectedInput('comebackActivityPoint'),
          },
        ],
      }),
    /dependency_projection_mismatch/,
  );
});

test('accepted handoff cannot carry a non-Production projection', () => {
  const handoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('newsIssuePoint'),
  });

  assert.throws(
    () =>
      assembleRiskAdjustmentProductDependencies({
        artistId: 'iu',
        dependencies: [
          {
            handoff,
            projectedInput: projectedInput('newsIssuePoint', {
              lifecycleState: 'shadow',
            }),
          },
        ],
      }),
    /accepted_dependency_boundary_invalid/,
  );
});

test('duplicate handoffs fail closed before Product assembly', () => {
  const handoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('newsIssuePoint'),
  });

  assert.throws(
    () =>
      assembleRiskAdjustmentProductDependencies({
        artistId: 'iu',
        dependencies: [
          { handoff, projectedInput: projectedInput('newsIssuePoint') },
          { handoff, projectedInput: projectedInput('newsIssuePoint') },
        ],
      }),
    /dependency_handoff_duplicate/,
  );
});
