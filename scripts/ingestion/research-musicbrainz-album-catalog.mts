import { pathToFileURL } from 'node:url';

import {
  runMusicBrainzAlbumCatalogResearchAttempt,
} from '../../lib/alternative-evidence/musicbrainzProviderAvailabilityResearch';

export {
  buildMusicBrainzReleaseGroupBrowseUrl,
  decodeMusicBrainzReleaseGroupPage,
  MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION,
  MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR,
  parseMusicBrainzAlbumCatalogResearchCommand,
  runMusicBrainzAlbumCatalogResearch,
} from '../../lib/alternative-evidence/musicbrainzAlbumCatalogResearch';

export {
  classifyMusicBrainzHttpFailure,
  MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_CONTRACT_VERSION,
  MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR,
  runMusicBrainzAlbumCatalogResearchAttempt,
} from '../../lib/alternative-evidence/musicbrainzProviderAvailabilityResearch';

export async function main(argv = process.argv.slice(2)) {
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.outcome !== 'observed') process.exitCode = 1;
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error(`MusicBrainz album catalog research failed closed: ${message}`);
    process.exitCode = 1;
  });
}
