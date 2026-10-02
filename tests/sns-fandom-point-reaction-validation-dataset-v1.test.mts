import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type SnsFandomObservation,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildSnsFandomReactionValidationDataset as buildReactionValidationDataset,
  type SnsFandomReactionValidationDatasetInput,
} from '../lib/intelligence/snsFandomPointReactionValidationDataset';
import {
  type SnsFandomReactionValidationLineageEntry,
} from '../lib/intelligence/snsFandomPointReactionValidationLineage';
import {
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

const CLIENT = 'gcp-project-fandex-youtube-primary';
const AGE_MS = 7 * 24 * 60 * 60 * 1000;

function manifest(
  artistId: string,
  videoIds: readonly string[],
  clientRef = CLIENT,
): SnsFandomYoutubeContentManifest {
  return {
    contractVersion: 'sns-fandom-youtube-content-manifest-v1',
    canonicalArtistId: artistId,
    youtubeChannelId: 'UC-' + artistId,
    providerClientRef: clientRef,
    selectionRule: 'official-channel-all-uploads-in-published-window',
    windowStart: '2026-09-01T00:00:00.000Z',
    windowEnd: '2026-09-30T23:59:59.999Z',
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
    items: videoIds.map((videoId, index) => ({
      videoId,
      publishedAt: new Date(
        Date.parse('2026-09-01T00:00:00.000Z')
          + index * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })),
    evidenceRef:
      'evidence://youtube/' + artistId + '/uploads/window',
  };
}

function observationsFor(
  m: SnsFandomYoutubeContentManifest,
  options: Readonly<{
    ageMs?: number;
    clientRef?: string;
    endpoints?: readonly string[];
    materialClass?: 'real' | 'preview' | 'synthetic';
    missingVideoId?: string;
    missingMetricId?: string;
  }> = {},
): readonly SnsFandomObservation[] {
  const ageMs = options.ageMs ?? AGE_MS;
  const out: SnsFandomObservation[] = [];
  const metricIds = [
    'youtube.video.view-count',
    'youtube.video.like-count',
    'youtube.video.comment-count',
  ] as const;

  for (const item of m.items) {
    for (const metricId of metricIds) {
      const missing =
        options.missingVideoId === item.videoId
        && options.missingMetricId === metricId;
      const observedAt = new Date(
        Date.parse(item.publishedAt) + ageMs,
      ).toISOString();

      out.push({
        contractVersion: 'fandex-observation-v1',
        observationId: [
          m.canonicalArtistId,
          item.videoId,
          metricId,
          observedAt,
        ].join(':'),
        providerId: 'youtube-data-api',
        entity: {
          entityType: 'artist',
          canonicalArtistId: m.canonicalArtistId,
          providerArtistId: m.youtubeChannelId,
          providerContentId: item.videoId,
          identityState: 'bound',
        },
        variable: {
          variableId: 'snsFandomPoint',
          metricFamily: 'sns-fandom',
          dimension: 'public-reaction-diffusion',
          metricId,
          metricRole: 'construct-evidence',
        },
        value: missing
          ? {
              rawValue: null,
              unit: null,
              missingState: 'missing',
            }
          : {
              rawValue:
                metricId === 'youtube.video.view-count'
                  ? 1000
                  : metricId === 'youtube.video.like-count'
                    ? 100
                    : 20,
              unit: 'count',
              missingState: 'observed',
            },
        time: {
          providerPeriodStart: null,
          providerPeriodEnd: null,
          observedAt,
          collectedAt: new Date(
            Date.parse(observedAt) + 60_000,
          ).toISOString(),
        },
        evidence: {
          evidenceRef: [
            'evidence://youtube',
            m.canonicalArtistId,
            item.videoId,
            metricId,
          ].join('/'),
          providerClientRef:
            options.clientRef ?? m.providerClientRef,
          providerEndpoints:
            options.endpoints ?? ['youtube.videos.list'],
          revision: null,
        },
        lifecycle: {
          state: 'research',
          materialClass: (options.materialClass ?? 'real') as 'real',
          blockers: [],
        },
      });
    }
  }

  return out;
}

function stableAudit() {
  return {
    state: 'stable' as const,
    evidenceRef: 'evidence://dataset/revision-audit/v1',
    comparedDatasetRefs: [
      'dataset://reaction-validation/revision-1',
      'dataset://reaction-validation/revision-2',
    ],
  };
}

function lineageEntriesFor(
  artists: SnsFandomReactionValidationDatasetInput['artists'],
  metricId: SnsFandomReactionValidationDatasetInput['metricId'],
): readonly SnsFandomReactionValidationLineageEntry[] {
  const entries: SnsFandomReactionValidationLineageEntry[] = [];

  for (const artist of artists) {
    for (const observation of artist.observations) {
      if (
        observation.variable.metricId !== metricId
        || observation.entity.providerContentId === null
      ) {
        continue;
      }

      const evidenceRef = observation.evidence.evidenceRef;
      const identityRef =
        'identity://' + observation.entity.canonicalArtistId;
      const rawValue = observation.value.rawValue;
      const rawString = rawValue === null ? null : String(rawValue);

      entries.push({
        canonicalArtistId: observation.entity.canonicalArtistId,
        observationId: observation.observationId,
        collectionRun: {
          manifestVersion: 'sns-fandom-collection-run-manifest-v1',
          runId: 'run:' + observation.observationId,
          providerId: 'youtube-data-api',
          adapterVersion: 'youtube-adapter-v1',
          approvalEvidenceRef: 'evidence://youtube/approval/v1',
          rightsState: 'authorized',
          collectionState: 'completed',
          startedAt: observation.time.observedAt,
          completedAt: observation.time.collectedAt,
          observationCount: 1,
          evidenceRefs: [evidenceRef],
          failureReasons: [],
        },
        rawRecord: {
          schemaVersion: 'sns-fandom-youtube-raw-collection-schema-v1',
          provider: 'youtube-data-api',
          providerResourceId: observation.entity.providerContentId,
          channelId: observation.entity.providerArtistId ?? '',
          artistIdentityRef: identityRef,
          observationWindow: {
            startAt: observation.time.observedAt,
            endAt: observation.time.observedAt,
          },
          observedAt: observation.time.observedAt,
          collectedAt: observation.time.collectedAt,
          metrics: {
            viewCount:
              metricId === 'youtube.video.view-count'
                ? rawString
                : null,
            likeCount:
              metricId === 'youtube.video.like-count'
                ? rawString
                : null,
            commentCount:
              metricId === 'youtube.video.comment-count'
                ? rawString
                : null,
          },
          rightsState: 'authorized-and-collectable',
          evidenceRefs: [evidenceRef],
        },
        historicalSnapshot: {
          contractVersion: 'sns-fandom-historical-snapshot-manifest-v1',
          snapshotId: 'snapshot:' + observation.observationId,
          providerId: 'youtube-data-api',
          artistIdentityRef: identityRef,
          observationWindow: {
            start: observation.time.observedAt,
            end: observation.time.observedAt,
          },
          collectionTimestamp: observation.time.collectedAt,
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
          revisionId: 'revision:' + observation.observationId,
          observationId: observation.observationId,
          providerId: 'youtube-data-api',
          previousRevisionId: null,
          revisionType: 'initial-capture',
          observedAt: observation.time.observedAt,
          collectedAt: observation.time.collectedAt,
          reason: 'initial provider capture',
          evidenceRefs: [evidenceRef],
        },
      });
    }
  }

  return entries;
}

function buildDataset(
  input: Omit<SnsFandomReactionValidationDatasetInput, 'lineageEntries'>,
) {
  return buildReactionValidationDataset({
    ...input,
    lineageEntries: lineageEntriesFor(input.artists, input.metricId),
  });
}

test('real exact-age multi-artist evidence forms a validation-ready dataset without producing aggregates', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1', 'b-2']);

  const result = buildDataset({
    datasetId: 'reaction-validation-v1',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      { manifest: a, observations: observationsFor(a) },
      { manifest: b, observations: observationsFor(b) },
    ],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'validation-ready');
  assert.equal(result.distinctCanonicalArtistCount, 2);
  assert.deepEqual(result.canonicalArtistIds, ['artist-a', 'artist-b']);
  assert.equal(result.targetContentAgeMilliseconds, AGE_MS);
  assert.equal(result.methodologyValidationEligible, true);
  assert.equal(result.revisionStabilityReviewed, true);
  assert.equal(result.lineageValidated, true);
  assert.equal(result.aggregateValuesProduced, false);
  assert.equal(result.normalizedValuesProduced, false);
  assert.equal(result.arbitraryContentCountEqualizationAllowed, false);
  assert.deepEqual(
    result.members.map((member) => member.selectedContentCount),
    [1, 2],
  );
  assert.ok(result.members.every(
    (member) =>
      member.aggregateValue === null
      && member.normalizedValue === null,
  ));
});

test('one artist cannot qualify a cross-artist methodology validation dataset', () => {
  const a = manifest('artist-a', ['a-1']);

  const result = buildDataset({
    datasetId: 'single-artist',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      { manifest: a, observations: observationsFor(a) },
    ],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.methodologyValidationEligible, false);
  assert.ok(
    result.blockers.includes(
      'reaction-validation-multi-artist-evidence-insufficient',
    ),
  );
});

test('preview or synthetic material is rejected even when values are numerically complete', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);

  const result = buildDataset({
    datasetId: 'synthetic-block',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      {
        manifest: a,
        observations: observationsFor(a, {
          materialClass: 'synthetic',
        }),
      },
      { manifest: b, observations: observationsFor(b) },
    ],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes('reaction-validation-non-real-material'),
  );
  assert.equal(result.methodologyValidationEligible, false);
});

test('different exact content ages across artists do not form one methodology cohort', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);

  const result = buildDataset({
    datasetId: 'age-mismatch',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      { manifest: a, observations: observationsFor(a) },
      {
        manifest: b,
        observations: observationsFor(b, {
          ageMs: AGE_MS + 24 * 60 * 60 * 1000,
        }),
      },
    ],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.targetContentAgeMilliseconds, null);
  assert.ok(
    result.blockers.includes(
      'reaction-validation-cross-artist-content-age-mismatch',
    ),
  );
});

test('provider client mismatch blocks methodology dataset reuse across API projects', () => {
  const a = manifest('artist-a', ['a-1'], CLIENT);
  const b = manifest(
    'artist-b',
    ['b-1'],
    'gcp-project-other-youtube',
  );

  const result = buildDataset({
    datasetId: 'client-mismatch',
    construct: 'window-total-reaction-volume',
    metricId: 'youtube.video.view-count',
    artists: [
      { manifest: a, observations: observationsFor(a) },
      { manifest: b, observations: observationsFor(b) },
    ],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.providerClientRef, null);
  assert.ok(
    result.blockers.includes(
      'reaction-validation-provider-client-mismatch',
    ),
  );
});

test('missing selected-metric evidence remains missing and never becomes zero', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);

  const result = buildDataset({
    datasetId: 'missing-value',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      {
        manifest: a,
        observations: observationsFor(a, {
          missingVideoId: 'a-1',
          missingMetricId: 'youtube.video.view-count',
        }),
      },
      { manifest: b, observations: observationsFor(b) },
    ],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.methodologyValidationEligible, false);
  assert.ok(
    result.blockers.includes(
      'reaction-validation-content-age-alignment-not-ready',
    ),
  );
});

test('structurally valid real data stays non-eligible until revision stability is assessed', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);

  const result = buildDataset({
    datasetId: 'revision-pending',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      { manifest: a, observations: observationsFor(a) },
      { manifest: b, observations: observationsFor(b) },
    ],
    revisionAudit: {
      state: 'unassessed',
      evidenceRef: null,
      comparedDatasetRefs: [],
    },
  });

  assert.equal(result.state, 'structurally-ready');
  assert.equal(result.methodologyValidationEligible, false);
  assert.equal(result.revisionStabilityReviewed, false);
  assert.ok(
    result.blockers.includes(
      'reaction-validation-revision-stability-unassessed',
    ),
  );
});

test('detected dataset revision instability blocks methodology validation eligibility', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);

  const result = buildDataset({
    datasetId: 'revision-changed',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      { manifest: a, observations: observationsFor(a) },
      { manifest: b, observations: observationsFor(b) },
    ],
    revisionAudit: {
      state: 'changed',
      evidenceRef: 'evidence://dataset/revision-audit/changed',
      comparedDatasetRefs: [
        'dataset://revision/1',
        'dataset://revision/2',
      ],
    },
  });

  assert.equal(result.state, 'structurally-ready');
  assert.equal(result.methodologyValidationEligible, false);
  assert.ok(
    result.blockers.includes(
      'reaction-validation-revision-instability-detected',
    ),
  );
});

test('a non-YouTube statistical endpoint is rejected before cross-artist methodology comparison', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);

  const result = buildDataset({
    datasetId: 'endpoint-mismatch',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists: [
      {
        manifest: a,
        observations: observationsFor(a, {
          endpoints: ['youtube.videos.list'],
        }),
      },
      {
        manifest: b,
        observations: observationsFor(b, {
          endpoints: ['youtube.other.list'],
        }),
      },
    ],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-validation-statistical-endpoint-invalid',
    ),
  );
});


test('validation-ready dataset is impossible without collection lineage', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);
  const artists = [
    { manifest: a, observations: observationsFor(a) },
    { manifest: b, observations: observationsFor(b) },
  ];

  const result = buildReactionValidationDataset({
    datasetId: 'lineage-missing',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists,
    lineageEntries: [],
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.lineageValidated, false);
  assert.equal(result.methodologyValidationEligible, false);
  assert.ok(
    result.blockers.includes('reaction-validation-lineage-not-ready'),
  );
});

test('mapped observation value must equal the raw provider value in lineage', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1']);
  const artists = [
    { manifest: a, observations: observationsFor(a) },
    { manifest: b, observations: observationsFor(b) },
  ];
  const lineage = lineageEntriesFor(
    artists,
    'youtube.video.view-count',
  );
  const first = lineage[0];

  const tamperedLineage = [
    {
      ...first,
      rawRecord: {
        ...first.rawRecord,
        metrics: {
          ...first.rawRecord.metrics,
          viewCount: '999999',
        },
      },
    },
    ...lineage.slice(1),
  ];

  const result = buildReactionValidationDataset({
    datasetId: 'raw-mapping-mismatch',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    artists,
    lineageEntries: tamperedLineage,
    revisionAudit: stableAudit(),
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-validation-raw-mapping-value-mismatch',
    ),
  );
  assert.equal(result.methodologyValidationEligible, false);
});
