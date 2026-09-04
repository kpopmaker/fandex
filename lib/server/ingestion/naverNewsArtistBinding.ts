import { getArtistV4ById } from '@/app/data/v4/artistUniverse';
import { buildArtistNewsQuery } from '@/lib/services/naverNews';

import { NAVER_NEWS_PROVIDER } from './naverNewsContracts';

export type CanonicalNaverNewsArtistBinding = Readonly<{
  canonicalArtistId: string;
  provider: typeof NAVER_NEWS_PROVIDER;
  query: string;
}>;

export function bindCanonicalArtistToNaverNews(
  canonicalArtistId: string,
): CanonicalNaverNewsArtistBinding {
  const artist = getArtistV4ById(canonicalArtistId);
  if (!artist) {
    throw new Error('naver_news_artist_not_found');
  }

  return Object.freeze({
    canonicalArtistId: artist.id,
    provider: NAVER_NEWS_PROVIDER,
    query: buildArtistNewsQuery(artist),
  });
}
