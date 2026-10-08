import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packet = JSON.parse(
  readFileSync('data/fandex-cloud-v10/product/iu_music_album_official_first_week_evidence_request_v1.json', 'utf8'),
);

test('IU official first-week request requires exact value, explicit 7-day period, attribution and edition semantics', () => {
  assert.equal(packet.canonicalArtistId, 'iu');
  assert.equal(packet.canonicalReleaseId, 'release:iu:a-flower-bookmark-3:2025-05-28');
  assert.deepEqual(packet.requiredWrittenEvidence.map((x: { id: string }) => x.id), [
    'exact-value', 'explicit-provider-period', 'metric-and-edition-scope', 'source-provenance',
  ]);
  assert.equal(packet.discoveryHypothesis.exactFirstWeekPhysicalCopies, 79_940);
  assert.equal(packet.discoveryHypothesis.treatedAsVerifiedProviderData, false);
  assert.ok(packet.requiredWrittenEvidence.every((item: { verified: boolean }) => item.verified === false));
});

test('official evidence request is preparation only: no outreach, API probe, rights grant, durable write or activation', () => {
  assert.equal(packet.inquirySent, false);
  assert.equal(packet.contactVerifiedForThisRequest, false);
  assert.equal(packet.paymentOrLicenseCommitmentAuthorized, false);
  assert.equal(packet.qualification.exactValueBoundToPeriodLocated, false);
  assert.equal(packet.qualification.claimLevelEvidenceReviewMaterialized, false);
  assert.equal(packet.qualification.sourceSpecificRightsDecisionMaterialized, false);
  assert.equal(packet.qualification.productionObservationEligible, false);
  assert.equal(packet.authorizationBoundary.automatedHistoricalQueryAllowed, false);
  assert.equal(packet.authorizationBoundary.guessedHistoricalParametersAllowed, false);
  assert.equal(packet.authorizationBoundary.durableProductionWriteAuthorized, false);
  assert.equal(packet.authorizationBoundary.productActivationAuthorized, false);
  assert.equal(packet.authorizationBoundary.publicPublicationAuthorized, false);
  assert.equal(packet.authorizationBoundary.methodologyLocked, false);
});
