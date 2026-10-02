import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRiskAdjustmentDerivationReadinessWitness,
} from '../lib/intelligence/riskAdjustmentDerivationReadinessWitness';
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
    availabilityState:
      variableId === 'comebackActivityPoint'
        ? 'available'
        : 'available-nonzero',
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

test('current main distinguishes partial metadata integration from accepted quality insufficiency', () => {
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

  const witness = createRiskAdjustmentDerivationReadinessWitness({
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

  assert.equal(witness.integrationState, 'partially-consumable');
  assert.equal(witness.acceptedQualityState, 'insufficient');
  assert.equal(witness.productReadinessState, 'insufficient-data');
  assert.deepEqual(witness.acceptedVariableIds, ['newsIssuePoint']);
  assert.deepEqual(
    witness.metadataBlockedVariableIds,
    ['comebackActivityPoint'],
  );
  assert.deepEqual(
    witness.qualityInsufficientVariableIds,
    ['newsIssuePoint'],
  );
  assert.deepEqual(witness.categoricalReadyVariableIds, []);

  const news = witness.dependencies.find(
    (dependency) => dependency.variableId === 'newsIssuePoint',
  );
  const activity = witness.dependencies.find(
    (dependency) => dependency.variableId === 'comebackActivityPoint',
  );
  assert.equal(
    news?.state,
    'metadata-consumable-quality-insufficient',
  );
  assert.deepEqual(news?.failClosedQualityIssues, [
    'confidence-insufficient',
    'conflict-unknown',
    'coverage-unknown',
    'freshness-unknown',
    'revision-state-unknown',
  ]);
  assert.equal(activity?.state, 'metadata-blocked');
  assert.deepEqual(activity?.qualityIssues, []);
  assert.equal(witness.numericEligible, false);
  assert.equal(witness.score, null);
});

test('post-Activity-producer overlay can be fully consumable while quality remains insufficient', () => {
  const newsHandoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  });
  const activityHandoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: completeCapability('comebackActivityPoint'),
  });

  const witness = createRiskAdjustmentDerivationReadinessWitness({
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
          coverageState: 'complete',
          freshnessState: 'unknown',
          conflictState: 'unknown',
          revisionState: 'unknown',
          historyState: 'unknown',
        }),
      },
    ],
  });

  assert.equal(witness.integrationState, 'all-consumable');
  assert.equal(witness.acceptedQualityState, 'insufficient');
  assert.equal(witness.productReadinessState, 'insufficient-data');
  assert.deepEqual(witness.acceptedVariableIds, [
    'comebackActivityPoint',
    'newsIssuePoint',
  ]);
  assert.deepEqual(witness.metadataBlockedVariableIds, []);
  assert.deepEqual(witness.qualityInsufficientVariableIds, [
    'comebackActivityPoint',
    'newsIssuePoint',
  ]);
});

test('explicit adverse but resolved quality can be categorical-ready without becoming a penalty', () => {
  const witness = createRiskAdjustmentDerivationReadinessWitness({
    artistId: 'iu',
    dependencies: [
      {
        handoff: evaluateRiskAdjustmentUpstreamHandoff({
          lifecycleState: 'production',
          materialClass: 'real',
          capability: completeCapability('newsIssuePoint'),
        }),
        projectedInput: projectedInput('newsIssuePoint', {
          freshnessState: 'stale',
        }),
      },
      {
        handoff: evaluateRiskAdjustmentUpstreamHandoff({
          lifecycleState: 'production',
          materialClass: 'real',
          capability: completeCapability('comebackActivityPoint'),
        }),
        projectedInput: projectedInput('comebackActivityPoint', {
          coverageState: 'incomplete',
          volatilityState: 'unusual',
        }),
      },
    ],
  });

  assert.equal(witness.integrationState, 'all-consumable');
  assert.equal(witness.acceptedQualityState, 'categorical-ready');
  assert.equal(
    witness.productReadinessState,
    'categorical-contract-ready',
  );
  assert.deepEqual(witness.qualityInsufficientVariableIds, []);
  assert.deepEqual(witness.categoricalReadyVariableIds, [
    'comebackActivityPoint',
    'newsIssuePoint',
  ]);
  assert.equal(witness.penalty, null);
  assert.equal(witness.weight, null);
  assert.equal(witness.activationAuthorized, false);
});

test('mixed accepted quality is explicit instead of collapsed into one risk label', () => {
  const witness = createRiskAdjustmentDerivationReadinessWitness({
    artistId: 'iu',
    dependencies: [
      {
        handoff: evaluateRiskAdjustmentUpstreamHandoff({
          lifecycleState: 'production',
          materialClass: 'real',
          capability: completeCapability('newsIssuePoint'),
        }),
        projectedInput: projectedInput('newsIssuePoint'),
      },
      {
        handoff: evaluateRiskAdjustmentUpstreamHandoff({
          lifecycleState: 'production',
          materialClass: 'real',
          capability: completeCapability('comebackActivityPoint'),
        }),
        projectedInput: projectedInput('comebackActivityPoint', {
          historyState: 'unknown',
        }),
      },
    ],
  });

  assert.equal(witness.integrationState, 'all-consumable');
  assert.equal(witness.acceptedQualityState, 'mixed');
  assert.equal(witness.productReadinessState, 'insufficient-data');
  assert.deepEqual(witness.categoricalReadyVariableIds, [
    'newsIssuePoint',
  ]);
  assert.deepEqual(witness.qualityInsufficientVariableIds, [
    'comebackActivityPoint',
  ]);
});

test('non-Production dependency is separated from metadata and quality readiness', () => {
  const witness = createRiskAdjustmentDerivationReadinessWitness({
    artistId: 'iu',
    dependencies: [
      {
        handoff: evaluateRiskAdjustmentUpstreamHandoff({
          lifecycleState: 'production-candidate',
          materialClass: 'real',
          capability: completeCapability('growthMomentumPoint'),
        }),
        projectedInput: projectedInput('growthMomentumPoint', {
          lifecycleState: 'production-candidate',
        }),
      },
    ],
  });

  assert.equal(witness.integrationState, 'none-consumable');
  assert.equal(witness.acceptedQualityState, 'not-evaluable');
  assert.deepEqual(witness.metadataBlockedVariableIds, []);
  assert.deepEqual(witness.notProductionEligibleVariableIds, [
    'growthMomentumPoint',
  ]);
  assert.deepEqual(witness.qualityInsufficientVariableIds, []);
});

test('empty dependency set stays nonnumeric and not quality-evaluable', () => {
  const witness = createRiskAdjustmentDerivationReadinessWitness({
    artistId: 'iu',
    dependencies: [],
  });

  assert.equal(witness.integrationState, 'none-consumable');
  assert.equal(witness.acceptedQualityState, 'not-evaluable');
  assert.equal(witness.productReadinessState, 'insufficient-data');
  assert.deepEqual(witness.dependencies, []);
  assert.equal(witness.numericEligible, false);
  assert.equal(witness.activationAuthorized, false);
  assert.equal(witness.publicationAuthorized, false);
  assert.equal(witness.publicRouteAuthorized, false);
});
