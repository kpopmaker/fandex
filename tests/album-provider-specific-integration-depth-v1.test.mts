import test from 'node:test';
import assert from 'node:assert/strict';
import { YES24_RETAIL_ADAPTER, buildYes24RetailRequestPlan, decodeYes24RetailResponse, normalizeYes24RetailResponse, Yes24LiveGateError } from '../lib/alternative-evidence/yes24RetailAdapter';
import { CIRCLE_PROVIDER_EVIDENCE, HANTEO_PROVIDER_EVIDENCE, CIRCLE_EVIDENCE_DESCRIPTOR, HANTEO_EVIDENCE_DESCRIPTOR } from '../lib/alternative-evidence/directProviderEvidence';
import { CIRCLE_PROVIDER_DESCRIPTOR } from '../lib/alternative-evidence/directAlbumProvider';
import { fromRetailObservation } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { fromCanonicalAlbumFeatureInput } from '../lib/alternative-evidence/albumTemporalSnapshot';

const response={success:true,data:{meta:{pubDate:'2026-08-30T00:00:00Z',version:'v1'},items:[{sortOrder:3,itemId:123,title:'Synthetic Album',author:'Artist',upDown:2,salePoint:77}]}};

test('YES24 documented response maps rank/index without units',()=>{
  const plan=buildYes24RetailRequestPlan({requestType:'bestseller-daily',date:'2026-08-30'});
  assert.equal(plan.networkAllowed,false); assert.equal(plan.categoryResolutionState,'unresolved');
  const decoded=decodeYes24RetailResponse(response); const observations=normalizeYes24RetailResponse(decoded,plan,{observedAt:'2026-08-30T01:00:00Z',collectedAt:'2026-08-30T01:01:00Z',syntheticFixture:true});
  assert.equal(observations.length,2); assert.equal(observations[0].semantic,'retail-rank'); assert.equal(observations[0].rank,3);
  assert.equal(observations[1].semantic,'retail-provider-index'); assert.equal(observations[1].providerIndex,77);
  const canonical=fromRetailObservation(observations[0],YES24_RETAIL_ADAPTER.bridgeObservation(observations[0]).evidence)[0];
  assert.equal(canonical.featureKey,'physicalRetailLevelProxy'); assert.equal(canonical.unit,'rank');
  const snapshot=fromCanonicalAlbumFeatureInput(canonical); assert.equal(snapshot.seriesKind,'snapshot-rank'); assert.equal(snapshot.periodType,'day');
});

test('YES24 request plan and live gate are default-off',async()=>{assert.equal(YES24_RETAIL_ADAPTER.descriptor.defaultOff.liveCallsAllowed,false);await assert.rejects(()=>YES24_RETAIL_ADAPTER.executeLive({execute:async()=>response},buildYes24RetailRequestPlan({requestType:'bestseller-realtime'})),(e)=>e instanceof Yes24LiveGateError);});
test('YES24 preserves external product and raw artist/category state',()=>{const p=buildYes24RetailRequestPlan({requestType:'bestseller-monthly',date:'2026-08-01'});const o=normalizeYes24RetailResponse(decodeYes24RetailResponse(response),p,{observedAt:'2026-08-30',collectedAt:'2026-08-30',syntheticFixture:true})[0];assert.equal(o.retailerProductId,'123');assert.equal(o.retailerArtistText,'Artist');assert.equal(o.fandexReleaseId,null);assert.equal(o.categoryResolutionState,'unresolved');});

test('Circle evidence upgrades only directly proven technical capabilities',()=>{
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.acquisitionClass,'public-direct-endpoint');
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.certificationCapabilities?.supportsCumulativeCertification,true);
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsCumulativeSales,undefined);
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsCumulativeSales'));
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsNativePeriodSales,'circle-retail-direct-response-v1:rowSum-period-sales');
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsHistoricalQueries,'circle-retail-direct-response-v1:historical-hour-day-week-month-year');
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsRevisions,'circle-retail-revision-v1:official-corrections-and-supersession-reconciler');
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.capabilityUpgrades.supportsSkuIdentity,'circle-retail-direct-response-v1:barcode-sku-identity-non-hour');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsNativePeriodSales.state,'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsHistoricalQueries.state,'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsRevisions.state,'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.capabilities.supportsSkuIdentity.state,'true');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.currentStage,'live-adapter-default-off');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.technicalReadiness,'adapter-ready');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.enabled,false);
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.liveCallsAllowed,false);
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.defaultOff.productionAllowed,false);
});

test('Circle base descriptor stays conservative while evidence-linked descriptor advances',()=>{
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.capabilities.supportsNativePeriodSales.state,'unknown');
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.capabilities.supportsHistoricalQueries.state,'unknown');
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.capabilities.supportsRevisions.state,'unknown');
  assert.equal(CIRCLE_PROVIDER_DESCRIPTOR.capabilities.supportsSkuIdentity.state,'unknown');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.automationState,'review-required');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.commercialUseState,'contract-required');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.rawRedistributionState,'blocked');
});

test('Circle technical collector gates are qualified while rights remain independently blocked',()=>{
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.blockers.includes('revision-and-rate-limit-qualification-required'),false);
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.blockers.includes('rate-limit-qualification-required'),false);
  assert.deepEqual(CIRCLE_PROVIDER_EVIDENCE.blockers,['storage-and-publication-rights-review-required']);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.temporalEvidence,/Hourly uses POST hour_time/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.temporalEvidence,/Yearly/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.temporalEvidence,/ResultStatus=Error/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.requestEvidence,/retail_hour/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.requestEvidence,/without Cookie or Referer/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.requestEvidence,/ranks 1-50/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.requestEvidence,/33422703085/);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.requestEvidence,/3 seconds apart/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.requestEvidence,/provider hard limit.*unknown/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.revisionEvidence,/duplicate-noop/i);
  assert.match(CIRCLE_PROVIDER_EVIDENCE.revisionEvidence,/supersedesObservationId/i);
});

test('Hanteo evidence keeps API and capabilities unknown',()=>{assert.equal(HANTEO_PROVIDER_EVIDENCE.acquisitionClass,'public-page-only');assert.ok(HANTEO_PROVIDER_EVIDENCE.unresolvedCapabilities.includes('supportsCumulativeSales'));assert.match(HANTEO_PROVIDER_EVIDENCE.requestEvidence,/unknown/i);assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.defaultOff.productionAllowed,false);});
test('provider evidence packet is not a market observation and providers remain unselected',()=>{assert.equal('observationId' in CIRCLE_PROVIDER_EVIDENCE,false);assert.equal('value' in HANTEO_PROVIDER_EVIDENCE,false);});
