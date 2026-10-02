import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSnsFandomReactionValidationCollectionPlan,
} from '../lib/intelligence/snsFandomPointReactionValidationCollectionPlan';
import {
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

function manifest(
  artistId: string,
  publishedDates: readonly string[],
): SnsFandomYoutubeContentManifest {
  return {
    contractVersion: 'sns-fandom-youtube-content-manifest-v1',
    canonicalArtistId: artistId,
    youtubeChannelId: 'UC-' + artistId,
    providerClientRef: 'gcp-project-fandex-youtube-primary',
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
    items: publishedDates.map((publishedAt, index) => ({
      videoId: artistId + '-video-' + String(index + 1),
      publishedAt,
    })),
    evidenceRef:
      'evidence://youtube/' + artistId + '/uploads/window',
  };
}

const AGE_7D = 7 * 24 * 60 * 60 * 1000;
const AGE_14D = 14 * 24 * 60 * 60 * 1000;

test('primary validation plan creates deterministic future capture tasks without authorizing execution', () => {
  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-primary-v1',
    plannedAt: '2026-10-02T00:00:00.000Z',
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
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
    existingCaptures: [],
  });

  assert.equal(result.state, 'planning-ready');
  assert.equal(result.distinctTargetContentAgeCount, 1);
  assert.equal(result.tasks.length, 2);
  assert.equal(result.pendingTaskCount, 2);
  assert.equal(result.missedTaskCount, 0);
  assert.equal(result.providerGrantRequired, true);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.arbitraryTargetAgeDefaultApplied, false);
  assert.equal(result.arbitraryContentCountEqualizationAllowed, false);

  assert.deepEqual(
    result.tasks.map((task) => task.captureAt),
    [
      '2026-10-08T12:00:00.000Z',
      '2026-10-08T18:00:00.000Z',
    ],
  );
  assert.equal(result.datasetBlueprints[0]?.lineageRequired, true);
  assert.equal(result.datasetBlueprints[0]?.revisionAuditRequired, true);
  assert.equal(result.datasetBlueprints[0]?.aggregateValue, null);
  assert.equal(result.datasetBlueprints[0]?.normalizedValue, null);
});

test('content-age sensitivity objective requires at least two explicitly justified target ages', () => {
  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-age-sensitivity',
    plannedAt: '2026-10-02T00:00:00.000Z',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    objectives: ['content-age-sensitivity'],
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: 'evidence://methodology/age-7d',
      },
    ],
    artistManifests: [
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
    existingCaptures: [],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-plan-content-age-sensitivity-needs-multiple-ages',
    ),
  );
});

test('two age cohorts produce separate dataset blueprints without choosing the ages in code', () => {
  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-two-ages',
    plannedAt: '2026-10-02T00:00:00.000Z',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    objectives: [
      'primary-validation',
      'content-age-sensitivity',
    ],
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: 'evidence://methodology/age-7d',
      },
      {
        datasetId: 'dataset-age-14d',
        targetContentAgeMilliseconds: AGE_14D,
        rationaleEvidenceRef: 'evidence://methodology/age-14d',
      },
    ],
    artistManifests: [
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
    existingCaptures: [],
  });

  assert.equal(result.state, 'planning-ready');
  assert.equal(result.distinctTargetContentAgeCount, 2);
  assert.equal(result.datasetBlueprints.length, 2);
  assert.deepEqual(
    result.datasetBlueprints.map(
      (blueprint) => blueprint.targetContentAgeMilliseconds,
    ),
    [AGE_7D, AGE_14D],
  );
  assert.equal(result.tasks.length, 4);
});

test('release-volume sensitivity uses natural manifest variation and never equalizes content counts', () => {
  const ready = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-volume-ready',
    plannedAt: '2026-10-02T00:00:00.000Z',
    construct: 'window-total-reaction-volume',
    metricId: 'youtube.video.view-count',
    objectives: ['release-volume-sensitivity'],
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: 'evidence://methodology/age-7d',
      },
    ],
    artistManifests: [
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', [
        '2026-10-01T12:00:00.000Z',
        '2026-10-01T18:00:00.000Z',
      ]),
    ],
    existingCaptures: [],
  });

  assert.equal(ready.state, 'planning-ready');
  assert.equal(ready.distinctSelectedContentCount, 2);
  assert.equal(ready.arbitraryContentCountEqualizationAllowed, false);

  const blocked = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-volume-blocked',
    plannedAt: '2026-10-02T00:00:00.000Z',
    construct: 'window-total-reaction-volume',
    metricId: 'youtube.video.view-count',
    objectives: ['release-volume-sensitivity'],
    targetAges: [
      {
        datasetId: 'dataset-age-7d',
        targetContentAgeMilliseconds: AGE_7D,
        rationaleEvidenceRef: 'evidence://methodology/age-7d',
      },
    ],
    artistManifests: [
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
    existingCaptures: [],
  });

  assert.equal(blocked.state, 'blocked');
  assert.ok(
    blocked.blockers.includes(
      'reaction-collection-plan-release-volume-variation-absent',
    ),
  );
});

test('target age requires explicit rationale evidence and no default age is invented', () => {
  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-no-rationale',
    plannedAt: '2026-10-02T00:00:00.000Z',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    objectives: ['primary-validation'],
    targetAges: [
      {
        datasetId: 'dataset-age-custom',
        targetContentAgeMilliseconds: 123456789,
        rationaleEvidenceRef: '',
      },
    ],
    artistManifests: [
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
    existingCaptures: [],
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.arbitraryTargetAgeDefaultApplied, false);
  assert.ok(
    result.blockers.includes(
      'reaction-collection-plan-target-age-rationale-missing',
    ),
  );
});

test('past exact-age capture window is blocked when no historical capture exists', () => {
  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-missed',
    plannedAt: '2026-10-20T00:00:00.000Z',
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
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
    existingCaptures: [],
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.missedTaskCount, 2);
  assert.ok(
    result.blockers.includes(
      'reaction-collection-plan-prospective-capture-window-missed',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-collection-plan-has-missed-captures',
    ),
  );
});

test('exact existing capture can satisfy an already-passed target age without fabricating a backfill', () => {
  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-existing-capture',
    plannedAt: '2026-10-20T00:00:00.000Z',
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
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
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

  assert.equal(result.state, 'planning-ready');
  assert.equal(result.alreadyCapturedTaskCount, 2);
  assert.equal(result.pendingTaskCount, 0);
  assert.equal(result.missedTaskCount, 0);
  assert.ok(result.tasks.every(
    (task) =>
      task.state === 'already-captured'
      && task.existingCaptureEvidenceRef !== null,
  ));
});

test('existing capture at the wrong content age cannot satisfy a target-age task', () => {
  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-existing-wrong-time',
    plannedAt: '2026-10-20T00:00:00.000Z',
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
      manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
      manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    ],
    existingCaptures: [
      {
        datasetId: 'dataset-age-7d',
        canonicalArtistId: 'artist-a',
        videoId: 'artist-a-video-1',
        metricId: 'youtube.video.view-count',
        observedAt: '2026-10-09T12:00:00.000Z',
        evidenceRef: 'evidence://existing/a-wrong-age',
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

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-plan-existing-capture-time-mismatch',
    ),
  );
  assert.equal(result.missedTaskCount, 1);
});


test('finalized-manifest planner rejects a publication window that is still open at planning time', () => {
  const openWindowManifest = {
    ...manifest('artist-a', ['2026-10-01T12:00:00.000Z']),
    windowEnd: '2026-10-31T23:59:59.999Z',
  };
  const openWindowManifestB = {
    ...manifest('artist-b', ['2026-10-01T18:00:00.000Z']),
    windowEnd: '2026-10-31T23:59:59.999Z',
  };

  const result = buildSnsFandomReactionValidationCollectionPlan({
    planId: 'reaction-plan-open-window',
    plannedAt: '2026-10-02T00:00:00.000Z',
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
    artistManifests: [openWindowManifest, openWindowManifestB],
    existingCaptures: [],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-collection-plan-content-window-not-finalized',
    ),
  );
});
