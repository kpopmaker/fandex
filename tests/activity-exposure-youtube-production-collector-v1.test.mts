import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createYouTubeActivityExposureCollector,
  type YouTubeActivityExposureFetch,
} from '../lib/server/ingestion/activityExposureYouTubeCollector';

const channelId = 'UC3SyT4_WLHzN7JmHQwKQZww';
const apiKey = 'synthetic-youtube-api-key';
const collectedAt = '2026-09-24T00:45:00.000Z';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

test('YouTube Production collector exhausts uploads pages and emits exact publication events', async () => {
  const requests: URL[] = [];
  const fetcher: YouTubeActivityExposureFetch = async (input) => {
    const url = new URL(input);
    requests.push(url);

    if (url.pathname.endsWith('/channels')) {
      return jsonResponse({
        items: [{
          id: channelId,
          contentDetails: {
            relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' },
          },
        }],
      });
    }

    if (url.pathname.endsWith('/playlistItems')) {
      const pageToken = url.searchParams.get('pageToken');
      return pageToken
        ? jsonResponse({
            items: [{ contentDetails: { videoId: 'kHW-UVXOcLU' } }],
          })
        : jsonResponse({
            nextPageToken: 'NEXT',
            items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }],
          });
    }

    return jsonResponse({
      items: [
        {
          id: 'JleoAppaxi0',
          snippet: {
            channelId,
            title: "IU 'Love wins all' MV",
            publishedAt: '2024-01-23T15:00:00Z',
          },
        },
        {
          id: 'kHW-UVXOcLU',
          snippet: {
            channelId,
            title: "IU 'Shopper' MV",
            publishedAt: '2024-02-20T09:00:00Z',
          },
        },
      ],
    });
  };

  const result = await createYouTubeActivityExposureCollector({
    apiKey,
    fetch: fetcher,
    now: () => new Date(collectedAt),
  }).collect({
    artistId: 'iu',
    providerArtistId: channelId,
  });

  assert.deepEqual(result.playlistVideoIds, ['JleoAppaxi0', 'kHW-UVXOcLU']);
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].occurredAtPrecision, 'timestamp');
  assert.equal(result.events[0].occurredAt, '2024-01-23T15:00:00Z');
  assert.equal(result.providerCoverage.collectionStatus, 'succeeded');
  assert.equal(result.providerCoverage.coverageState, 'covered');
  assert.deepEqual(result.unavailableVideoIds, []);
  assert.ok(
    result.rawObservations.every(
      (observation) => observation.rawPayloadRetentionState === 'digest-only',
    ),
  );
  assert.ok(requests.every((request) => request.searchParams.get('key') === apiKey));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(apiKey));
});

test('playlist video omitted by videos.list is explicit bounded partial, not zero or inactive', async () => {
  const collector = createYouTubeActivityExposureCollector({
    apiKey,
    now: () => new Date(collectedAt),
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({
          items: [{
            id: channelId,
            contentDetails: {
              relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' },
            },
          }],
        });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        return jsonResponse({
          items: [
            { contentDetails: { videoId: 'JleoAppaxi0' } },
            { contentDetails: { videoId: 'kHW-UVXOcLU' } },
          ],
        });
      }
      return jsonResponse({
        items: [{
          id: 'JleoAppaxi0',
          snippet: {
            channelId,
            title: "IU 'Love wins all' MV",
            publishedAt: '2024-01-23T15:00:00Z',
          },
        }],
      });
    },
  });

  const result = await collector.collect({
    artistId: 'iu',
    providerArtistId: channelId,
  });

  assert.deepEqual(result.unavailableVideoIds, ['kHW-UVXOcLU']);
  assert.equal(result.events.length, 1);
  assert.equal(result.providerCoverage.collectionStatus, 'bounded_partial');
  assert.equal(result.providerCoverage.coverageState, 'partial');
  assert.equal('value' in result.providerCoverage, false);
  assert.equal('inactive' in result.providerCoverage, false);
  assert.ok(
    result.rawObservations.some(
      (observation) =>
        observation.sourceEntityId === 'kHW-UVXOcLU'
        && observation.normalizedEventIds.length === 0,
    ),
  );
});

test('video from non-canonical channel remains evidence but not an observed event', async () => {
  const result = await createYouTubeActivityExposureCollector({
    apiKey,
    now: () => new Date(collectedAt),
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({
          items: [{
            id: channelId,
            contentDetails: {
              relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' },
            },
          }],
        });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        return jsonResponse({
          items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }],
        });
      }
      return jsonResponse({
        items: [{
          id: 'JleoAppaxi0',
          snippet: {
            channelId: 'UC0000000000000000000000',
            title: 'Wrong channel',
            publishedAt: '2024-01-23T15:00:00Z',
          },
        }],
      });
    },
  }).collect({
    artistId: 'iu',
    providerArtistId: channelId,
  });

  assert.equal(result.events.length, 0);
  assert.deepEqual(result.channelMismatchVideoIds, ['JleoAppaxi0']);
  assert.equal(result.providerCoverage.collectionStatus, 'bounded_partial');
});

test('invalid exact publishedAt fails closed without rendered-date fallback', async () => {
  const collector = createYouTubeActivityExposureCollector({
    apiKey,
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({
          items: [{
            id: channelId,
            contentDetails: {
              relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' },
            },
          }],
        });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        return jsonResponse({
          items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }],
        });
      }
      return jsonResponse({
        items: [{
          id: 'JleoAppaxi0',
          snippet: {
            channelId,
            title: "IU 'Love wins all' MV",
            publishedAt: '2024-01-23',
          },
        }],
      });
    },
  });

  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: channelId }),
    { message: 'youtube_activity_exposure_response_invalid' },
  );
});
