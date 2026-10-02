import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
} from '../lib/intelligence/brandFitIdentityBindings';
import {
  prepareBrandFitYouTubeEvidenceCandidate,
} from '../lib/intelligence/brandFitProductionCollectionHandoff';
import {
  reviewBrandFitStoredEvidenceCandidate,
} from '../lib/intelligence/brandFitStoredEvidenceReview';
import {
  BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT,
  buildBrandFitImmutableEvidenceObjectCandidate,
  decodeBrandFitImmutableEvidenceEnvelope,
} from '../lib/intelligence/brandFitImmutableEvidenceRecord';

const compliance = {
  usesYouTubeDataApiOnly: true,
  scrapingDisabled: true,
  audiovisualDownloadDisabled: true,
  nonAuthorizedMetadataRefreshWithin30Days: true,
  latestMetadataRefreshEnabled: true,
  termsAndPrivacyDisclosureReady: true,
  officialBrandChannelBindingRequired: true,
  numericDerivedMetricDisabled: true,
} as const;

function review() {
  const handoff = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      provider: 'youtube-data-api',
      videoId: '39CUlBDuRSo',
      channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
      title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
      description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
      publishedAt: '2025-08-03T00:00:00Z',
      collectedAt: '2026-10-01T08:20:00.000Z',
    },
  });
  return reviewBrandFitStoredEvidenceCandidate(handoff);
}

test('storage review becomes deterministic immutable object candidate without write permission', () => {
  const candidate = buildBrandFitImmutableEvidenceObjectCandidate(review());

  assert.equal(
    candidate.pathname.startsWith(
      BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT + '/iu/estee-lauder/',
    ),
    true,
  );
  assert.match(candidate.pathname, /[0-9a-f]{64}\.json$/);
  assert.match(candidate.payloadDigest, /^[0-9a-f]{64}$/);
  assert.match(candidate.evidenceDigest, /^[0-9a-f]{64}$/);
  assert.equal(candidate.storageWriteAuthorized, false);
  assert.equal(candidate.productActivationAuthorized, false);
  assert.equal(candidate.publicPublicationAuthorized, false);
});

test('immutable envelope round trips through canonical body', () => {
  const candidate = buildBrandFitImmutableEvidenceObjectCandidate(review());
  const decoded = decodeBrandFitImmutableEvidenceEnvelope(candidate.body);

  assert.equal(decoded.payloadDigest, candidate.payloadDigest);
  assert.equal(decoded.evidenceDigest, candidate.evidenceDigest);
  assert.equal(decoded.canonicalArtistId, 'iu');
  assert.equal(decoded.canonicalBrandId, 'estee-lauder');
  assert.equal(
    decoded.canonicalCampaignId,
    'estee-lauder-korea-new-night-campaign-2025-iu',
  );
  assert.equal(decoded.sourceRightsState, 'restricted');
  assert.equal(decoded.numericEligible, false);
});

test('same evidence produces the same path and payload digest', () => {
  const first = buildBrandFitImmutableEvidenceObjectCandidate(review());
  const second = buildBrandFitImmutableEvidenceObjectCandidate(review());

  assert.equal(first.pathname, second.pathname);
  assert.equal(first.payloadDigest, second.payloadDigest);
  assert.equal(first.body, second.body);
});

test('tampered immutable evidence payload fails closed', () => {
  const candidate = buildBrandFitImmutableEvidenceObjectCandidate(review());
  const parsed = JSON.parse(candidate.body);
  parsed.evidence.identity.canonicalBrandId = 'tampered-brand';

  assert.throws(
    () => decodeBrandFitImmutableEvidenceEnvelope(JSON.stringify(parsed)),
    /brand_fit_immutable_record_payload_invalid/,
  );
});

test('tampered payload digest fails closed', () => {
  const candidate = buildBrandFitImmutableEvidenceObjectCandidate(review());
  const parsed = JSON.parse(candidate.body);
  parsed.payloadDigest = 'f'.repeat(64);

  assert.throws(
    () => decodeBrandFitImmutableEvidenceEnvelope(JSON.stringify(parsed)),
    /brand_fit_immutable_record_payload_invalid/,
  );
});

test('blocked storage review cannot create an immutable object candidate', () => {
  assert.throws(
    () => buildBrandFitImmutableEvidenceObjectCandidate({
      status: 'blocked',
      contractVersion: 'brand-fit-stored-evidence-review-v1',
      reason: 'handoff-not-eligible',
      storageWriteAuthorized: false,
      productActivationAuthorized: false,
      publicPublicationAuthorized: false,
    }),
    /brand_fit_immutable_record_review_not_ready/,
  );
});
