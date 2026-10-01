import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type SnsFandomObservation,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildSnsFandomReactionValidationDataset,
} from '../lib/intelligence/snsFandomPointReactionValidationDataset';
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
          materialClass: options.materialClass ?? 'real',
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

test('real exact-age multi-artist evidence forms a validation-ready dataset without producing aggregates', () => {
  const a = manifest('artist-a', ['a-1']);
  const b = manifest('artist-b', ['b-1', 'b-2']);

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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

  const result = buildSnsFandomReactionValidationDataset({
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
