import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  CIRCLE_PROVIDER_EVIDENCE,
  HANTEO_EVIDENCE_DESCRIPTOR,
  HANTEO_PROVIDER_EVIDENCE,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildAlbumProviderAuthorizationRequestManifest,
  ALBUM_PROVIDER_AUTHORIZATION_REQUEST_VERSION,
} from '../lib/product/readiness/albumProviderAuthorizationRequestManifest';

test('Circle authorization request pins all current rights states without granting anything', () => {
  const request =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: CIRCLE_EVIDENCE_DESCRIPTOR,
      providerEvidence: CIRCLE_PROVIDER_EVIDENCE,
    });

  assert.equal(
    request.contractVersion,
    ALBUM_PROVIDER_AUTHORIZATION_REQUEST_VERSION,
  );
  assert.equal(request.providerId, 'circle-chart');
  assert.equal(request.slots.length, 8);

  const states = Object.fromEntries(
    request.slots.map(slot => [
      slot.dimension,
      slot.currentAuthorizationState,
    ]),
  );
  assert.deepEqual(states, {
    acquisitionState: 'review-required',
    automationState: 'review-required',
    rawStorageState: 'review-required',
    normalizedStorageState: 'review-required',
    retentionState: 'unknown',
    commercialUseState: 'contract-required',
    derivedPublicationState: 'review-required',
    rawRedistributionState: 'blocked',
  });

  assert.deepEqual(
    request.requiredProductionDimensions,
    [
      'acquisitionState',
      'automationState',
      'normalizedStorageState',
      'retentionState',
      'commercialUseState',
      'derivedPublicationState',
    ],
  );
  assert.deepEqual(
    request.trackedNonRequiredDimensions,
    ['rawStorageState', 'rawRedistributionState'],
  );

  for (const slot of request.slots) {
    assert.equal(slot.requestedDecision, null);
    assert.deepEqual(slot.submittedEvidenceRefs, []);
    assert.deepEqual(slot.submittedConditionRefs, []);
    assert.equal(slot.reviewerRef, null);
    assert.equal(slot.reviewedAt, null);
    assert.equal(slot.submissionReady, false);
  }

  assert.deepEqual(
    request.rightsReviewReferences.map(reference => reference.referenceId),
    [
      'circle:site-footer-ai-ml-tdm-restriction',
      'circle:chart-partnership-request',
    ],
  );
  assert.ok(
    request.rightsReviewReferences.every(
      reference =>
        reference.authorizationStateNotInferred === true
        && /^https:\/\//.test(reference.sourceUrl),
    ),
  );

  assert.equal(request.requestContainsAuthorizationDecision, false);
  assert.equal(request.requestContainsProductionApproval, false);
  assert.equal(request.authorizationRecordsMaterialized, false);
  assert.equal(request.technicalCapabilityImpliesAuthorization, false);
  assert.equal(request.autoAuthorized, false);
  assert.equal(request.productionAuthorizationSatisfied, false);
  assert.equal(request.productionAllowed, false);
  assert.equal(request.publicationAuthorized, false);
  assert.equal(request.commercialRightsCleared, false);
});

test('Hanteo authorization request has the same eight rights questions and remains default-off', () => {
  const request =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: HANTEO_EVIDENCE_DESCRIPTOR,
      providerEvidence: HANTEO_PROVIDER_EVIDENCE,
    });

  assert.equal(request.providerId, 'hanteo-chart');
  assert.equal(request.slots.length, 8);
  assert.equal(request.technicalReadiness, 'adapter-ready');
  assert.ok(request.officialEvidenceUrls.length >= 2);
  assert.ok(
    request.currentBlockers.includes(
      'storage-and-publication-rights-review-required',
    ),
  );
  assert.equal(
    request.slots.find(
      slot => slot.dimension === 'commercialUseState',
    )?.currentAuthorizationState,
    'contract-required',
  );
  assert.equal(
    request.slots.find(
      slot => slot.dimension === 'rawRedistributionState',
    )?.currentAuthorizationState,
    'blocked',
  );
  assert.deepEqual(
    request.rightsReviewReferences.map(reference => reference.referenceId),
    ['hanteo:sales-data-copyright-notice'],
  );
  assert.equal(
    request.rightsReviewReferences[0]?.kind,
    'official-restriction-notice',
  );
  assert.equal(
    request.rightsReviewReferences[0]?.authorizationStateNotInferred,
    true,
  );
  assert.equal(request.productionAllowed, false);
  assert.equal(request.commercialRightsCleared, false);
});

test('authorization request ID is deterministic for the exact provider rights target', () => {
  const first =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: CIRCLE_EVIDENCE_DESCRIPTOR,
      providerEvidence: CIRCLE_PROVIDER_EVIDENCE,
    });
  const second =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: CIRCLE_EVIDENCE_DESCRIPTOR,
      providerEvidence: CIRCLE_PROVIDER_EVIDENCE,
    });

  assert.equal(first.requestId, second.requestId);
  assert.equal(first.targetFingerprint, second.targetFingerprint);
});

test('provider evidence from a different provider cannot be attached to the request', () => {
  assert.throws(
    () =>
      buildAlbumProviderAuthorizationRequestManifest({
        descriptor: CIRCLE_EVIDENCE_DESCRIPTOR,
        providerEvidence: HANTEO_PROVIDER_EVIDENCE,
      }),
    /authorization_request_provider_mismatch/,
  );
});

test('technical qualification evidence URLs remain review references, not rights evidence', () => {
  const request =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: CIRCLE_EVIDENCE_DESCRIPTOR,
      providerEvidence: CIRCLE_PROVIDER_EVIDENCE,
    });

  assert.deepEqual(
    new Set(request.officialEvidenceUrls),
    new Set(CIRCLE_PROVIDER_EVIDENCE.officialEvidenceUrls),
  );
  assert.ok(
    request.slots.every(
      slot => slot.submittedEvidenceRefs.length === 0,
    ),
  );
  assert.equal(
    request.reviewerMustSupplyEvidenceRefsForGrantedState,
    true,
  );
  assert.equal(
    request.reviewerMustSupplyConditionRefsForConditionalState,
    true,
  );
});


test('official policy references change the request fingerprint but never populate authorization evidence slots', () => {
  const request =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: HANTEO_EVIDENCE_DESCRIPTOR,
      providerEvidence: HANTEO_PROVIDER_EVIDENCE,
    });

  assert.ok(request.rightsReviewReferences.length > 0);
  assert.ok(
    request.rightsReviewReferences.every(
      reference => reference.observedOn === '2026-10-02',
    ),
  );
  assert.ok(
    request.slots.every(
      slot =>
        slot.submittedEvidenceRefs.length === 0
        && slot.submittedConditionRefs.length === 0
        && slot.requestedDecision === null,
    ),
  );
  assert.equal(request.authorizationRecordsMaterialized, false);
  assert.equal(request.productionAuthorizationSatisfied, false);
});
