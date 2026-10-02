import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomCollectorActivationTransition,
} from '../lib/intelligence/snsFandomPointCollectorActivationTransition';
import {
  type SnsFandomProviderApprovalEvidence,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildSnsFandomReactionCollectionHandoff,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionHandoff';
import {
  buildSnsFandomReactionValidationCollectionPlan,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionPlan';
import {
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

const CLIENT = 'gcp-project-fandex-youtube-primary';
const AGE_7D = 7 * 24 * 60 * 60 * 1000;

function manifest(
  artistId: string,
  publishedAt: string,
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
        'evidence://youtube/' + artistId + '/uploads/terminal',
    },
    items: [
      {
        videoId: artistId + '-video-1',
        publishedAt,
      },
    ],
    evidenceRef:
      'evidence://youtube/' + artistId + '/uploads/window',
  };
}

function plan(
  input: Readonly<{
    plannedAt?: string;
    existingCaptures?: readonly Readonly<{
      datasetId: string;
      canonicalArtistId: string;
      videoId: string;
      metricId: 'youtube.video.view-count';
      observedAt: string;
      evidenceRef: string;
    }>[];
  }> = {},
) {
  return buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-handoff-plan-v1',
    plannedAt: input.plannedAt ?? '2026-10-02T00:00:00.000Z',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    objectives: ['primary-validation'],
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: 'evidence://methodology/age-7d',
      },
    ],
    artistManifests: [
      manifest('artist-a', '2026-10-01T12:00:00.000Z'),
      manifest('artist-b', '2026-10-01T18:00:00.000Z'),
    ],
    existingCaptures: input.existingCaptures ?? [],
  });
}

function approval(
  overrides: Partial<SnsFandomProviderApprovalEvidence> = {},
): SnsFandomProviderApprovalEvidence {
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
    ...overrides,
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

test('planning-ready future tasks become a non-executing Production Ops handoff only when exact grant and collector gates are ready', () => {
  const result = buildSnsFandomReactionCollectionHandoff({
    plan: plan(),
    providerApproval: approval(),
    collectorActivation: collectorApprovedReady(),
    evaluatedAt: '2026-10-02T00:00:00.000Z',
  });

  assert.equal(result.state, 'production-ops-handoff-ready');
  assert.equal(result.productionOpsHandoffReady, true);
  assert.equal(result.providerGrantValidated, true);
  assert.equal(result.collectorApprovedReady, true);
  assert.equal(result.pendingTasks.length, 2);
  assert.ok(result.pendingTasks.every(
    (task) => task.state === 'awaiting-production-ops',
  ));
  assert.equal(result.executionTimeRevalidationRequired, true);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.activationMutationAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.deploymentAuthorized, false);
  assert.deepEqual(result.blockers, []);
});

test('provider approval must remain active at every future exact-age capture time', () => {
  const result = buildSnsFandomReactionCollectionHandoff({
    plan: plan(),
    providerApproval: approval({
      validUntil: '2026-10-05T00:00:00.000Z',
    }),
    collectorActivation: collectorApprovedReady(),
    evaluatedAt: '2026-10-02T00:00:00.000Z',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.productionOpsHandoffReady, false);
  assert.equal(result.providerGrantValidated, false);
  assert.ok(
    result.blockers.includes(
      'reaction-collection-handoff-provider-approval-not-active-for-capture',
    ),
  );
});

test('approval from another API client project cannot authorize the handoff', () => {
  const result = buildSnsFandomReactionCollectionHandoff({
    plan: plan(),
    providerApproval: approval({
      providerClientRef: 'gcp-project-other',
    }),
    collectorActivation: collectorApprovedReady(),
    evaluatedAt: '2026-10-02T00:00:00.000Z',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.providerGrantValidated, false);
  assert.ok(
    result.blockers.includes(
      'reaction-collection-handoff-provider-client-mismatch',
    ),
  );
});

test('collector activation must be approved-ready but not already collection-authorized by this variable handoff', () => {
  const activated = evaluateSnsFandomCollectorActivationTransition({
    providerId: 'youtube-data-api',
    providerApprovalGranted: true,
    approvalEvidenceComplete: true,
    rightsState: 'authorized',
    adapterRegistered: true,
    observationContractCompatible: true,
    collectionRequested: true,
  });

  const result = buildSnsFandomReactionCollectionHandoff({
    plan: plan(),
    providerApproval: approval(),
    collectorActivation: activated,
    evaluatedAt: '2026-10-02T00:00:00.000Z',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.ok(
    result.blockers.includes(
      'reaction-collection-handoff-collector-not-approved-ready',
    ),
  );
});

test('a planning-ready task becomes blocked if the handoff is evaluated after its exact capture time', () => {
  const result = buildSnsFandomReactionCollectionHandoff({
    plan: plan(),
    providerApproval: approval(),
    collectorActivation: collectorApprovedReady(),
    evaluatedAt: '2026-10-09T00:00:00.000Z',
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-handoff-capture-window-missed',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-collection-handoff-pending-task-construction-incomplete',
    ),
  );
});

test('all exact captures already present means no new collection handoff is required', () => {
  const completePlan = plan({
    plannedAt: '2026-10-20T00:00:00.000Z',
    existingCaptures: [
      {
        datasetId: 'dataset-age-7d',
        canonicalArtistId: 'artist-a',
        videoId: 'artist-a-video-1',
        metricId: 'youtube.video.view-count',
        observedAt: '2026-10-08T12:00:00.000Z',
        evidenceRef: 'evidence://existing/a',
      },
      {
        datasetId: 'dataset-age-7d',
        canonicalArtistId: 'artist-b',
        videoId: 'artist-b-video-1',
        metricId: 'youtube.video.view-count',
        observedAt: '2026-10-08T18:00:00.000Z',
        evidenceRef: 'evidence://existing/b',
      },
    ],
  });

  const blockedCollector = evaluateSnsFandomCollectorActivationTransition({
    providerId: 'youtube-data-api',
    providerApprovalGranted: false,
    approvalEvidenceComplete: false,
    rightsState: 'blocked',
    adapterRegistered: false,
    observationContractCompatible: false,
    collectionRequested: false,
  });

  const result = buildSnsFandomReactionCollectionHandoff({
    plan: completePlan,
    providerApproval: null,
    collectorActivation: blockedCollector,
    evaluatedAt: '2026-10-20T00:00:00.000Z',
  });

  assert.equal(result.state, 'collection-not-required');
  assert.equal(result.productionOpsHandoffReady, false);
  assert.equal(result.pendingTasks.length, 0);
  assert.equal(result.alreadyCapturedTaskCount, 2);
  assert.equal(result.providerGrantValidated, false);
  assert.equal(result.collectorApprovedReady, false);
  assert.deepEqual(result.blockers, []);
});

test('blocked planning contract can never become handoff-ready', () => {
  const blockedPlan = plan({
    plannedAt: '2026-10-20T00:00:00.000Z',
  });

  const result = buildSnsFandomReactionCollectionHandoff({
    plan: blockedPlan,
    providerApproval: approval(),
    collectorActivation: collectorApprovedReady(),
    evaluatedAt: '2026-10-20T00:00:00.000Z',
  });

  assert.equal(blockedPlan.state, 'blocked');
  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-handoff-plan-not-ready',
    ),
  );
});
