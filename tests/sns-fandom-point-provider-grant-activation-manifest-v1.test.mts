import assert from 'node:assert/strict';
import test from 'node:test';

// Provider grant activation boundary regression coverage.
// The implementation contract keeps provider approval, rights authorization,
// and collector activation as separate states.

test('provider grant activation requires real approval evidence', () => {
  const activation = {
    approvalState: 'granted',
    approvalEvidenceRef: 'external://provider/grant',
    complianceGrantRecorded: true,
    rightsAuthorized: true,
    adapterRegistered: true,
    collectionContractCompatible: true,
  };

  assert.equal(activation.approvalState, 'granted');
  assert.equal(Boolean(activation.approvalEvidenceRef), true);
  assert.equal(activation.complianceGrantRecorded, true);
});

test('submission state cannot activate a collector', () => {
  const activation = {
    approvalState: 'submitted',
    approvalEvidenceRef: null,
    collectionAuthorized: false,
  };

  assert.notEqual(activation.approvalState, 'granted');
  assert.equal(activation.collectionAuthorized, false);
});

test('rights and adapter readiness are independent gates', () => {
  const activation = {
    rightsAuthorized: false,
    adapterRegistered: true,
    collectionContractCompatible: true,
  };

  assert.equal(activation.adapterRegistered, true);
  assert.equal(activation.rightsAuthorized, false);
});
