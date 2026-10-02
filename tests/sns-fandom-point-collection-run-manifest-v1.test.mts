import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateSnsFandomCollectionRunManifest,
  type SnsFandomCollectionRunManifest,
} from '../lib/intelligence/snsFandomPointCollectionRunManifest';

function manifest(
  overrides: Partial<SnsFandomCollectionRunManifest> = {},
): SnsFandomCollectionRunManifest {
  return {
    manifestVersion: 'sns-fandom-collection-run-manifest-v1',
    runId: 'run-youtube-1',
    providerId: 'youtube-data-api',
    adapterVersion: 'youtube-adapter-v1',
    approvalEvidenceRef: 'approval://youtube/grant',
    rightsState: 'authorized',
    collectionState: 'completed',
    startedAt: '2026-10-01T23:55:00.000Z',
    completedAt: '2026-10-02T00:00:00.000Z',
    observationCount: 12,
    evidenceRefs: ['evidence://youtube/run-1'],
    failureReasons: [],
    ...overrides,
  };
}

test('completed collection run requires approval evidence and authorized rights', () => {
  const result = validateSnsFandomCollectionRunManifest(manifest());

  assert.equal(result.valid, true);
  assert.deepEqual(result.blockers, []);
});

test('collection run without provider approval evidence is rejected', () => {
  const result = validateSnsFandomCollectionRunManifest(
    manifest({ approvalEvidenceRef: null }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.includes('collection-approval-evidence-missing'),
  );
});

test('completed state cannot contain failed collection reasons', () => {
  const result = validateSnsFandomCollectionRunManifest(
    manifest({ failureReasons: ['provider-timeout'] }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('collection-run-has-failures'));
});

test('unknown rights state cannot start production collection', () => {
  const result = validateSnsFandomCollectionRunManifest(
    manifest({
      rightsState: 'unknown',
      collectionState: 'running',
      completedAt: null,
      observationCount: 0,
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.includes('collection-rights-not-authorized'),
  );
});
