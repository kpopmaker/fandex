import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDirectAlbumObservation,
  type DirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  appendAlbumObservationHistory,
} from '../lib/product/contracts/albumObservationHistory';
import {
  buildAlbumNormalizationInput,
} from '../lib/product/contracts/albumNormalizationInput';
import {
  createAlbumCalibrationEvidenceRecordFromCandidate,
  deriveAlbumNormalizationCalibrationEvidenceCandidates,
} from '../lib/product/readiness/albumNormalizationCalibrationEvidenceDerivation';
import {
  reviewAlbumNormalizationCalibrationEvidence,
} from '../lib/product/readiness/albumNormalizationCalibrationEvidenceReview';

function observation(
  overrides: Partial<DirectAlbumObservation> = {},
): DirectAlbumObservation {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000001',
    fandexArtistId: 'iu',
    fandexReleaseId: 'iu-release-1',
    fandexReleaseFamilyId: 'iu-release-family-1',
    semantic: 'period-sale',
    value: 100,
    unit: 'physical-units',
    territory: 'Korea',
    format: 'physical',
    providerPeriod: 'day:20261001',
    providerPublishedAt: '2026-10-01T12:00:00+09:00',
    observedAt: '2026-10-01T13:00:00+09:00',
    collectedAt: '2026-10-01T13:01:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'as-known-at-collection',
    scopeRole: 'child-sku',
    parentObservationId: null,
    syntheticFixture: false,
    ...overrides,
  });
}

function revision(
  previous: DirectAlbumObservation,
): DirectAlbumObservation {
  return buildDirectAlbumObservation({
    ...previous,
    observationId: undefined,
    evidenceDigest: undefined,
    value: 110,
    observedAt: '2026-10-02T09:00:00+09:00',
    collectedAt: '2026-10-02T09:01:00+09:00',
    revisionId: 'revision-1',
    revisionObservedAt: '2026-10-02T08:55:00+09:00',
    supersedesObservationId: previous.observationId,
  });
}

test('current primary observations become review candidates but are never auto-verified', () => {
  const current = observation();
  const history = appendAlbumObservationHistory({
    observations: [current],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [current],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const result =
    deriveAlbumNormalizationCalibrationEvidenceCandidates({
      normalizationInput,
      history,
      asOf: '2026-10-01T14:00:00+09:00',
    });

  assert.equal(result.dataIssues.length, 0);
  assert.deepEqual(
    result.notAutomaticallyDerivedDimensions,
    ['release-scope-completeness'],
  );
  assert.deepEqual(result.autoVerifiedDimensions, []);
  assert.equal(result.reviewerConclusionRequired, true);
  assert.equal(result.numericNormalizationDefined, false);
  assert.equal(result.calibrationRunAuthorized, false);

  for (const candidate of [
    result.candidates.periodCoverage,
    result.candidates.revisionStability,
  ]) {
    assert.equal(candidate.state, 'review-candidate');
    assert.deepEqual(
      candidate.coveredObservationIds,
      [current.observationId],
    );
    assert.equal(
      candidate.uncoveredPrimaryObservationIds.length,
      0,
    );
    assert.equal(candidate.reviewerConclusionRequired, true);
    assert.equal(candidate.autoVerified, false);
    assert.equal(candidate.numericNormalizationDefined, false);
  }
});

test('derivation is deterministic for the same normalization input, history, and as-of', () => {
  const current = observation();
  const history = appendAlbumObservationHistory({
    observations: [current],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [current],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const input = {
    normalizationInput,
    history,
    asOf: '2026-10-01T14:00:00+09:00',
  } as const;

  const first =
    deriveAlbumNormalizationCalibrationEvidenceCandidates(input);
  const second =
    deriveAlbumNormalizationCalibrationEvidenceCandidates(input);

  assert.equal(
    first.historyFingerprint,
    second.historyFingerprint,
  );
  assert.equal(
    first.candidates.periodCoverage.candidateId,
    second.candidates.periodCoverage.candidateId,
  );
  assert.equal(
    first.candidates.revisionStability.candidateId,
    second.candidates.revisionStability.candidateId,
  );
});

test('reacquisition is surfaced as evidence acquisition facts without changing the covered sales observation', () => {
  const original = observation();
  const reacquired = buildDirectAlbumObservation({
    ...original,
    observationId: undefined,
    evidenceDigest: undefined,
    observedAt: '2026-10-01T15:00:00+09:00',
    collectedAt: '2026-10-01T15:01:00+09:00',
  });

  const history = appendAlbumObservationHistory({
    observations: [original, reacquired],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [reacquired],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const result =
    deriveAlbumNormalizationCalibrationEvidenceCandidates({
      normalizationInput,
      history,
      asOf: '2026-10-01T16:00:00+09:00',
    });

  assert.equal(
    result.candidates.revisionStability.facts
      .reacquisitionEventCount,
    1,
  );
  assert.equal(
    result.candidates.revisionStability.facts
      .revisionObservationCount,
    0,
  );
  assert.deepEqual(
    result.candidates.periodCoverage.coveredObservationIds,
    [original.observationId],
  );
});

test('revision-aware derivation binds to the latest active normalization candidate and reports revision facts', () => {
  const original = observation();
  const revised = revision(original);
  const history = appendAlbumObservationHistory({
    observations: [original, revised],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [original, revised],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  assert.deepEqual(
    normalizationInput.primaryCandidateObservationIds,
    [revised.observationId],
  );

  const result =
    deriveAlbumNormalizationCalibrationEvidenceCandidates({
      normalizationInput,
      history,
      asOf: '2026-10-02T10:00:00+09:00',
    });

  assert.equal(
    result.candidates.revisionStability.state,
    'review-candidate',
  );
  assert.deepEqual(
    result.candidates.revisionStability.coveredObservationIds,
    [revised.observationId],
  );
  assert.equal(
    result.candidates.revisionStability.facts
      .supersededObservationCount,
    1,
  );
  assert.equal(
    result.candidates.revisionStability.facts
      .revisionObservationCount,
    1,
  );
});

test('future normalization candidate is insufficient before FANDEX collected that revision', () => {
  const original = observation();
  const revised = revision(original);
  const history = appendAlbumObservationHistory({
    observations: [original, revised],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [original, revised],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const result =
    deriveAlbumNormalizationCalibrationEvidenceCandidates({
      normalizationInput,
      history,
      asOf: '2026-10-02T09:00:59+09:00',
    });

  assert.equal(
    result.candidates.periodCoverage.state,
    'insufficient-evidence',
  );
  assert.deepEqual(
    result.candidates.periodCoverage
      .uncoveredPrimaryObservationIds,
    [revised.observationId],
  );
  assert.ok(
    result.candidates.periodCoverage.reasonCodes.includes(
      'primary-observation-not-active-in-history',
    ),
  );
});

test('candidate conversion still requires an explicit reviewer conclusion', () => {
  const current = observation();
  const history = appendAlbumObservationHistory({
    observations: [current],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [current],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });
  const derived =
    deriveAlbumNormalizationCalibrationEvidenceCandidates({
      normalizationInput,
      history,
      asOf: '2026-10-01T14:00:00+09:00',
    });

  const record = createAlbumCalibrationEvidenceRecordFromCandidate({
    candidate: derived.candidates.periodCoverage,
    evidenceId: 'reviewed-period-coverage:1',
    conclusion: 'verified',
    sourceRef:
      `derived-candidate:${derived.candidates.periodCoverage.candidateId}`,
    reviewedAt: '2026-10-01T20:00:00+09:00',
  });

  assert.equal(record.conclusion, 'verified');
  assert.equal(
    record.targetFingerprint,
    derived.targetFingerprint,
  );

  const review = reviewAlbumNormalizationCalibrationEvidence({
    normalizationInput,
    records: [record],
  });

  assert.equal(
    review.dimensions.periodCoverage.state,
    'verified',
  );
  assert.equal(
    review.dimensions.releaseScopeCompleteness.state,
    'unknown',
  );
  assert.equal(
    review.dimensions.revisionStability.state,
    'unknown',
  );
  assert.equal(review.readyForCalibrationGate, false);
});

test('insufficient derived evidence cannot be promoted to verified', () => {
  const original = observation();
  const revised = revision(original);
  const history = appendAlbumObservationHistory({
    observations: [original, revised],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [original, revised],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });
  const derived =
    deriveAlbumNormalizationCalibrationEvidenceCandidates({
      normalizationInput,
      history,
      asOf: '2026-10-02T09:00:59+09:00',
    });

  assert.equal(
    derived.candidates.periodCoverage.state,
    'insufficient-evidence',
  );

  assert.throws(
    () => createAlbumCalibrationEvidenceRecordFromCandidate({
      candidate: derived.candidates.periodCoverage,
      evidenceId: 'invalid-review:1',
      conclusion: 'verified',
      sourceRef: 'derived-candidate:invalid',
      reviewedAt: '2026-10-02T10:00:00+09:00',
    }),
    /verified_requires_review_candidate/,
  );
});

test('history-only derivation never claims release-scope completeness', () => {
  const current = observation();
  const history = appendAlbumObservationHistory({
    observations: [current],
  });
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [current],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const derived =
    deriveAlbumNormalizationCalibrationEvidenceCandidates({
      normalizationInput,
      history,
      asOf: '2026-10-01T14:00:00+09:00',
    });

  assert.equal(
    'releaseScopeCompleteness' in derived.candidates,
    false,
  );
  assert.deepEqual(
    derived.notAutomaticallyDerivedDimensions,
    ['release-scope-completeness'],
  );
});
