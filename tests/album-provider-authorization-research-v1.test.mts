import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HANTEO_AUTHORIZATION_QUESTIONS,
  HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR,
  evaluateAlbumProviderAuthorizationResponse,
} from '../lib/alternative-evidence/albumProviderAuthorizationResearch';

test('Hanteo authorization research keeps unused raw redistribution and historical backfill outside required Production usage', () => {
  assert.equal(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.providerId, 'hanteo-chart');
  assert.match(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.officialInquiryEntry, /hanteochart\.com\/ko\/about/);
  assert.match(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.officialInquiryForm, /resource\.hanteochart\.io/);
  assert.equal(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.rawRedistributionPlanned, false);
  assert.equal(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.historicalBackfillRequiredForProduction, false);
  assert.equal(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.prospectiveAuthorizedObservationHistoryAllowed, true);
  assert.equal(HANTEO_AUTHORIZATION_QUESTIONS.length, 10);
});

test('ambiguous or incomplete required rights remain blocked while optional capability gaps stay separate', () => {
  const result = evaluateAlbumProviderAuthorizationResponse({
    acquisition: 'allowed',
    automatedAccess: 'not-addressed',
    normalizedStorage: 'not-addressed',
    retention: 'not-addressed',
    commercialUse: 'not-addressed',
    derivedPublication: 'not-addressed',
    rawRedistribution: 'not-addressed',
    providerPeriodDefinition: 'partially-verified',
    historicalQueryContract: 'not-addressed',
    revisionPolicy: 'not-addressed',
    responseEvidenceId: null,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.rightsResolved, false);
  assert.equal(result.semanticsResolved, false);
  assert.equal(result.historicalQueryContractResolved, false);
  assert.ok(result.blockers.includes('provider-automation-rights-unresolved'));
  assert.ok(result.blockers.includes('provider-normalized-storage-rights-unresolved'));
  assert.ok(result.blockers.includes('provider-authorization-response-evidence-missing'));
  assert.ok(!result.blockers.some((blocker) => blocker.includes('historical-query')));
  assert.ok(!result.blockers.some((blocker) => blocker.includes('raw-redistribution')));
  assert.ok(result.nonBlockingGaps.includes('provider-historical-query-contract-unresolved-optional-capability'));
  assert.ok(result.nonBlockingGaps.includes('provider-raw-redistribution-policy-unresolved-not-used-by-fandex'));
});

test('required rights plus evidence reach onboarding review even when optional historical backfill is not addressed', () => {
  const result = evaluateAlbumProviderAuthorizationResponse({
    acquisition: 'allowed-with-conditions',
    automatedAccess: 'allowed-with-conditions',
    normalizedStorage: 'allowed-with-conditions',
    retention: 'allowed-with-conditions',
    commercialUse: 'allowed-with-conditions',
    derivedPublication: 'allowed-with-conditions',
    rawRedistribution: 'not-addressed',
    providerPeriodDefinition: 'verified',
    historicalQueryContract: 'not-addressed',
    revisionPolicy: 'verified',
    responseEvidenceId: 'provider-response:hanteo:authorization-review:example',
  });

  assert.equal(result.state, 'eligible-for-onboarding-review');
  assert.equal(result.rightsResolved, true);
  assert.equal(result.semanticsResolved, true);
  assert.equal(result.historicalQueryContractResolved, false);
  assert.deepEqual(result.blockers, []);
  assert.ok(result.nonBlockingGaps.includes('provider-historical-query-contract-unresolved-optional-capability'));
  assert.ok(result.nonBlockingGaps.includes('provider-raw-redistribution-policy-unresolved-not-used-by-fandex'));
});
