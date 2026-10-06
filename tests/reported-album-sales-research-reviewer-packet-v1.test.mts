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
  buildReportedAlbumSalesResearchReviewerPacket,
  REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION,
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

function history() {
  return buildReportedAlbumSalesHistory(
    seed().drafts.map(createReportedAlbumSalesObservation),
  );
}

function researchInput() {
  return buildReportedAlbumSalesResearchInput(
    history(),
    '2026-10-06T21:57:29+09:00',
  );
}

test('expanded canonical cohort becomes a reviewer-ready packet without automatic approvals', () => {
  const packet = buildReportedAlbumSalesResearchReviewerPacket({
    researchInput: researchInput(),
    history: history(),
  });

  assert.equal(
    packet.contractVersion,
    REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION,
  );
  assert.equal(packet.inputState, 'reviewable');
  assert.equal(packet.releaseCount, 128);
  assert.equal(packet.artistCount, 21);
  assert.equal(packet.observations.length, 128);

  assert.deepEqual(
    new Set(packet.observations.map(item => item.canonicalArtistId)),
    new Set([
      'iu',
      'aespa',
      'ateez',
      'boynextdoor',
      'ive',
      'lesserafim',
      'newjeans',
      'seventeen',
      'straykids',
      'txt',
      'bts',
      'twice',
      'enhypen',
      'riize',
      'blackpink',
      'jungkook',
      'v',
      'jennie',
      'jimin',
      'lisa',
      'rose',
    ]),
  );

  assert.ok(
    packet.observations.every(
      observation =>
        observation.evidenceRefs.length > 0
        && observation.evidenceRefs.every(
          evidence =>
            evidence.evidenceId.trim() !== ''
            && /^https:\/\//.test(evidence.sourceUrl),
        ),
    ),
  );
  assert.ok(
    packet.observations.every(
      observation => observation.releaseIdentityState === 'candidate',
    ),
  );

  assert.deepEqual(
    packet.dimensions.map(dimension => dimension.dimension),
    [
      'cohort-coverage',
      'release-identity',
      'source-quality',
      'period-consistency',
    ],
  );

  const coverage = packet.dimensions[0];
  assert.equal(coverage.mode, 'manual-only');
  assert.equal(coverage.candidateId, null);
  assert.equal(coverage.coveredObservationIds.length, 128);
  assert.equal(coverage.autoVerified, false);

  for (const dimension of packet.dimensions.slice(1)) {
    assert.equal(dimension.mode, 'derived-review-candidate');
    assert.ok(dimension.candidateId);
    assert.equal(dimension.coveredObservationIds.length, 128);
    assert.equal(dimension.autoVerified, false);
  }

  assert.equal(packet.reviewerConclusionRequired, true);
  assert.equal(packet.reviewRecordsMaterialized, false);
  assert.equal(packet.automaticSufficiencyDecisionAllowed, false);
  assert.equal(packet.automaticReleaseIdentityResolutionAllowed, false);
  assert.equal(packet.automaticSourceQualityApprovalAllowed, false);
  assert.equal(packet.automaticPeriodConsistencyApprovalAllowed, false);
  assert.equal(packet.automaticCohortCoverageApprovalAllowed, false);
  assert.equal(packet.minimumCohortSizeDefined, false);
  assert.equal(packet.numericNormalizationDefined, false);
  assert.equal(packet.calibrationMethodDefined, false);
  assert.equal(packet.calibrationRunAuthorized, false);
  assert.equal(packet.scoreFieldsPresent, false);
  assert.equal(packet.productEligible, false);
  assert.equal(packet.directProviderReplacementAllowed, false);
});

test('IU reviewer row preserves Tier B plus Tier C corroboration instead of silently upgrading the discovery source', () => {
  const packet = buildReportedAlbumSalesResearchReviewerPacket({
    researchInput: researchInput(),
    history: history(),
  });
  const iu = packet.observations.find(
    observation =>
      observation.canonicalArtistId === 'iu'
      && observation.releaseTitle === 'LILAC',
  );

  assert.ok(iu);
  assert.equal(iu.evidenceQuality, 'provider-attributed-secondary');
  assert.deepEqual(
    new Set(iu.evidenceRefs.map(evidence => evidence.sourceTier)),
    new Set([
      'tier-b-provider-attributed-reputable',
      'tier-c-discovery-only',
    ]),
  );
  assert.equal(iu.evidenceRefs.length, 2);
});

test('reviewer packet IDs are deterministic for the exact research snapshot', () => {
  const first = buildReportedAlbumSalesResearchReviewerPacket({
    researchInput: researchInput(),
    history: history(),
  });
  const second = buildReportedAlbumSalesResearchReviewerPacket({
    researchInput: researchInput(),
    history: history(),
  });

  assert.equal(first.packetId, second.packetId);
  assert.equal(first.inputFingerprint, second.inputFingerprint);
  assert.equal(first.cohortReviewPacketId, second.cohortReviewPacketId);
});

test('reviewer packet fails closed when an included observation is absent from the supplied history', () => {
  const input = researchInput();
  const fullHistory = history();
  const firstIncluded = input.includedObservationIds[0];
  assert.ok(firstIncluded);

  const filteredHistory = Object.freeze({
    ...fullHistory,
    observations: Object.freeze(
      fullHistory.observations.filter(
        observation => observation.observationId !== firstIncluded,
      ),
    ),
  });

  assert.throws(
    () =>
      buildReportedAlbumSalesResearchReviewerPacket({
        researchInput: input,
        history: filteredHistory,
      }),
    /reviewer_packet_observation_missing/,
  );
});

test('review record template requires explicit human review metadata but materializes no decision', () => {
  const packet = buildReportedAlbumSalesResearchReviewerPacket({
    researchInput: researchInput(),
    history: history(),
  });

  assert.deepEqual(
    packet.reviewRecordTemplate.conclusionRequired,
    ['verified', 'partial', 'conflicting', 'unknown'],
  );
  assert.equal(
    packet.reviewRecordTemplate.evidenceRefsRequiredForNonUnknown,
    true,
  );
  assert.equal(packet.reviewRecordTemplate.reviewerRefRequired, true);
  assert.equal(packet.reviewRecordTemplate.reviewedAtOffsetRequired, true);
  assert.equal(
    packet.reviewRecordTemplate.inputFingerprintMustMatch,
    true,
  );
  assert.equal(
    packet.reviewRecordTemplate.coveredObservationIdsMustBelongToCohort,
    true,
  );
  assert.equal(packet.reviewRecordsMaterialized, false);
});
