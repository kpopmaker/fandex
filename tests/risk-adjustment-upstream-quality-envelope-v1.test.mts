import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateRiskAdjustmentUpstreamQualityEnvelope,
  type RiskAdjustmentUpstreamQualityEnvelope,
} from '../lib/intelligence/riskAdjustmentUpstreamQualityEnvelope';
import {
  createRiskAdjustmentProductContractCandidate,
} from '../lib/intelligence/riskAdjustmentProductContractCandidate';

const semanticStates: Readonly<Record<string, string>> = {
  availability: 'available-nonzero',
  identity: 'resolved',
  confidence: 'insufficient',
  coverage: 'complete',
  freshness: 'current',
  conflict: 'none',
  revision: 'stable',
  history: 'sufficient',
  volatility: 'unknown',
};

const semantic = (dimension: string, stateValue = semanticStates[dimension]) => ({
  semanticId: 'news-issue:' + dimension,
  semanticVersion: 'v1',
  stateValue,
  evidenceRefs: ['contract:' + dimension],
});

function completeEnvelope(
  overrides: Partial<RiskAdjustmentUpstreamQualityEnvelope> = {},
): RiskAdjustmentUpstreamQualityEnvelope {
  return {
    contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
    producerContractVersion: 'news-issue-quality-v1',
    variableId: 'newsIssuePoint',
    lifecycleState: 'production',
    materialClass: 'real',
    input: {
      variableId: 'newsIssuePoint',
      lifecycleState: 'production',
      materialClass: 'real',
      confidenceState: 'insufficient',
      availabilityState: 'available-nonzero',
      identityState: 'resolved',
      coverageState: 'complete',
      freshnessState: 'current',
      conflictState: 'none',
      revisionState: 'stable',
      volatilityState: 'unknown',
      historyState: 'sufficient',
      evidenceRefs: ['naver-news-job:job-1'],
    },
    requiredDimensionSemantics: {
      availability: semantic('availability'),
      identity: semantic('identity'),
      confidence: semantic('confidence'),
      coverage: semantic('coverage'),
      freshness: semantic('freshness'),
      conflict: semantic('conflict'),
      revision: semantic('revision'),
      history: semantic('history'),
    },
    optionalDimensionSemantics: {},
    ...overrides,
  };
}

test('runtime envelope contract version mismatch fails closed', () => {
  const envelope = {
    ...completeEnvelope(),
    contractVersion: 'risk-adjustment-upstream-quality-envelope-v0',
  } as unknown as RiskAdjustmentUpstreamQualityEnvelope;

  assert.deepEqual(
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope),
    {
      status: 'invalid',
      contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
      reason: 'contract-version-mismatch',
    },
  );
});

test('complete upstream semantic envelope is accepted for Risk consumption', () => {
  const assessment = evaluateRiskAdjustmentUpstreamQualityEnvelope(
    completeEnvelope(),
  );

  assert.equal(assessment.status, 'accepted');
  if (assessment.status !== 'accepted') return;

  assert.equal(assessment.handoff.acceptedForRiskConsumption, true);
  assert.deepEqual(assessment.handoff.missingRequiredDimensions, []);
  assert.deepEqual(assessment.handoff.unknownRequiredDimensions, []);
  assert.deepEqual(
    assessment.handoff.optionalDimensionsNotExplicit,
    ['volatility'],
  );
});

test('explicit poor or insufficient quality remains valid metadata rather than being hidden', () => {
  const assessment = evaluateRiskAdjustmentUpstreamQualityEnvelope(
    completeEnvelope(),
  );
  assert.equal(assessment.status, 'accepted');
  if (assessment.status !== 'accepted') return;

  assert.equal(assessment.input.confidenceState, 'insufficient');

  const product = createRiskAdjustmentProductContractCandidate({
    artistId: 'iu',
    inputs: [assessment.input],
  });

  assert.equal(product.readinessState, 'insufficient-data');
  assert.equal(product.numericEligible, false);
  assert.equal(product.score, null);
  assert.equal(product.penalty, null);
});

test('missing required dimension semantic remains metadata-blocked', () => {
  const envelope = completeEnvelope({
    requiredDimensionSemantics: {
      availability: semantic('availability'),
      identity: semantic('identity'),
      confidence: semantic('confidence'),
      coverage: semantic('coverage'),
      conflict: semantic('conflict'),
      revision: semantic('revision'),
      history: semantic('history'),
    },
  });

  const assessment =
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope);

  assert.equal(assessment.status, 'required-metadata-blocked');
  if (assessment.status !== 'required-metadata-blocked') return;

  assert.deepEqual(
    assessment.handoff.missingRequiredDimensions,
    ['freshness'],
  );
  assert.equal(assessment.handoff.acceptedForRiskConsumption, false);
});

test('empty semantic evidence is structurally invalid rather than silently absent', () => {
  const envelope = completeEnvelope({
    requiredDimensionSemantics: {
      ...completeEnvelope().requiredDimensionSemantics,
      freshness: {
        semanticId: 'news-issue:freshness',
        semanticVersion: 'v1',
        stateValue: 'current',
        evidenceRefs: [],
      },
    },
  });

  assert.deepEqual(
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope),
    {
      status: 'invalid',
      contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
      reason: 'dimension-semantic-invalid',
    },
  );
});

test('required semantic state must match the projected Risk input state', () => {
  const envelope = completeEnvelope({
    requiredDimensionSemantics: {
      ...completeEnvelope().requiredDimensionSemantics,
      freshness: semantic('freshness', 'stale'),
    },
  });

  assert.deepEqual(
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope),
    {
      status: 'invalid',
      contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
      reason: 'dimension-state-mismatch',
    },
  );
});

test('optional volatility semantic must bind to the projected volatility state', () => {
  const envelope = completeEnvelope({
    optionalDimensionSemantics: {
      volatility: semantic('volatility', 'ordinary'),
    },
  });

  assert.deepEqual(
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope),
    {
      status: 'invalid',
      contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
      reason: 'dimension-state-mismatch',
    },
  );
});

test('runtime-invalid projected state cannot be accepted even when semantic stateValue matches it', () => {
  const base = completeEnvelope();
  const envelope = {
    ...base,
    input: {
      ...base.input,
      freshnessState: 'banana',
    },
    requiredDimensionSemantics: {
      ...base.requiredDimensionSemantics,
      freshness: semantic('freshness', 'banana'),
    },
  } as unknown as RiskAdjustmentUpstreamQualityEnvelope;

  assert.deepEqual(
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope),
    {
      status: 'invalid',
      contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
      reason: 'upstream-input-invalid',
    },
  );
});

test('variable identity mismatch is rejected before handoff evaluation', () => {
  const envelope = completeEnvelope({
    variableId: 'comebackActivityPoint',
  });

  assert.deepEqual(
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope),
    {
      status: 'invalid',
      contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
      reason: 'variable-id-mismatch',
    },
  );
});

test('non-Production material remains explicitly not Production eligible', () => {
  const envelope = completeEnvelope({
    lifecycleState: 'shadow',
    input: {
      ...completeEnvelope().input,
      lifecycleState: 'shadow',
    },
  });

  const assessment =
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope);

  assert.equal(assessment.status, 'not-production-eligible');
  if (assessment.status !== 'not-production-eligible') return;
  assert.equal(assessment.handoff.acceptedForRiskConsumption, false);
  assert.deepEqual(assessment.handoff.blockers, ['upstream-not-production']);
});

test('optional volatility semantic is not required for handoff acceptance', () => {
  const withoutVolatility =
    evaluateRiskAdjustmentUpstreamQualityEnvelope(completeEnvelope());
  assert.equal(withoutVolatility.status, 'accepted');

  const withVolatility =
    evaluateRiskAdjustmentUpstreamQualityEnvelope(
      completeEnvelope({
        optionalDimensionSemantics: {
          volatility: semantic('volatility'),
        },
      }),
    );
  assert.equal(withVolatility.status, 'accepted');
  if (withVolatility.status !== 'accepted') return;
  assert.deepEqual(
    withVolatility.handoff.optionalDimensionsNotExplicit,
    [],
  );
});
