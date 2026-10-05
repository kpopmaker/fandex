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
  buildReportedAlbumSalesResearchReviewRequestManifest,
  REPORTED_ALBUM_SALES_RESEARCH_REVIEW_REQUEST_VERSION,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchReviewRequestManifest';
import {
  buildReportedAlbumSalesResearchReviewerPacket,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchReviewerPacket';

type SeedFile = Readonly<{
  drafts: readonly ReportedAlbumSalesObservationDraft[];
}>;

function context() {
  const seed = JSON.parse(
    readFileSync(
      'data/fandex-cloud-v10/research/reported_album_sales_web_seed_v1.json',
      'utf8',
    ),
  ) as SeedFile;
  const history = buildReportedAlbumSalesHistory(
    seed.drafts.map(createReportedAlbumSalesObservation),
  );
  const researchInput = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-06T01:01:38+09:00',
  );
  const reviewerPacket =
    buildReportedAlbumSalesResearchReviewerPacket({
      researchInput,
      history,
    });
  return { researchInput, reviewerPacket };
}

test('current 21-artist cohort produces four empty reviewer-owned submission slots', () => {
  const { reviewerPacket } = context();
  const manifest =
    buildReportedAlbumSalesResearchReviewRequestManifest(
      reviewerPacket,
    );

  assert.equal(
    manifest.contractVersion,
    REPORTED_ALBUM_SALES_RESEARCH_REVIEW_REQUEST_VERSION,
  );
  assert.equal(manifest.releaseCount, 125);
  assert.equal(manifest.artistCount, 21);
  assert.equal(manifest.observationIds.length, 125);
  assert.ok(manifest.evidenceUrls.length >= 129);
  assert.deepEqual(
    manifest.requestedDimensions,
    [
      'cohort-coverage',
      'release-identity',
      'source-quality',
      'period-consistency',
    ],
  );

  assert.equal(manifest.slots.length, 4);
  for (const slot of manifest.slots) {
    assert.equal(slot.requestedConclusion, null);
    assert.deepEqual(slot.submittedEvidenceRefs, []);
    assert.equal(slot.reviewerRef, null);
    assert.equal(slot.reviewedAt, null);
    assert.equal(slot.submissionReady, false);
    assert.equal(slot.coveredObservationIds.length, 125);
  }

  const cohortCoverage = manifest.slots.find(
    slot => slot.dimension === 'cohort-coverage',
  );
  assert.ok(cohortCoverage);
  assert.equal(cohortCoverage.packetCandidateId, null);

  for (
    const dimension of [
      'release-identity',
      'source-quality',
      'period-consistency',
    ] as const
  ) {
    const slot = manifest.slots.find(
      item => item.dimension === dimension,
    );
    assert.ok(slot);
    assert.ok(slot.packetCandidateId);
  }
});

test('request manifest contains no approval semantics or generated review records', () => {
  const { reviewerPacket } = context();
  const manifest =
    buildReportedAlbumSalesResearchReviewRequestManifest(
      reviewerPacket,
    );

  assert.equal(manifest.reviewerMustSupplyConclusion, true);
  assert.equal(
    manifest.reviewerMustSupplyEvidenceRefsForNonUnknown,
    true,
  );
  assert.equal(manifest.reviewerMustSupplyReviewerRef, true);
  assert.equal(manifest.reviewerMustSupplyReviewedAt, true);
  assert.equal(manifest.requestContainsReviewerConclusion, false);
  assert.equal(manifest.requestContainsApproval, false);
  assert.equal(manifest.reviewRecordsMaterialized, false);
  assert.equal(manifest.automaticReviewerConclusionAllowed, false);
  assert.equal(
    manifest.automaticReleaseIdentityResolutionAllowed,
    false,
  );
  assert.equal(manifest.automaticSufficiencyDecisionAllowed, false);
  assert.equal(manifest.minimumCohortSizeDefined, false);
  assert.equal(manifest.numericNormalizationDefined, false);
  assert.equal(manifest.calibrationMethodDefined, false);
  assert.equal(manifest.calibrationRunAuthorized, false);
  assert.equal(manifest.productEligible, false);
  assert.equal(manifest.directProviderReplacementAllowed, false);
});

test('review request is deterministic for the exact reviewer packet snapshot', () => {
  const { reviewerPacket } = context();
  const first =
    buildReportedAlbumSalesResearchReviewRequestManifest(
      reviewerPacket,
    );
  const second =
    buildReportedAlbumSalesResearchReviewRequestManifest(
      reviewerPacket,
    );

  assert.equal(first.requestId, second.requestId);
  assert.equal(first.reviewerPacketId, second.reviewerPacketId);
  assert.equal(first.inputFingerprint, second.inputFingerprint);
  assert.equal(
    first.cohortReviewPacketId,
    second.cohortReviewPacketId,
  );
});

test('review request keeps all source URLs directly inspectable by a reviewer', () => {
  const { reviewerPacket } = context();
  const manifest =
    buildReportedAlbumSalesResearchReviewRequestManifest(
      reviewerPacket,
    );

  const packetUrls = new Set(
    reviewerPacket.observations.flatMap(observation =>
      observation.evidenceRefs.map(evidence => evidence.sourceUrl),
    ),
  );

  assert.deepEqual(
    new Set(manifest.evidenceUrls),
    packetUrls,
  );
  assert.ok(
    manifest.evidenceUrls.every(url => /^https:\/\//.test(url)),
  );
});

test('invalid reviewer packet boundary cannot become a review request', () => {
  const { reviewerPacket } = context();
  const invalid = Object.freeze({
    ...reviewerPacket,
    productEligible: true,
  }) as unknown as typeof reviewerPacket;

  assert.throws(
    () =>
      buildReportedAlbumSalesResearchReviewRequestManifest(
        invalid,
      ),
    /review_request_packet_boundary_invalid/,
  );
});
