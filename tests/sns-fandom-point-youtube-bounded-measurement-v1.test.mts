import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  executeSnsFandomYoutubeBoundedMeasurement,
  type SnsFandomYoutubeApiRequest,
} from '../lib/intelligence/snsFandomPointYoutubeBoundedMeasurement';
import {
  type SnsFandomYoutubeAuditArtistBindingManifestInput,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  evaluateSnsFandomYoutubeProviderClientIdentity,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientIdentity';
import {
  buildSnsFandomYoutubeQuotaMeasurementHandoff,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff';

async function mergedAuditManifest() {
  return JSON.parse(
    await readFile(
      new URL(
        '../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as SnsFandomYoutubeAuditArtistBindingManifestInput;
}

function providerClientIdentity() {
  return evaluateSnsFandomYoutubeProviderClientIdentity({
    providerId: 'youtube-data-api',
    providerClientRef: 'gcp-project-fandex-509708',
    googleCloudProjectNumber: '385464276768',
    googleCloudProjectId: 'fandex-509708',
    credentialLocatorRef:
      'github-actions-secret://FANDEX_SNS_FANDOM_YOUTUBE_API_KEY',
    evidenceRef:
      'github-issue://kpopmaker/fandex/issues/424#provider-client-owner-evidence-2026-10-03',
    verifiedAt: '2026-10-03T03:10:00.000Z',
  });
}

async function handoff() {
  return buildSnsFandomYoutubeQuotaMeasurementHandoff({
    handoffId: 'sns-fandom-youtube-quota-measurement-v1:test',
    preparedAt: '2026-10-03T05:00:00.000Z',
    artistBindingManifest: await mergedAuditManifest(),
    providerClientIdentity: providerClientIdentity(),
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    measurementWindowStart: '2026-10-03T04:06:51.000Z',
    measurementWindowEnd: '2027-10-03T04:06:51.000Z',
    reactionSnapshotRunsPerDay: 24,
    cadenceEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/424#issuecomment-5965374359',
    providerBatchLimitEvidenceRef: null,
    providerQuotaCostEvidenceRef:
      'https://developers.google.com/youtube/v3/determine_quota_cost',
  });
}

test('bounded measurement uses the exact five-member cohort and singleton video requests', async () => {
  const requests: SnsFandomYoutubeApiRequest[] = [];

  const result = await executeSnsFandomYoutubeBoundedMeasurement({
    handoff: await handoff(),
    measurementStartedAt: '2026-10-03T05:00:00.000Z',
    requestJson: async (request) => {
      requests.push(request);
      if (request.method === 'channels.list') {
        return {
          items: [{
            id: request.params.id,
            contentDetails: {
              relatedPlaylists: {
                uploads: 'uploads-' + request.params.id,
              },
            },
          }],
        };
      }
      if (request.method === 'playlistItems.list') {
        return {
          items: [{
            contentDetails: {
              videoId: 'video-' + request.params.playlistId,
              videoPublishedAt: '2026-10-03T04:30:00Z',
            },
          }],
        };
      }
      return {
        items: [{
          id: request.params.id,
          statistics: {
            viewCount: '1',
          },
        }],
      };
    },
  });

  assert.equal(result.state, 'bounded-measurement-completed');
  assert.equal(result.artistChannelCount, 5);
  assert.equal(result.artists.length, 5);
  assert.equal(result.uploadManifestPageCountPerReactionRun, 5);
  assert.equal(result.videoCountPerReactionRun, 5);
  assert.deepEqual(result.providerCallsObserved, {
    channelsList: 5,
    playlistItemsList: 5,
    videosList: 5,
    total: 15,
  });
  assert.equal(result.quotaUnitsObserved, 15);
  assert.equal(result.measurementWindowComplete, false);
  assert.equal(result.rawVideoIdentifiersStored, false);
  assert.equal(result.rawStatisticsStored, false);
  assert.equal(result.secretMaterialStored, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.schedulerMutationAuthorized, false);

  const idRequests = requests.filter(
    (request) =>
      request.method === 'channels.list'
      || request.method === 'videos.list',
  );
  assert.ok(idRequests.length > 0);
  assert.ok(
    idRequests.every(
      (request) =>
        typeof request.params.id === 'string'
        && !request.params.id.includes(','),
    ),
  );
  assert.equal(
    requests.some(
      (request) =>
        request.method !== 'channels.list'
        && request.method !== 'playlistItems.list'
        && request.method !== 'videos.list',
    ),
    false,
  );
});

test('an observed zero included-video count stays zero rather than becoming missing', async () => {
  const requests: SnsFandomYoutubeApiRequest[] = [];

  const result = await executeSnsFandomYoutubeBoundedMeasurement({
    handoff: await handoff(),
    measurementStartedAt: '2026-10-03T05:00:00.000Z',
    requestJson: async (request) => {
      requests.push(request);
      if (request.method === 'channels.list') {
        return {
          items: [{
            id: request.params.id,
            contentDetails: {
              relatedPlaylists: {
                uploads: 'uploads-' + request.params.id,
              },
            },
          }],
        };
      }
      if (request.method === 'playlistItems.list') {
        return {
          items: [{
            contentDetails: {
              videoId: 'older-video-' + request.params.playlistId,
              videoPublishedAt: '2026-10-02T04:30:00.000Z',
            },
          }],
        };
      }
      throw new Error('videos.list must not be called for zero included videos');
    },
  });

  assert.equal(result.uploadManifestPageCountPerReactionRun, 5);
  assert.equal(result.videoCountPerReactionRun, 0);
  assert.deepEqual(result.providerCallsObserved, {
    channelsList: 5,
    playlistItemsList: 5,
    videosList: 0,
    total: 10,
  });
  assert.equal(
    requests.filter((request) => request.method === 'videos.list').length,
    0,
  );
});


test('provider RFC3339 offset datetime is accepted without canonical string equality', async () => {
  const result = await executeSnsFandomYoutubeBoundedMeasurement({
    handoff: await handoff(),
    measurementStartedAt: '2026-10-03T05:00:00.000Z',
    requestJson: async (request) => {
      if (request.method === 'channels.list') {
        return {
          items: [{
            id: request.params.id,
            contentDetails: {
              relatedPlaylists: {
                uploads: 'uploads-' + request.params.id,
              },
            },
          }],
        };
      }
      if (request.method === 'playlistItems.list') {
        return {
          items: [{
            contentDetails: {
              videoId: 'video-' + request.params.playlistId,
              videoPublishedAt: '2026-10-03T13:30:00+09:00',
            },
          }],
        };
      }
      return {
        items: [{
          id: request.params.id,
          statistics: {
            viewCount: '1',
          },
        }],
      };
    },
  });

  assert.equal(result.videoCountPerReactionRun, 5);
  assert.equal(result.providerCallsObserved.videosList, 5);
});

test('request-attempt callback records provider calls before a parser failure', async () => {
  const attempts: SnsFandomYoutubeApiRequest[] = [];

  await assert.rejects(
    executeSnsFandomYoutubeBoundedMeasurement({
      handoff: await handoff(),
      measurementStartedAt: '2026-10-03T05:00:00.000Z',
      onRequestAttempt: (request) => attempts.push(request),
      requestJson: async (request) => {
        if (request.method === 'channels.list') {
          return {
            items: [{
              id: request.params.id,
              contentDetails: {
                relatedPlaylists: {
                  uploads: 'uploads-' + request.params.id,
                },
              },
            }],
          };
        }
        if (request.method === 'playlistItems.list') {
          return {
            items: [{
              contentDetails: {
                videoId: 'video-' + request.params.playlistId,
                videoPublishedAt: 'not-a-provider-datetime',
              },
            }],
          };
        }
        throw new Error('videos.list must not be reached after parser failure');
      },
    }),
    /sns_fandom_bounded_measurement_video_published_at_invalid/,
  );

  assert.deepEqual(
    attempts.map((request) => request.method),
    ['channels.list', 'playlistItems.list'],
  );
});

test('operation failure receipt is wired to attempted-provider-call counters', async () => {
  const source = await readFile(
    new URL(
      '../scripts/operations/snsFandomYoutubeBoundedMeasurementV1.mts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    source,
    /providerCallMayHaveOccurred: providerCallsAttempted\.total > 0/,
  );
  assert.match(
    source,
    /providerCallsAttempted: \{ \.\.\.providerCallsAttempted \}/,
  );
  assert.match(source, /onRequestAttempt:/);
});
