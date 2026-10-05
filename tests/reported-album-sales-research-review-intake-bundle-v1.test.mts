import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportedAlbumSalesHistory,
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
  type ReportedAlbumSalesResearchCohortReviewDimension,
  type ReportedAlbumSalesResearchCohortReviewRecord,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchCohortReview';
import {
  buildReportedAlbumSalesResearchInput,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchInput';
import {
  intakeReportedAlbumSalesResearchReviewBundle,
  REPORTED_ALBUM_SALES_RESEARCH_REVIEW_INTAKE_BUNDLE_VERSION,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchReviewIntakeBundle';
import {
  buildReportedAlbumSalesResearchReviewerPacket,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchReviewerPacket';

type SeedFile = Readonly<{
  drafts: readonly ReportedAlbumSalesObservationDraft[];
}>;

function seed(): SeedFile {
  return JSON.parse(
    readFileSync(
      'data/fandex-cloud-v10/research/reported_album_sales_web_seed_v1.json',
      'utf8',
    ),
  ) as SeedFile;
}

function context() {
  const history = buildReportedAlbumSalesHistory(
    seed().drafts.map(createReportedAlbumSalesObservation),
  );
  const researchInput = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-05T10:10:31+09:00',
  );
  const reviewerPacket =
    buildReportedAlbumSalesResearchReviewerPacket({
      researchInput,
      history,
    });

  return { history, researchInput, reviewerPacket };
}

function reviewRecord(
  dimension: ReportedAlbumSalesResearchCohortReviewDimension,
  fingerprint: string,
  coveredObservationIds: readonly string[],
  suffix = '1',
): ReportedAlbumSalesResearchCohortReviewRecord {
  return Object.freeze({
    recordVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
    evidenceId: `external-review:${dimension}:${suffix}`,
    dimension,
    inputFingerprint: fingerprint,
    coveredObservationIds: Object.freeze([...coveredObservationIds]),
    conclusion: 'verified' as const,
    evidenceRefs: Object.freeze([
      `external-review-source:${dimension}:${suffix}`,
    ]),
    reviewerRef: 'reviewer:test-fixture-only',
    reviewedAt: '2026-10-02T20:30:00+09:00',
  });
}

function fullReviewRecords() {
  const { researchInput } = context();
  return [
    reviewRecord(
      'cohort-coverage',
      researchInput.inputFingerprint,
      researchInput.includedObservationIds,
    ),
    reviewRecord(
      'release-identity',
      researchInput.inputFingerprint,
      researchInput.includedObservationIds,
    ),
    reviewRecord(
      'source-quality',
      researchInput.inputFingerprint,
      researchInput.includedObservationIds,
    ),
    reviewRecord(
      'period-consistency',
      researchInput.inputFingerprint,
      researchInput.includedObservationIds,
    ),
  ] as const;
}

test('empty external review intake stays integrity-valid but methodology-blocked', () => {
  const { researchInput, reviewerPacket } = context();
  const bundle = intakeReportedAlbumSalesResearchReviewBundle({
    researchInput,
    reviewerPacket,
    records: [],
  });

  assert.equal(
    bundle.contractVersion,
    REPORTED_ALBUM_SALES_RESEARCH_REVIEW_INTAKE_BUNDLE_VERSION,
  );
  assert.equal(bundle.integrityState, 'valid');
  assert.equal(bundle.state, 'review-incomplete-or-blocked');
  assert.equal(bundle.reviewRecordCount, 0);
  assert.equal(bundle.methodologyDesignGate.status, 'blocked');
  assert.ok(
    bundle.methodologyDesignGate.blockers.includes(
      'cohort-coverage:unknown',
    ),
  );
  assert.equal(bundle.reviewerRecordsGeneratedBySystem, false);
  assert.equal(bundle.automaticReviewerConclusionAllowed, false);
  assert.equal(bundle.automaticPacketRepairAllowed, false);
  assert.equal(bundle.numericNormalizationDefined, false);
  assert.equal(bundle.calibrationRunAuthorized, false);
  assert.equal(bundle.productEligible, false);
});

test('synthetic fully reviewed fixture reaches methodology-design completion only, never Product or calibration authorization', () => {
  const { researchInput, reviewerPacket } = context();
  const records = fullReviewRecords();

  const bundle = intakeReportedAlbumSalesResearchReviewBundle({
    researchInput,
    reviewerPacket,
    records,
  });

  assert.equal(bundle.integrityState, 'valid');
  assert.equal(bundle.state, 'review-complete-for-methodology-design');
  assert.equal(
    bundle.methodologyDesignGate.status,
    'eligible-for-methodology-design',
  );
  assert.equal(bundle.reviewRecordCount, 4);
  assert.deepEqual(
    new Set(bundle.reviewerRefs),
    new Set(['reviewer:test-fixture-only']),
  );
  assert.equal(bundle.reviewerConclusionsPreserved, true);
  assert.equal(bundle.reviewerRecordsGeneratedBySystem, false);
  assert.equal(bundle.numericNormalizationDefined, false);
  assert.equal(bundle.calibrationMethodDefined, false);
  assert.equal(bundle.calibrationRunAuthorized, false);
  assert.equal(bundle.productEligible, false);
  assert.equal(bundle.directProviderReplacementAllowed, false);
});

test('stale reviewer packet fingerprint makes the bundle intake-invalid instead of repairing it', () => {
  const { researchInput, reviewerPacket } = context();
  const stalePacket = Object.freeze({
    ...reviewerPacket,
    inputFingerprint: 'stale-fingerprint',
  }) as typeof reviewerPacket;

  const bundle = intakeReportedAlbumSalesResearchReviewBundle({
    researchInput,
    reviewerPacket: stalePacket,
    records: [],
  });

  assert.equal(bundle.integrityState, 'invalid');
  assert.equal(bundle.state, 'intake-invalid');
  assert.ok(
    bundle.dataIssues.includes(
      'reviewer-packet-input-fingerprint-mismatch',
    ),
  );
  assert.equal(bundle.automaticPacketRepairAllowed, false);
});

test('stale review record fingerprint invalidates the bundle even when the reviewer packet is current', () => {
  const { researchInput, reviewerPacket } = context();
  const stale = reviewRecord(
    'cohort-coverage',
    'stale-fingerprint',
    researchInput.includedObservationIds,
  );

  const bundle = intakeReportedAlbumSalesResearchReviewBundle({
    researchInput,
    reviewerPacket,
    records: [stale],
  });

  assert.equal(bundle.integrityState, 'invalid');
  assert.equal(bundle.state, 'intake-invalid');
  assert.ok(
    bundle.dataIssues.some(issue =>
      issue.includes('review-record:input-fingerprint-mismatch:'),
    ),
  );
  assert.equal(bundle.methodologyDesignGate.status, 'blocked');
});

test('valid partial reviewer coverage is preserved as incomplete rather than promoted', () => {
  const { researchInput, reviewerPacket } = context();
  const subset = researchInput.includedObservationIds.slice(0, 2);
  const partial = reviewRecord(
    'cohort-coverage',
    researchInput.inputFingerprint,
    subset,
  );

  const bundle = intakeReportedAlbumSalesResearchReviewBundle({
    researchInput,
    reviewerPacket,
    records: [partial],
  });

  assert.equal(bundle.integrityState, 'valid');
  assert.equal(bundle.state, 'review-incomplete-or-blocked');
  assert.equal(
    bundle.methodologyDesignGate.dimensions.cohortCoverage.state,
    'partial',
  );
  assert.ok(
    bundle.methodologyDesignGate
      .dimensions.cohortCoverage.uncoveredObservationIds.length > 0,
  );
});

test('bundle ID is deterministic and record-order independent for the same external review snapshot', () => {
  const { researchInput, reviewerPacket } = context();
  const records = [...fullReviewRecords()];

  const first = intakeReportedAlbumSalesResearchReviewBundle({
    researchInput,
    reviewerPacket,
    records,
  });
  const second = intakeReportedAlbumSalesResearchReviewBundle({
    researchInput,
    reviewerPacket,
    records: [...records].reverse(),
  });

  assert.equal(first.bundleId, second.bundleId);
  assert.equal(first.reviewerPacketId, second.reviewerPacketId);
  assert.equal(first.inputFingerprint, second.inputFingerprint);
});
