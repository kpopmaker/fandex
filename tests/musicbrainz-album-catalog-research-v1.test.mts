import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMusicBrainzReleaseGroupBrowseUrl,
  decodeMusicBrainzReleaseGroupPage,
  MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR,
  MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION,
  parseMusicBrainzAlbumCatalogResearchCommand,
  runMusicBrainzAlbumCatalogResearch,
} from '../lib/alternative-evidence/musicbrainzAlbumCatalogResearch';

const IU_MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const UNKNOWN_PLANET_RELEASE_GROUP_ID = 'b2c99753-a266-4571-8c66-809579893470';

const providerFixture = Object.freeze({
  'release-group-count': 2,
  'release-group-offset': 0,
  'release-groups': [
    {
      id: UNKNOWN_PLANET_RELEASE_GROUP_ID,
      title: 'Unknown Planet',
      'first-release-date': '2026-09-10',
      'primary-type': 'Single',
      'secondary-types': [],
      'artist-credit': [
        {
          name: 'IU',
          joinphrase: '',
          artist: {
            id: IU_MUSICBRAINZ_ARTIST_ID,
            name: 'IU',
          },
        },
      ],
    },
    {
      id: '11111111-2222-4333-8444-555555555555',
      title: 'Synthetic collaboration fixture',
      'first-release-date': '2026-01-01',
      'primary-type': 'Single',
      'secondary-types': ['Compilation'],
      'artist-credit': [
        {
          name: 'Other Artist',
          joinphrase: ' & ',
          artist: {
            id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            name: 'Other Artist',
          },
        },
        {
          name: 'IU',
          joinphrase: '',
          artist: {
            id: IU_MUSICBRAINZ_ARTIST_ID,
            name: 'IU',
          },
        },
      ],
    },
  ],
});

test('descriptor is research-only and cannot publish Product score', () => {
  assert.equal(MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR.productScorePublished, false);
  assert.equal(MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR.productMethodologyFrozen, false);
  assert.equal(MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR.productionEligible, false);
  assert.equal(MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR.pollingAllowed, false);
  assert.equal(MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR.maxAverageRequestsPerSecond, 1);
});

test('browse request is artist-MBID scoped and preserves provider website-default status filter', () => {
  const url = new URL(buildMusicBrainzReleaseGroupBrowseUrl({
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    limit: 100,
    offset: 0,
  }));
  assert.equal(url.origin, 'https://musicbrainz.org');
  assert.equal(url.pathname, '/ws/2/release-group');
  assert.equal(url.searchParams.get('artist'), IU_MUSICBRAINZ_ARTIST_ID);
  assert.equal(url.searchParams.get('limit'), '100');
  assert.equal(url.searchParams.get('offset'), '0');
  assert.equal(url.searchParams.get('fmt'), 'json');
  assert.equal(url.searchParams.get('inc'), 'artist-credits');
  assert.equal(url.searchParams.get('release-group-status'), 'website-default');
});

test('command requires explicit canonical and provider artist identities', () => {
  assert.deepEqual(parseMusicBrainzAlbumCatalogResearchCommand([
    '--canonical-artist-id=iu',
    `--provider-artist-id=${IU_MUSICBRAINZ_ARTIST_ID}`,
  ]), {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    limit: 100,
    offset: 0,
  });
  assert.throws(() => parseMusicBrainzAlbumCatalogResearchCommand([]), /canonical_artist_id_required/);
  assert.throws(() => parseMusicBrainzAlbumCatalogResearchCommand([
    '--canonical-artist-id=iu',
    `--provider-artist-id=${IU_MUSICBRAINZ_ARTIST_ID}`,
    '--limit=101',
  ]), /musicbrainz_limit_must_be_1_to_100/);
});

test('decoder preserves release-group metadata without converting it into album score semantics', () => {
  const result = decodeMusicBrainzReleaseGroupPage(providerFixture, {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    requestedLimit: 100,
    collectedAt: '2026-09-16T10:00:00.000Z',
  });
  assert.equal(result.contractVersion, MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION);
  assert.equal(result.lifecycle, 'research');
  assert.equal(result.productScorePublished, false);
  assert.equal(result.providerReleaseGroupCount, 2);
  assert.equal(result.returnedCount, 2);
  assert.equal(result.paginationState, 'provider-count-covered');

  const unknownPlanet = result.observations[0];
  assert.equal(unknownPlanet.providerReleaseGroupId, UNKNOWN_PLANET_RELEASE_GROUP_ID);
  assert.equal(unknownPlanet.title, 'Unknown Planet');
  assert.equal(unknownPlanet.firstReleaseDate, '2026-09-10');
  assert.equal(unknownPlanet.primaryType, 'Single');
  assert.deepEqual(unknownPlanet.secondaryTypes, []);
  assert.equal(unknownPlanet.canonicalArtistCreditState, 'sole-credit');
  assert.equal(unknownPlanet.providerObservationTime, null);
  assert.equal(unknownPlanet.collectedAt, '2026-09-16T10:00:00.000Z');
  assert.equal(unknownPlanet.catalogInclusionMeaning, 'observed-in-provider-artist-release-group-browse');
  assert.match(unknownPlanet.providerPayloadDigest, /^[a-f0-9]{64}$/);
  assert.ok(!('value' in unknownPlanet));
  assert.ok(!('score' in unknownPlanet));
});

test('collaboration credit is preserved instead of being treated as sole IU catalog ownership', () => {
  const result = decodeMusicBrainzReleaseGroupPage(providerFixture, {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    requestedLimit: 100,
    collectedAt: '2026-09-16T10:00:00.000Z',
  });
  const collaboration = result.observations[1];
  assert.equal(collaboration.canonicalArtistCreditState, 'multi-artist-credit');
  assert.equal(collaboration.artistCredit.length, 2);
  assert.equal(collaboration.artistCredit.filter((credit) => credit.canonicalArtistMatch).length, 1);
});

test('provider count can show that another page remains without pretending interval or catalog completeness', () => {
  const result = decodeMusicBrainzReleaseGroupPage({
    ...providerFixture,
    'release-group-count': 150,
  }, {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    requestedLimit: 100,
    collectedAt: '2026-09-16T10:00:00.000Z',
  });
  assert.equal(result.paginationState, 'more-pages-available');
});

test('runner is side-effect limited to one injected GET and returns research observations', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify(providerFixture), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await runMusicBrainzAlbumCatalogResearch([
    '--canonical-artist-id=iu',
    `--provider-artist-id=${IU_MUSICBRAINZ_ARTIST_ID}`,
  ], {
    fetchImpl,
    now: () => new Date('2026-09-16T10:00:00.000Z'),
    userAgent: 'FANDEXResearchTest/0.1 (https://github.com/kpopmaker/fandex)',
  });

  assert.match(requestUrl, /musicbrainz\.org\/ws\/2\/release-group/);
  assert.equal(requestInit?.method, 'GET');
  assert.equal((requestInit?.headers as Record<string, string>)['User-Agent'], 'FANDEXResearchTest/0.1 (https://github.com/kpopmaker/fandex)');
  assert.equal(result.observations.length, 2);
  assert.equal(result.directProductContributionEligible, false);
});

test('malformed provider rows fail closed', () => {
  assert.throws(() => decodeMusicBrainzReleaseGroupPage({}, {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    requestedLimit: 100,
    collectedAt: '2026-09-16T10:00:00.000Z',
  }), /musicbrainz_release_groups_missing/);

  assert.throws(() => decodeMusicBrainzReleaseGroupPage({
    'release-group-count': 1,
    'release-group-offset': 0,
    'release-groups': [{ title: 'missing id' }],
  }, {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    requestedLimit: 100,
    collectedAt: '2026-09-16T10:00:00.000Z',
  }), /musicbrainz_release_group_id_missing/);
});
