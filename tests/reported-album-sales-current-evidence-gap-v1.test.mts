import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const payload = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_current_release_evidence_gap_v1.json',
    'utf8',
  ),
);

test('IU current physical-release gap remains fail-closed rather than promoting discovery-only sales', () => {
  assert.equal(payload.canonicalArtistId, 'iu');
  assert.equal(
    payload.currentReleaseCandidate.latestPhysicalReleaseState,
    'candidate-latest',
  );
  assert.equal(
    payload.currentReleaseCandidate.verificationBoundary
      .exhaustiveLatestPhysicalReleaseReviewCompleted,
    false,
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim.productionEvidenceState,
    'discovery-only',
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim
      .tierAOrBProductionEvidenceRefs.length,
    0,
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim
      .productionObservationEligible,
    false,
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim.providerPeriodStart,
    null,
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim.providerPeriodEnd,
    null,
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim.discoveryProviderPeriodStart,
    '2025-05-28',
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim.discoveryProviderPeriodEnd,
    '2025-06-03',
  );
  assert.equal(
    payload.reportedHanteoFirstWeekClaim
      .discoveryProviderPeriodProductionEligible,
    false,
  );
  assert.equal(
    payload.currentReleaseCandidate.editionResolutionState,
    'candidate',
  );
  assert.equal(
    payload.currentReleaseCandidate.canonicalEditionId,
    null,
  );
  assert.deepEqual(
    payload.currentReleaseCandidate.editionCandidates.map(
      (entry: { candidateEdition: string }) => entry.candidateEdition,
    ),
    ['standard-cd', 'cdp-limited'],
  );
  assert.ok(
    payload.blockers.includes(
      'tier-a-or-b-first-week-evidence-missing',
    ),
  );
  assert.ok(
    payload.blockers.includes('explicit-provider-period-missing'),
  );
  assert.equal(
    payload.currentReleaseReview.state,
    'human-reviewed-binding-materialized',
  );
  assert.equal(
    payload.currentReleaseReview.canonicalReleaseId,
    'release:iu:a-flower-bookmark-3:2025-05-28',
  );
  assert.equal(
    payload.currentReleaseReview.editionResolutionState,
    'release-level',
  );
  assert.equal(payload.currentReleaseReview.autoVerified, false);
  assert.equal(
    payload.blockers.includes(
      'latest-physical-release-not-human-reviewed',
    ),
    false,
  );
  assert.equal(
    payload.blockers.includes('canonical-release-id-unresolved'),
    false,
  );
  assert.equal(
    payload.blockers.includes(
      'edition-semantics-unresolved-standard-vs-cdp',
    ),
    false,
  );
  assert.equal(payload.semantics.missingEqualsZero, false);
  assert.equal(payload.semantics.missingEqualsStable, false);
  assert.equal(
    payload.semantics.releaseDateDerivedProviderPeriodAllowed,
    false,
  );
  assert.equal(payload.productActivationAuthorized, false);
  assert.equal(payload.publicPublicationAuthorized, false);
  assert.equal(payload.numericScoreDefined, false);
});
