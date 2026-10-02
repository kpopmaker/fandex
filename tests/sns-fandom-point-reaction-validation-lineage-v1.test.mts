import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSnsFandomReactionValidationLineage,
  type SnsFandomReactionValidationLineageEntry,
} from '../lib/intelligence/snsFandomPointReactionValidationLineage';

function entry(
  overrides: Partial<SnsFandomReactionValidationLineageEntry> = {},
): SnsFandomReactionValidationLineageEntry {
  const evidenceRef = 'evidence://youtube/artist-a/video-a/view-count';
  const observedAt = '2026-09-08T00:00:00.000Z';
  const collectedAt = '2026-09-08T00:01:00.000Z';
  const observationId = 'artist-a:video-a:youtube.video.view-count';

  const base: SnsFandomReactionValidationLineageEntry = {
    canonicalArtistId: 'artist-a',
    observationId,
    collectionRun: {
      manifestVersion: 'sns-fandom-collection-run-manifest-v1',
      runId: 'run-a',
      providerId: 'youtube-data-api',
      adapterVersion: 'youtube-adapter-v1',
      approvalEvidenceRef: 'evidence://youtube/approval/v1',
      rightsState: 'authorized',
      collectionState: 'completed',
      startedAt: '2026-09-08T00:00:30.000Z',
      completedAt: collectedAt,
      observationCount: 1,
      evidenceRefs: [evidenceRef],
      failureReasons: [],
    },
    rawRecord: {
      schemaVersion: 'sns-fandom-youtube-raw-collection-schema-v1',
      provider: 'youtube-data-api',
      providerResourceId: 'video-a',
      channelId: 'UC-artist-a',
      artistIdentityRef: 'identity://artist-a',
      observationWindow: {
        startAt: observedAt,
        endAt: observedAt,
      },
      observedAt,
      collectedAt,
      metrics: {
        viewCount: '1000',
        likeCount: '100',
        commentCount: '20',
      },
      rightsState: 'authorized-and-collectable',
      evidenceRefs: [evidenceRef],
    },
    historicalSnapshot: {
      contractVersion: 'sns-fandom-historical-snapshot-manifest-v1',
      snapshotId: 'snapshot-a',
      providerId: 'youtube-data-api',
      artistIdentityRef: 'identity://artist-a',
      observationWindow: {
        start: observedAt,
        end: observedAt,
      },
      collectionTimestamp: collectedAt,
      observationTimestampSource: 'provider-observation-time',
      state: 'validated',
      lineage: {
        providerResponseRef: evidenceRef,
        adapterVersion: 'youtube-adapter-v1',
        evidenceRefs: [evidenceRef],
      },
      revision: {
        previousSnapshotId: null,
        supersedesSnapshotId: null,
        revisionReason: null,
      },
      eligibility: {
        usableForMethodologyValidation: true,
        usableForScoring: false,
      },
    },
    revisionEvent: {
      revisionId: 'revision-a',
      observationId,
      providerId: 'youtube-data-api',
      previousRevisionId: null,
      revisionType: 'initial-capture',
      observedAt,
      collectedAt,
      reason: 'initial provider capture',
      evidenceRefs: [evidenceRef],
    },
  };

  return {
    ...base,
    ...overrides,
  };
}

test('complete collection-to-revision lineage is methodology-validation eligible', () => {
  const result = buildSnsFandomReactionValidationLineage([entry()]);

  assert.equal(result.state, 'lineage-ready');
  assert.equal(result.methodologyValidationEligible, true);
  assert.equal(result.distinctObservationCount, 1);
  assert.equal(result.distinctCollectionRunCount, 1);
  assert.equal(result.distinctSnapshotCount, 1);
  assert.equal(result.distinctRevisionCount, 1);
  assert.equal(result.members[0]?.providerResourceId, 'video-a');
  assert.equal(result.members[0]?.rawMetrics.viewCount, '1000');
  assert.deepEqual(result.blockers, []);
});

test('collection run and raw evidence must be connected', () => {
  const base = entry();
  const result = buildSnsFandomReactionValidationLineage([
    entry({
      collectionRun: {
        ...base.collectionRun,
        evidenceRefs: ['evidence://other/run'],
      },
    }),
  ]);

  assert.equal(result.state, 'lineage-blocked');
  assert.equal(result.methodologyValidationEligible, false);
  assert.ok(
    result.blockers.includes(
      'reaction-validation-lineage-run-raw-evidence-disconnected',
    ),
  );
});

test('raw and historical snapshot evidence must be connected', () => {
  const base = entry();
  const result = buildSnsFandomReactionValidationLineage([
    entry({
      historicalSnapshot: {
        ...base.historicalSnapshot,
        lineage: {
          ...base.historicalSnapshot.lineage,
          evidenceRefs: ['evidence://other/snapshot'],
        },
      },
    }),
  ]);

  assert.equal(result.state, 'lineage-blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-validation-lineage-raw-snapshot-evidence-disconnected',
    ),
  );
});

test('snapshot and revision evidence must be connected', () => {
  const base = entry();
  const result = buildSnsFandomReactionValidationLineage([
    entry({
      revisionEvent: {
        ...base.revisionEvent,
        evidenceRefs: ['evidence://other/revision'],
      },
    }),
  ]);

  assert.equal(result.state, 'lineage-blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-validation-lineage-snapshot-revision-evidence-disconnected',
    ),
  );
});

test('observation and raw provider times must remain identical through revision lineage', () => {
  const base = entry();
  const result = buildSnsFandomReactionValidationLineage([
    entry({
      revisionEvent: {
        ...base.revisionEvent,
        observedAt: '2026-09-08T00:05:00.000Z',
      },
    }),
  ]);

  assert.equal(result.state, 'lineage-blocked');
  assert.ok(
    result.blockers.includes('reaction-validation-lineage-time-mismatch'),
  );
});

test('rights-blocked raw records cannot enter methodology validation lineage', () => {
  const base = entry();
  const result = buildSnsFandomReactionValidationLineage([
    entry({
      rawRecord: {
        ...base.rawRecord,
        rightsState: 'blocked-by-rights',
      },
    }),
  ]);

  assert.equal(result.state, 'lineage-blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-validation-lineage-raw-record-ineligible',
    ),
  );
});

test('duplicate observation lineage entries fail closed', () => {
  const result = buildSnsFandomReactionValidationLineage([
    entry(),
    entry({
      collectionRun: {
        ...entry().collectionRun,
        runId: 'run-b',
      },
      historicalSnapshot: {
        ...entry().historicalSnapshot,
        snapshotId: 'snapshot-b',
      },
      revisionEvent: {
        ...entry().revisionEvent,
        revisionId: 'revision-b',
      },
    }),
  ]);

  assert.equal(result.state, 'lineage-blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-validation-lineage-observation-duplicate',
    ),
  );
});
