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
  REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
  buildReportedAlbumSalesResearchCohortReviewPacket,
  evaluateReportedAlbumSalesResearchMethodologyDesignGate,
  type ReportedAlbumSalesResearchCohortReviewDimension,
  type ReportedAlbumSalesResearchCohortReviewRecord,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchCohortReview';

type SeedFile = Readonly<{
  drafts: readonly ReportedAlbumSalesObservationDraft[];
}>;

function seedInput() {
  const seed = JSON.parse(
    readFileSync(
      'data/fandex-cloud-v10/research/reported_album_sales_web_seed_v1.json',
      'utf8',
    ),
  ) as SeedFile;

  const history = buildReportedAlbumSalesHistory(
    seed.drafts.map(createReportedAlbumSalesObservation),
  );

  return buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-04T17:09:27+09:00',
  );
}

function record(
  dimension: ReportedAlbumSalesResearchCohortReviewDimension,
  inputFingerprint: string,
  coveredObservationIds: readonly string[],
  conclusion:
    | 'verified'
    | 'partial'
    | 'conflicting'
    | 'unknown' = 'verified',
  evidenceId = `${dimension}:review-1`,
): ReportedAlbumSalesResearchCohortReviewRecord {
  return Object.freeze({
    recordVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
    evidenceId,
    dimension,
    inputFingerprint,
    coveredObservationIds: Object.freeze([
      ...coveredObservationIds,
    ]),
    conclusion,
    evidenceRefs: conclusion === 'unknown'
      ? Object.freeze([])
      : Object.freeze([`review-source:${evidenceId}`]),
    reviewerRef: 'reviewer:album-research',
    reviewedAt: '2026-10-02T18:00:00+09:00',
  });
}

function fullyVerifiedRecords() {
  const input = seedInput();
  const covered = input.includedObservationIds;

  return {
    input,
    records: Object.freeze([
      record(
        'cohort-coverage',
        input.inputFingerprint,
        covered,
      ),
      record(
        'release-identity',
        input.inputFingerprint,
        covered,
      ),
      record(
        'source-quality',
        input.inputFingerprint,
        covered,
      ),
      record(
        'period-consistency',
        input.inputFingerprint,
        covered,
      ),
    ]),
  };
}

test('actual research cohort packet exposes facts without making an automatic sufficiency decision', () => {
  const input = seedInput();
  const packet =
    buildReportedAlbumSalesResearchCohortReviewPacket(input);

  assert.equal(packet.inputState, 'reviewable');
  assert.equal(packet.facts.releaseCount, 110);
  assert.equal(packet.facts.artistCount, 21);
  assert.equal(
    packet.facts.releaseIdentityStateCounts.candidate,
    110,
  );
  assert.equal(
    packet.facts.releaseIdentityStateCounts.resolved,
    0,
  );
  assert.equal(
    packet.facts.evidenceQualityCounts['primary-official'],
    38,
  );
  assert.equal(
    packet.facts.evidenceQualityCounts[
      'provider-attributed-secondary'
    ],
    66,
  );
  assert.equal(
    packet.facts.evidenceQualityCounts['corroborated-secondary'],
    6,
  );
  assert.equal(packet.facts.explicitSevenDayPeriodCount, 110);
  assert.equal(packet.facts.periodInferenceUsed, false);

  assert.equal(
    packet.facts.exclusionReasonCounts[
      'not-research-usable'
    ] ?? 0,
    0,
  );
  assert.equal(
    packet.facts.exclusionReasonCounts[
      'provider-period-incomplete'
    ] ?? 0,
    0,
  );
  assert.equal(
    packet.facts.exclusionReasonCounts['provider-mismatch'],
    2,
  );
  assert.equal(
    packet.facts.exclusionReasonCounts[
      'metric-semantic-mismatch'
    ],
    2,
  );

  assert.equal(packet.reviewerConclusionRequired, true);
  assert.equal(
    packet.automaticSufficiencyDecisionAllowed,
    false,
  );
  assert.equal(packet.minimumCohortSizeDefined, false);
  assert.equal(packet.numericNormalizationDefined, false);
  assert.equal(packet.calibrationMethodDefined, false);
  assert.equal(packet.productEligible, false);
});

test('no review evidence keeps all four dimensions unknown and blocks methodology design', () => {
  const input = seedInput();
  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records: [],
    });

  assert.equal(gate.status, 'blocked');
  assert.equal(gate.dimensions.cohortCoverage.state, 'unknown');
  assert.equal(gate.dimensions.releaseIdentity.state, 'unknown');
  assert.equal(gate.dimensions.sourceQuality.state, 'unknown');
  assert.equal(gate.dimensions.periodConsistency.state, 'unknown');

  assert.equal(gate.arbitraryThresholdDefined, false);
  assert.equal(gate.minimumCohortSizeDefined, false);
  assert.equal(gate.numericNormalizationDefined, false);
  assert.equal(gate.calibrationMethodDefined, false);
  assert.equal(gate.calibrationRunAuthorized, false);
  assert.equal(gate.normalizedValue, null);
  assert.equal(gate.productEligible, false);
});

test('a verified conclusion over only part of the cohort is downgraded to partial', () => {
  const input = seedInput();
  const subset = input.includedObservationIds.slice(0, 2);

  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records: [
        record(
          'cohort-coverage',
          input.inputFingerprint,
          subset,
        ),
      ],
    });

  assert.equal(gate.dimensions.cohortCoverage.state, 'partial');
  assert.equal(
    gate.dimensions.cohortCoverage.coveredObservationIds.length,
    2,
  );
  assert.equal(
    gate.dimensions.cohortCoverage.uncoveredObservationIds.length,
    input.includedObservationIds.length - subset.length,
  );
  assert.equal(gate.status, 'blocked');
});

test('stale review records cannot be reused for a different input fingerprint', () => {
  const input = seedInput();

  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records: [
        record(
          'release-identity',
          `${input.inputFingerprint}-stale`,
          input.includedObservationIds,
        ),
      ],
    });

  assert.ok(
    gate.dataIssues.some(issue =>
      issue.startsWith('input-fingerprint-mismatch:')),
  );
  assert.equal(
    gate.dimensions.releaseIdentity.state,
    'conflicting',
  );
  assert.equal(gate.status, 'blocked');
});

test('explicit conflicting review evidence fails closed', () => {
  const input = seedInput();

  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records: [
        record(
          'source-quality',
          input.inputFingerprint,
          input.includedObservationIds,
          'conflicting',
        ),
      ],
    });

  assert.equal(
    gate.dimensions.sourceQuality.state,
    'conflicting',
  );
  assert.equal(gate.status, 'blocked');
});

test('non-unknown reviewer conclusions require external evidence references', () => {
  const input = seedInput();
  const invalid: ReportedAlbumSalesResearchCohortReviewRecord =
    Object.freeze({
      ...record(
        'period-consistency',
        input.inputFingerprint,
        input.includedObservationIds,
      ),
      evidenceRefs: Object.freeze([]),
    });

  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records: [invalid],
    });

  assert.ok(
    gate.dataIssues.some(issue =>
      issue.startsWith('evidence-ref-missing:')),
  );
  assert.equal(
    gate.dimensions.periodConsistency.state,
    'conflicting',
  );
  assert.equal(gate.status, 'blocked');
});

test('review evidence may cover only observations in the current research cohort', () => {
  const input = seedInput();

  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records: [
        record(
          'cohort-coverage',
          input.inputFingerprint,
          [
            ...input.includedObservationIds,
            'not-in-current-cohort',
          ],
        ),
      ],
    });

  assert.ok(
    gate.dataIssues.some(issue =>
      issue.startsWith(
        'covered-observation-not-in-cohort:',
      )),
  );
  assert.equal(gate.status, 'blocked');
});

test('all four dimensions verified over the current cohort permit methodology design only', () => {
  const { input, records } = fullyVerifiedRecords();

  const gate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input,
      records,
    });

  assert.equal(
    gate.status,
    'eligible-for-methodology-design',
  );
  assert.equal(gate.dataIssues.length, 0);
  assert.equal(gate.blockers.length, 0);
  assert.ok(
    Object.values(gate.dimensions).every(
      dimension => dimension.state === 'verified',
    ),
  );

  assert.equal(gate.arbitraryThresholdDefined, false);
  assert.equal(gate.minimumCohortSizeDefined, false);
  assert.equal(gate.numericNormalizationDefined, false);
  assert.equal(gate.calibrationMethodDefined, false);
  assert.equal(gate.calibrationRunAuthorized, false);
  assert.equal(gate.normalizedValue, null);
  assert.equal(gate.scoreFieldsPresent, false);
  assert.equal(gate.productEligible, false);
  assert.equal(gate.directProviderReplacementAllowed, false);
});

test('packet ID is deterministic for the same research input snapshot', () => {
  const input = seedInput();
  const first =
    buildReportedAlbumSalesResearchCohortReviewPacket(input);
  const second =
    buildReportedAlbumSalesResearchCohortReviewPacket(input);

  assert.equal(first.packetId, second.packetId);
});
