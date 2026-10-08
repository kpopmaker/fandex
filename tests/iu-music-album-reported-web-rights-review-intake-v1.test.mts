import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const intake = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_reported_web_rights_review_intake_v1.json',
    'utf8',
  ),
);

test('IU reported-web rights intake records Hanteo restriction evidence without inferring authorization', () => {
  assert.equal(intake.canonicalArtistId, 'iu');
  assert.equal(intake.sourceType, 'reported-web-evidence');
  assert.equal(intake.accessMode, 'manual-reviewed');
  assert.equal(
    intake.materialBoundary,
    'factual-values-and-provenance-only',
  );
  assert.equal(
    intake.copyrightedArticleExpressionRequestedForStorage,
    false,
  );
  assert.equal(intake.fixedManualOnlyStates.automationState, 'blocked');
  assert.equal(intake.fixedManualOnlyStates.rawStorageState, 'blocked');
  assert.equal(
    intake.fixedManualOnlyStates.rawRedistributionState,
    'blocked',
  );
  assert.ok(
    intake.rightsReviewReferences.every(
      (reference: { authorizationStateNotInferred: boolean }) =>
        reference.authorizationStateNotInferred === true,
    ),
  );
  assert.equal(intake.decision, null);
  assert.equal(intake.reviewMaterialized, false);
  assert.equal(intake.rightsState, 'review-required');
  assert.equal(intake.autoAuthorized, false);
  assert.equal(intake.durableWriteAuthorized, false);
});

test('rights intake refuses to treat discovery-only 79,940 as a source-specific Production rights decision', () => {
  assert.equal(intake.productionEvidenceContext.exactValue, 79_940);
  assert.equal(intake.productionEvidenceContext.discoveryOnly, true);
  assert.equal(
    intake.productionEvidenceContext
      .qualifyingTierAOrBExactValueSourceLocated,
    false,
  );
  assert.equal(
    intake.productionEvidenceContext
      .sourceSpecificRightsDecisionDeferredUntilQualifyingEvidenceSourceExists,
    true,
  );
  assert.ok(
    intake.blockers.includes(
      'source-specific-rights-review-cannot-be-finalized',
    ),
  );
  assert.equal(intake.productActivationAuthorized, false);
  assert.equal(intake.publicPublicationAuthorized, false);
});
