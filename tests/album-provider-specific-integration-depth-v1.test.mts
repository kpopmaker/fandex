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
import { CIRCLE_PROVIDER_DESCRIPTOR } from '../lib/alternative-evidence/directAlbumProvider';
import { fromRetailObservation } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { fromCanonicalAlbumFeatureInput } from '../lib/alternative-evidence/albumTemporalSnapshot';

const response = {
  success: true,
  data: {
    meta: { pubDate: '2026-08-30T00:00:00Z', version: 'v1' },
    items: [{ sortOrder: 3, itemId: 123, title: 'Synthetic Album', author: 'Artist', upDown: 2, salePoint: 77 }],
  },
};

test('YES24 documented response maps rank/index without units', () => {
  const plan = buildYes24RetailRequestPlan({ requestType: 'bestseller-daily', date: '2026-08-30' });
  assert.equal(plan.networkAllowed, false);
  assert.equal(plan.categoryResolutionState, 'unresolved');
  const decoded = decodeYes24RetailResponse(response);
  const observations = normalizeYes24RetailResponse(decoded, plan, {
    observedAt: '2026-08-30T01:00:00Z',
    collectedAt: '2026-08-30T01:01:00Z',
    syntheticFixture: true,
  });
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

test('YES24 request plan and live gate are default-off', async () => {
  assert.equal(YES24_RETAIL_ADAPTER.descriptor.defaultOff.liveCallsAllowed, false);
  await assert.rejects(
    () => YES24_RETAIL_ADAPTER.executeLive(
      { execute: async () => response },
      buildYes24RetailRequestPlan({ requestType: 'bestseller-realtime' }),
    ),
    (error) => error instanceof Yes24LiveGateError,
  );
});

test('YES24 preserves external product and raw artist/category state', () => {
  const plan = buildYes24RetailRequestPlan({ requestType: 'bestseller-monthly', date: '2026-08-01' });
  const observation = normalizeYes24RetailResponse(
    decodeYes24RetailResponse(response),
    plan,
    { observedAt: '2026-08-30', collectedAt: '2026-08-30', syntheticFixture: true },
  )[0];
  assert.equal(observation.retailerProductId, '123');
  assert.equal(observation.retailerArtistText, 'Artist');
  assert.equal(observation.fandexReleaseId, null);
  assert.equal(observation.categoryResolutionState, 'unresolved');
});

test('Circle evidence-linked descriptor upgrades only directly qualified capabilities', () => {
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.acquisitionClass, 'public-direct-endpoint');
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsNativePeriodSales);
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsHistoricalQueries);
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsSkuIdentity);
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsCumulativeSales, undefined);
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsCumulativeSales'));
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsRevisions'));
  assert.ok(!CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsNativePeriodSales'));
  assert.ok(!CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsHistoricalQueries'));
  assert.ok(!CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsSkuIdentity'));

  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.currentStage, 'live-adapter-default-off');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.technicalReadiness, 'adapter-ready');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsNativePeriodSales.state, 'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsHistoricalQueries.state, 'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsSkuIdentity.state, 'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsCumulativeSales.state, 'unknown');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsRevisions.state, 'unknown');
  assert.ok(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsNativePeriodSales.evidenceIds.length > 0);

  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.acquisitionState, 'review-required');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.automationState, 'review-required');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.commercialUseState, 'contract-required');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.rawRedistributionState, 'blocked');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.enabled, false);
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.liveCallsAllowed, false);
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.productionAllowed, false);
});

test('base Circle descriptor stays conservative and unqualified', () => {
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.capabilities.supportsNativePeriodSales.state, 'unknown');
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.capabilities.supportsHistoricalQueries.state, 'unknown');
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.capabilities.supportsSkuIdentity.state, 'unknown');
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.defaultOff.enabled, false);
});

test('Circle certification remains threshold context, not cumulative exact sales', () => {
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.certificationCapabilities?.supportsCumulativeCertification, true);
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.certificationCapabilities?.supportsThresholdCertification, true);
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsCumulativeSales, undefined);
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsCumulativeSales'));
});

test('Hanteo evidence keeps direct API capabilities unknown', () => {
  assert.equal(HANTEO_PROVIDER_EVIDENCE.acquisitionClass, 'public-page-only');
  assert.ok(HANTEO_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsNativePeriodSales'));
  assert.ok(HANTEO_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsCumulativeSales'));
  assert.match(HANTEO_PROVIDER_EVIDENCE.requestEvidence, /unknown/i);
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.capabilities.supportsNativePeriodSales.state, 'unknown');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.defaultOff.productionAllowed, false);
});

test('provider evidence packet is not a market observation and providers remain unselected', () => {
  assert.equal('observationId' in CIRCLE_PROVIDER_EVIDENCE, false);
  assert.equal('value' in HANTEO_PROVIDER_EVIDENCE, false);
});
