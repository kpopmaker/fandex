import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptRiskAdjustmentToFandexVariableProduct,
  RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/riskAdjustmentFandexVariableProduct';
import {
  buildRiskAdjustmentCurrentReadinessReport,
} from '../lib/intelligence/riskAdjustmentCurrentReadinessReport';
import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  createRiskAdjustmentProductContractCandidate,
} from '../lib/intelligence/riskAdjustmentProductContractCandidate';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyWitness';

function upstream(
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

function currentInputs(
  overrides: Readonly<{
    news?: Partial<RiskAdjustmentUpstreamInput>;
    activity?: Partial<RiskAdjustmentUpstreamInput>;
  }> = {},
): readonly RiskAdjustmentUpstreamInput[] {
  return [
    upstream('newsIssuePoint', overrides.news),
    upstream('comebackActivityPoint', overrides.activity),
  ];
}

function pair(
  inputs: readonly RiskAdjustmentUpstreamInput[],
) {
  return {
    candidate: createRiskAdjustmentProductContractCandidate({
      artistId: 'iu',
      inputs,
    }),
    readiness: buildRiskAdjustmentCurrentReadinessReport(
      deriveRiskAdjustmentQualitySufficiencyWitness(inputs),
    ),
  };
}

test('current unresolved quality state maps to building-history without a fake Risk value', () => {
  const result = adaptRiskAdjustmentToFandexVariableProduct(
    pair(currentInputs({
      news: {
        confidenceState: 'insufficient',
        coverageState: 'unknown',
        freshnessState: 'unknown',
        conflictState: 'unknown',
        revisionState: 'unknown',
        volatilityState: 'unknown',
      },
      activity: {
        confidenceState: 'insufficient',
        freshnessState: 'unknown',
        conflictState: 'unknown',
        revisionState: 'unknown',
        volatilityState: 'unknown',
        historyState: 'unknown',
      },
    })),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.variableId, 'riskAdjustmentPoint');
  assert.equal(result.record.canonicalArtistId, 'iu');
  assert.equal(result.record.lifecycleState, 'research');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.readinessState, 'building-history');
  assert.equal(result.record.availability, 'unavailable');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'not-produced',
  });
  assert.equal(result.record.coverage, 'incomplete');
  assert.equal(result.record.confidence, 'insufficient');
  assert.equal(result.record.freshness, 'unknown');
  assert.equal(
    result.record.productVersion,
    RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );
});

test('categorical-ready current inputs emit a quality state without numeric penalty or weight', () => {
  const result = adaptRiskAdjustmentToFandexVariableProduct(
    pair(currentInputs({
      news: { freshnessState: 'stale' },
      activity: { coverageState: 'incomplete' },
    })),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.readinessState, 'research-only');
  assert.equal(result.record.availability, 'available');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'quality',
    state: 'coverage-limited|source-stale',
  });

  const serialized = JSON.stringify(result.record);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"kind":"numeric"'), false);
});

test('dependency-blocked current input maps to explicit blocked common state', () => {
  const result = adaptRiskAdjustmentToFandexVariableProduct(
    pair(currentInputs({
      news: { lifecycleState: 'shadow' },
    })),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.readinessState, 'blocked');
  assert.equal(result.record.availability, 'blocked');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'blocked',
  });
  assert.ok(
    result.record.blockerReason?.includes(
      'dependency-blocked:newsIssuePoint',
    ),
  );
});

test('true zero remains explicit evidence and never becomes a Risk score of zero', () => {
  const result = adaptRiskAdjustmentToFandexVariableProduct(
    pair(currentInputs({
      news: { availabilityState: 'true-zero' },
    })),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      'risk-true-zero:newsIssuePoint',
    ),
  );
  assert.equal(
    JSON.stringify(result.record).includes('"value":0'),
    false,
  );
});

test('partial six-variable candidate universe stays explicit even when current two-input categorical contract is ready', () => {
  const result = adaptRiskAdjustmentToFandexVariableProduct(
    pair(currentInputs()),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.coverage, 'incomplete');
  assert.ok(
    result.record.evidenceRefs.includes(
      'risk-candidate-universe-status:partial-current-real-production',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'risk-excluded-upstream-count:4',
    ),
  );
});

test('candidate and current readiness must cover the same current accepted dependencies', () => {
  const readiness = buildRiskAdjustmentCurrentReadinessReport(
    deriveRiskAdjustmentQualitySufficiencyWitness(currentInputs()),
  );
  const candidate = createRiskAdjustmentProductContractCandidate({
    artistId: 'iu',
    inputs: [upstream('newsIssuePoint')],
  });

  assert.deepEqual(
    adaptRiskAdjustmentToFandexVariableProduct({
      candidate,
      readiness,
    }),
    {
      status: 'blocked',
      reason: 'candidate-current-input-mismatch',
    },
  );
});

test('forged numeric or Product authorization state fails closed', () => {
  const current = pair(currentInputs());
  const numeric = {
    ...current.candidate,
    score: 0,
  } as unknown as typeof current.candidate;
  const activated = {
    ...current.candidate,
    activationAuthorized: true,
  } as unknown as typeof current.candidate;

  assert.deepEqual(
    adaptRiskAdjustmentToFandexVariableProduct({
      candidate: numeric,
      readiness: current.readiness,
    }),
    {
      status: 'blocked',
      reason: 'numeric-boundary-violated',
    },
  );

  assert.deepEqual(
    adaptRiskAdjustmentToFandexVariableProduct({
      candidate: activated,
      readiness: current.readiness,
    }),
    {
      status: 'blocked',
      reason: 'authorization-boundary-violated',
    },
  );
});

test('aggregate Risk observation and collection times remain unknown rather than inferred from heterogeneous upstream evidence', () => {
  const result = adaptRiskAdjustmentToFandexVariableProduct(
    pair(currentInputs()),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.asOf, null);
  assert.deepEqual(result.record.observationTime, { kind: 'unknown' });
  assert.equal(result.record.collectionTime, null);
});
