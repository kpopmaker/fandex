import { writeFileSync } from 'node:fs';

import { artistUniverseV4 } from '../../app/data/v4/artistUniverse';

const outputPath = process.argv[2] ?? 'artist_universe_identity_index_runtime.json';

const artists = artistUniverseV4.map((artist) => ({
  id: artist.id,
  ticker: artist.ticker,
  aliases: Array.from(
    new Set([
      artist.nameKo,
      artist.nameEn,
      artist.ticker,
      ...artist.profile.aliases,
      ...artist.profile.koreanAliases,
      ...artist.profile.englishAliases,
    ].map((value) => value.trim()).filter(Boolean)),
  ),
  keywords: Array.from(
    new Set(
      artist.profile.keywords
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ),
}));

writeFileSync(
  outputPath,
  JSON.stringify(
    {
      version: 'artist_universe_identity_index_v1',
      artistCount: artists.length,
      artists,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log(JSON.stringify({ outputPath, artistCount: artists.length }));
