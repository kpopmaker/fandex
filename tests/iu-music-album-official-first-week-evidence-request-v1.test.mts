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

test('2026-10-08 verified public inquiry routing cannot be mistaken for rights-holder or dispatch authorization', () => {
  const review = packet.publicOfficialContactRoutingReview;
  assert.equal(review.publishedContactReference, 'https://www.hanteonews.com/en/company/home');
  assert.equal(review.publishedBusinessPartnershipContact.email, 'news.cs@hanteo.com');
  assert.equal(review.publishedBusinessPartnershipContact.officialPublishedContactVerified, true);
  assert.equal(review.publishedBusinessPartnershipContact.hanteoChartSalesDataRightsRecipientVerified, false);
  assert.equal(review.alternativeNewsTipContact.selectedForSalesRightsRequest, false);
  assert.equal(review.contactVerifiedForThisRequest, false);
  assert.equal(review.outreachApprovalRequired, true);
  assert.equal(review.outreachAuthorized, false);
  assert.equal(review.outreachSent, false);
  assert.equal(review.directSalesDataRightsHolderAuthorized, false);
  assert.equal(review.repliesOrRightsDecisionsReceived, false);
  const hall = packet.additionalOfficialEvidenceSurfaceReview;
  assert.equal(hall.showsInitialChodongValuesForFeaturedRecords, true);
  assert.equal(hall.reviewedPublicPageContainsIUFlowerBookmark3, false);
  assert.equal(hall.exactIU79940Exposed, false);
  assert.equal(hall.IUSpecificFirstWeekPeriodExposed, false);
  assert.equal(hall.productionExactClaimQualified, false);
});
