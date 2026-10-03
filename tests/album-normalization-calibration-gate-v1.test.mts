import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDirectAlbumObservation,
  type DirectAlbumProviderDescriptor,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildAlbumNormalizationInput,
} from '../lib/product/contracts/albumNormalizationInput';
import {
  evaluateAlbumNormalizationCalibrationGate,
} from '../lib/product/readiness/albumNormalizationCalibrationGate';

function productionAuthorizedCircle(): DirectAlbumProviderDescriptor {
  return Object.freeze({
    ...CIRCLE_EVIDENCE_DESCRIPTOR,
    onboarding: Object.freeze({
      ...CIRCLE_EVIDENCE_DESCRIPTOR.onboarding,
      currentStage: 'active' as const,
      enabled: true,
      liveCallsAllowed: true,
      researchAllowed: true,
      productionAllowed: true,
      authorization: Object.freeze({
        acquisitionState: 'allowed' as const,
        automationState: 'allowed' as const,
        rawStorageState: 'allowed-with-conditions' as const,
        normalizedStorageState: 'allowed' as const,
        retentionState: 'allowed' as const,
        commercialUseState: 'allowed' as const,
        derivedPublicationState: 'allowed' as const,
        rawRedistributionState: 'blocked' as const,
      }),
      blockers: Object.freeze([]),
    }),
  });
}

function observation(value = 100) {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: 'circle-iu-day-20261001',
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000001',
    fandexArtistId: 'iu',
    fandexReleaseId: 'iu-release-1',
    fandexReleaseFamilyId: 'iu-release-family-1',
    semantic: 'period-sale',
    value,
    unit: 'physical-units',
    territory: 'Korea',
    format: 'physical',
    providerPeriod: 'day:20261001',
    providerPublishedAt: null,
    observedAt: '2026-10-01T13:00:00+09:00',
    collectedAt: '2026-10-01T13:01:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'as-known-at-collection',
    scopeRole: 'child-sku',
    parentObservationId: null,
    syntheticFixture: false,
  });
}

const verifiedEvidence = Object.freeze({
  periodCoverage: Object.freeze({
    state: 'verified' as const,
    evidenceIds: Object.freeze(['period-coverage-review:1']),
  }),
  releaseScopeCompleteness: Object.freeze({
    state: 'verified' as const,
    evidenceIds: Object.freeze(['release-scope-review:1']),
  }),
  revisionStability: Object.freeze({
    state: 'verified' as const,
    evidenceIds: Object.freeze(['revision-stability-review:1']),
  }),
});

test('current research-only state is blocked without inventing minimum history length', () => {
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const gate = evaluateAlbumNormalizationCalibrationGate({
    normalizationInput,
    productionAuthorizedProviderIds: [],
    historyState: 'research-only',
  });

  assert.equal(gate.status, 'blocked');
  assert.equal(gate.checks['production-history-available'], false);
  assert.equal(
    gate.checks['primary-provider-production-authorized'],
    false,
  );
  assert.equal(gate.checks['normalization-input-usable'], false);
  assert.equal(gate.checks['primary-candidate-present'], false);
  assert.equal(gate.checks['period-coverage-verified'], false);
  assert.equal(
    gate.checks['release-scope-completeness-verified'],
    false,
  );
  assert.equal(gate.checks['revision-stability-verified'], false);
  assert.equal(gate.arbitraryThresholdDefined, false);
  assert.equal(gate.minimumHistoryLengthDefined, false);
  assert.equal(gate.numericNormalizationDefined, false);
  assert.equal(gate.calibrationRunAuthorized, false);
  assert.equal(gate.normalizedValue, null);
});

test('Production history and authorized reconciled input are still blocked when calibration evidence is unknown', () => {
  const provider = productionAuthorizedCircle();
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [observation()],
    providers: [provider],
  });

  assert.equal(normalizationInput.inputSetUsable, true);

  const gate = evaluateAlbumNormalizationCalibrationGate({
    normalizationInput,
    productionAuthorizedProviderIds: ['circle-chart'],
    historyState: 'production-history-available',
  });

  assert.equal(gate.status, 'blocked');
  assert.equal(gate.checks['production-history-available'], true);
  assert.equal(
    gate.checks['primary-provider-production-authorized'],
    true,
  );
  assert.equal(gate.checks['normalization-input-usable'], true);
  assert.equal(gate.checks['primary-candidate-present'], true);
  assert.equal(
    gate.checks['normalization-input-conflict-free'],
    true,
  );
  assert.equal(gate.checks['period-coverage-verified'], false);
  assert.equal(
    gate.checks['release-scope-completeness-verified'],
    false,
  );
  assert.equal(gate.checks['revision-stability-verified'], false);
});

test('verified evidence requires non-empty evidence IDs', () => {
  const provider = productionAuthorizedCircle();
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [observation()],
    providers: [provider],
  });

  const gate = evaluateAlbumNormalizationCalibrationGate({
    normalizationInput,
    productionAuthorizedProviderIds: ['circle-chart'],
    historyState: 'production-history-available',
    evidence: {
      periodCoverage: {
        state: 'verified',
        evidenceIds: [],
      },
      releaseScopeCompleteness: {
        state: 'verified',
        evidenceIds: ['release-scope-review:1'],
      },
      revisionStability: {
        state: 'verified',
        evidenceIds: ['revision-stability-review:1'],
      },
    },
  });

  assert.equal(gate.status, 'blocked');
  assert.equal(gate.checks['period-coverage-verified'], false);
});

test('all prerequisites permit methodology design only, never numeric output or calibration execution', () => {
  const provider = productionAuthorizedCircle();
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [observation()],
    providers: [provider],
  });

  const gate = evaluateAlbumNormalizationCalibrationGate({
    normalizationInput,
    productionAuthorizedProviderIds: ['circle-chart'],
    historyState: 'production-history-available',
    evidence: verifiedEvidence,
  });

  assert.equal(gate.status, 'eligible-for-methodology-design');
  assert.ok(Object.values(gate.checks).every(Boolean));
  assert.equal(gate.blockers.length, 0);

  assert.equal(gate.arbitraryThresholdDefined, false);
  assert.equal(gate.minimumHistoryLengthDefined, false);
  assert.equal(gate.numericNormalizationDefined, false);
  assert.equal(gate.calibrationRunAuthorized, false);
  assert.equal(gate.normalizedValue, null);
  assert.equal(gate.scoreFieldsPresent, false);
});

test('normalization conflicts block calibration even when external review evidence is verified', () => {
  const provider = productionAuthorizedCircle();
  const first = observation(100);
  const second = buildDirectAlbumObservation({
    ...first,
    observationId: undefined,
    evidenceDigest: undefined,
    providerObservationId: 'circle-iu-day-20261001-conflict',
    value: 101,
  });

  const normalizationInput = buildAlbumNormalizationInput({
    observations: [first, second],
    providers: [provider],
  });
  assert.equal(normalizationInput.inputSetUsable, false);

  const gate = evaluateAlbumNormalizationCalibrationGate({
    normalizationInput,
    productionAuthorizedProviderIds: ['circle-chart'],
    historyState: 'production-history-available',
    evidence: verifiedEvidence,
  });

  assert.equal(gate.status, 'blocked');
  assert.equal(gate.checks['normalization-input-usable'], false);
  assert.equal(
    gate.checks['normalization-input-conflict-free'],
    false,
  );
});
