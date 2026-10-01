import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ESTEE_LAUDER_DIRECT_SITE_QUALIFICATION,
  YOUTUBE_DATA_API_BRAND_SOURCE_QUALIFICATION,
  evaluateYouTubeBrandSourceCollectionEligibility,
  listBrandFitSourceQualifications,
} from '../lib/intelligence/brandFitSourceQualification';

const compliant = () => ({
  usesYouTubeDataApiOnly: true,
  scrapingDisabled: true,
  audiovisualDownloadDisabled: true,
  nonAuthorizedMetadataRefreshWithin30Days: true,
  latestMetadataRefreshEnabled: true,
  termsAndPrivacyDisclosureReady: true,
  officialBrandChannelBindingRequired: true,
  numericDerivedMetricDisabled: true,
});

test('direct Estée Lauder website collection is blocked by reviewed rights terms', () => {
  assert.equal(ESTEE_LAUDER_DIRECT_SITE_QUALIFICATION.rightsState, 'deny');
  assert.equal(
    ESTEE_LAUDER_DIRECT_SITE_QUALIFICATION.directCollectionEligible,
    false,
  );
  assert.equal(
    ESTEE_LAUDER_DIRECT_SITE_QUALIFICATION.blockers.includes(
      'automated-scraping-prohibited',
    ),
    true,
  );
  assert.equal(
    ESTEE_LAUDER_DIRECT_SITE_QUALIFICATION.blockers.includes(
      'commercial-reuse-not-authorized',
    ),
    true,
  );
});

test('YouTube Data API source remains conditional until compliance controls exist', () => {
  assert.equal(
    YOUTUBE_DATA_API_BRAND_SOURCE_QUALIFICATION.status,
    'conditional-candidate',
  );
  assert.equal(
    YOUTUBE_DATA_API_BRAND_SOURCE_QUALIFICATION.rightsState,
    'restricted',
  );
  assert.equal(
    YOUTUBE_DATA_API_BRAND_SOURCE_QUALIFICATION.directCollectionEligible,
    false,
  );
  assert.equal(
    YOUTUBE_DATA_API_BRAND_SOURCE_QUALIFICATION.numericDerivationEligible,
    false,
  );
});

test('fully attested YouTube controls permit only the brand adapter boundary', () => {
  const result = evaluateYouTubeBrandSourceCollectionEligibility(compliant());
  assert.equal(result.status, 'eligible-for-brand-adapter');
  assert.equal(result.directCollectionEligible, true);
  assert.equal(result.rightsState, 'restricted');
  assert.equal(result.numericDerivationEligible, false);
  assert.deepEqual(result.blockers, []);
});

test('scraping must remain disabled even when other controls pass', () => {
  const result = evaluateYouTubeBrandSourceCollectionEligibility({
    ...compliant(),
    scrapingDisabled: false,
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.directCollectionEligible, false);
  assert.deepEqual(result.blockers, ['youtube-scraping-not-disabled']);
});

test('non-authorized metadata needs a 30-day refresh/delete control', () => {
  const result = evaluateYouTubeBrandSourceCollectionEligibility({
    ...compliant(),
    nonAuthorizedMetadataRefreshWithin30Days: false,
  });
  assert.deepEqual(result.blockers, [
    'youtube-30-day-refresh-delete-control-missing',
  ]);
});

test('official brand channel identity binding is mandatory', () => {
  const result = evaluateYouTubeBrandSourceCollectionEligibility({
    ...compliant(),
    officialBrandChannelBindingRequired: false,
  });
  assert.deepEqual(result.blockers, [
    'official-brand-channel-binding-control-missing',
  ]);
});

test('numeric derived metric remains disabled even for an otherwise compliant API source', () => {
  const result = evaluateYouTubeBrandSourceCollectionEligibility({
    ...compliant(),
    numericDerivedMetricDisabled: false,
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.numericDerivationEligible, false);
  assert.deepEqual(result.blockers, [
    'youtube-numeric-derived-metric-not-disabled',
  ]);
});

test('qualification registry is deterministic and rights-explicit', () => {
  const providers = listBrandFitSourceQualifications();
  assert.deepEqual(
    providers.map((provider) => provider.providerId),
    [
      'estee-lauder-site-direct-fetch',
      'youtube-data-api-official-brand-channel',
    ],
  );
  assert.deepEqual(
    providers.map((provider) => provider.rightsState),
    ['deny', 'restricted'],
  );
});
