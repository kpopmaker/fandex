import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type SnsFandomObservation,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  evaluateSnsFandomYoutubeContentAgeAlignment,
} from '../lib/intelligence/snsFandomPointYoutubeContentAgeAlignment';
import {
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

const CLIENT = 'gcp-project-fandex-youtube-primary';

function manifest(
  items: readonly Readonly<{ videoId: string; publishedAt: string }>[],
): SnsFandomYoutubeContentManifest {
  return {
    contractVersion: 'sns-fandom-youtube-content-manifest-v1',
    canonicalArtistId: 'iu',
    youtubeChannelId: 'UC-iu',
    providerClientRef: CLIENT,
    selectionRule: 'official-channel-all-uploads-in-published-window',
    windowStart: '2026-09-01T00:00:00.000Z',
    windowEnd: '2026-09-30T23:59:59.999Z',
    uploadsPlaylistId: 'UU-iu',
    providerEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
    ],
    pagination: {
      pageCount: 1,
      terminalNextPageToken: null,
      terminalPageEvidenceRef:
        'evidence://youtube/iu/uploads/terminal',
    },
    items,
    evidenceRef: 'evidence://youtube/iu/uploads/window',
  };
}

function observation(
  input: Readonly<{
    videoId: string;
    metricId:
      | 'youtube.video.view-count'
      | 'youtube.video.like-count'
      | 'youtube.video.comment-count';
    observedAt: string;
    rawValue: number | null;
    missingState?: 'observed' | 'missing' | 'unsupported';
  }>,
): SnsFandomObservation {
  const missingState = input.missingState ?? 'observed';

  return {
    contractVersion: 'fandex-observation-v1',
    observationId: [
      'youtube-data-api',
      'iu',
      input.videoId,
      input.metricId,
      input.observedAt,
    ].join(':'),
    providerId: 'youtube-data-api',
    entity: {
      entityType: 'artist',
      canonicalArtistId: 'iu',
      providerArtistId: 'UC-iu',
      providerContentId: input.videoId,
      identityState: 'bound',
    },
    variable: {
      variableId: 'snsFandomPoint',
      metricFamily: 'sns-fandom',
      dimension: 'public-reaction-diffusion',
      metricId: input.metricId,
      metricRole: 'construct-evidence',
    },
    value: missingState === 'observed'
      ? {
          rawValue: input.rawValue,
          unit: 'count',
          missingState,
        }
      : {
          rawValue: null,
          unit: null,
          missingState,
        },
    time: {
      providerPeriodStart: null,
      providerPeriodEnd: null,
      observedAt: input.observedAt,
      collectedAt: new Date(
        Date.parse(input.observedAt) + 60_000,
      ).toISOString(),
    },
    evidence: {
      evidenceRef: 'evidence://youtube/' + input.videoId,
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

function allMetricsFor(
  videoId: string,
  observedAt: string,
): readonly SnsFandomObservation[] {
  return [
    observation({
      videoId,
      metricId: 'youtube.video.view-count',
      observedAt,
      rawValue: 100,
    }),
    observation({
      videoId,
      metricId: 'youtube.video.like-count',
      observedAt,
      rawValue: 10,
    }),
    observation({
      videoId,
      metricId: 'youtube.video.comment-count',
      observedAt,
      rawValue: 5,
    }),
  ];
}

test('same snapshot time does not make differently aged videos directly comparable', () => {
  const contentManifest = manifest([
    {
      videoId: 'video-a',
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      videoId: 'video-b',
      publishedAt: '2026-09-15T00:00:00.000Z',
    },
  ]);

  const result = evaluateSnsFandomYoutubeContentAgeAlignment({
    manifest: contentManifest,
    observations: [
      ...allMetricsFor('video-a', '2026-10-01T00:00:00.000Z'),
      ...allMetricsFor('video-b', '2026-10-01T00:00:00.000Z'),
    ],
  });

  assert.equal(result.state, 'age-alignment-blocked');
  assert.equal(result.artistLevelAggregationReady, false);
  assert.equal(result.interpolationAllowed, false);
  assert.equal(result.extrapolationAllowed, false);
  assert.ok(
    result.blockers.includes('youtube-content-age-alignment-required'),
  );
  assert.ok(result.metrics.every(
    (metric) =>
      metric.state === 'age-misaligned'
      && metric.directRawComparisonReady === false
      && metric.aggregationMethod === null
      && metric.aggregateValue === null,
  ));
});

test('different collection dates can be exact-age-aligned when elapsed content age is identical', () => {
  const contentManifest = manifest([
    {
      videoId: 'video-a',
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      videoId: 'video-b',
      publishedAt: '2026-09-15T00:00:00.000Z',
    },
  ]);

  const result = evaluateSnsFandomYoutubeContentAgeAlignment({
    manifest: contentManifest,
    observations: [
      ...allMetricsFor('video-a', '2026-09-08T00:00:00.000Z'),
      ...allMetricsFor('video-b', '2026-09-22T00:00:00.000Z'),
    ],
  });

  assert.equal(result.state, 'age-alignment-ready');
  assert.equal(result.artistLevelAggregationReady, false);
  assert.ok(result.metrics.every(
    (metric) =>
      metric.state === 'exact-age-aligned'
      && metric.directRawComparisonReady === true
      && metric.distinctContentAgeMilliseconds.length === 1
      && metric.aggregationMethod === null,
  ));
  assert.ok(
    result.blockers.includes(
      'youtube-artist-level-aggregation-methodology-not-approved',
    ),
  );
});

test('missing metric values block age-aligned aggregation evidence instead of becoming zero', () => {
  const contentManifest = manifest([
    {
      videoId: 'video-a',
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
  ]);

  const result = evaluateSnsFandomYoutubeContentAgeAlignment({
    manifest: contentManifest,
    observations: [
      observation({
        videoId: 'video-a',
        metricId: 'youtube.video.view-count',
        observedAt: '2026-09-08T00:00:00.000Z',
        rawValue: 100,
      }),
      observation({
        videoId: 'video-a',
        metricId: 'youtube.video.like-count',
        observedAt: '2026-09-08T00:00:00.000Z',
        rawValue: null,
        missingState: 'missing',
      }),
      observation({
        videoId: 'video-a',
        metricId: 'youtube.video.comment-count',
        observedAt: '2026-09-08T00:00:00.000Z',
        rawValue: 5,
      }),
    ],
  });

  assert.equal(result.state, 'evidence-incomplete');
  const likes = result.metrics.find(
    (metric) => metric.metricId === 'youtube.video.like-count',
  );
  assert.equal(likes?.state, 'evidence-incomplete');
  assert.ok(
    likes?.blockers.includes('youtube-content-age-metric-not-observed'),
  );
});

test('duplicate observations for the same video metric fail closed', () => {
  const contentManifest = manifest([
    {
      videoId: 'video-a',
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
  ]);

  const duplicate = observation({
    videoId: 'video-a',
    metricId: 'youtube.video.view-count',
    observedAt: '2026-09-08T00:00:00.000Z',
    rawValue: 100,
  });

  const result = evaluateSnsFandomYoutubeContentAgeAlignment({
    manifest: contentManifest,
    observations: [
      duplicate,
      {
        ...duplicate,
        observationId: duplicate.observationId + ':duplicate',
      },
      observation({
        videoId: 'video-a',
        metricId: 'youtube.video.like-count',
        observedAt: '2026-09-08T00:00:00.000Z',
        rawValue: 10,
      }),
      observation({
        videoId: 'video-a',
        metricId: 'youtube.video.comment-count',
        observedAt: '2026-09-08T00:00:00.000Z',
        rawValue: 5,
      }),
    ],
  });

  assert.equal(result.state, 'evidence-incomplete');
  const views = result.metrics.find(
    (metric) => metric.metricId === 'youtube.video.view-count',
  );
  assert.ok(
    views?.blockers.includes(
      'youtube-content-age-observation-duplicate',
    ),
  );
});

test('observation outside the manifest is never silently folded into the content set', () => {
  const contentManifest = manifest([
    {
      videoId: 'video-a',
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
  ]);

  const result = evaluateSnsFandomYoutubeContentAgeAlignment({
    manifest: contentManifest,
    observations: [
      ...allMetricsFor('video-a', '2026-09-08T00:00:00.000Z'),
      ...allMetricsFor('video-extra', '2026-09-08T00:00:00.000Z'),
    ],
  });

  assert.equal(result.state, 'evidence-incomplete');
  assert.ok(result.metrics.every((metric) =>
    metric.blockers.includes(
      'youtube-content-age-observation-outside-manifest',
    )
  ));
});


test('an empty but complete publication window is not reaction aggregation evidence', () => {
  const result = evaluateSnsFandomYoutubeContentAgeAlignment({
    manifest: manifest([]),
    observations: [],
  });

  assert.equal(result.state, 'evidence-incomplete');
  assert.equal(result.artistLevelAggregationReady, false);
  assert.ok(
    result.blockers.includes('youtube-content-age-manifest-empty'),
  );
  assert.ok(result.metrics.every(
    (metric) => metric.state === 'evidence-incomplete',
  ));
});
