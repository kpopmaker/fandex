import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomCollectorActivationTransition,
} from '../lib/intelligence/snsFandomPointCollectorActivationTransition';

const readyInput = {
  providerId: 'youtube-data-api',
  providerApprovalGranted: true,
  approvalEvidenceComplete: true,
  rightsState: 'authorized',
  adapterRegistered: true,
  observationContractCompatible: true,
  collectionRequested: false,
} as const;

test('collector activation requires all provider gates', () => {
  const result = evaluateSnsFandomCollectorActivationTransition(readyInput);

  assert.equal(result.providerId, 'youtube-data-api');
  assert.equal(result.state, 'approved-ready');
  assert.equal(result.collectionAuthorized, false);
});

test('missing provider approval blocks activation', () => {
  const result = evaluateSnsFandomCollectorActivationTransition({
    ...readyInput,
    providerApprovalGranted: false,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.collectionAuthorized, false);
  assert.ok(result.blockers.includes('provider-approval-not-granted'));
});

test('submission acknowledgement is not provider approval', () => {
  const result = evaluateSnsFandomCollectorActivationTransition({
    ...readyInput,
    providerApprovalGranted: false,
    approvalEvidenceComplete: false,
  });

  assert.equal(result.collectionAuthorized, false);
});

test('adapter availability cannot bypass rights gate', () => {
  const result = evaluateSnsFandomCollectorActivationTransition({
    ...readyInput,
    rightsState: 'blocked',
  });

  assert.equal(result.collectionAuthorized, false);
  assert.ok(
    result.blockers.includes('provider-rights-not-authorized'),
  );
});

test('collection request activates only after every gate is satisfied', () => {
  const result = evaluateSnsFandomCollectorActivationTransition({
    ...readyInput,
    collectionRequested: true,
  });

  assert.equal(result.state, 'activated');
  assert.equal(result.collectionAuthorized, true);
});
