import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMusicBrainzActivityResearchCollector,
  MUSICBRAINZ_ACTIVITY_PAGE_SIZE,
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

function page(offset: number, groups: unknown[], count = groups.length) {
  return {
    'release-group-count': count,
    'release-group-offset': offset,
    'release-groups': groups,
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

test('collector paginates release groups and normalizes observed release events', async () => {
  const requests: URL[] = [];
  const groups = [
    releaseGroup({
      id: '066225ff-a8bd-4183-bff5-08329f0a063a',
      title: 'The Winning',
      date: '2024-02-20',
    }),
    releaseGroup({
      id: '2d7f2788-c4d2-4a79-9182-4d6259ab9ddd',
      title: 'Palette',
      date: '2017-04-21',
    }),
  ];
  const syntheticFetch: MusicBrainzActivityFetch = async (input) => {
    const url = new URL(input);
    requests.push(url);
    const offset = Number(url.searchParams.get('offset'));
    return offset === 0
      ? jsonResponse(page(0, [groups[0]], 2))
      : jsonResponse(page(1, [groups[1]], 2));
  };

  const result = await createMusicBrainzActivityResearchCollector({
    fetch: syntheticFetch,
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].searchParams.get('artist'), iuMbid);
  assert.equal(requests[0].searchParams.get('limit'), String(MUSICBRAINZ_ACTIVITY_PAGE_SIZE));
  assert.equal(result.pages.length, 2);
  assert.equal(result.rawObservations.length, 2);
  assert.equal(result.events.length, 2);
  assert.deepEqual(result.validationIssues, []);
  assert.equal(result.events[0].occurredAt, '2024-02-20');
  assert.equal(result.events[0].eventFamily, 'release');
  assert.equal(result.events[0].sourceEntityId, groups[0].id);
});

test('partial dates preserve provider precision', async () => {
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async () => jsonResponse(page(0, [
      releaseGroup({
        id: '2d7f2788-c4d2-4a79-9182-4d6259ab9ddd',
        title: 'Partial Date',
        date: '2017-04',
      }),
    ])),
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.events[0].occurredAt, '2017-04');
  assert.equal(result.events[0].occurredAtPrecision, 'month');
});

test('missing release date remains raw evidence and does not fabricate observed event', async () => {
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async () => jsonResponse(page(0, [
      releaseGroup({
        id: '2d7f2788-c4d2-4a79-9182-4d6259ab9ddd',
        title: 'Missing Date',
      }),
    ])),
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.rawObservations.length, 1);
  assert.equal(result.events.length, 0);
  assert.deepEqual(result.rawObservations[0].normalizedEventIds, []);
});

test('artist-credit mismatch is preserved as evidence but blocked from normalized event', async () => {
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async () => jsonResponse(page(0, [
      releaseGroup({
        id: '2d7f2788-c4d2-4a79-9182-4d6259ab9ddd',
        title: 'Wrong Artist',
        date: '2024-01-01',
        artistId: '00000000-0000-4000-8000-000000000000',
      }),
    ])),
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.rawObservations.length, 1);
  assert.equal(result.events.length, 0);
});

test('duplicate release-group IDs across pages do not create duplicate activity events', async () => {
  const group = releaseGroup({
    id: '066225ff-a8bd-4183-bff5-08329f0a063a',
    title: 'The Winning',
    date: '2024-02-20',
  });
  let calls = 0;
  const result = await createMusicBrainzActivityResearchCollector({
    fetch: async () => {
      calls += 1;
      return calls === 1
        ? jsonResponse(page(0, [group], 2))
        : jsonResponse(page(1, [group], 2));
    },
    now: () => new Date(collectedAt),
  }).collect({ artistId: 'iu', providerArtistId: iuMbid });

  assert.equal(result.events.length, 1);
  assert.equal(result.rawObservations.length, 1);
  assert.deepEqual(result.validationIssues, []);
});

test('pagination count changing mid-collection fails closed', async () => {
  let calls = 0;
  const collector = createMusicBrainzActivityResearchCollector({
    fetch: async () => {
      calls += 1;
      return calls === 1
        ? jsonResponse(page(0, [releaseGroup({
            id: '066225ff-a8bd-4183-bff5-08329f0a063a',
            title: 'A',
            date: '2024-02-20',
          })], 2))
        : jsonResponse(page(1, [releaseGroup({
            id: '2d7f2788-c4d2-4a79-9182-4d6259ab9ddd',
            title: 'B',
            date: '2017-04-21',
          })], 3));
    },
  });

  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: iuMbid }),
    { message: 'musicbrainz_activity_pagination_changed_during_collection' },
  );
});

test('malformed provider payload fails closed', async () => {
  const collector = createMusicBrainzActivityResearchCollector({
    fetch: async () => jsonResponse({
      'release-group-count': 1,
      'release-group-offset': 0,
      'release-groups': [{ id: 'not-an-mbid', title: 'bad' }],
    }),
  });

  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: iuMbid }),
    { message: 'musicbrainz_activity_response_invalid' },
  );
});

test('invalid artist MBID is rejected before fetch', async () => {
  let calls = 0;
  const collector = createMusicBrainzActivityResearchCollector({
    fetch: async () => {
      calls += 1;
      return jsonResponse(page(0, []));
    },
  });
  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: 'iu-text-alias' }),
    { message: 'musicbrainz_activity_artist_id_invalid' },
  );
  assert.equal(calls, 0);
});
