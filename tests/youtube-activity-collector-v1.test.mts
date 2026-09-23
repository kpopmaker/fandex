import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createYouTubeActivityResearchCollector,
  type YouTubeActivityFetch,
} from '../lib/server/research/youtubeActivityCollector';

const channelId = 'UC3SyT4_WLHzN7JmHQwKQZww';
const apiKey = 'synthetic-youtube-api-key';
const collectedAt = '2026-09-23T13:00:00.000Z';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

test('collector resolves uploads playlist, paginates, and emits exact publication events', async () => {
  const requests: URL[] = [];
  const fetcher: YouTubeActivityFetch = async (input) => {
    const url = new URL(input);
    requests.push(url);
    if (url.pathname.endsWith('/channels')) {
      return jsonResponse({ items: [{
        id: channelId,
        contentDetails: { relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' } },
      }] });
    }
    if (url.pathname.endsWith('/playlistItems')) {
      const token = url.searchParams.get('pageToken');
      return token
        ? jsonResponse({ items: [{ contentDetails: { videoId: 'kHW-UVXOcLU' } }] })
        : jsonResponse({
            nextPageToken: 'NEXT',
            items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }],
          });
    }
    return jsonResponse({ items: [
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
    ] });
  };

  const result = await createYouTubeActivityResearchCollector({
    apiKey,
    fetch: fetcher,
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: channelId });

  assert.equal(result.uploadsPlaylistId, 'UU3SyT4_WLHzN7JmHQwKQZww');
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].occurredAtPrecision, 'timestamp');
  assert.equal(result.events[0].occurredAt, '2024-01-23T15:00:00Z');
  assert.deepEqual(result.validationIssues, []);
  assert.equal(result.rawObservations.length, 3);
  assert.ok(requests.every((url) => url.searchParams.get('key') === apiKey));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(apiKey));
});

test('video from non-canonical channel remains raw evidence but does not become event', async () => {
  const result = await createYouTubeActivityResearchCollector({
    apiKey,
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({ items: [{
          id: channelId,
          contentDetails: { relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' } },
        }] });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        return jsonResponse({ items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }] });
      }
      return jsonResponse({ items: [{
        id: 'JleoAppaxi0',
        snippet: {
          channelId: 'UC0000000000000000000000',
          title: 'Wrong channel',
          publishedAt: '2024-01-23T15:00:00Z',
        },
      }] });
    },
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: channelId });

  assert.equal(result.events.length, 0);
  assert.equal(result.rawObservations.length, 2);
});

test('duplicate video IDs across playlist pages are deduplicated before video lookup', async () => {
  const videoRequestIds: string[] = [];
  const result = await createYouTubeActivityResearchCollector({
    apiKey,
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({ items: [{
          id: channelId,
          contentDetails: { relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' } },
        }] });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        const token = url.searchParams.get('pageToken');
        return token
          ? jsonResponse({ items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }] })
          : jsonResponse({
              nextPageToken: 'NEXT',
              items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }],
            });
      }
      videoRequestIds.push(url.searchParams.get('id') ?? '');
      return jsonResponse({ items: [{
        id: 'JleoAppaxi0',
        snippet: {
          channelId,
          title: "IU 'Love wins all' MV",
          publishedAt: '2024-01-23T15:00:00Z',
        },
      }] });
    },
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: channelId });

  assert.deepEqual(videoRequestIds, ['JleoAppaxi0']);
  assert.equal(result.events.length, 1);
});

test('playlist pagination cycle fails closed', async () => {
  let playlistCalls = 0;
  const collector = createYouTubeActivityResearchCollector({
    apiKey,
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({ items: [{
          id: channelId,
          contentDetails: { relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' } },
        }] });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        playlistCalls += 1;
        return jsonResponse({
          nextPageToken: 'SAME',
          items: [{ contentDetails: { videoId: playlistCalls === 1 ? 'JleoAppaxi0' : 'kHW-UVXOcLU' } }],
        });
      }
      return jsonResponse({ items: [] });
    },
  });

  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: channelId }),
    { message: 'youtube_activity_pagination_cycle' },
  );
});

test('channel response must resolve exactly one canonical channel', async () => {
  const collector = createYouTubeActivityResearchCollector({
    apiKey,
    fetch: async () => jsonResponse({ items: [] }),
  });
  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: channelId }),
    { message: 'youtube_activity_channel_not_unique' },
  );
});

test('invalid exact publishedAt fails closed instead of falling back to day precision', async () => {
  const collector = createYouTubeActivityResearchCollector({
    apiKey,
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({ items: [{
          id: channelId,
          contentDetails: { relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' } },
        }] });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        return jsonResponse({ items: [{ contentDetails: { videoId: 'JleoAppaxi0' } }] });
      }
      return jsonResponse({ items: [{
        id: 'JleoAppaxi0',
        snippet: {
          channelId,
          title: "IU 'Love wins all' MV",
          publishedAt: '2024-01-23',
        },
      }] });
    },
  });

  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: channelId }),
    { message: 'youtube_activity_response_invalid' },
  );
});

test('api key and channel id are validated before provider fetch', async () => {
  assert.throws(
    () => createYouTubeActivityResearchCollector({ apiKey: ' bad-key ' }),
    { message: 'youtube_activity_config_invalid' },
  );

  let calls = 0;
  const collector = createYouTubeActivityResearchCollector({
    apiKey,
    fetch: async () => {
      calls += 1;
      return jsonResponse({});
    },
  });
  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: 'not-a-channel-id' }),
    { message: 'youtube_activity_channel_id_invalid' },
  );
  assert.equal(calls, 0);
});
