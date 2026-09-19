import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import type { NaverNewsIngestionCommand, NaverNewsSort } from './naverNewsContracts';

export type CanonicalNaverNewsIngestionCommandInput = Readonly<{
  canonicalArtistId: string;
  collectionKey: string;
  display: number;
  start: number;
  sort: NaverNewsSort;
}>;

export function buildNaverNewsIngestionCommandFromCanonicalArtist(
  input: CanonicalNaverNewsIngestionCommandInput,
): NaverNewsIngestionCommand {
  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);

  return Object.freeze({
    provider: binding.provider,
    collectionKey: input.collectionKey,
    query: binding.query,
    display: input.display,
    start: input.start,
    sort: input.sort,
  });
}
