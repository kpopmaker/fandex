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
  assert.ok(
    payload.blockers.includes(
      'tier-a-or-b-first-week-evidence-missing',
    ),
  );
  assert.ok(
    payload.blockers.includes('explicit-provider-period-missing'),
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
