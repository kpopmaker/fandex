import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const candidate = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_current_release_review_decision_candidate_v1.json',
    'utf8',
  ),
);

test('IU review decision candidate records evidence-supported release-level proposal without pretending human review occurred', () => {
  assert.equal(candidate.canonicalArtistId, 'iu');
  assert.equal(
    candidate.proposedConclusion.latestPhysicalReleaseFamily,
    'A Flower Bookmark 3',
  );
  assert.equal(
    candidate.proposedConclusion.editionResolutionState,
    'release-level',
  );
  assert.equal(
    candidate.proposedConclusion.canonicalReleaseId,
    null,
  );
  assert.equal(candidate.humanReviewDecision, null);
  assert.equal(candidate.bindingMaterialized, false);
  assert.equal(candidate.autoVerified, false);
  assert.equal(candidate.productionObservationEligible, false);
  assert.equal(candidate.productActivationAuthorized, false);
  assert.equal(candidate.publicPublicationAuthorized, false);
});

test('decision candidate preserves the CDP limited edition as evidence for edition semantics rather than silently creating a second release', () => {
  assert.ok(
    candidate.proposedConclusion.supportingEvidenceRefs.includes(
      'yes24:147561057:a-flower-bookmark-3-cdp',
    ),
  );
  assert.ok(
    candidate.unresolvedBeforeBinding.includes(
      'human-reviewer-must-confirm-release-level-vs-edition-specific-resolution',
    ),
  );
});
