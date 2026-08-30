import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256Canonical } from '../lib/shared/canonicalDigest';
import { buildDirectAlbumObservation, type DirectAlbumObservation } from '../lib/alternative-evidence/directAlbumProvider';
import { YES24_RETAIL_ADAPTER, buildYes24RetailRequestPlan, decodeYes24RetailResponse, normalizeYes24RetailResponse } from '../lib/alternative-evidence/yes24RetailAdapter';
import { fromDirectAlbumObservation, fromRetailObservation } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { enrichAlbumFeatureInputIdentity } from '../lib/alternative-evidence/identityFoundation';
import { fromCanonicalAlbumFeatureInput, deriveCumulativeDeltas, selectAsKnownAt } from '../lib/alternative-evidence/albumTemporalSnapshot';
import { evaluateAlbumMethodologyScenario } from '../lib/alternative-evidence/albumSyntheticValidation';
import { envelopeRecord, planPersistenceAppend, defaultAuthorizationSnapshot } from '../lib/alternative-evidence/persistenceContracts';

const evidence=(id:string,provider='synthetic-provider')=>({evidenceId:id,origin:'direct-licensed-provider',sourceId:provider,sourceUrl:null,acquisitionProvider:'fixture',reportedProvider:provider,observedAt:'2026-08-30T01:00:00Z',collectedAt:'2026-08-30T02:00:00Z',sourcePublishedAt:null,evidenceDigest:sha256Canonical({id}),researchOnly:true,contractVersion:'alternative-evidence-v1'} as never);
const direct=(id:string,semantic:DirectAlbumObservation['semantic'],value:number|null,extra:Partial<DirectAlbumObservation>={})=>buildDirectAlbumObservation({contractVersion:'direct-album-observation-v1',providerId:'synthetic-provider',providerObservationId:id,providerArtistId:'pa',providerReleaseId:'pr',providerEditionId:null,providerSkuId:null,fandexArtistId:'fa',fandexReleaseId:'fr',fandexReleaseFamilyId:'ff',semantic,value,unit:semantic==='rank'?'rank':semantic==='index'?'provider-index':'physical-units',territory:'Korea',format:'CD',providerPeriod:'2026-08-30',providerPublishedAt:'2026-08-30T01:00:00Z',observedAt:'2026-08-30T01:30:00Z',collectedAt:'2026-08-30T02:00:00Z',revisionId:null,revisionObservedAt:null,supersedesObservationId:null,knowledgeMode:'current-research',scopeRole:'standalone',parentObservationId:null,syntheticFixture:true,...extra});
const canon=(o:DirectAlbumObservation,id=o.observationId)=>fromDirectAlbumObservation(o,evidence(id))[0];
const retailCanon=(id:string,rank:number|null,index:number|null)=>{const plan=buildYes24RetailRequestPlan({requestType:'bestseller-daily',date:'2026-08-30'});const response=decodeYes24RetailResponse({success:true,data:{meta:{pubDate:'2026-08-30T01:00:00Z',version:'v1'},items:[{sortOrder:rank,itemId:Number(id.replace(/\D/g,''))||123,title:'Album',author:'Artist',salePoint:index}]}});const observations=normalizeYes24RetailResponse(response,plan,{observedAt:'2026-08-30T01:30:00Z',collectedAt:'2026-08-30T02:00:00Z',syntheticFixture:true});const o=observations.find(item=>index===null?item.semantic==='retail-rank':item.semantic==='retail-provider-index');if(!o)throw new Error('yes24_fixture_observation_missing');return fromRetailObservation(o,YES24_RETAIL_ADAPTER.bridgeObservation(o).evidence)[0];};
function spine(input:ReturnType<typeof canon>,snapshots=[fromCanonicalAlbumFeatureInput(input)]){const identity=enrichAlbumFeatureInputIdentity(input,{artistState:input.artistIdentityState as never,releaseState:input.releaseIdentityState as never});const temporal=fromCanonicalAlbumFeatureInput(identity);const evaluation=evaluateAlbumMethodologyScenario({scenarioId:`spine-${input.featureInputId}`,description:'full spine',inputs:[identity],snapshots});const record=envelopeRecord({recordType:'MethodologyEvaluationRecord',recordVersion:'v1',persistenceScope:'synthetic-validation',payload:evaluation,createdFromRecordIds:[identity.featureInputId,...snapshots.map(x=>x.snapshotId)],contributionIdentityId:identity.contributionIdentity.contributionIdentityId,methodologyVersion:evaluation.methodologyVersion,syntheticOnly:true});const plan=planPersistenceAppend([], [record], {scope:'synthetic-validation',authorization:defaultAuthorizationSnapshot(),technicalEligibility:'unknown',syntheticOnly:true});return {identity,temporal,evaluation,record,plan,stages:{usedSourceBuilder:true,usedCanonicalAdapter:true,usedIdentityLayer:true,usedTemporalLayer:true,usedMethodologyResolver:true,usedPersistencePlanner:true}};}

test('eight distinct full-spine semantic scenarios pass all six stages',()=>{const scenarios=[
  spine(canon(direct('native','period-sale',100))),
  spine(retailCanon('yes24-rank',3,null)),
  spine(retailCanon('yes24-index',null,77)),
  spine(canon(direct('pre','preorder',50))),
  spine(canon(direct('ship','shipment',60))),
  spine(canon(direct('unresolved','period-sale',100,{fandexReleaseId:null}))),
  spine(canon(direct('cum','cumulative-sale',180))),
  spine(canon(direct('context','first-week-sale',120))),
  ];
  assert.equal(scenarios.length,8);for(const s of scenarios){assert.ok(Object.values(s.stages).every(Boolean));assert.equal(s.plan.effects.databaseWrites,0);assert.equal(s.evaluation.productionReady,false);assert.equal(s.evaluation.liveReadiness,'not-established');}
  assert.equal(scenarios[0].evaluation.absoluteLevel.state,'ready');
  assert.equal(scenarios[1].evaluation.absoluteLevel.state,'unavailable');
  assert.equal(scenarios[2].evaluation.absoluteLevel.state,'unavailable');
  assert.ok(scenarios[5].identity.blockers.includes('release-unresolved'));
  assert.equal(scenarios[7].temporal.seriesKind,'reported-event');
});
test('full-spine revision and as-known paths retain immutable lineage',()=>{const a=canon(direct('old','cumulative-sale',100,{providerPeriod:'2026-08-01',collectedAt:'2026-08-01T02:00:00Z'}));const b=canon(direct('fix','cumulative-sale',110,{providerPeriod:'2026-08-01',collectedAt:'2026-08-01T02:00:00Z',revisionId:'r1',revisionObservedAt:'2026-08-05T00:00:00Z'}));const sa=spine(a),sb=spine(b);const plan=planPersistenceAppend([sa.record],[{...sb.record,supersedesRecordId:sa.record.recordId,recordState:'revised'}],{scope:'synthetic-validation',authorization:defaultAuthorizationSnapshot(),technicalEligibility:'unknown',syntheticOnly:true});assert.equal(plan.actions[0].action,'revision-append');assert.equal(selectAsKnownAt([sa.temporal,sb.temporal],'2026-08-03T00:00:00Z').length,1);assert.equal(deriveCumulativeDeltas([sa.temporal,sb.temporal])[1].delta,10);});
test('full-spine outputs remain deterministic',()=>{const a=spine(canon(direct('det','period-sale',42))),b=spine(canon(direct('det','period-sale',42)));assert.equal(a.identity.featureInputId,b.identity.featureInputId);assert.equal(a.temporal.snapshotId,b.temporal.snapshotId);assert.equal(a.evaluation.evaluationId,b.evaluation.evaluationId);assert.equal(a.record.recordId,b.record.recordId);assert.equal(a.plan.planDigest,b.plan.planDigest);});
