import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomCollectorActivationTransition,
} from '../lib/intelligence/snsFandomPointCollectorActivationTransition';
import {
  type SnsFandomProviderApprovalEvidence,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildSnsFandomProspectiveContentEnrollment,
  reconcileSnsFandomProspectiveEnrollmentWithFinalManifest,
} from '../lib/intelligence/snsFandomPointReactionProspectiveContentEnrollment';
import {
  bundleSnsFandomProspectiveReactionReceipts,
  type SnsFandomProspectiveReceiptBundleEntry,
} from '../lib/intelligence/snsFandomPointReactionProspectiveReceiptBundle';
import {
  buildSnsFandomProspectiveReactionCollectionHandoff,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionHandoff';
import {
  evaluateSnsFandomReactionCollectionReceipts,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionReceipt';
import {
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

const CLIENT = 'gcp-project-fandex-youtube-primary';
const AGE_7D = 7 * 24 * 60 * 60 * 1000;

function approval(): SnsFandomProviderApprovalEvidence {
  return {
    contractVersion: 'sns-fandom-provider-approval-evidence-v1',
    providerId: 'youtube-data-api',
    providerClientRef: CLIENT,
    state: 'approved',
    approvalClass: 'youtube-analytics-derived-metrics-data-storage',
    useCase: 'analytics-reporting',
    approvedDimensions: ['public-reaction-diffusion'],
    approvedMetricIds: ['youtube.video.view-count'],
    allowedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    approvedAt: '2026-10-01T00:00:00.000Z',
    validUntil: null,
    evidenceRef: 'evidence://youtube/provider-grant/v1',
    rights: {
      commercialProductUse: true,
      recurringAutomatedCollection: true,
      aggregateRetention: true,
      derivedMetricPublication: true,
    },
    retention: {
      statisticalDataMonths: 36,
      derivedMetricMonths: 36,
      nonStatisticalDataRefreshDays: 30,
    },
    youtubePolicyGrant: {
      complianceAuditPassed: true,
      analyticsReportingUseCaseAccepted: true,
      developerPoliciesAmendmentAccepted: true,
      additionalDerivedMetricsApproved: true,
      extendedStatisticalStorageApproved: true,
    },
  };
}

function collectorApprovedReady() {
  return evaluateSnsFandomCollectorActivationTransition({
    providerId: 'youtube-data-api',
    providerApprovalGranted: true,
    approvalEvidenceComplete: true,
    rightsState: 'authorized',
    adapterRegistered: true,
    observationContractCompatible: true,
    collectionRequested: false,
  });
}

function finalManifest(
  artistId: string,
  videoId: string,
  publishedAt: string,
  extraItems: SnsFandomYoutubeContentManifest['items'] = [],
): SnsFandomYoutubeContentManifest {
  return {
    contractVersion: 'sns-fandom-youtube-content-manifest-v1',
    canonicalArtistId: artistId,
    youtubeChannelId: 'UC-' + artistId,
    providerClientRef: CLIENT,
    selectionRule: 'official-channel-all-uploads-in-published-window',
    windowStart: '2026-10-01T00:00:00.000Z',
    windowEnd: '2026-10-31T23:59:59.999Z',
    uploadsPlaylistId: 'UU-' + artistId,
    providerEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
    ],
    pagination: {
      pageCount: 1,
      terminalNextPageToken: null,
      terminalPageEvidenceRef:
        'evidence://youtube/' + artistId + '/uploads/final/terminal',
    },
    items: [
      {
        videoId,
        publishedAt,
      },
      ...extraItems,
    ],
    evidenceRef:
      'evidence://youtube/' + artistId + '/uploads/final',
  };
}

function entry(
  artistId: string,
  publishedAt: string,
  observationId = 'obs-' + artistId,
): SnsFandomProspectiveReceiptBundleEntry {
  const videoId = artistId + '-video-1';
  const enrollment = buildSnsFandomProspectiveContentEnrollment({
    enrollmentId: 'prospective-' + artistId + '-october-v1',
    evaluatedAt: '2026-10-02T00:00:00.000Z',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    canonicalArtistId: artistId,
    youtubeChannelId: 'UC-' + artistId,
    providerClientRef: CLIENT,
    selectionRule: 'official-channel-all-uploads-in-published-window',
    windowStart: '2026-10-01T00:00:00.000Z',
    windowEnd: '2026-10-31T23:59:59.999Z',
    uploadsPlaylistId: 'UU-' + artistId,
    providerEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
    ],
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: 'evidence://methodology/age-7d',
      },
    ],
    discoverySnapshots: [
      {
        observedAt: '2026-10-02T00:00:00.000Z',
        pageCount: 1,
        terminalNextPageToken: null,
        terminalPageEvidenceRef:
          'evidence://youtube/' + artistId + '/uploads/2026-10-02/terminal',
        evidenceRef:
          'evidence://youtube/' + artistId + '/uploads/2026-10-02',
        items: [
          {
            videoId,
            publishedAt,
            evidenceRef:
              'evidence://youtube/' + videoId + '/discovery',
          },
        ],
      },
    ],
  });

  const handoff = buildSnsFandomProspectiveReactionCollectionHandoff({
    enrollment,
    providerApproval: approval(),
    collectorActivation: collectorApprovedReady(),
    evaluatedAt: '2026-10-02T00:00:00.000Z',
  });
  const task = handoff.pendingTasks[0];
  assert.ok(task);

  const receipt = evaluateSnsFandomReactionCollectionReceipts({
    handoff,
    receipts: [
      {
        taskId: task.taskId,
        datasetId: task.datasetId,
        canonicalArtistId: task.canonicalArtistId,
        videoId: task.videoId,
        metricId: task.metricId,
        providerId: 'youtube-data-api',
        providerClientRef: task.providerClientRef,
        state: 'succeeded',
        observedAt: task.captureAt,
        collectedAt: task.captureAt,
        observationId,
        collectionRunId: 'run-' + artistId + '-age-7d',
        evidenceRef:
          'evidence://youtube/' + videoId + '/capture-age-7d',
        failureReason: null,
      },
    ],
  });

  const reconciliation =
    reconcileSnsFandomProspectiveEnrollmentWithFinalManifest({
      enrollment,
      finalManifest: finalManifest(artistId, videoId, publishedAt),
      reconciledAt: '2026-11-01T00:00:00.000Z',
    });

  return {
    enrollment,
    reconciliation,
    receipts: [receipt],
  };
}

test('two reconciled artist enrollments bundle exact receipts into the existing multi-artist receipt shape', () => {
  const result = bundleSnsFandomProspectiveReactionReceipts({
    studyId: 'prospective-study-age-7d-v1',
    entries: [
      entry('artist-a', '2026-10-01T12:00:00.000Z'),
      entry('artist-b', '2026-10-01T18:00:00.000Z'),
    ],
  });

  assert.equal(result.state, 'receipt-bundle-ready');
  assert.deepEqual(result.canonicalArtistIds, ['artist-a', 'artist-b']);
  assert.equal(result.providerClientRef, CLIENT);
  assert.equal(result.metricId, 'youtube.video.view-count');
  assert.equal(result.construct, 'typical-content-reaction-intensity');
  assert.equal(result.expectedTaskCount, 2);
  assert.equal(result.bundledReceiptMemberCount, 2);
  assert.equal(result.multiArtistEvidenceRequired, true);
  assert.equal(result.automaticBackfillAllowed, false);
  assert.deepEqual(result.blockers, []);

  assert.ok(result.receipt);
  assert.equal(result.receipt.planId, 'prospective-study-age-7d-v1');
  assert.equal(result.receipt.state, 'capture-complete-lineage-pending');
  assert.equal(result.receipt.targetAgeDatasetAssemblyEligible, true);
  assert.equal(result.receipt.exactTargetAgeCaptureCount, 2);
  assert.equal(result.receipt.deviatedCaptureCount, 0);
  assert.equal(result.receipt.lineageValidationStillRequired, true);
  assert.equal(result.receipt.revisionAuditStillRequired, true);
});

test('single-artist evidence cannot masquerade as a multi-artist validation receipt', () => {
  const result = bundleSnsFandomProspectiveReactionReceipts({
    studyId: 'prospective-study-single-artist',
    entries: [
      entry('artist-a', '2026-10-01T12:00:00.000Z'),
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.receipt, null);
  assert.ok(
    result.blockers.includes(
      'prospective-receipt-bundle-multi-artist-evidence-insufficient',
    ),
  );
});

test('every prospectively enrolled task must have an exact receipt before bundling', () => {
  const artistA = entry('artist-a', '2026-10-01T12:00:00.000Z');
  const artistB = entry('artist-b', '2026-10-01T18:00:00.000Z');

  const result = bundleSnsFandomProspectiveReactionReceipts({
    studyId: 'prospective-study-missing-receipt',
    entries: [
      artistA,
      {
        ...artistB,
        receipts: [],
      },
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.receipt, null);
  assert.ok(
    result.blockers.includes(
      'prospective-receipt-bundle-enrollment-receipt-task-set-mismatch',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'prospective-receipt-bundle-study-task-set-mismatch',
    ),
  );
});

test('final content reconciliation is mandatory before receipt bundling', () => {
  const artistA = entry('artist-a', '2026-10-01T12:00:00.000Z');
  const artistB = entry('artist-b', '2026-10-01T18:00:00.000Z');
  const brokenReconciliation =
    reconcileSnsFandomProspectiveEnrollmentWithFinalManifest({
      enrollment: artistB.enrollment,
      finalManifest: finalManifest(
        'artist-b',
        'artist-b-video-1',
        '2026-10-01T18:00:00.000Z',
        [
          {
            videoId: 'artist-b-video-missed',
            publishedAt: '2026-10-20T12:00:00.000Z',
          },
        ],
      ),
      reconciledAt: '2026-11-01T00:00:00.000Z',
    });

  const result = bundleSnsFandomProspectiveReactionReceipts({
    studyId: 'prospective-study-broken-reconciliation',
    entries: [
      artistA,
      {
        ...artistB,
        reconciliation: brokenReconciliation,
      },
    ],
  });

  assert.equal(brokenReconciliation.state, 'blocked');
  assert.equal(result.state, 'blocked');
  assert.equal(result.receipt, null);
  assert.ok(
    result.blockers.includes(
      'prospective-receipt-bundle-reconciliation-not-ready',
    ),
  );
});

test('duplicate observation identities across artists fail closed before lineage assembly', () => {
  const result = bundleSnsFandomProspectiveReactionReceipts({
    studyId: 'prospective-study-duplicate-observation',
    entries: [
      entry(
        'artist-a',
        '2026-10-01T12:00:00.000Z',
        'obs-duplicate',
      ),
      entry(
        'artist-b',
        '2026-10-01T18:00:00.000Z',
        'obs-duplicate',
      ),
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.receipt, null);
  assert.ok(
    result.blockers.includes(
      'prospective-receipt-bundle-observation-id-duplicate',
    ),
  );
});
