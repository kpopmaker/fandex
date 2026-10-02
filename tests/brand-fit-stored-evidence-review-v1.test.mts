import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
} from '../lib/intelligence/brandFitIdentityBindings';
import {
  prepareBrandFitYouTubeEvidenceCandidate,
  type BrandFitCollectionHandoffResult,
} from '../lib/intelligence/brandFitProductionCollectionHandoff';
import {
  reviewBrandFitStoredEvidenceCandidate,
} from '../lib/intelligence/brandFitStoredEvidenceReview';

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

function handoff(): BrandFitCollectionHandoffResult {
  return prepareBrandFitYouTubeEvidenceCandidate({
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
      collectedAt: '2026-10-01T07:30:00.000Z',
    },
  });
}

test('eligible provider handoff becomes a non-writing storage candidate', () => {
  const reviewed = reviewBrandFitStoredEvidenceCandidate(handoff());

  assert.equal(reviewed.status, 'storage-candidate');
  if (reviewed.status !== 'storage-candidate') return;

  assert.match(reviewed.evidenceDigest, /^[0-9a-f]{64}$/);
  assert.equal(reviewed.evidence.variableId, 'brandFitPoint');
  assert.equal(
    reviewed.evidence.identity.canonicalCampaignId,
    'estee-lauder-korea-new-night-campaign-2025-iu',
  );
  assert.equal(reviewed.storageWriteAuthorized, false);
  assert.equal(reviewed.productActivationAuthorized, false);
  assert.equal(reviewed.publicPublicationAuthorized, false);
});

test('review preserves restricted rights and zero numeric interpretation', () => {
  const reviewed = reviewBrandFitStoredEvidenceCandidate(handoff());
  assert.equal(reviewed.status, 'storage-candidate');
  if (reviewed.status !== 'storage-candidate') return;

  assert.deepEqual(reviewed.review, {
    identityBound: true,
    sourceQualified: true,
    rightsState: 'restricted',
    rawProviderPayloadStored: false,
    rawTitleStored: false,
    rawDescriptionStored: false,
    numericDerivationEligible: false,
  });
  assert.equal(reviewed.evidence.interpretation.score, null);
  assert.equal(reviewed.evidence.interpretation.sentiment, null);
  assert.equal(reviewed.evidence.interpretation.inferredDealValue, null);
});

test('same normalized evidence produces a deterministic digest', () => {
  const first = reviewBrandFitStoredEvidenceCandidate(handoff());
  const second = reviewBrandFitStoredEvidenceCandidate(handoff());

  assert.equal(first.status, 'storage-candidate');
  assert.equal(second.status, 'storage-candidate');
  if (
    first.status !== 'storage-candidate'
    || second.status !== 'storage-candidate'
  ) return;

  assert.equal(first.evidenceDigest, second.evidenceDigest);
});

test('blocked collection handoff cannot enter stored-evidence review', () => {
  const blocked: BrandFitCollectionHandoffResult = {
    status: 'blocked',
    contractVersion: 'brand-fit-production-collection-handoff-v1',
    reason: 'adapter-rejected',
    databaseWriteAuthorized: false,
    productActivationAuthorized: false,
    rawProviderPayloadRetentionAuthorized: false,
  };

  assert.deepEqual(reviewBrandFitStoredEvidenceCandidate(blocked), {
    status: 'blocked',
    contractVersion: 'brand-fit-stored-evidence-review-v1',
    reason: 'handoff-not-eligible',
    storageWriteAuthorized: false,
    productActivationAuthorized: false,
    publicPublicationAuthorized: false,
  });
});

test('identity drift is blocked before storage candidacy', () => {
  const eligible = handoff();
  assert.equal(eligible.status, 'eligible-for-stored-evidence-review');
  if (eligible.status !== 'eligible-for-stored-evidence-review') return;

  const modified = {
    ...eligible,
    adapterResult: {
      ...eligible.adapterResult,
      evidence: {
        ...eligible.adapterResult.evidence,
        identity: {
          ...eligible.adapterResult.evidence.identity,
          canonicalBrandId: 'different-brand',
        },
      },
    },
  } as BrandFitCollectionHandoffResult;

  const reviewed = reviewBrandFitStoredEvidenceCandidate(modified);
  assert.equal(reviewed.status, 'blocked');
  if (reviewed.status !== 'blocked') return;
  assert.equal(reviewed.reason, 'identity-mismatch');
});

test('rights drift cannot silently become publication permission', () => {
  const eligible = handoff();
  assert.equal(eligible.status, 'eligible-for-stored-evidence-review');
  if (eligible.status !== 'eligible-for-stored-evidence-review') return;

  const modified = {
    ...eligible,
    adapterResult: {
      ...eligible.adapterResult,
      evidence: {
        ...eligible.adapterResult.evidence,
        source: {
          ...eligible.adapterResult.evidence.source,
          rightsState: 'allow',
        },
      },
    },
  } as BrandFitCollectionHandoffResult;

  const reviewed = reviewBrandFitStoredEvidenceCandidate(modified);
  assert.equal(reviewed.status, 'blocked');
  if (reviewed.status !== 'blocked') return;
  assert.equal(reviewed.reason, 'rights-state-mismatch');
});

test('retention contract drift is blocked', () => {
  const eligible = handoff();
  assert.equal(eligible.status, 'eligible-for-stored-evidence-review');
  if (eligible.status !== 'eligible-for-stored-evidence-review') return;

  const modified = {
    ...eligible,
    adapterResult: {
      ...eligible.adapterResult,
      rawMetadataRetention: 'retain-indefinitely',
    },
  } as unknown as BrandFitCollectionHandoffResult;

  const reviewed = reviewBrandFitStoredEvidenceCandidate(modified);
  assert.equal(reviewed.status, 'blocked');
  if (reviewed.status !== 'blocked') return;
  assert.equal(reviewed.reason, 'retention-contract-mismatch');
});
