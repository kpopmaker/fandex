import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YES24_RETAIL_ADAPTER,
  buildYes24RetailRequestPlan,
  decodeYes24RetailResponse,
  normalizeYes24RetailResponse,
  Yes24LiveGateError,
} from '../lib/alternative-evidence/yes24RetailAdapter';
import {
  CIRCLE_PROVIDER_EVIDENCE,
  HANTEO_PROVIDER_EVIDENCE,
  CIRCLE_EVIDENCE_DESCRIPTOR,
  HANTEO_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import { fromRetailObservation } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { fromCanonicalAlbumFeatureInput } from '../lib/alternative-evidence/albumTemporalSnapshot';

const response = {
  success: true,
  data: {
    meta: { pubDate: '2026-08-30T00:00:00Z', version: 'v1' },
    items: [{ sortOrder: 3, itemId: 123, title: 'Synthetic Album', author: 'Artist', upDown: 2, salePoint: 77 }],
  },
};

test('YES24 documented response maps rank/index without physical units', () => {
  const plan = buildYes24RetailRequestPlan({ requestType: 'bestseller-daily', date: '2026-08-30' });
  assert.equal(plan.networkAllowed, false);
  assert.equal(plan.categoryResolutionState, 'unresolved');
  const observations = normalizeYes24RetailResponse(
    decodeYes24RetailResponse(response),
    plan,
    { observedAt: '2026-08-30T01:00:00Z', collectedAt: '2026-08-30T01:01:00Z', syntheticFixture: true },
  );
  assert.equal(observations.length, 2);
  assert.equal(observations[0].semantic, 'retail-rank');
  assert.equal(observations[0].rank, 3);
  assert.equal(observations[1].semantic, 'retail-provider-index');
  assert.equal(observations[1].providerIndex, 77);
  const canonical = fromRetailObservation(
    observations[0],
    YES24_RETAIL_ADAPTER.bridgeObservation(observations[0]).evidence,
  )[0];
  assert.equal(canonical.featureKey, 'physicalRetailLevelProxy');
  assert.equal(canonical.unit, 'rank');
  const snapshot = fromCanonicalAlbumFeatureInput(canonical);
  assert.equal(snapshot.seriesKind, 'snapshot-rank');
  assert.equal(snapshot.periodType, 'day');
});

test('YES24 remains default-off', async () => {
  assert.equal(YES24_RETAIL_ADAPTER.descriptor.defaultOff.liveCallsAllowed, false);
  await assert.rejects(
    () => YES24_RETAIL_ADAPTER.executeLive(
      { execute: async () => response },
      buildYes24RetailRequestPlan({ requestType: 'bestseller-realtime' }),
    ),
    (error) => error instanceof Yes24LiveGateError,
  );
});

test('Circle technical qualification exposes only directly evidenced capabilities', () => {
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.acquisitionClass, 'public-direct-endpoint');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsNativePeriodSales.state, 'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsHistoricalQueries.state, 'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsRevisions.state, 'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsSkuIdentity.state, 'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsCumulativeSales.state, 'unknown');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsReleaseIdentity.state, 'unknown');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.currentStage, 'live-adapter-default-off');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.liveCallsAllowed, false);
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.productionAllowed, false);
});

test('Circle certification context never becomes exact cumulative sales', () => {
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.certificationCapabilities?.supportsCumulativeCertification, true);
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsCumulativeSales, undefined);
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsCumulativeSales'));
});

test('Hanteo current exact-copy qualification stays current-only and secondary-capable', () => {
  assert.equal(HANTEO_PROVIDER_EVIDENCE.acquisitionClass, 'public-direct-endpoint');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsNativePeriodSales.state, 'true');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsArtistIdentity.state, 'true');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsHistoricalQueries.state, 'unknown');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsReleaseIdentity.state, 'unknown');
  assert.ok(HANTEO_PROVIDER_EVIDENCE.blockers.includes('historical-exact-copies-public-selector-unverified'));
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.defaultOff.liveCallsAllowed, false);
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.defaultOff.productionAllowed, false);
});

test('provider qualification never grants authorization by technical capability', () => {
  for (const descriptor of [CIRCLE_EVIDENCE_DESCRIPTOR, HANTEO_EVIDENCE_DESCRIPTOR]) {
    assert.equal(descriptor.onboarding.authorization.automationState, 'review-required');
    assert.equal(descriptor.onboarding.authorization.normalizedStorageState, 'review-required');
    assert.equal(descriptor.onboarding.authorization.commercialUseState, 'contract-required');
    assert.equal(descriptor.onboarding.authorization.derivedPublicationState, 'review-required');
    assert.equal(descriptor.onboarding.authorization.rawRedistributionState, 'blocked');
  }
});

test('provider evidence packets are not observations or score inputs', () => {
  assert.equal('observationId' in CIRCLE_PROVIDER_EVIDENCE, false);
  assert.equal('value' in HANTEO_PROVIDER_EVIDENCE, false);
});
