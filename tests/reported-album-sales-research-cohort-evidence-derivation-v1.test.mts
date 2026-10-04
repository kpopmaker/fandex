import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportedAlbumSalesHistory,
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesResearchInput,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchInput';
import {
  createReportedAlbumSalesResearchReviewRecordFromCandidate,
  deriveReportedAlbumSalesResearchCohortEvidenceCandidates,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchCohortEvidenceDerivation';
import {
  evaluateReportedAlbumSalesResearchMethodologyDesignGate,
  REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchCohortReview';

type SeedFile = Readonly<{
  drafts: readonly ReportedAlbumSalesObservationDraft[];
}>;

function researchInput(asOf = '2026-10-04T22:20:41+09:00') {
  const seed = JSON.parse(
    readFileSync(
      'data/fandex-cloud-v10/research/reported_album_sales_web_seed_v1.json',
      'utf8',
    ),
  ) as SeedFile;

  const history = buildReportedAlbumSalesHistory(
    seed.drafts.map(createReportedAlbumSalesObservation),
  );

  return buildReportedAlbumSalesResearchInput(history, asOf);
}

test('actual research input derives three review candidates but never cohort coverage', () => {
  const input = researchInput();
  const derived =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      input,
    );

  assert.deepEqual(
    derived.notAutomaticallyDerivedDimensions,
    ['cohort-coverage'],
  );
  assert.deepEqual(derived.autoVerifiedDimensions, []);
  assert.equal(derived.reviewerConclusionRequired, true);

  for (const candidate of Object.values(derived.candidates)) {
    assert.equal(candidate.state, 'review-candidate');
    assert.deepEqual(
      new Set(candidate.coveredObservationIds),
      new Set(input.includedObservationIds),
    );
    assert.equal(candidate.reviewerConclusionRequired, true);
    assert.equal(candidate.autoVerified, false);
    assert.equal(
      candidate.eligibleAsReviewRecordWithoutReviewer,
      false,
    );
    assert.equal(candidate.numericNormalizationDefined, false);
    assert.equal(candidate.productEligible, false);
  }

  assert.equal(derived.numericNormalizationDefined, false);
  assert.equal(derived.calibrationMethodDefined, false);
  assert.equal(derived.calibrationRunAuthorized, false);
  assert.equal(derived.productEligible, false);
});

test('derived release-identity facts expose candidate identities without auto-resolving them', () => {
  const candidate =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      researchInput(),
    ).candidates.releaseIdentity;

  assert.equal(
    candidate.facts.releaseIdentityStateCounts.candidate,
    112,
  );
  assert.equal(
    candidate.facts.releaseIdentityStateCounts.resolved,
    0,
  );
  assert.ok(
    candidate.reasonCodes.includes(
      'candidate-release-identity-requires-review',
    ),
  );
  assert.equal(candidate.autoVerified, false);
});

test('derived source-quality facts preserve mixed official and secondary evidence without ranking it', () => {
  const candidate =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      researchInput(),
    ).candidates.sourceQuality;

  assert.equal(
    candidate.facts.evidenceQualityCounts['primary-official'],
    40,
  );
  assert.equal(
    candidate.facts.evidenceQualityCounts[
      'provider-attributed-secondary'
    ],
    66,
  );
  assert.equal(
    candidate.facts.evidenceQualityCounts['corroborated-secondary'],
    6,
  );
  assert.ok(
    candidate.reasonCodes.includes(
      'secondary-source-quality-requires-review',
    ),
  );
  assert.ok(candidate.sourceEvidenceIds.length >= 118);
  assert.equal(candidate.autoVerified, false);
});

test('derived period facts confirm explicit seven-day shape but still require reviewer conclusion', () => {
  const candidate =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      researchInput(),
    ).candidates.periodConsistency;

  assert.equal(candidate.facts.explicitSevenDayPeriodCount, 112);
  assert.equal(candidate.facts.sameUnderlyingProvider, true);
  assert.equal(candidate.facts.sameMetricSemantic, true);
  assert.ok(
    candidate.reasonCodes.includes(
      'period-consistency-still-requires-review',
    ),
  );
  assert.equal(candidate.autoVerified, false);
});

test('pre-collection input produces insufficient evidence candidates instead of reviewable evidence', () => {
  const derived =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      researchInput('2026-10-01T23:59:59+09:00'),
    );

  for (const candidate of Object.values(derived.candidates)) {
    assert.equal(candidate.state, 'insufficient-evidence');
    assert.equal(candidate.coveredObservationIds.length, 0);
  }
});

test('review records can be materialized only with explicit reviewer inputs', () => {
  const candidate =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      researchInput(),
    ).candidates.periodConsistency;

  const record =
    createReportedAlbumSalesResearchReviewRecordFromCandidate({
      candidate,
      evidenceId: 'reviewed-period-consistency:1',
      conclusion: 'verified',
      evidenceRefs: [
        'review-source:period-consistency:1',
      ],
      reviewerRef: 'reviewer:album-research',
      reviewedAt: '2026-10-02T20:00:00+09:00',
    });

  assert.equal(
    record.recordVersion,
    REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
  );
  assert.equal(record.dimension, 'period-consistency');
  assert.equal(
    record.inputFingerprint,
    candidate.inputFingerprint,
  );
  assert.deepEqual(
    record.coveredObservationIds,
    candidate.coveredObservationIds,
  );
  assert.equal(record.conclusion, 'verified');
});

test('verified review record cannot be created from an insufficient derived candidate', () => {
  const candidate =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      researchInput('2026-10-01T23:59:59+09:00'),
    ).candidates.releaseIdentity;

  assert.throws(
    () =>
      createReportedAlbumSalesResearchReviewRecordFromCandidate({
        candidate,
        evidenceId: 'invalid-verified:1',
        conclusion: 'verified',
        evidenceRefs: ['review-source:invalid'],
        reviewerRef: 'reviewer:album-research',
        reviewedAt: '2026-10-02T20:00:00+09:00',
      }),
    /verified_requires_review_candidate/,
  );
});

test('three reviewed derived dimensions still leave methodology design blocked without manual cohort coverage review', () => {
  const input = researchInput();
  const derived =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      input,
    );

  const records = [
    createReportedAlbumSalesResearchReviewRecordFromCandidate({
      candidate: derived.candidates.releaseIdentity,
      evidenceId: 'reviewed-release-identity:1',
      conclusion: 'verified',
      evidenceRefs: ['review-source:release-identity:1'],
      reviewerRef: 'reviewer:album-research',
      reviewedAt: '2026-10-02T20:00:00+09:00',
    }),
    createReportedAlbumSalesResearchReviewRecordFromCandidate({
      candidate: derived.candidates.sourceQuality,
      evidenceId: 'reviewed-source-quality:1',
      conclusion: 'verified',
      evidenceRefs: ['review-source:source-quality:1'],
      reviewerRef: 'reviewer:album-research',
      reviewedAt: '2026-10-02T20:00:00+09:00',
    }),
    createReportedAlbumSalesResearchReviewRecordFromCandidate({
      candidate: derived.candidates.periodConsistency,
      evidenceId: 'reviewed-period-consistency:1',
      conclusion: 'verified',
      evidenceRefs: ['review-source:period-consistency:1'],
      reviewerRef: 'reviewer:album-research',
      reviewedAt: '2026-10-02T20:00:00+09:00',
    }),
  ];

  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records,
    });

  assert.equal(gate.status, 'blocked');
  assert.equal(gate.dimensions.releaseIdentity.state, 'verified');
  assert.equal(gate.dimensions.sourceQuality.state, 'verified');
  assert.equal(gate.dimensions.periodConsistency.state, 'verified');
  assert.equal(gate.dimensions.cohortCoverage.state, 'unknown');
  assert.ok(
    gate.blockers.includes('cohort-coverage:unknown'),
  );
  assert.equal(gate.numericNormalizationDefined, false);
  assert.equal(gate.productEligible, false);
});

test('derived candidate IDs are deterministic for the same research input', () => {
  const input = researchInput();
  const first =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      input,
    );
  const second =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      input,
    );

  assert.equal(
    first.candidates.releaseIdentity.candidateId,
    second.candidates.releaseIdentity.candidateId,
  );
  assert.equal(
    first.candidates.sourceQuality.candidateId,
    second.candidates.sourceQuality.candidateId,
  );
  assert.equal(
    first.candidates.periodConsistency.candidateId,
    second.candidates.periodConsistency.candidateId,
  );
});
