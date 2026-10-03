import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptMomentumToFandexVariableProduct,
  MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/momentumFandexVariableProduct';
import {
  MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION,
  type MomentumLiveShadowProductReadinessResult,
} from '../lib/product/readiness/momentumLiveShadowProductReadiness';
import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';

function runtimeShadow(
  directionalConsensus:
    | 'direction-corroborated-up'
    | 'direction-corroborated-down'
    | 'flat-corroborated'
    | 'direction-conflicted'
    | 'direction-insufficient' = 'direction-conflicted',
): ProductMomentumEvidenceConsensusReadModelResult {
  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion: 'product-momentum-evidence-consensus-v1' as const,
      identity: Object.freeze({
        sourceArtistId: 'iu',
        constructId: 'momentumEvidenceConsensus' as const,
      }),
      construct: 'Momentum Evidence Consensus' as const,
      evidence: Object.freeze({
        alignmentCutoffAt: '2026-09-30T02:10:05.000Z',
        directionalConsensus,
        persistenceConsensus: 'persistence-not-applicable' as const,
        qualitativeDirectionEvidenceUsable:
          directionalConsensus !== 'direction-conflicted'
          && directionalConsensus !== 'direction-insufficient',
        conflictState:
          directionalConsensus === 'direction-conflicted'
            ? 'detected' as const
            : 'none' as const,
      }),
      requiredFamilies: Object.freeze([
        'audience-consumption',
        'media-attention',
      ] as const),
      sourceCarrier: Object.freeze({
        variableId:
          'momentum.cross-family-evidence-state.research' as const,
        lifecycleState: 'research' as const,
        materialClass: 'real' as const,
      }),
      storedEvidenceTrace: Object.freeze({
        carrierRecordId: 'a'.repeat(64),
        observationId: 'obs-momentum-1',
        sourceV143Digest: 'b'.repeat(64),
        observationDigest: 'c'.repeat(64),
      }),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    }),
  });
}

function readiness(input: Readonly<{
  satisfiesFreshness?: boolean;
  sourceAdvancementObserved?: boolean;
  state?:
    | 'current-categorical-evaluation-required'
    | 'public-route-candidate'
    | 'blocked';
}> = {}): MomentumLiveShadowProductReadinessResult {
  const satisfiesFreshness = input.satisfiesFreshness ?? false;
  const sourceAdvancementObserved =
    input.sourceAdvancementObserved ?? true;

  return Object.freeze({
    contractVersion: MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION,
    state:
      input.state
      ?? (satisfiesFreshness
        ? 'public-route-candidate'
        : 'current-categorical-evaluation-required'),
    productActivationReady: false as const,
    productPublicationReady: false as const,
    publicRouteDesignReady: satisfiesFreshness,
    productMomentumScore: null,
    numericProductEligible: false as const,
    previewFallbackAllowed: false as const,
    runtimeShadowReadVerified: true,
    currentCarrier: Object.freeze({
      carrierRecordId: 'a'.repeat(64),
      alignmentCutoffAt: '2026-09-30T02:10:05.000Z',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      historicalOnly: !satisfiesFreshness,
    }),
    sourceCurrentness: Object.freeze({
      lastfmSourceAdvancedBeyondCarrierCutoff:
        sourceAdvancementObserved,
      naverSchedulerObservedAfterCarrierCutoff:
        sourceAdvancementObserved,
      naverCurrentStoredEvidenceReproducedForReadiness:
        satisfiesFreshness,
      sourceAdvancementObserved,
    }),
    freshnessPolicy: Object.freeze({
      arbitraryAgeThresholdAllowed: false as const,
      maximumAgeDays: null,
      currentCategoricalEvaluationRequiredAfterSourceAdvancement:
        true as const,
      newHistoryObservationRequiredBeforeEvaluation: false as const,
      historyAppendDecision:
        'defer-until-current-evaluation' as const,
    }),
    currentEvaluation: Object.freeze({
      performed: satisfiesFreshness,
      currentCarrierProduced: false,
      currentNoOpEvaluationAttested: satisfiesFreshness,
      satisfiesFreshness,
      evaluatedAlignmentCutoffAt:
        satisfiesFreshness
          ? '2026-09-30T02:10:05.000Z'
          : null,
      directionalConsensus:
        satisfiesFreshness
          ? 'direction-conflicted'
          : null,
      persistenceConsensus:
        satisfiesFreshness
          ? 'persistence-not-applicable'
          : null,
      attestationPath:
        satisfiesFreshness
          ? 'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json'
          : null,
      attestationDigest:
        satisfiesFreshness ? 'd'.repeat(64) : null,
    }),
    blockers:
      input.state === 'blocked'
        ? Object.freeze(['source-currentness-audit-invalid'])
        : satisfiesFreshness
          ? Object.freeze([])
          : Object.freeze([
              'current-dual-source-categorical-evaluation-not-performed',
              'historical-carrier-not-current-activation-evidence',
            ]),
  });
}

test('shadow Momentum categorical evidence maps to a non-production common record', () => {
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: runtimeShadow(),
    readiness: readiness(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.variableId, 'growthMomentumPoint');
  assert.equal(result.record.canonicalArtistId, 'iu');
  assert.equal(result.record.lifecycleState, 'shadow');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.readinessState, 'research-only');
  assert.equal(result.record.availability, 'available');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'categorical',
    state: 'direction-conflicted',
  });
  assert.equal(result.record.confidence, 'insufficient');
  assert.equal(result.record.coverage, 'unknown');
  assert.equal(result.record.freshness, 'stale');
  assert.equal(
    result.record.methodologyVersion,
    'v142_fandex_momentum_cross_family_combination_research_v1',
  );
  assert.equal(
    result.record.productVersion,
    MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );
});

test('direction conflict remains categorical evidence and is never collapsed to zero or stable', () => {
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: runtimeShadow('direction-conflicted'),
    readiness: readiness(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'categorical',
    state: 'direction-conflicted',
  });
  assert.equal(
    JSON.stringify(result.record).includes('"value":0'),
    false,
  );
});

test('validated current reevaluation marks freshness current without promoting lifecycle', () => {
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: runtimeShadow(),
    readiness: readiness({
      satisfiesFreshness: true,
      sourceAdvancementObserved: true,
    }),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.freshness, 'current');
  assert.equal(result.record.lifecycleState, 'shadow');
  assert.equal(result.record.readinessState, 'research-only');
});

test('without source advancement or current reevaluation freshness stays unknown', () => {
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: runtimeShadow(),
    readiness: readiness({
      satisfiesFreshness: false,
      sourceAdvancementObserved: false,
    }),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.freshness, 'unknown');
});

test('missing or invalid runtime shadow fails closed rather than using preview fallback', () => {
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: Object.freeze({
      status: 'missing' as const,
      reason: 'no-stored-categorical-evidence' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    }),
    readiness: readiness(),
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-read-not-ok',
  });
});

test('blocked readiness fails closed without emitting a common record', () => {
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: runtimeShadow(),
    readiness: readiness({ state: 'blocked' }),
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-readiness-blocked',
  });
});

test('carrier/readiness disagreement fails closed', () => {
  const mismatched = readiness();
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: runtimeShadow('direction-corroborated-up'),
    readiness: mismatched,
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-carrier-readiness-mismatch',
  });
});

test('stored evidence lineage is preserved and no numeric Momentum score is emitted', () => {
  const result = adaptMomentumToFandexVariableProduct({
    runtimeShadow: runtimeShadow(),
    readiness: readiness(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      `momentum-carrier:${'a'.repeat(64)}`,
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      `momentum-observation-digest:${'c'.repeat(64)}`,
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      `momentum-source-v143-digest:${'b'.repeat(64)}`,
    ),
  );
  assert.deepEqual(result.record.observationTime, {
    kind: 'instant',
    observedAt: '2026-09-30T02:10:05.000Z',
  });
  assert.equal(
    JSON.stringify(result.record).includes('productMomentumScore'),
    false,
  );
});
