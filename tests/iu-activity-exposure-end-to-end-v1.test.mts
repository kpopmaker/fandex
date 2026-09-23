import test from 'node:test';
import assert from 'node:assert/strict';

import { validateActivityExposureStream } from '../lib/research/activityExposure';
import { canDeterministicallyReplay } from '../lib/research/activityExposureObservation';
import { createMusicBrainzActivityResearchCollector } from '../lib/server/research/musicBrainzActivityCollector';
import { createYouTubeActivityResearchCollector } from '../lib/server/research/youtubeActivityCollector';

const artistId = 'iu';
const musicbrainzArtistId = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const youtubeChannelId = 'UC3SyT4_WLHzN7JmHQwKQZww';
const collectedAt = '2026-09-23T13:30:00.000Z';

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

test('IU v1 provider collectors form one valid evidence stream without numeric aggregation', async () => {
  const musicbrainz = await createMusicBrainzActivityResearchCollector({
    now: () => new Date(collectedAt),
    sleep: async () => {},
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse({
          'release-group-count': 1,
          'release-group-offset': 0,
          'release-groups': [{
            id: '066225ff-a8bd-4183-bff5-08329f0a063a',
            title: 'The Winning',
            'first-release-date': '2024-02-20',
            'primary-type': 'EP',
            'secondary-types': [],
            'artist-credit': [{
              name: 'IU',
              artist: {
                id: musicbrainzArtistId,
                name: 'IU',
                'sort-name': 'IU',
              },
            }],
          }],
        });
      }
      return jsonResponse({
        'release-count': 1,
        'release-offset': 0,
        releases: [{
          id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
          title: 'The Winning',
          status: 'Official',
          date: '2024-02-20',
          country: 'KR',
        }],
      });
    },
  }).collect({ artistId, providerArtistId: musicbrainzArtistId });

  const youtube = await createYouTubeActivityResearchCollector({
    apiKey: 'synthetic-youtube-api-key',
    now: () => new Date(collectedAt),
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/channels')) {
        return jsonResponse({
          items: [{
            id: youtubeChannelId,
            contentDetails: {
              relatedPlaylists: { uploads: 'UU3SyT4_WLHzN7JmHQwKQZww' },
            },
          }],
        });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        return jsonResponse({
          items: [{
            contentDetails: { videoId: 'kHW-UVXOcLU' },
          }],
        });
      }
      return jsonResponse({
        items: [{
          id: 'kHW-UVXOcLU',
          snippet: {
            channelId: youtubeChannelId,
            title: "IU 'Shopper' MV",
            publishedAt: '2024-02-20T09:00:00Z',
          },
        }],
      });
    },
  }).collect({ artistId, providerArtistId: youtubeChannelId });

  const combined = [...musicbrainz.events, ...youtube.events];
  const issues = validateActivityExposureStream(combined, {
    artistId,
    musicbrainzArtistId,
    youtubeChannelId,
  });

  assert.deepEqual(issues, []);
  assert.equal(combined.length, 2);
  assert.deepEqual(
    new Set(combined.map((event) => event.eventFamily)),
    new Set(['release', 'official_content']),
  );
  assert.equal(combined[0].sourceProvider, 'musicbrainz');
  assert.equal(combined[1].sourceProvider, 'youtube');

  for (const event of combined) {
    for (const field of [
      'score',
      'point',
      'weight',
      'decay',
      'activeWindowDays',
      'activityCount',
      'aggregateCount',
    ]) {
      assert.equal(Object.prototype.hasOwnProperty.call(event, field), false);
    }
  }

  assert.equal(
    canDeterministicallyReplay([
      ...musicbrainz.rawObservations,
      ...youtube.rawObservations,
    ]),
    true,
  );
});

test('same calendar date across release and video publication remains two distinct events', async () => {
  const releaseEvent = {
    artistId,
    eventId: 'activity:musicbrainz:release-group:066225ff-a8bd-4183-bff5-08329f0a063a',
    eventFamily: 'release' as const,
    eventType: 'confirmed_release',
    lifecycleState: 'observed' as const,
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: '2024-02-20',
    occurredAtPrecision: 'day' as const,
    sourcePublishedAt: null,
    collectedAt,
    sourceProvider: 'musicbrainz' as const,
    sourceEntityType: 'release-group',
    sourceEntityId: '066225ff-a8bd-4183-bff5-08329f0a063a',
    canonicalFamilyId: '066225ff-a8bd-4183-bff5-08329f0a063a',
    providerArtistId: musicbrainzArtistId,
    evidenceRef: 'https://musicbrainz.org/release-group/066225ff-a8bd-4183-bff5-08329f0a063a',
    identityState: 'resolved_for_research',
    missingState: 'covered' as const,
    evidenceState: 'direct_provider_evidence_with_official_release_support',
    conflictState: 'clear',
    timeZoneState: 'not_applicable_date_only',
    revisionId: 'research-collection',
    supersedesRevisionId: null,
  };

  const videoEvent = {
    artistId,
    eventId: 'activity:youtube:video:kHW-UVXOcLU',
    eventFamily: 'official_content' as const,
    eventType: 'official_video_publication',
    lifecycleState: 'observed' as const,
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: '2024-02-20T09:00:00Z',
    occurredAtPrecision: 'timestamp' as const,
    sourcePublishedAt: '2024-02-20T09:00:00Z',
    collectedAt,
    sourceProvider: 'youtube' as const,
    sourceEntityType: 'video',
    sourceEntityId: 'kHW-UVXOcLU',
    canonicalFamilyId: null,
    providerArtistId: youtubeChannelId,
    evidenceRef: 'https://www.youtube.com/watch?v=kHW-UVXOcLU',
    identityState: 'resolved_for_research',
    missingState: 'covered' as const,
    evidenceState: 'direct_provider_evidence',
    conflictState: 'clear',
    timeZoneState: 'provider_iso8601_timestamp',
    revisionId: 'research-collection',
    supersedesRevisionId: null,
  };

  assert.deepEqual(
    validateActivityExposureStream([releaseEvent, videoEvent], {
      artistId,
      musicbrainzArtistId,
      youtubeChannelId,
    }),
    [],
  );
  assert.notEqual(releaseEvent.eventId, videoEvent.eventId);
  assert.notEqual(releaseEvent.eventFamily, videoEvent.eventFamily);
});
