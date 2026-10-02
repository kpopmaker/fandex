import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSnsFandomProspectiveContentEnrollment,
  reconcileSnsFandomProspectiveEnrollmentWithFinalManifest,
  type SnsFandomProspectiveEnrollmentInput,
} from '../lib/intelligence/snsFandomPointReactionProspectiveContentEnrollment';
import {
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

const AGE_7D = 7 * 24 * 60 * 60 * 1000;

function enrollmentInput(
  overrides: Partial<SnsFandomProspectiveEnrollmentInput> = {},
): SnsFandomProspectiveEnrollmentInput {
  return {
    enrollmentId: 'prospective-iu-october-v1',
    evaluatedAt: '2026-10-10T00:00:00.000Z',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    canonicalArtistId: 'iu',
    youtubeChannelId: 'UC-iu',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    selectionRule: 'official-channel-all-uploads-in-published-window',
    windowStart: '2026-10-01T00:00:00.000Z',
    windowEnd: '2026-10-31T23:59:59.999Z',
    uploadsPlaylistId: 'UU-iu',
    providerEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
    ],
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: 'evidence://methodology/target-age-7d',
      },
    ],
    discoverySnapshots: [
      {
        observedAt: '2026-10-02T00:00:00.000Z',
        pageCount: 1,
        terminalNextPageToken: null,
        terminalPageEvidenceRef:
          'evidence://youtube/iu/uploads/2026-10-02/terminal',
        evidenceRef: 'evidence://youtube/iu/uploads/2026-10-02',
        items: [
          {
            videoId: 'video-a',
            publishedAt: '2026-10-01T12:00:00.000Z',
            evidenceRef: 'evidence://youtube/video-a/discovery',
          },
        ],
      },
      {
        observedAt: '2026-10-10T00:00:00.000Z',
        pageCount: 1,
        terminalNextPageToken: null,
        terminalPageEvidenceRef:
          'evidence://youtube/iu/uploads/2026-10-10/terminal',
        evidenceRef: 'evidence://youtube/iu/uploads/2026-10-10',
        items: [
          {
            videoId: 'video-a',
            publishedAt: '2026-10-01T12:00:00.000Z',
            evidenceRef: 'evidence://youtube/video-a/discovery',
          },
          {
            videoId: 'video-b',
            publishedAt: '2026-10-09T12:00:00.000Z',
            evidenceRef: 'evidence://youtube/video-b/discovery',
          },
        ],
      },
    ],
    ...overrides,
  };
}

function finalManifest(
  items: SnsFandomYoutubeContentManifest['items'] = [
    {
      videoId: 'video-a',
      publishedAt: '2026-10-01T12:00:00.000Z',
    },
    {
      videoId: 'video-b',
      publishedAt: '2026-10-09T12:00:00.000Z',
    },
  ],
): SnsFandomYoutubeContentManifest {
  return {
    contractVersion: 'sns-fandom-youtube-content-manifest-v1',
    canonicalArtistId: 'iu',
    youtubeChannelId: 'UC-iu',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    selectionRule: 'official-channel-all-uploads-in-published-window',
    windowStart: '2026-10-01T00:00:00.000Z',
    windowEnd: '2026-10-31T23:59:59.999Z',
    uploadsPlaylistId: 'UU-iu',
    providerEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
    ],
    pagination: {
      pageCount: 2,
      terminalNextPageToken: null,
      terminalPageEvidenceRef:
        'evidence://youtube/iu/uploads/october/terminal',
    },
    items,
    evidenceRef: 'evidence://youtube/iu/uploads/october/final',
  };
}

test('open publication window can provisionally enroll discovered official uploads without claiming a complete universe', () => {
  const result = buildSnsFandomProspectiveContentEnrollment(
    enrollmentInput(),
  );

  assert.equal(result.state, 'enrollment-active');
  assert.deepEqual(result.provisionalVideoIds, ['video-a', 'video-b']);
  assert.equal(result.contentUniverseComplete, false);
  assert.equal(result.finalManifestReconciliationRequired, true);
  assert.equal(result.discoveryCadenceMilliseconds, null);
  assert.equal(result.arbitraryDiscoveryCadenceApplied, false);
  assert.equal(result.arbitraryTargetAgeDefaultApplied, false);
  assert.equal(result.automaticBackfillAllowed, false);
  assert.equal(result.pendingTaskCount, 2);
  assert.equal(result.missedTaskCount, 0);

  assert.deepEqual(
    result.tasks.map((task) => task.captureAt),
    [
      '2026-10-08T12:00:00.000Z',
      '2026-10-16T12:00:00.000Z',
    ],
  );
});

test('prospective ops packet is reviewable but cannot authorize scheduler, activation, collection, or deploy mutations', () => {
  const result = buildSnsFandomProspectiveContentEnrollment(
    enrollmentInput(),
  );

  assert.equal(result.opsPacket.state, 'ops-review-ready');
  assert.equal(result.opsPacket.providerGrantRequired, true);
  assert.equal(result.opsPacket.providerApprovalValidated, false);
  assert.equal(result.opsPacket.executionTimeRevalidationRequired, true);
  assert.equal(result.opsPacket.schedulerMutationAllowed, false);
  assert.equal(result.opsPacket.activationMutationAllowed, false);
  assert.equal(result.opsPacket.collectionExecutionAuthorized, false);
  assert.equal(result.opsPacket.deploymentAuthorized, false);
  assert.equal(result.opsPacket.pendingTasks.length, 1);
  assert.equal(result.opsPacket.pendingTasks[0]?.videoId, 'video-b');
});

test('target age still requires external methodology rationale and no default is invented', () => {
  const input = enrollmentInput({
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: '',
      },
    ],
  });

  const result = buildSnsFandomProspectiveContentEnrollment(input);

  assert.equal(result.state, 'blocked');
  assert.equal(result.arbitraryTargetAgeDefaultApplied, false);
  assert.ok(
    result.blockers.includes(
      'prospective-enrollment-target-age-rationale-missing',
    ),
  );
});

test('content discovered only after its target-age capture time is fail-closed and never backfilled', () => {
  const input = enrollmentInput({
    evaluatedAt: '2026-10-20T00:00:00.000Z',
    discoverySnapshots: [
      {
        observedAt: '2026-10-20T00:00:00.000Z',
        pageCount: 1,
        terminalNextPageToken: null,
        terminalPageEvidenceRef:
          'evidence://youtube/iu/uploads/2026-10-20/terminal',
        evidenceRef: 'evidence://youtube/iu/uploads/2026-10-20',
        items: [
          {
            videoId: 'video-late',
            publishedAt: '2026-10-01T12:00:00.000Z',
            evidenceRef: 'evidence://youtube/video-late/discovery',
          },
        ],
      },
    ],
  });

  const result = buildSnsFandomProspectiveContentEnrollment(input);

  assert.equal(result.state, 'blocked');
  assert.equal(result.missedTaskCount, 1);
  assert.equal(result.automaticBackfillAllowed, false);
  assert.equal(result.tasks[0]?.state, 'missed-before-enrollment');
  assert.ok(
    result.blockers.includes(
      'prospective-enrollment-target-age-missed-before-enrollment',
    ),
  );
});

test('finalized manifest exact-match reconciles the provisional enrollment but still does not bypass receipt and lineage gates', () => {
  const enrollment = buildSnsFandomProspectiveContentEnrollment(
    enrollmentInput(),
  );

  const result =
    reconcileSnsFandomProspectiveEnrollmentWithFinalManifest({
      enrollment,
      finalManifest: finalManifest(),
      reconciledAt: '2026-11-01T00:00:00.000Z',
    });

  assert.equal(result.state, 'reconciliation-ready');
  assert.equal(result.contentUniverseReconciled, true);
  assert.equal(
    result.prospectiveContentUniverseEligibleForDatasetAssembly,
    true,
  );
  assert.equal(result.validationDatasetUseAllowed, false);
  assert.equal(result.automaticBackfillAllowed, false);
  assert.deepEqual(result.missingFromEnrollmentVideoIds, []);
  assert.deepEqual(result.absentFromFinalManifestVideoIds, []);
});

test('a final-manifest video that was never prospectively enrolled blocks reconciliation instead of being silently added', () => {
  const enrollment = buildSnsFandomProspectiveContentEnrollment(
    enrollmentInput(),
  );
  const manifest = finalManifest([
    ...finalManifest().items,
    {
      videoId: 'video-c-missed-enrollment',
      publishedAt: '2026-10-20T12:00:00.000Z',
    },
  ]);

  const result =
    reconcileSnsFandomProspectiveEnrollmentWithFinalManifest({
      enrollment,
      finalManifest: manifest,
      reconciledAt: '2026-11-01T00:00:00.000Z',
    });

  assert.equal(result.state, 'blocked');
  assert.equal(result.contentUniverseReconciled, false);
  assert.equal(
    result.prospectiveContentUniverseEligibleForDatasetAssembly,
    false,
  );
  assert.equal(result.automaticBackfillAllowed, false);
  assert.deepEqual(
    result.missingFromEnrollmentVideoIds,
    ['video-c-missed-enrollment'],
  );
  assert.ok(
    result.blockers.includes(
      'prospective-enrollment-final-manifest-set-mismatch',
    ),
  );
});

test('reconciliation cannot happen before the declared publication window is finalized', () => {
  const enrollment = buildSnsFandomProspectiveContentEnrollment(
    enrollmentInput(),
  );

  const result =
    reconcileSnsFandomProspectiveEnrollmentWithFinalManifest({
      enrollment,
      finalManifest: finalManifest(),
      reconciledAt: '2026-10-20T00:00:00.000Z',
    });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'prospective-enrollment-final-manifest-window-not-finalized',
    ),
  );
});


test('prospective enrollment evaluation must be anchored to the latest discovery snapshot', () => {
  const result = buildSnsFandomProspectiveContentEnrollment(
    enrollmentInput({
      evaluatedAt: '2026-10-11T00:00:00.000Z',
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'prospective-enrollment-evaluation-not-latest-discovery',
    ),
  );
});

test('final reconciliation binds the exact uploads playlist identity', () => {
  const enrollment = buildSnsFandomProspectiveContentEnrollment(
    enrollmentInput(),
  );
  const mismatched = {
    ...finalManifest(),
    uploadsPlaylistId: 'UU-different',
  };

  const result =
    reconcileSnsFandomProspectiveEnrollmentWithFinalManifest({
      enrollment,
      finalManifest: mismatched,
      reconciledAt: '2026-11-01T00:00:00.000Z',
    });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'prospective-enrollment-final-manifest-scope-mismatch',
    ),
  );
});
