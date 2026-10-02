import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomPointCollectorActivationTransition,
} from '../lib/intelligence/snsFandomPointCollectorActivationTransition';

const readyInput = {
  providerApprovalGranted: true,
  approvalEvidenceComplete: true,
  rightsState: 'authorized',
  adapterRegistered: true,
  observationContractCompatible: true,
} as const;

test('collector activation requires all provider gates', () => {
  const result = evaluateSnsFandomPointCollectorActivationTransition(readyInput);

  assert.equal(result.state, 'approved-ready');
  assert.equal(result.collectionAuthorized, false);
});

test('missing provider approval blocks activation', () => {
  const result = evaluateSnsFandomPointCollectorActivationTransition({
    ...readyInput,
    providerApprovalGranted: false,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.collectionAuthorized, false);
  assert.ok(result.blockers.includes('provider-approval-not-granted'));
});

test('submission acknowledgement is not provider approval', () => {
  const result = evaluateSnsFandomPointCollectorActivationTransition({
    ...readyInput,
    providerApprovalGranted: false,
    approvalEvidenceComplete: false,
  });

  assert.equal(result.collectionAuthorized, false);
});

test('adapter availability cannot bypass rights gate', () => {
  const result = evaluateSnsFandomPointCollectorActivationTransition({
    ...readyInput,
    rightsState: 'blocked-by-rights',
  });

  assert.equal(result.collectionAuthorized, false);
  assert.ok(result.blockers.includes('rights-not-authorized'));
});
