import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
} from '../lib/intelligence/brandFitIdentityBindings';
import {
  prepareBrandFitYouTubeEvidenceCandidate,
} from '../lib/intelligence/brandFitProductionCollectionHandoff';

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

function observation() {
  return {
    provider: 'youtube-data-api' as const,
    videoId: '39CUlBDuRSo',
    channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
    title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
    description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
    publishedAt: '2025-08-03T00:00:00.000Z',
    collectedAt: '2026-10-01T02:00:00.000Z',
  };
}

test('exact API observation can advance only to stored-evidence review', () => {
  const result = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: observation(),
  });

  assert.equal(result.status, 'eligible-for-stored-evidence-review');
  if (result.status !== 'eligible-for-stored-evidence-review') return;

  assert.equal(result.adapterResult.evidence.eventType, 'campaign-appearance');
  assert.equal(
    result.adapterResult.evidence.identity.canonicalCampaignId,
    'estee-lauder-korea-new-night-campaign-2025-iu',
  );
  assert.equal(result.databaseWriteAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
  assert.equal(result.rawProviderPayloadRetentionAuthorized, false);
});

test('provider timestamp must be exact ISO and is never inferred from day precision', () => {
  const result = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      ...observation(),
      publishedAt: '2025-08-03',
    },
  });

  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion: 'brand-fit-production-collection-handoff-v1',
    reason: 'provider-time-invalid',
    databaseWriteAuthorized: false,
    productActivationAuthorized: false,
    rawProviderPayloadRetentionAuthorized: false,
  });
});

test('unexpected video cannot be substituted into the bounded collection plan', () => {
  const result = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      ...observation(),
      videoId: 'vl0FzlZicOs',
    },
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'provider-observation-mismatch');
});

test('channel mismatch is blocked before relationship interpretation', () => {
  const result = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      ...observation(),
      channelId: 'UC0000000000000000000000',
    },
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'provider-observation-mismatch');
});

test('co-mention without explicit campaign language is rejected by the adapter', () => {
  const result = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      ...observation(),
      description: 'Estée Lauder X IU product film',
    },
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'adapter-rejected');
});

test('missing compliance controls block the evidence handoff', () => {
  const result = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance: {
      ...compliance,
      nonAuthorizedMetadataRefreshWithin30Days: false,
    },
    providerObservation: observation(),
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'adapter-rejected');
});

test('collection before provider publication is impossible', () => {
  const result = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      ...observation(),
      collectedAt: '2025-08-02T23:59:59.000Z',
    },
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'provider-time-invalid');
});


test('provider ISO timestamp without milliseconds is accepted while day-only remains blocked', () => {
  const accepted = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      ...observation(),
      publishedAt: '2025-08-03T00:00:00Z',
    },
  });
  assert.equal(accepted.status, 'eligible-for-stored-evidence-review');

  const blocked = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      ...observation(),
      publishedAt: '2025-08-03',
    },
  });
  assert.equal(blocked.status, 'blocked');
  if (blocked.status !== 'blocked') return;
  assert.equal(blocked.reason, 'provider-time-invalid');
});
