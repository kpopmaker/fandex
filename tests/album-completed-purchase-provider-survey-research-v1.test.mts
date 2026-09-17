import test from 'node:test';
import assert from 'node:assert/strict';

import { ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH } from '../lib/alternative-evidence/albumCompletedPurchaseProviderSurveyResearch';

test('bounded provider survey keeps construct and rights blockers separate', () => {
  const survey = ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH;
  assert.equal(survey.exhaustiveUniverseClaim, false);
  assert.equal(survey.openProductionCompatibleProviderFound, false);
  assert.equal(survey.contractCapableProviderFound, true);
  assert.equal(survey.conclusion.rightsBlockerRetained, true);
  assert.equal(survey.conclusion.universalAbsenceClaim, false);

  const hanteo = survey.candidates.find((candidate) => candidate.candidateId === 'hanteo-chart');
  assert.equal(hanteo?.constructCompatible, true);
  assert.equal(hanteo?.currentFandexAuthorization, false);
  assert.equal(hanteo?.productionCandidateState, 'rights-blocked');

  const circleRetail = survey.candidates.find((candidate) => candidate.candidateId === 'circle-retail-album-chart');
  assert.equal(circleRetail?.constructCompatible, true);
  assert.equal(circleRetail?.automaticAcquisitionRights, 'blocked');

  const customs = survey.candidates.find((candidate) => candidate.candidateId === 'korea-customs-album-export-statistics');
  assert.equal(customs?.constructCompatible, false);
  assert.equal(customs?.productionCandidateState, 'construct-incompatible');
});

test('Luminate is a contract-capable unit-sales path but is not currently authorized for FANDEX', () => {
  const luminate = ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH.candidates.find(
    (candidate) => candidate.candidateId === 'luminate-music-api-data-share',
  );

  assert.equal(luminate?.providerClass, 'licensed-data-service');
  assert.equal(luminate?.constructCompatible, true);
  assert.equal(luminate?.directProviderObservationAvailable, true);
  assert.equal(luminate?.unitPhysicalSalesAvailable, true);
  assert.equal(luminate?.currentFandexAuthorization, false);
  assert.equal(luminate?.automaticAcquisitionRights, 'review-required');
  assert.equal(luminate?.normalizedStorageRights, 'review-required');
  assert.equal(luminate?.derivedPublicationRights, 'review-required');
  assert.equal(luminate?.contractualProductionPath, 'explicitly-offered');
  assert.equal(luminate?.productionCandidateState, 'contract-capable');
  assert.deepEqual(luminate?.territoryScope, ['US', 'CA']);
});

test('Official Charts is a licensed physical-sales path rather than an open ingestion source', () => {
  const officialCharts = ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH.candidates.find(
    (candidate) => candidate.candidateId === 'official-charts-b2b-data',
  );

  assert.equal(officialCharts?.constructCompatible, true);
  assert.equal(officialCharts?.unitPhysicalSalesAvailable, true);
  assert.equal(officialCharts?.currentFandexAuthorization, false);
  assert.equal(officialCharts?.contractualProductionPath, 'explicitly-offered');
  assert.equal(officialCharts?.productionCandidateState, 'contract-capable');
  assert.deepEqual(officialCharts?.territoryScope, ['GB']);
});

test('retailer Open APIs remain proxy or identity sources when they expose index/rank rather than sold units', () => {
  const survey = ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH;
  for (const candidateId of ['yes24-open-api-music', 'aladin-open-api-music']) {
    const candidate = survey.candidates.find((item) => item.candidateId === candidateId);
    assert.equal(candidate?.providerClass, 'retailer-api');
    assert.equal(candidate?.directProviderObservationAvailable, true);
    assert.equal(candidate?.unitPhysicalSalesAvailable, false);
    assert.equal(candidate?.constructCompatible, false);
    assert.equal(candidate?.productionCandidateState, 'construct-incompatible');
  }
});

test('reported context, rank/index proxies and shipment proxies cannot substitute direct completed purchases', () => {
  const conclusion = ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH.conclusion;
  assert.equal(conclusion.reportedContextMaySubstituteDirectObservation, false);
  assert.equal(conclusion.rankOrSalesIndexMaySubstitutePhysicalUnits, false);
  assert.equal(conclusion.shipmentMaySubstituteCompletedPurchase, false);
  assert.deepEqual(conclusion.contractCapableCandidateIds, [
    'luminate-music-api-data-share',
    'official-charts-b2b-data',
  ]);
});
