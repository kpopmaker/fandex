import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMusicBrainzActivityExposureCollector,
  MUSICBRAINZ_ACTIVITY_EXPOSURE_MIN_REQUEST_INTERVAL_MS,
  type MusicBrainzActivityExposureFetch,
} from '../lib/server/ingestion/activityExposureMusicBrainzCollector';

const iuMbid = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const collaboratorMbid = '11111111-1111-4111-8111-111111111111';
const collectedAt = '2026-09-24T00:30:00.000Z';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function releaseGroup(input: Readonly<{
  id?: string;
  title?: string;
  date?: string;
  credits?: readonly Readonly<{
    id: string;
    name: string;
  }>[];
}>) {
  return {
    id: input.id ?? '066225ff-a8bd-4183-bff5-08329f0a063a',
    title: input.title ?? 'The Winning',
    'first-release-date': input.date ?? '2024-02-20',
    'primary-type': 'EP',
    'secondary-types': [],
    'artist-credit': (input.credits ?? [{ id: iuMbid, name: 'IU' }]).map(
      (credit) => ({
        name: credit.name,
        artist: {
          id: credit.id,
          name: credit.name,
          'sort-name': credit.name,
        },
      }),
    ),
  };
}

function release(input: Readonly<{
  id?: string;
  title?: string;
  status?: string;
  date?: string;
}>) {
  return {
    id: input.id ?? '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
    title: input.title ?? 'The Winning',
    status: input.status ?? 'Official',
    date: input.date,
    country: 'KR',
  };
}

test('MusicBrainz Production collector requires concrete Official release support', async () => {
  const sleeps: number[] = [];
  const fetcher: MusicBrainzActivityExposureFetch = async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/release-group')) {
      return jsonResponse({
        'release-group-count': 1,
        'release-group-offset': 0,
        'release-groups': [releaseGroup({})],
      });
    }
    return jsonResponse({
      'release-count': 1,
      'release-offset': 0,
      releases: [release({ date: '2024-02-20' })],
    });
  };

  const result = await createMusicBrainzActivityExposureCollector({
    fetch: fetcher,
    now: () => new Date(collectedAt),
    sleep: async (milliseconds) => { sleeps.push(milliseconds); },
  }).collect({
    artistId: 'iu',
    providerArtistId: iuMbid,
  });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].occurredAt, '2024-02-20');
  assert.equal(result.events[0].occurredAtPrecision, 'day');
  assert.equal(result.providerCoverage.collectionStatus, 'succeeded');
  assert.equal(result.providerCoverage.coverageState, 'covered');
  assert.deepEqual(result.missingSourceDataReleaseGroupIds, []);
  assert.ok(
    result.rawObservations.every(
      (observation) => observation.rawPayloadRetentionState === 'digest-only',
    ),
  );
  assert.ok(
    result.rawObservations.every(
      (observation) => observation.authorizationState === 'review-required',
    ),
  );
  assert.equal(sleeps[0], MUSICBRAINZ_ACTIVITY_EXPOSURE_MIN_REQUEST_INTERVAL_MS);
});

test('release-group provenance date alone becomes bounded partial, never an event or zero', async () => {
  const result = await createMusicBrainzActivityExposureCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse({
          'release-group-count': 1,
          'release-group-offset': 0,
          'release-groups': [releaseGroup({ date: '2010-09-28' })],
        });
      }
      return jsonResponse({
        'release-count': 0,
        'release-offset': 0,
        releases: [],
      });
    },
    now: () => new Date(collectedAt),
    sleep: async () => {},
  }).collect({
    artistId: 'iu',
    providerArtistId: iuMbid,
  });

  assert.equal(result.events.length, 0);
  assert.equal(result.missingSourceDataReleaseGroupIds.length, 1);
  assert.equal(result.providerCoverage.collectionStatus, 'bounded_partial');
  assert.equal(result.providerCoverage.coverageState, 'partial');
  assert.equal('score' in result, false);
  assert.equal('value' in result.providerCoverage, false);
  assert.equal('inactive' in result.providerCoverage, false);
});

test('collaboration artist credits remain multi-artist in Production event', async () => {
  const result = await createMusicBrainzActivityExposureCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse({
          'release-group-count': 1,
          'release-group-offset': 0,
          'release-groups': [releaseGroup({
            title: 'Joint Release',
            credits: [
              { id: iuMbid, name: 'IU' },
              { id: collaboratorMbid, name: 'Collaborator' },
            ],
          })],
        });
      }
      return jsonResponse({
        'release-count': 1,
        'release-offset': 0,
        releases: [release({ title: 'Joint Release', date: '2024-02-20' })],
      });
    },
    now: () => new Date(collectedAt),
    sleep: async () => {},
  }).collect({
    artistId: 'iu',
    providerArtistId: iuMbid,
  });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].participationScope, 'collaboration');
  assert.deepEqual(
    result.events[0].providerArtistCredits.map((credit) => credit.providerArtistId),
    [iuMbid, collaboratorMbid],
  );
});

test('MusicBrainz changing pagination count fails closed', async () => {
  let releaseCalls = 0;
  const collector = createMusicBrainzActivityExposureCollector({
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/release-group')) {
        return jsonResponse({
          'release-group-count': 1,
          'release-group-offset': 0,
          'release-groups': [releaseGroup({})],
        });
      }
      releaseCalls += 1;
      return releaseCalls === 1
        ? jsonResponse({
            'release-count': 2,
            'release-offset': 0,
            releases: [release({ date: '2024-02-20' })],
          })
        : jsonResponse({
            'release-count': 3,
            'release-offset': 1,
            releases: [release({
              id: 'ae97cc33-21cf-4ddf-8824-70e3ae2ba1f7',
              date: '2024-02-21',
            })],
          });
    },
    sleep: async () => {},
  });

  await assert.rejects(
    collector.collect({ artistId: 'iu', providerArtistId: iuMbid }),
    { message: 'musicbrainz_activity_exposure_pagination_changed' },
  );
});

test('MusicBrainz raw evidence digest is invariant to JSON object key order', async () => {
  const groupA = {
    id: '066225ff-a8bd-4183-bff5-08329f0a063a',
    title: 'The Winning',
    'first-release-date': '2024-02-20',
    'artist-credit': [{
      name: 'IU',
      artist: {
        id: iuMbid,
        name: 'IU',
        'sort-name': 'IU',
      },
    }],
  };
  const groupB = {
    'artist-credit': [{
      artist: {
        'sort-name': 'IU',
        name: 'IU',
        id: iuMbid,
      },
      name: 'IU',
    }],
    'first-release-date': '2024-02-20',
    title: 'The Winning',
    id: '066225ff-a8bd-4183-bff5-08329f0a063a',
  };
  const releaseA = {
    id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
    title: 'The Winning',
    status: 'Official',
    date: '2024-02-20',
    country: 'KR',
  };
  const releaseB = {
    country: 'KR',
    date: '2024-02-20',
    status: 'Official',
    title: 'The Winning',
    id: '1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3',
  };

  async function collect(
    group: Record<string, unknown>,
    providerRelease: Record<string, unknown>,
  ) {
    return createMusicBrainzActivityExposureCollector({
      fetch: async (input) => {
        const url = new URL(input);
        return url.pathname.endsWith('/release-group')
          ? jsonResponse({
              'release-group-count': 1,
              'release-group-offset': 0,
              'release-groups': [group],
            })
          : jsonResponse({
              'release-count': 1,
              'release-offset': 0,
              releases: [providerRelease],
            });
      },
      now: () => new Date(collectedAt),
      sleep: async () => {},
    }).collect({
      artistId: 'iu',
      providerArtistId: iuMbid,
    });
  }

  const first = await collect(groupA, releaseA);
  const reordered = await collect(groupB, releaseB);
  const evidenceDigests = (
    observations: typeof first.rawObservations,
  ) => observations
    .map((observation) => [
      observation.sourceEntityType,
      observation.sourceEntityId,
      observation.rawPayloadDigest,
    ].join(':'))
    .sort();

  assert.deepEqual(
    evidenceDigests(first.rawObservations),
    evidenceDigests(reordered.rawObservations),
  );
});
