import fs from 'node:fs';
import { artistUniverseV4 } from '../../app/data/v4/artistUniverse';

const rows = artistUniverseV4.map((artist) => ({
  canonicalArtistId: artist.id,
  canonicalName: artist.nameKo,
  aliases: artist.profile.aliases,
  koreanAliases: artist.profile.koreanAliases,
  englishAliases: artist.profile.englishAliases,
  entityType: artist.entityType,
  agency: artist.agency,
  debutDate: artist.debutDate ?? null,
  debutYear: artist.debutDate ? Number(artist.debutDate.slice(0, 4)) : null,
  members: artist.members,
  disambiguationKeywords: artist.profile.disambiguationKeywords,
}));

if (rows.length !== 355) {
  throw new Error(`canonical_identity_metadata_count:${rows.length}`);
}
if (new Set(rows.map((row) => row.canonicalArtistId)).size !== 355) {
  throw new Error('duplicate_canonical_artist_id');
}

fs.writeFileSync(
  'music_genie_canonical_identity_metadata_v1.json',
  JSON.stringify({
    version: 'music_genie_canonical_identity_metadata_v1',
    canonicalUniverseVersion: 'artist_universe_v4',
    canonicalUniverseCount: 355,
    artists: rows,
  }, null, 2) + '\n',
  'utf8',
);

console.log('PASS: materialized canonical identity metadata | artists=355');
