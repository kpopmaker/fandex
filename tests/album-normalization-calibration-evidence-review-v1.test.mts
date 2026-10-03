import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildAlbumNormalizationInput,
} from '../lib/product/contracts/albumNormalizationInput';
import {
  ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
  buildAlbumNormalizationCalibrationReviewTarget,
  reviewAlbumNormalizationCalibrationEvidence,
  type AlbumNormalizationCalibrationDimension,
  type AlbumNormalizationCalibrationEvidenceRecord,
} from '../lib/product/readiness/albumNormalizationCalibrationEvidenceReview';

function observation(sku: string, value: number) {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: sku,
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

function inputWithTwoSkus() {
  return buildAlbumNormalizationInput({
    observations: [
      observation('8800000000001', 100),
      observation('8800000000002', 50),
    ],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });
}

function record(
  dimension: AlbumNormalizationCalibrationDimension,
  targetFingerprint: string,
  coveredObservationIds: readonly string[],
  conclusion:
    | 'verified'
    | 'partial'
    | 'conflicting'
    | 'unknown' = 'verified',
  evidenceId = `${dimension}:1`,
): AlbumNormalizationCalibrationEvidenceRecord {
  return Object.freeze({
    recordVersion:
      ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
    evidenceId,
    dimension,
    targetFingerprint,
    coveredObservationIds: Object.freeze([
      ...coveredObservationIds,
    ]),
    conclusion,
    sourceRef: `review-artifact:${evidenceId}`,
    reviewedAt: '2026-10-01T20:00:00+09:00',
  });
}

function completeVerifiedRecords() {
  const normalizationInput = inputWithTwoSkus();
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      normalizationInput,
    );
  const covered = target.primaryObservationIds;

  return {
    normalizationInput,
    target,
    records: Object.freeze([
      record(
        'period-coverage',
        target.fingerprint,
        covered,
      ),
      record(
        'release-scope-completeness',
        target.fingerprint,
        covered,
      ),
      record(
        'revision-stability',
        target.fingerprint,
        covered,
      ),
    ]),
  };
}

test('review target fingerprint is deterministic and bound to the reconciled normalization input', () => {
  const first = inputWithTwoSkus();
  const second = inputWithTwoSkus();

  const targetA =
    buildAlbumNormalizationCalibrationReviewTarget(first);
  const targetB =
    buildAlbumNormalizationCalibrationReviewTarget(second);

  assert.equal(targetA.fingerprint, targetB.fingerprint);
  assert.deepEqual(
    targetA.primaryObservationIds,
    first.primaryCandidateObservationIds,
  );

  const changed = buildAlbumNormalizationInput({
    observations: [
      observation('8800000000001', 100),
    ],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });
  const changedTarget =
    buildAlbumNormalizationCalibrationReviewTarget(changed);

  assert.notEqual(
    targetA.fingerprint,
    changedTarget.fingerprint,
  );
});

test('all three dimensions verified over the full primary set are ready for the calibration gate', () => {
  const { normalizationInput, records } =
    completeVerifiedRecords();

  const review =
    reviewAlbumNormalizationCalibrationEvidence({
      normalizationInput,
      records,
    });

  assert.equal(review.dataIssues.length, 0);
  assert.equal(review.readyForCalibrationGate, true);
  assert.equal(
    review.dimensions.periodCoverage.state,
    'verified',
  );
  assert.equal(
    review.dimensions.releaseScopeCompleteness.state,
    'verified',
  );
  assert.equal(
    review.dimensions.revisionStability.state,
    'verified',
  );
  assert.equal(
    review.evidence.periodCoverage.state,
    'verified',
  );
  assert.equal(review.numericNormalizationDefined, false);
  assert.equal(review.calibrationRunAuthorized, false);
  assert.equal(review.scoreFieldsPresent, false);
});

test('verified conclusion over only part of the current primary set is downgraded to partial', () => {
  const normalizationInput = inputWithTwoSkus();
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      normalizationInput,
    );
  const firstOnly = [target.primaryObservationIds[0]];

  const review =
    reviewAlbumNormalizationCalibrationEvidence({
      normalizationInput,
      records: [
        record(
          'period-coverage',
          target.fingerprint,
          firstOnly,
        ),
      ],
    });

  assert.equal(
    review.dimensions.periodCoverage.state,
    'partial',
  );
  assert.deepEqual(
    review.dimensions.periodCoverage.uncoveredPrimaryObservationIds,
    [target.primaryObservationIds[1]],
  );
  assert.equal(review.readyForCalibrationGate, false);
});

test('conflicting evidence fails closed even when full coverage is present', () => {
  const normalizationInput = inputWithTwoSkus();
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      normalizationInput,
    );

  const review =
    reviewAlbumNormalizationCalibrationEvidence({
      normalizationInput,
      records: [
        record(
          'revision-stability',
          target.fingerprint,
          target.primaryObservationIds,
          'conflicting',
        ),
      ],
    });

  assert.equal(
    review.dimensions.revisionStability.state,
    'conflicting',
  );
  assert.equal(review.readyForCalibrationGate, false);
});

test('review records for a stale normalization-input fingerprint become data issues', () => {
  const { normalizationInput, target } =
    completeVerifiedRecords();

  const review =
    reviewAlbumNormalizationCalibrationEvidence({
      normalizationInput,
      records: [
        record(
          'period-coverage',
          `${target.fingerprint}-stale`,
          target.primaryObservationIds,
        ),
      ],
    });

  assert.ok(
    review.dataIssues.some(issue =>
      issue.startsWith('target-fingerprint-mismatch:')),
  );
  assert.equal(
    review.dimensions.periodCoverage.state,
    'conflicting',
  );
  assert.equal(review.readyForCalibrationGate, false);
});

test('duplicate evidence IDs fail closed instead of double-counting review evidence', () => {
  const normalizationInput = inputWithTwoSkus();
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      normalizationInput,
    );
  const duplicateId = 'review:duplicate';

  const review =
    reviewAlbumNormalizationCalibrationEvidence({
      normalizationInput,
      records: [
        record(
          'period-coverage',
          target.fingerprint,
          target.primaryObservationIds,
          'verified',
          duplicateId,
        ),
        record(
          'revision-stability',
          target.fingerprint,
          target.primaryObservationIds,
          'verified',
          duplicateId,
        ),
      ],
    });

  assert.ok(
    review.dataIssues.includes(
      `duplicate-evidence-id:${duplicateId}`,
    ),
  );
  assert.equal(review.readyForCalibrationGate, false);
});

test('evidence cannot claim coverage for an observation excluded from the primary normalization set', () => {
  const normalizationInput = inputWithTwoSkus();
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      normalizationInput,
    );

  const review =
    reviewAlbumNormalizationCalibrationEvidence({
      normalizationInput,
      records: [
        record(
          'release-scope-completeness',
          target.fingerprint,
          [
            ...target.primaryObservationIds,
            'not-a-primary-observation',
          ],
        ),
      ],
    });

  assert.ok(
    review.dataIssues.some(issue =>
      issue.startsWith(
        'covered-observation-not-primary:',
      )),
  );
  assert.equal(
    review.dimensions.releaseScopeCompleteness.state,
    'conflicting',
  );
  assert.equal(review.readyForCalibrationGate, false);
});

test('missing evidence records remain unknown rather than being interpreted as failure or zero', () => {
  const normalizationInput = inputWithTwoSkus();

  const review =
    reviewAlbumNormalizationCalibrationEvidence({
      normalizationInput,
      records: [],
    });

  assert.equal(
    review.dimensions.periodCoverage.state,
    'unknown',
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
