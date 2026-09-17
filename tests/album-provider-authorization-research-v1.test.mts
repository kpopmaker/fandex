import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HANTEO_AUTHORIZATION_QUESTIONS,
  HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR,
  evaluateAlbumProviderAuthorizationResponse,
} from '../lib/alternative-evidence/albumProviderAuthorizationResearch';

test('Hanteo authorization packet targets the official inquiry path and covers rights plus semantics', () => {
  assert.equal(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.providerId, 'hanteo-chart');
  assert.match(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.officialInquiryEntry, /hanteochart\.com\/ko\/about/);
  assert.match(HANTEO_AUTHORIZATION_REQUEST_DESCRIPTOR.officialInquiryForm, /resource\.hanteochart\.io/);
  assert.equal(HANTEO_AUTHORIZATION_QUESTIONS.length, 10);
});

test('ambiguous or incomplete provider response remains blocked', () => {
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
  assert.ok(result.blockers.includes('provider-automation-rights-unresolved'));
  assert.ok(result.blockers.includes('provider-normalized-storage-rights-unresolved'));
  assert.ok(result.blockers.includes('provider-authorization-response-evidence-missing'));
});

test('only explicit rights and fully verified semantics reach onboarding review', () => {
  const result = evaluateAlbumProviderAuthorizationResponse({
    acquisition: 'allowed-with-conditions',
    automatedAccess: 'allowed-with-conditions',
    normalizedStorage: 'allowed-with-conditions',
    retention: 'allowed-with-conditions',
    commercialUse: 'allowed-with-conditions',
    derivedPublication: 'allowed-with-conditions',
    rawRedistribution: 'not-allowed',
    providerPeriodDefinition: 'verified',
    historicalQueryContract: 'verified',
    revisionPolicy: 'verified',
    responseEvidenceId: 'provider-response:hanteo:authorization-review:example',
  });

  assert.deepEqual(result, {
    state: 'eligible-for-onboarding-review',
    rightsResolved: true,
    semanticsResolved: true,
    blockers: [],
  });
});
