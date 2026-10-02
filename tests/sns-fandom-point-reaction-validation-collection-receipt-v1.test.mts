import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomReactionCollectionReceipts,
  type SnsFandomReactionCollectionExecutionReceipt,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionReceipt';
import {
  type SnsFandomReactionCollectionHandoffResult,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionHandoff';

const CLIENT = 'gcp-project-fandex-youtube-primary';

function handoff(
  overrides: Partial<SnsFandomReactionCollectionHandoffResult> = {},
): SnsFandomReactionCollectionHandoffResult {
  return {
    contractVersion:
      'sns-fandom-reaction-validation-collection-handoff-v1',
    state: 'production-ops-handoff-ready',
    planId: 'plan-v1',
    evaluatedAt: '2026-10-02T00:00:00.000Z',
    providerId: 'youtube-data-api',
    providerClientRef: CLIENT,
    approvalEvidenceRef: 'evidence://youtube/grant/v1',
    pendingTasks: [
      {
        taskId: 'task-a',
        datasetId: 'dataset-age-7d',
        canonicalArtistId: 'artist-a',
        youtubeChannelId: 'UC-artist-a',
        providerClientRef: CLIENT,
        videoId: 'artist-a-video-1',
        metricId: 'youtube.video.view-count',
        captureAt: '2026-10-08T12:00:00.000Z',
        contentSelectionEvidenceRef:
          'evidence://youtube/artist-a/window',
        state: 'awaiting-production-ops',
      },
      {
        taskId: 'task-b',
        datasetId: 'dataset-age-7d',
        canonicalArtistId: 'artist-b',
        youtubeChannelId: 'UC-artist-b',
        providerClientRef: CLIENT,
        videoId: 'artist-b-video-1',
        metricId: 'youtube.video.view-count',
        captureAt: '2026-10-08T18:00:00.000Z',
        contentSelectionEvidenceRef:
          'evidence://youtube/artist-b/window',
        state: 'awaiting-production-ops',
      },
    ],
    alreadyCapturedTaskCount: 0,
    productionOpsHandoffReady: true,
    providerGrantValidated: true,
    collectorApprovedReady: true,
    executionTimeRevalidationRequired: true,
    schedulerMutationAllowed: false,
    activationMutationAllowed: false,
    collectionExecutionAuthorized: false,
    deploymentAuthorized: false,
    blockers: [],
    ...overrides,
  };
}

function receipt(
  taskId: 'task-a' | 'task-b',
  overrides: Partial<SnsFandomReactionCollectionExecutionReceipt> = {},
): SnsFandomReactionCollectionExecutionReceipt {
  const isA = taskId === 'task-a';
  return {
    taskId,
    datasetId: 'dataset-age-7d',
    canonicalArtistId: isA ? 'artist-a' : 'artist-b',
    videoId: isA ? 'artist-a-video-1' : 'artist-b-video-1',
    metricId: 'youtube.video.view-count',
    providerId: 'youtube-data-api',
    providerClientRef: CLIENT,
    state: 'succeeded',
    observedAt: isA
      ? '2026-10-08T12:00:00.000Z'
      : '2026-10-08T18:00:00.000Z',
    collectedAt: isA
      ? '2026-10-08T12:00:01.000Z'
      : '2026-10-08T18:00:01.000Z',
    observationId: 'observation-' + taskId,
    collectionRunId: 'run-' + taskId,
    evidenceRef: 'evidence://collection/' + taskId,
    failureReason: null,
    ...overrides,
  };
}

test('exact planned captures complete operational collection but still require lineage and revision validation', () => {
  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff(),
    receipts: [receipt('task-a'), receipt('task-b')],
  });

  assert.equal(result.state, 'capture-complete-lineage-pending');
  assert.equal(result.expectedTaskCount, 2);
  assert.equal(result.completedMemberCount, 2);
  assert.equal(result.exactTargetAgeCaptureCount, 2);
  assert.equal(result.deviatedCaptureCount, 0);
  assert.equal(result.targetAgeDatasetAssemblyEligible, true);
  assert.equal(result.lineageValidationStillRequired, true);
  assert.equal(result.revisionAuditStillRequired, true);
  assert.equal(result.timingToleranceApplied, false);
  assert.equal(result.interpolationApplied, false);
  assert.equal(result.extrapolationApplied, false);
  assert.deepEqual(result.blockers, []);
});

test('timing deviation is recorded but never silently accepted through an arbitrary tolerance', () => {
  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff(),
    receipts: [
      receipt('task-a', {
        observedAt: '2026-10-08T12:00:02.000Z',
        collectedAt: '2026-10-08T12:00:03.000Z',
      }),
      receipt('task-b'),
    ],
  });

  assert.equal(
    result.state,
    'capture-complete-timing-review-required',
  );
  assert.equal(result.targetAgeDatasetAssemblyEligible, false);
  assert.equal(result.exactTargetAgeCaptureCount, 1);
  assert.equal(result.deviatedCaptureCount, 1);
  assert.equal(
    result.members.find((member) => member.taskId === 'task-a')
      ?.timingDeviationMilliseconds,
    2000,
  );
  assert.equal(result.timingToleranceApplied, false);
  assert.ok(
    result.blockers.includes(
      'reaction-collection-receipt-target-age-timing-deviation-unapproved',
    ),
  );
});

test('missing planned receipt blocks collection completion', () => {
  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff(),
    receipts: [receipt('task-a')],
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.targetAgeDatasetAssemblyEligible, false);
  assert.ok(
    result.blockers.includes('reaction-collection-receipt-task-missing'),
  );
  assert.ok(
    result.blockers.includes('reaction-collection-receipt-count-mismatch'),
  );
});

test('unexpected receipt cannot be injected into a handoff', () => {
  const extra = {
    ...receipt('task-a'),
    taskId: 'task-extra',
    canonicalArtistId: 'artist-x',
    videoId: 'artist-x-video-1',
    observationId: 'observation-extra',
    collectionRunId: 'run-extra',
    evidenceRef: 'evidence://collection/extra',
  } as SnsFandomReactionCollectionExecutionReceipt;

  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff(),
    receipts: [receipt('task-a'), receipt('task-b'), extra],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-receipt-unexpected-task',
    ),
  );
  assert.ok(
    result.blockers.includes('reaction-collection-receipt-count-mismatch'),
  );
});

test('failed collection receipt requires a failure reason and cannot create a member', () => {
  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff(),
    receipts: [
      receipt('task-a', {
        state: 'failed',
        observedAt: null,
        collectedAt: null,
        observationId: null,
        collectionRunId: null,
        evidenceRef: null,
        failureReason: null,
      }),
      receipt('task-b'),
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes('reaction-collection-receipt-task-failed'),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-collection-receipt-failure-reason-missing',
    ),
  );
});

test('receipt must preserve exact task and provider-client binding', () => {
  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff(),
    receipts: [
      receipt('task-a', {
        providerClientRef: 'gcp-project-other',
      }),
      receipt('task-b'),
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-receipt-task-binding-mismatch',
    ),
  );
});

test('collection time cannot precede observation time', () => {
  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff(),
    receipts: [
      receipt('task-a', {
        collectedAt: '2026-10-08T11:59:59.000Z',
      }),
      receipt('task-b'),
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-receipt-collection-before-observation',
    ),
  );
});

test('receipts cannot bypass a non-ready Production Ops handoff', () => {
  const result = evaluateSnsFandomReactionCollectionReceipts({
    handoff: handoff({
      state: 'blocked',
      productionOpsHandoffReady: false,
      blockers: ['provider-grant-missing'],
    }),
    receipts: [receipt('task-a'), receipt('task-b')],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-receipt-handoff-not-ready',
    ),
  );
});
