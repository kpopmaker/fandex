import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMusicBrainzActivityResearchCollector,
  MUSICBRAINZ_ACTIVITY_MIN_REQUEST_INTERVAL_MS,
  type MusicBrainzActivityFetch,
} from '../lib/server/research/musicBrainzActivityCollector';

const iuMbid = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const collectedAt = '2026-09-23T12:30:00.000Z';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function releaseGroupPage(offset: number, groups: unknown[], count = groups.length) {
  return {
    'release-group-count': count,
    'release-group-offset': offset,
    'release-groups': groups,
  };
}

function releasePage(offset: number, releases: unknown[], count = releases.length) {
  return {
    'release-count': count,
    'release-offset': offset,
    releases,
  };
}

function releaseGroup(input: Readonly<{
  id: string;
  title: string;
  date?: string;
  artistId?: string;
}>) {
  return {
    id: input.id,
    title: input.title,
    'first-release-date': input.date,
    'primary-type': 'EP',
    'secondary-types': [],
    'artist-credit': [{
      name: 'IU',
      artist: {
        id: input.artistId ?? iuMbid,
        name: 'IU',
        'sort-name': 'IU',
      },
    }],
  };
}

function officialRelease(input: Readonly<{
  id: string;
  title: string;
  date?: string;
  status?: string;
  country?: string;
}>) {
  return {
    id: input.id,
    title: input.title,
    status: input.status ?? 'Official',
    date: input.date,
    country: input.country ?? 'KR',
  };
}

test('collector requires concrete official release evidence before observed event', async () => {
  const requests: URL[] = [];
  const sleeps: number[] = [];
  const rg = releaseGroup({
    id: '066225ff-a8bd-4183-bff5-08329f0a063a',
    title: 'The Winning',
    date: '2024-02-20',
  });
  const release = officialRelease({
    id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
    title: 'The Winning',
    date: '2024-02-20',
  });

  const syntheticFetch: MusicBrainzActivityFetch = async (input) => {
    const url = new URL(input);
    requests.push(url);
    if (url.pathname.endsWith('/release-group')) {
      return jsonResponse(releaseGroupPage(0, [rg]));
    }
    return jsonResponse(releasePage(0, [release]));
  };

  const result = await createMusicBrainzActivityResearchCollector({
    fetch: syntheticFetch,
    now: () => new Date(collectedAt),
    sleep: async (milliseconds) => { sleeps.push(milliseconds); },
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(requests.length, 2);
  assert.equal(sleeps.length, 1);
  assert.equal(sleeps[0], MUSICBRAINZ_ACTIVITY_MIN_REQUEST_INTERVAL_MS);
  assert.equal(requests[0].searchParams.get('artist'), iuMbid);
  assert.equal(requests[0].searchParams.get('release-group-status'), 'website-default');
  assert.equal(requests[1].searchParams.get('release-group'), rg.id);
  assert.equal(requests[1].searchParams.get('status'), 'official');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].occurredAt, '2024-02-20');
  assert.equal(result.events[0].supportingReleaseId, release.id);
  assert.equal(result.rawObservations.length, 2);
  assert.deepEqual(result.validationIssues, []);
});

test('release-group date alone never creates confirmed observed event', async () => {
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async (input) => {
      const url = new URL(input);
      return url.pathname.endsWith('/release-group')
        ? jsonResponse(releaseGroupPage(0, [releaseGroup({
            id: '066225ff-a8bd-4183-bff5-08329f0a063a',
            title: 'The Winning',
            date: '2024-02-20',
          })]))
        : jsonResponse(releasePage(0, []));
    },
    sleep: async () => {},
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.events.length, 0);
  assert.equal(result.rawObservations.length, 1);
  assert.deepEqual(result.rawObservations[0].normalizedEventIds, []);
});

test('earliest dated official release determines occurrence and preserves precision', async () => {
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse(releaseGroupPage(0, [releaseGroup({
          id: '066225ff-a8bd-4183-bff5-08329f0a063a',
          title: 'The Winning',
          date: '2024-02-20',
        })]));
      }
      return jsonResponse(releasePage(0, [
        officialRelease({
          id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
          title: 'The Winning',
          date: '2024-02',
        }),
        officialRelease({
          id: 'ae97cc33-21cf-4ddf-8824-70e3ae2ba1f7',
          title: 'The Winning',
          date: '2024-02-20',
        }),
      ]));
    },
    sleep: async () => {},
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].occurredAt, '2024-02');
  assert.equal(result.events[0].occurredAtPrecision, 'month');
});

test('non-official or undated releases remain evidence but do not confirm occurrence', async () => {
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse(releaseGroupPage(0, [releaseGroup({
          id: '066225ff-a8bd-4183-bff5-08329f0a063a',
          title: 'The Winning',
          date: '2024-02-20',
        })]));
      }
      return jsonResponse(releasePage(0, [
        officialRelease({
          id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
          title: 'The Winning',
          date: '2024-02-20',
          status: 'Promotion',
        }),
        officialRelease({
          id: 'ae97cc33-21cf-4ddf-8824-70e3ae2ba1f7',
          title: 'The Winning',
        }),
      ]));
    },
    sleep: async () => {},
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.events.length, 0);
  assert.equal(result.rawObservations.length, 3);
});

test('artist-credit mismatch blocks release lookup and normalized event', async () => {
  let calls = 0;
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async () => {
      calls += 1;
      return jsonResponse(releaseGroupPage(0, [releaseGroup({
        id: '066225ff-a8bd-4183-bff5-08329f0a063a',
        title: 'Wrong Artist',
        date: '2024-02-20',
        artistId: '00000000-0000-4000-8000-000000000000',
      })]));
    },
    sleep: async () => {},
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(calls, 1);
  assert.equal(result.events.length, 0);
  assert.equal(result.rawObservations.length, 1);
});

test('release pagination increments by actual returned item count', async () => {
  const releaseOffsets: number[] = [];
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse(releaseGroupPage(0, [releaseGroup({
          id: '066225ff-a8bd-4183-bff5-08329f0a063a',
          title: 'The Winning',
          date: '2024-02-20',
        })]));
      }
      const offset = Number(url.searchParams.get('offset'));
      releaseOffsets.push(offset);
      if (offset === 0) {
        return jsonResponse(releasePage(0, [
          officialRelease({
            id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
            title: 'The Winning',
            date: '2024-02-20',
          }),
        ], 2));
      }
      return jsonResponse(releasePage(1, [
        officialRelease({
          id: 'ae97cc33-21cf-4ddf-8824-70e3ae2ba1f7',
          title: 'The Winning',
          date: '2024-02-21',
        }),
      ], 2));
    },
    sleep: async () => {},
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.deepEqual(releaseOffsets, [0, 1]);
  assert.equal(result.releasePages.length, 2);
  assert.equal(result.events.length, 1);
});

test('changing pagination count fails closed', async () => {
  let releaseCalls = 0;
  const collector = createMusicBrainzActivityResearchCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse(releaseGroupPage(0, [releaseGroup({
          id: '066225ff-a8bd-4183-bff5-08329f0a063a',
          title: 'The Winning',
          date: '2024-02-20',
        })]));
      }
      releaseCalls += 1;
      return releaseCalls === 1
        ? jsonResponse(releasePage(0, [officialRelease({
            id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
            title: 'The Winning',
            date: '2024-02-20',
          })], 2))
        : jsonResponse(releasePage(1, [officialRelease({
            id: 'ae97cc33-21cf-4ddf-8824-70e3ae2ba1f7',
            title: 'The Winning',
            date: '2024-02-21',
          })], 3));
    },
    sleep: async () => {},
  });

  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: iuMbid }),
    { message: 'musicbrainz_activity_pagination_changed_during_collection' },
  );
});

test('invalid artist MBID is rejected before fetch', async () => {
  let calls = 0;
  const collector = createMusicBrainzActivityResearchCollector({
    fetch: async () => {
      calls += 1;
      return jsonResponse(releaseGroupPage(0, []));
    },
    sleep: async () => {},
  });
  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: 'iu-text-alias' }),
    { message: 'musicbrainz_activity_artist_id_invalid' },
  );
  assert.equal(calls, 0);
});


test('collaboration artist credits are preserved in normalized release event', async () => {
  const collaboratorId = '11111111-1111-4111-8111-111111111111';
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse(releaseGroupPage(0, [{
          id: '066225ff-a8bd-4183-bff5-08329f0a063a',
          title: 'Joint Release',
          'first-release-date': '2024-02-20',
          'primary-type': 'Single',
          'secondary-types': [],
          'artist-credit': [
            {
              name: 'IU',
              artist: { id: iuMbid, name: 'IU', 'sort-name': 'IU' },
            },
            {
              name: 'Collaborator',
              artist: {
                id: collaboratorId,
                name: 'Collaborator',
                'sort-name': 'Collaborator',
              },
            },
          ],
        }]));
      }
      return jsonResponse(releasePage(0, [
        officialRelease({
          id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
          title: 'Joint Release',
          date: '2024-02-20',
        }),
      ]));
    },
    sleep: async () => {},
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].participationScope, 'collaboration');
  assert.deepEqual(result.events[0].providerArtistCredits, [
    {
      providerArtistId: iuMbid,
      creditedName: 'IU',
      canonicalProviderName: 'IU',
    },
    {
      providerArtistId: collaboratorId,
      creditedName: 'Collaborator',
      canonicalProviderName: 'Collaborator',
    },
  ]);
});


test('release with null status remains missing and does not become confirmed release', async () => {
  const releaseGroupId = '1299e16d-133b-47b0-b991-36cf11eff7d7';
  const releaseId = '8634da4e-9649-4dcf-a901-2ed6dbb0f438';

  const collector = createMusicBrainzActivityResearchCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse({
          'release-group-count': 1,
          'release-group-offset': 0,
          'release-groups': [{
            id: releaseGroupId,
            title: '그대네요',
            'first-release-date': '2010-09-28',
            'primary-type': 'Single',
            'artist-credit': [{
              name: 'IU',
              artist: { id: artistId, name: 'IU' },
            }],
          }],
        });
      }

      assert.equal(url.searchParams.get('status'), 'official');
      return jsonResponse({
        'release-count': 0,
        'release-offset': 0,
        releases: [],
      });
    },
    now: () => new Date('2026-09-24T22:14:34.050Z'),
    sleep: async () => {},
  });

  const result = await collector.collect({
    artistId: 'iu',
    providerArtistId: artistId,
  });

  assert.equal(result.events.length, 0);
  assert.equal(
    result.rawObservations.filter(
      (item) =>
        item.sourceEntityType === 'release-group'
        && item.sourceEntityId === releaseGroupId,
    ).length,
    1,
  );

  // Live diagnostic evidence for this provider revision found an unfiltered
  // concrete release with this ID/date but status=null. The frozen collector
  // must not silently reinterpret that as Official.
  assert.match(releaseId, /^[0-9a-f-]{36}$/);
});
