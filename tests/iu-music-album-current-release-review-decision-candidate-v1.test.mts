import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const candidate = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_current_release_review_decision_candidate_v1.json',
    'utf8',
  ),
);

test('IU review decision candidate records the explicitly approved human review without granting Production eligibility', () => {
  assert.equal(candidate.canonicalArtistId, 'iu');
  assert.equal(
    candidate.proposedConclusion.latestPhysicalReleaseFamily,
    'A Flower Bookmark 3',
  );
  assert.equal(
    candidate.proposedConclusion.latestPhysicalReleaseFamilyState,
    'human-reviewed',
  );
  assert.equal(
    candidate.proposedConclusion.editionResolutionState,
    'release-level',
  );
  assert.equal(
    candidate.proposedConclusion.canonicalReleaseId,
    'release:iu:a-flower-bookmark-3:2025-05-28',
  );
  assert.equal(
    candidate.humanReviewDecision.conclusion,
    'verified-latest-physical-release',
  );
  assert.equal(candidate.bindingMaterialized, true);
  assert.deepEqual(candidate.unresolvedBeforeBinding, []);
  assert.equal(candidate.autoVerified, false);
  assert.equal(candidate.productionObservationEligible, false);
  assert.equal(candidate.productActivationAuthorized, false);
  assert.equal(candidate.publicPublicationAuthorized, false);
});

test('approved release-level decision preserves the CDP limited edition evidence without silently creating a second canonical release', () => {
  assert.ok(
    candidate.proposedConclusion.supportingEvidenceRefs.includes(
      'yes24:147561057:a-flower-bookmark-3-cdp',
    ),
  );
  assert.equal(
    candidate.humanReviewDecision.editionResolutionState,
    'release-level',
  );
  assert.equal(
    candidate.humanReviewDecision.canonicalEditionId,
    null,
  );
});
