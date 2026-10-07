import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  buildRiskAdjustmentCurrentReadinessReport,
} from '../lib/intelligence/riskAdjustmentCurrentReadinessReport';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyWitness';

function input(
  variableId: RiskAdjustmentUpstreamInput['variableId'],
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
    volatilityState: 'ordinary',
    historyState: 'sufficient',
    evidenceRefs: [`evidence:${variableId}:1`],
    ...overrides,
  };
}

function currentWitness() {
  return deriveRiskAdjustmentQualitySufficiencyWitness([
    input('newsIssuePoint', {
      confidenceState: 'insufficient',
      availabilityState: 'available-nonzero',
      coverageState: 'unknown',
      freshnessState: 'unknown',
      conflictState: 'unknown',
      revisionState: 'unknown',
      volatilityState: 'unknown',
    }),
    input('comebackActivityPoint', {
      confidenceState: 'insufficient',
      coverageState: 'complete',
      freshnessState: 'unknown',
      conflictState: 'unknown',
      revisionState: 'unknown',
      volatilityState: 'unknown',
      historyState: 'unknown',
    }),
  ]);
}

test('current readiness report keeps Product sufficiency separate from candidate-universe coverage', () => {
  const report =
    buildRiskAdjustmentCurrentReadinessReport(currentWitness());

  assert.equal(report.currentProductStatus, 'quality-sufficiency-blocked');
  assert.equal(report.currentProductReadyForCategoricalContract, false);
  assert.equal(
    report.candidateUniverseStatus,
    'partial-current-real-production',
  );
  assert.equal(report.candidateCount, 6);
  assert.equal(report.currentRealProductionCount, 2);
  assert.equal(report.excludedUpstreamCount, 4);
  assert.equal(report.unresolvedQualityOwnerCount, 2);
  assert.equal(report.excludedOwnerCount, 4);

  assert.deepEqual(
    report.entries.map((entry) => ({
      variableId: entry.variableId,
      state: entry.state,
      acceptedForRiskConsumption: entry.acceptedForRiskConsumption,
      exclusionReason: entry.exclusionReason,
      unresolvedRequiredDimensions:
        entry.unresolvedRequiredDimensions,
    })),
    [
      {
        variableId: 'newsIssuePoint',
        state: 'eligible-quality-blocked',
        acceptedForRiskConsumption: true,
        exclusionReason: null,
        unresolvedRequiredDimensions: [
          'confidence',
          'conflict',
          'coverage',
          'freshness',
          'revision',
        ],
      },
      {
        variableId: 'comebackActivityPoint',
        state: 'eligible-quality-blocked',
        acceptedForRiskConsumption: true,
        exclusionReason: null,
        unresolvedRequiredDimensions: [
          'confidence',
          'conflict',
          'freshness',
          'history',
          'revision',
        ],
      },
      {
        variableId: 'growthMomentumPoint',
        state: 'excluded-upstream-readiness',
        acceptedForRiskConsumption: false,
        exclusionReason: 'momentum-publication-not-production',
        unresolvedRequiredDimensions: [],
      },
      {
        variableId: 'musicAlbumPoint',
        state: 'excluded-upstream-readiness',
        acceptedForRiskConsumption: false,
        exclusionReason: 'music-album-reported-web-current-production-not-ready',
        unresolvedRequiredDimensions: [],
      },
      {
        variableId: 'snsFandomPoint',
        state: 'excluded-upstream-readiness',
        acceptedForRiskConsumption: false,
        exclusionReason: 'sns-fandom-provider-and-product-gates-open',
        unresolvedRequiredDimensions: [],
      },
      {
        variableId: 'brandFitPoint',
        state: 'excluded-upstream-readiness',
        acceptedForRiskConsumption: false,
        exclusionReason: 'brand-fit-product-activation-not-authorized',
        unresolvedRequiredDimensions: [],
      },
    ],
  );

  assert.equal(report.numericEligible, false);
  assert.equal(report.score, null);
  assert.equal(report.penalty, null);
  assert.equal(report.weight, null);
});

test('resolving both current inputs changes Product readiness without pretending excluded candidates became Production', () => {
  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        availabilityState: 'available-nonzero',
        coverageState: 'incomplete',
        freshnessState: 'stale',
        conflictState: 'detected',
        revisionState: 'unstable',
      }),
      input('comebackActivityPoint', {
        coverageState: 'complete',
        freshnessState: 'stale',
        conflictState: 'detected',
        revisionState: 'revised-stable',
        historyState: 'sufficient',
      }),
    ]);

  const report =
    buildRiskAdjustmentCurrentReadinessReport(witness);

  assert.equal(
    report.currentProductStatus,
    'categorical-contract-ready',
  );
  assert.equal(report.currentProductReadyForCategoricalContract, true);
  assert.equal(
    report.candidateUniverseStatus,
    'partial-current-real-production',
  );
  assert.equal(report.currentRealProductionCount, 2);
  assert.equal(report.excludedUpstreamCount, 4);

  assert.deepEqual(
    report.entries
      .filter((entry) => entry.acceptedForRiskConsumption)
      .map((entry) => entry.state),
    ['eligible-categorical-ready', 'eligible-categorical-ready'],
  );
  assert.equal(
    report.entries.filter(
      (entry) => entry.state === 'excluded-upstream-readiness',
    ).length,
    4,
  );
});

test('readiness report rejects a witness that silently omits a current Real dependency', () => {
  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint'),
    ]);

  assert.throws(
    () => buildRiskAdjustmentCurrentReadinessReport(witness),
    /risk_adjustment_current_readiness_witness_eligibility_mismatch/,
  );
});

test('readiness report rejects a witness that injects a non-current dependency', () => {
  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint'),
      input('comebackActivityPoint'),
      input('snsFandomPoint'),
    ]);

  assert.throws(
    () => buildRiskAdjustmentCurrentReadinessReport(witness),
    /risk_adjustment_current_readiness_witness_eligibility_mismatch/,
  );
});
