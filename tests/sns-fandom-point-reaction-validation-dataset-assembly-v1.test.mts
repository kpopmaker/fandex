import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type SnsFandomObservation,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  assembleSnsFandomReactionValidationDataset,
} from '../lib/intelligence/snsFandomPointReactionValidationDatasetAssembly';
import {
  type SnsFandomReactionValidationDatasetInput,
} from '../lib/intelligence/snsFandomPointReactionValidationDataset';
import {
  type SnsFandomReactionCollectionReceiptResult,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionReceipt';
import {
  type SnsFandomReactionValidationLineageEntry,
} from '../lib/intelligence/snsFandomPointReactionValidationLineage';
import {
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

const CLIENT = 'gcp-project-fandex-youtube-primary';

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
    windowEnd: '2026-10-01T23:59:59.999Z',
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

function observation(
  artistId: string,
  publishedAt: string,
  observedAt: string,
  metricId:
    | 'youtube.video.view-count'
    | 'youtube.video.like-count'
    | 'youtube.video.comment-count',
  rawValue: number,
): SnsFandomObservation {
  const videoId = artistId + '-video-1';
  const observationId = [
    artistId,
    videoId,
    metricId,
  ].join(':');
  const evidenceRef = 'evidence://collection/' + observationId;

  return {
    contractVersion: 'fandex-observation-v1',
    observationId,
    providerId: 'youtube-data-api',
    entity: {
      entityType: 'artist',
      canonicalArtistId: artistId,
      providerArtistId: 'UC-' + artistId,
      providerContentId: videoId,
      identityState: 'bound',
    },
    variable: {
      variableId: 'snsFandomPoint',
      metricFamily: 'sns-fandom',
      dimension: 'public-reaction-diffusion',
      metricId,
      metricRole: 'construct-evidence',
    },
    value: {
      rawValue,
      unit: 'count',
      missingState: 'observed',
    },
    time: {
      providerPeriodStart: null,
      providerPeriodEnd: null,
      observedAt,
      collectedAt: new Date(
        Date.parse(observedAt) + 1000,
      ).toISOString(),
    },
    evidence: {
      evidenceRef,
      providerClientRef: CLIENT,
      providerEndpoints: ['youtube.videos.list'],
      revision: null,
    },
    lifecycle: {
      state: 'research',
      materialClass: 'real',
      blockers: [],
    },
  };
}

function artistObservations(
  artistId: string,
  publishedAt: string,
  observedAt: string,
): readonly SnsFandomObservation[] {
  return [
    observation(
      artistId,
      publishedAt,
      observedAt,
      'youtube.video.view-count',
      artistId === 'artist-a' ? 1000 : 2000,
    ),
    observation(
      artistId,
      publishedAt,
      observedAt,
      'youtube.video.like-count',
      artistId === 'artist-a' ? 100 : 200,
    ),
    observation(
      artistId,
      publishedAt,
      observedAt,
      'youtube.video.comment-count',
      artistId === 'artist-a' ? 20 : 40,
    ),
  ];
}

function lineageFor(
  viewObservation: SnsFandomObservation,
): SnsFandomReactionValidationLineageEntry {
  const evidenceRef = viewObservation.evidence.evidenceRef;
  const artistId = viewObservation.entity.canonicalArtistId;
  const videoId = viewObservation.entity.providerContentId as string;
  const identityRef = 'identity://' + artistId;

  return {
    canonicalArtistId: artistId,
    observationId: viewObservation.observationId,
    collectionRun: {
      manifestVersion: 'sns-fandom-collection-run-manifest-v1',
      runId: 'run:' + viewObservation.observationId,
      providerId: 'youtube-data-api',
      adapterVersion: 'youtube-adapter-v1',
      approvalEvidenceRef: 'evidence://youtube/provider-grant/v1',
      rightsState: 'authorized',
      collectionState: 'completed',
      startedAt: viewObservation.time.observedAt,
      completedAt: viewObservation.time.collectedAt,
      observationCount: 1,
      evidenceRefs: [evidenceRef],
      failureReasons: [],
    },
    rawRecord: {
      schemaVersion: 'sns-fandom-youtube-raw-collection-schema-v1',
      provider: 'youtube-data-api',
      providerResourceId: videoId,
      channelId: viewObservation.entity.providerArtistId as string,
      artistIdentityRef: identityRef,
      observationWindow: {
        startAt: viewObservation.time.observedAt,
        endAt: viewObservation.time.observedAt,
      },
      observedAt: viewObservation.time.observedAt,
      collectedAt: viewObservation.time.collectedAt,
      metrics: {
        viewCount: String(viewObservation.value.rawValue),
        likeCount: null,
        commentCount: null,
      },
      rightsState: 'authorized-and-collectable',
      evidenceRefs: [evidenceRef],
    },
    historicalSnapshot: {
      contractVersion: 'sns-fandom-historical-snapshot-manifest-v1',
      snapshotId: 'snapshot:' + viewObservation.observationId,
      providerId: 'youtube-data-api',
      artistIdentityRef: identityRef,
      observationWindow: {
        start: viewObservation.time.observedAt,
        end: viewObservation.time.observedAt,
      },
      collectionTimestamp: viewObservation.time.collectedAt,
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
      revisionId: 'revision:' + viewObservation.observationId,
      observationId: viewObservation.observationId,
      providerId: 'youtube-data-api',
      previousRevisionId: null,
      revisionType: 'initial-capture',
      observedAt: viewObservation.time.observedAt,
      collectedAt: viewObservation.time.collectedAt,
      reason: 'initial provider capture',
      evidenceRefs: [evidenceRef],
    },
  };
}

function fixtures(): Readonly<{
  datasetInput: SnsFandomReactionValidationDatasetInput;
  receipt: SnsFandomReactionCollectionReceiptResult;
}> {
  const aObservedAt = '2026-10-08T12:00:00.000Z';
  const bObservedAt = '2026-10-08T18:00:00.000Z';
  const a = artistObservations(
    'artist-a',
    '2026-10-01T12:00:00.000Z',
    aObservedAt,
  );
  const b = artistObservations(
    'artist-b',
    '2026-10-01T18:00:00.000Z',
    bObservedAt,
  );
  const aView = a[0];
  const bView = b[0];
  const lineage = [lineageFor(aView), lineageFor(bView)];

  const datasetInput: SnsFandomReactionValidationDatasetInput = {
    datasetId: 'dataset-age-7d',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      {
        manifest: manifest(
          'artist-a',
          '2026-10-01T12:00:00.000Z',
        ),
        observations: a,
      },
      {
        manifest: manifest(
          'artist-b',
          '2026-10-01T18:00:00.000Z',
        ),
        observations: b,
      },
    ],
    lineageEntries: lineage,
    revisionAudit: {
      state: 'stable',
      evidenceRef: 'evidence://revision-audit/v1',
      comparedDatasetRefs: [
        'dataset://age-7d/revision-1',
        'dataset://age-7d/revision-2',
      ],
    },
  };

  const receipt: SnsFandomReactionCollectionReceiptResult = {
    contractVersion:
      'sns-fandom-reaction-validation-collection-receipt-v1',
    state: 'capture-complete-lineage-pending',
    planId: 'plan-v1',
    expectedTaskCount: 2,
    receivedReceiptCount: 2,
    completedMemberCount: 2,
    exactTargetAgeCaptureCount: 2,
    deviatedCaptureCount: 0,
    members: [
      {
        taskId: 'task-a',
        datasetId: 'dataset-age-7d',
        canonicalArtistId: 'artist-a',
        videoId: 'artist-a-video-1',
        metricId: 'youtube.video.view-count',
        plannedCaptureAt: aObservedAt,
        actualObservedAt: aObservedAt,
        collectedAt: aView.time.collectedAt,
        timingDeviationMilliseconds: 0,
        timingState: 'exact-target-age',
        observationId: aView.observationId,
        collectionRunId: lineage[0].collectionRun.runId,
        evidenceRef: aView.evidence.evidenceRef,
      },
      {
        taskId: 'task-b',
        datasetId: 'dataset-age-7d',
        canonicalArtistId: 'artist-b',
        videoId: 'artist-b-video-1',
        metricId: 'youtube.video.view-count',
        plannedCaptureAt: bObservedAt,
        actualObservedAt: bObservedAt,
        collectedAt: bView.time.collectedAt,
        timingDeviationMilliseconds: 0,
        timingState: 'exact-target-age',
        observationId: bView.observationId,
        collectionRunId: lineage[1].collectionRun.runId,
        evidenceRef: bView.evidence.evidenceRef,
      },
    ],
    targetAgeDatasetAssemblyEligible: true,
    lineageValidationStillRequired: true,
    revisionAuditStillRequired: true,
    timingToleranceApplied: false,
    interpolationApplied: false,
    extrapolationApplied: false,
    blockers: [],
  };

  return { datasetInput, receipt };
}

test('exact receipts plus matching lineage assemble a validation-ready dataset without producing a score', () => {
  const { datasetInput, receipt } = fixtures();
  const result = assembleSnsFandomReactionValidationDataset({
    receipt,
    datasetInput,
  });

  assert.equal(result.state, 'validation-dataset-ready');
  assert.equal(result.receiptMemberCount, 2);
  assert.equal(result.observationCount, 2);
  assert.equal(result.lineageEntryCount, 2);
  assert.equal(result.dataset?.state, 'validation-ready');
  assert.equal(result.dataset?.lineageValidated, true);
  assert.equal(result.dataset?.methodologyValidationEligible, true);
  assert.equal(result.aggregateValuesProduced, false);
  assert.equal(result.normalizedValuesProduced, false);
  assert.equal(result.methodologyDecisionProduced, false);
  assert.deepEqual(result.blockers, []);
});

test('timing-review receipt cannot assemble the original target-age dataset', () => {
  const { datasetInput, receipt } = fixtures();
  const result = assembleSnsFandomReactionValidationDataset({
    receipt: {
      ...receipt,
      state: 'capture-complete-timing-review-required',
      targetAgeDatasetAssemblyEligible: false,
      deviatedCaptureCount: 1,
      blockers: [
        'reaction-collection-receipt-target-age-timing-deviation-unapproved',
      ],
    },
    datasetInput,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.dataset, null);
  assert.ok(
    result.blockers.includes(
      'reaction-dataset-assembly-receipt-not-eligible',
    ),
  );
});

test('receipt and dataset observation ids must match exactly', () => {
  const { datasetInput, receipt } = fixtures();
  const result = assembleSnsFandomReactionValidationDataset({
    receipt: {
      ...receipt,
      members: [
        {
          ...receipt.members[0],
          observationId: 'unexpected-observation',
        },
        receipt.members[1],
      ],
    },
    datasetInput,
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-dataset-assembly-receipt-observation-set-mismatch',
    ),
  );
});

test('receipt collection run must match the lineage collection run', () => {
  const { datasetInput, receipt } = fixtures();
  const result = assembleSnsFandomReactionValidationDataset({
    receipt: {
      ...receipt,
      members: [
        {
          ...receipt.members[0],
          collectionRunId: 'run:other',
        },
        receipt.members[1],
      ],
    },
    datasetInput,
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-dataset-assembly-collection-run-mismatch',
    ),
  );
});

test('receipt evidence must remain connected to the lineage chain', () => {
  const { datasetInput, receipt } = fixtures();
  const result = assembleSnsFandomReactionValidationDataset({
    receipt: {
      ...receipt,
      members: [
        {
          ...receipt.members[0],
          evidenceRef: 'evidence://disconnected',
        },
        receipt.members[1],
      ],
    },
    datasetInput,
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-dataset-assembly-receipt-evidence-disconnected',
    ),
  );
});
