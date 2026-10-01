import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ESTEE_LAUDER_KOREA_YOUTUBE_BINDING,
  IU_ESTEE_LAUDER_AMBASSADOR_BINDING,
  IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING,
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
  validateBrandFitIdentityBindings,
} from '../lib/intelligence/brandFitIdentityBindings';

test('IU and Estée Lauder relationship identity is sourced from official company evidence', () => {
  assert.equal(
    IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalArtistId,
    'iu',
  );
  assert.equal(
    IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalBrandId,
    'estee-lauder',
  );
  assert.equal(
    IU_ESTEE_LAUDER_AMBASSADOR_BINDING.relationshipType,
    'ambassador',
  );
  assert.equal(
    IU_ESTEE_LAUDER_AMBASSADOR_BINDING.identityState,
    'resolved',
  );
  assert.equal(
    IU_ESTEE_LAUDER_AMBASSADOR_BINDING.relationshipEvidence.announcedOn,
    '2024-04-11',
  );
  assert.equal(
    IU_ESTEE_LAUDER_AMBASSADOR_BINDING.relationshipEvidence.lastCorroboratedOn,
    '2026-01-08',
  );
});

test('Estée Lauder Korea YouTube binding is exact and provider-specific', () => {
  assert.equal(
    ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.provider,
    'youtube',
  );
  assert.equal(
    ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.providerChannelId,
    'UCUeEq2B8Cx3Sdjj0Zva7uRA',
  );
  assert.equal(
    ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.providerChannelHandle,
    '@KREsteeLauder',
  );
});

test('explicit NEW Night campaign gets a canonical campaign identity', () => {
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.canonicalCampaignId,
    'estee-lauder-korea-new-night-campaign-2025-iu',
  );
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.evidence.videoId,
    '39CUlBDuRSo',
  );
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.evidence.sourceDatePrecision,
    'day',
  );
});

test('collection plan never invents an exact provider timestamp', () => {
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN
      .requiresExactProviderPublishedAt,
    true,
  );
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN
      .exactProviderPublishedAtPrefilled,
    false,
  );
});

test('collection plan remains owned by Production Operations and disabled here', () => {
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN.collectionOwner,
    'production-operations',
  );
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN.liveCollectionAuthorized,
    false,
  );
  assert.equal(
    IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN
      .requiresComplianceAttestation,
    true,
  );
});

test('identity bindings cross-check cleanly', () => {
  assert.deepEqual(validateBrandFitIdentityBindings(), []);
});
