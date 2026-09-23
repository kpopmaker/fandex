import test from 'node:test';
import assert from 'node:assert/strict';

import { artistUniverseV4 } from '../app/data/v4/artistUniverse';
import { bindCanonicalArtistToNaverNews } from '../lib/server/ingestion/naverNewsArtistBinding';

test('audit NAVER artist identity coverage across the full artist universe', () => {
  const rows = artistUniverseV4.map((artist) => {
    const binding = bindCanonicalArtistToNaverNews(artist.id);
    const aliases = artist.profile.koreanAliases.filter((alias) => [...alias].length >= 2);
    return {
      artistId: artist.id,
      tier: artist.collection.tier,
      query: binding.query,
      koreanAliasCount: aliases.length,
      status: aliases.length > 0 ? 'identity-ready' : 'identity-metadata-required',
    };
  });

  const ready = rows.filter((row) => row.status === 'identity-ready');
  const blocked = rows.filter((row) => row.status === 'identity-metadata-required');

  console.log(JSON.stringify({
    contract: 'artist-expansion-naver-identity-coverage-v1',
    totalArtists: rows.length,
    identityReady: ready.length,
    identityMetadataRequired: blocked.length,
    readinessRate: rows.length === 0 ? 0 : ready.length / rows.length,
    realtime: {
      total: rows.filter((row) => row.tier === 'realtime').length,
      ready: ready.filter((row) => row.tier === 'realtime').length,
      blocked: blocked.filter((row) => row.tier === 'realtime').length,
    },
    blockedArtistIds: blocked.map((row) => row.artistId),
    readyArtistIds: ready.map((row) => row.artistId),
  }, null, 2));

  assert.equal(rows.length, artistUniverseV4.length);
  assert.ok(rows.every((row) => row.query.trim().length > 0));
  assert.equal(ready.length, artistUniverseV4.length);
  assert.equal(blocked.length, 0);
});
