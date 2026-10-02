import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptOfficialBrandYouTubeVideo,
  type BrandFitYouTubeVideoInput,
} from '../lib/intelligence/brandFitYouTubeSourceAdapter';

const controls = {
  usesYouTubeDataApiOnly: true,
  scrapingDisabled: true,
  audiovisualDownloadDisabled: true,
  nonAuthorizedMetadataRefreshWithin30Days: true,
  latestMetadataRefreshEnabled: true,
  termsAndPrivacyDisclosureReady: true,
  officialBrandChannelBindingRequired: true,
  numericDerivedMetricDisabled: true,
} as const;

function input(
  overrides: Partial<BrandFitYouTubeVideoInput> = {},
): BrandFitYouTubeVideoInput {
  return {
    controls,
    officialBrandChannel: {
      canonicalBrandId: 'estee-lauder',
      providerChannelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
      identityState: 'resolved',
    },
    artist: {
      canonicalArtistId: 'iu',
      aliases: ['IU', '아이유'],
      identityState: 'resolved',
    },
    canonicalCampaignId: 'estee-lauder-night-campaign-iu',
    video: {
      videoId: '39CUlBDuRSo',
      channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
      title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
      description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
      // Fixture-only exact timestamp. Production must use the provider value.
      publishedAt: '2026-09-01T00:00:00.000Z',
      collectedAt: '2026-09-01T01:00:00.000Z',
    },
    ...overrides,
  };
}

test('explicit campaign text on a bound official brand channel becomes categorical campaign evidence', () => {
  const result = adaptOfficialBrandYouTubeVideo(input());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.evidence.variableId, 'brandFitPoint');
  assert.equal(result.evidence.eventType, 'campaign-appearance');
  assert.equal(
    result.evidence.relationshipType,
    'campaign-participant',
  );
  assert.equal(
    result.evidence.identity.canonicalArtistId,
    'iu',
  );
  assert.equal(
    result.evidence.identity.canonicalBrandId,
    'estee-lauder',
  );
  assert.equal(result.evidence.source.rightsState, 'restricted');
  assert.equal(result.evidence.interpretation.score, null);
  assert.equal(result.rawTitleStoredInEvidence, false);
  assert.equal(result.rawDescriptionStoredInEvidence, false);
});

test('X/co-mention alone does not infer a campaign or contract', () => {
  const result = adaptOfficialBrandYouTubeVideo(
    input({
      video: {
        ...input().video,
        description: 'NEW product film featuring IU',
      },
    }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    contractVersion: 'brand-fit-youtube-source-adapter-v1',
    reason: 'relationship-not-explicit',
  });
});

test('campaign evidence requires a campaign identity instead of inventing one from video ID', () => {
  const result = adaptOfficialBrandYouTubeVideo(
    input({ canonicalCampaignId: null }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    contractVersion: 'brand-fit-youtube-source-adapter-v1',
    reason: 'campaign-identity-required',
  });
});

test('official brand channel mismatch fails closed', () => {
  const result = adaptOfficialBrandYouTubeVideo(
    input({
      video: {
        ...input().video,
        channelId: 'UC0000000000000000000000',
      },
    }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    contractVersion: 'brand-fit-youtube-source-adapter-v1',
    reason: 'source-channel-mismatch',
  });
});

test('artist must be explicitly present in provider metadata', () => {
  const result = adaptOfficialBrandYouTubeVideo(
    input({
      video: {
        ...input().video,
        title: 'NEW Sleep Drama On-air',
        description: '에스티 로더의 NEW 나이트 캠페인',
      },
    }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    contractVersion: 'brand-fit-youtube-source-adapter-v1',
    reason: 'artist-not-explicitly-mentioned',
  });
});

test('provider compliance must be attested before adapter use', () => {
  const result = adaptOfficialBrandYouTubeVideo(
    input({
      controls: {
        ...controls,
        nonAuthorizedMetadataRefreshWithin30Days: false,
      },
    }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    contractVersion: 'brand-fit-youtube-source-adapter-v1',
    reason: 'provider-compliance-blocked',
  });
});

test('unresolved brand channel identity is not treated as official', () => {
  const result = adaptOfficialBrandYouTubeVideo(
    input({
      officialBrandChannel: {
        ...input().officialBrandChannel,
        identityState: 'unresolved',
      },
    }),
  );
  assert.equal(result.status, 'unsupported');
  if (result.status !== 'unsupported') return;
  assert.equal(result.reason, 'brand-channel-identity-unresolved');
});

test('ambassador is only emitted when the metadata says ambassador explicitly', () => {
  const result = adaptOfficialBrandYouTubeVideo(
    input({
      canonicalCampaignId: null,
      video: {
        ...input().video,
        title: 'Introducing IU as our Global Brand Ambassador',
        description: 'Meet our new ambassador IU.',
      },
    }),
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.evidence.eventType, 'relationship-announced');
  assert.equal(result.evidence.relationshipType, 'ambassador');
});
