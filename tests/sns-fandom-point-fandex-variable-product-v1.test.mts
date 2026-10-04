import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptSnsFandomPointToFandexVariableProduct,
  SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/snsFandomPointFandexVariableProduct';
import {
  evaluateSnsFandomPointReadiness,
  SNS_FANDOM_POINT_CONTRACT_VERSION,
  type SnsFandomPointReadinessResult,
} from '../lib/intelligence/snsFandomPointContracts';

function readiness(
  state: SnsFandomPointReadinessResult['state'],
): SnsFandomPointReadinessResult {
  const base = {
    contractVersion: SNS_FANDOM_POINT_CONTRACT_VERSION,
    state,
    snsFandomPoint: null,
    numericProductEligible: false as const,
    productActivationReady: false as const,
    productPublicationReady: false as const,
    previewFallbackAllowed: false as const,
    crossPlatformRawAverageAllowed: false as const,
    followerCountAloneAllowedAsFandom: false as const,
    mentionCountAloneAllowedAsSnsFandom: false as const,
    observedReactionEvidenceCount: 0,
    contentLevelReactionEvidenceCount: 0,
    temporalPersistenceEvidenceCount: 0,
    productionReadyProviders: Object.freeze([]),
    providerApprovedProviders: Object.freeze([]),
    artistAuthorizedProviders: Object.freeze([]),
    evidenceEligibleProviders: Object.freeze([]),
    blockers: Object.freeze([]),
  };

  if (state === 'provider-rights-blocked') {
    return Object.freeze({
      ...base,
      state,
      blockers: Object.freeze([
        'public-reaction-diffusion-provider-rights-blocked',
        'fandom-activity-persistence-provider-rights-blocked',
      ]),
    });
  }

  if (state === 'source-evidence-incomplete') {
    return Object.freeze({
      ...base,
      state,
      evidenceEligibleProviders: Object.freeze([
        'youtube-data-api' as const,
      ]),
      blockers: Object.freeze([
        'public-reaction-diffusion-evidence-missing',
        'fandom-activity-persistence-history-missing',
      ]),
    });
  }

  return Object.freeze({
    ...base,
    state,
    observedReactionEvidenceCount: 3,
    temporalPersistenceEvidenceCount: 2,
    productionReadyProviders: Object.freeze([
      'youtube-data-api' as const,
    ]),
    evidenceEligibleProviders: Object.freeze([
      'youtube-data-api' as const,
    ]),
    blockers: Object.freeze([
      'cross-dimension-combination-methodology-not-approved',
    ]),
  });
}

test('current default snsFandom readiness maps to an explicit blocked common record', () => {
  const current = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [],
  });

  const result = adaptSnsFandomPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    readiness: current,
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.variableId, 'snsFandomPoint');
  assert.equal(result.record.canonicalArtistId, 'iu');
  assert.equal(result.record.lifecycleState, 'research');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.readinessState, 'blocked');
  assert.equal(result.record.availability, 'blocked');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'blocked',
  });
  assert.equal(result.record.confidence, 'insufficient');
  assert.equal(result.record.coverage, 'unknown');
  assert.equal(result.record.freshness, 'unknown');
  assert.ok(
    result.record.blockerReason?.includes(
      'public-reaction-diffusion-provider-rights-blocked',
    ),
  );
  assert.equal(
    result.record.productVersion,
    SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );
});

test('provider rights without sufficient evidence maps to building-history, not Production', () => {
  const result = adaptSnsFandomPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    readiness: readiness('source-evidence-incomplete'),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.lifecycleState, 'research');
  assert.equal(result.record.readinessState, 'building-history');
  assert.equal(result.record.availability, 'unavailable');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'not-produced',
  });
  assert.equal(result.record.coverage, 'incomplete');
  assert.equal(result.record.blockerReason, null);
});

test('dual-dimension evidence-ready remains research-only because combination methodology is not approved', () => {
  const result = adaptSnsFandomPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    readiness: readiness('dual-dimension-evidence-ready'),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.lifecycleState, 'research');
  assert.equal(result.record.readinessState, 'research-only');
  assert.equal(result.record.availability, 'unavailable');
  assert.equal(result.record.coverage, 'complete');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'not-produced',
  });
  assert.ok(
    result.record.evidenceRefs.includes(
      'sns-fandom-readiness-blocker:cross-dimension-combination-methodology-not-approved',
    ),
  );
});

test('Missing is never converted into zero and no synthetic snsFandomPoint value is emitted', () => {
  const result = adaptSnsFandomPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    readiness: readiness('source-evidence-incomplete'),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const serialized = JSON.stringify(result.record);
  assert.equal(serialized.includes('"value":0'), false);
  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"snsFandomPoint":'), false);
});

test('provider/evidence lineage is preserved as common evidence refs', () => {
  const result = adaptSnsFandomPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    readiness: readiness('dual-dimension-evidence-ready'),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      'sns-fandom-production-ready-provider:youtube-data-api',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'sns-fandom-evidence-eligible-provider:youtube-data-api',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'sns-fandom-observed-reaction-count:3',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'sns-fandom-persistence-count:2',
    ),
  );
});

test('a forged numeric or activation-ready upstream state fails closed', () => {
  const forged = {
    ...readiness('dual-dimension-evidence-ready'),
    numericProductEligible: true,
  } as unknown as SnsFandomPointReadinessResult;

  const result = adaptSnsFandomPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    readiness: forged,
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-product-boundary-violated',
  });
});

test('aggregate observation and collection times remain unknown rather than inferred from heterogeneous evidence', () => {
  const result = adaptSnsFandomPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    readiness: readiness('source-evidence-incomplete'),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.asOf, null);
  assert.deepEqual(result.record.observationTime, { kind: 'unknown' });
  assert.equal(result.record.collectionTime, null);
});
