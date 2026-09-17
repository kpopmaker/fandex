import test from 'node:test';
import assert from 'node:assert/strict';

import { ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH } from '../lib/alternative-evidence/albumCompletedPurchaseProviderSurveyResearch';

test('bounded provider survey keeps construct and rights blockers separate', () => {
  const survey = ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH;
  assert.equal(survey.exhaustiveUniverseClaim, false);
  assert.equal(survey.openProductionCompatibleProviderFound, false);
  assert.equal(survey.conclusion.rightsBlockerRetained, true);
  assert.equal(survey.conclusion.universalAbsenceClaim, false);

  const hanteo = survey.candidates.find((candidate) => candidate.candidateId === 'hanteo-chart');
  assert.equal(hanteo?.constructCompatible, true);
  assert.equal(hanteo?.productionCandidateState, 'rights-blocked');

  const circleRetail = survey.candidates.find((candidate) => candidate.candidateId === 'circle-retail-album-chart');
  assert.equal(circleRetail?.constructCompatible, true);
  assert.equal(circleRetail?.automaticAcquisitionRights, 'blocked');

  const customs = survey.candidates.find((candidate) => candidate.candidateId === 'korea-customs-album-export-statistics');
  assert.equal(customs?.constructCompatible, false);
  assert.equal(customs?.productionCandidateState, 'construct-incompatible');
});

test('reported context and shipment proxies cannot substitute direct completed purchases', () => {
  const conclusion = ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH.conclusion;
  assert.equal(conclusion.reportedContextMaySubstituteDirectObservation, false);
  assert.equal(conclusion.shipmentMaySubstituteCompletedPurchase, false);
});
