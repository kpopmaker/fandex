import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateCollectionRunManifest,
} from '../lib/intelligence/snsFandomPointCollectionRunManifest';

test('completed collection run requires approval evidence and authorized rights', () => {
  const result = validateCollectionRunManifest({
    state: 'completed',
    approvalEvidenceRef: 'approval://youtube/grant',
    rightsState: 'authorized',
    observationCount: 12,
    completedAt: '2026-10-02T00:00:00.000Z',
    failureReasons: [],
  });

  assert.equal(result.valid, true);
});

test('collection run without provider approval evidence is rejected', () => {
  const result = validateCollectionRunManifest({
    state: 'completed',
    approvalEvidenceRef: null,
    rightsState: 'authorized',
    observationCount: 12,
    completedAt: '2026-10-02T00:00:00.000Z',
    failureReasons: [],
  });

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('approval-evidence-missing'));
});

test('completed state cannot contain failed collection reasons', () => {
  const result = validateCollectionRunManifest({
    state: 'completed',
    approvalEvidenceRef: 'approval://youtube/grant',
    rightsState: 'authorized',
    observationCount: 12,
    completedAt: '2026-10-02T00:00:00.000Z',
    failureReasons: ['provider-timeout'],
  });

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('completed-run-has-failures'));
});

test('unknown rights state cannot start production collection', () => {
  const result = validateCollectionRunManifest({
    state: 'running',
    approvalEvidenceRef: 'approval://youtube/grant',
    rightsState: 'unknown',
    observationCount: 0,
    completedAt: null,
    failureReasons: [],
  });

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('rights-state-not-authorized'));
});
