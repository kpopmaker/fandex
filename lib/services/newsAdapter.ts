import type { ArtistNewsItem } from '@/app/data/v3/types';
import type { ArtistV4 } from '@/app/data/v4/types';
import type { NaverNewsItem } from './naverNews';

const htmlEntityMap: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, token: string) => {
    if (token.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
    }

    if (token.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
    }

    return htmlEntityMap[token.toLowerCase()] ?? entity;
  });
}

export function normalizeNewsText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPublishedAt(pubDate: string) {
  const timestamp = Date.parse(pubDate);

  if (Number.isNaN(timestamp)) {
    return new Date(0).toISOString();
  }

  return new Date(timestamp).toISOString();
}

function normalizeUrl(item: NaverNewsItem) {
  const rawUrl = item.originallink || item.link;

  try {
    return new URL(rawUrl).toString();
  } catch {
    return undefined;
  }
}

function getImportanceScore(item: NaverNewsItem, query: string) {
  const searchableText = normalizeNewsText(`${item.title} ${item.description}`).toLowerCase();
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const matchedTokens = queryTokens.filter((token) => searchableText.includes(token));
  const hasOriginalLink = Boolean(item.originallink);

  return Math.min(100, 50 + matchedTokens.length * 8 + (hasOriginalLink ? 10 : 0));
}

export function naverNewsItemToArtistNewsItem({
  item,
  index,
  query,
  artist,
}: {
  item: NaverNewsItem;
  index: number;
  query: string;
  artist?: ArtistV4;
}): ArtistNewsItem {
  const title = normalizeNewsText(item.title);
  const summary = normalizeNewsText(item.description);
  const publishedAt = toPublishedAt(item.pubDate);
  const url = normalizeUrl(item);
  const artistId = artist?.id ?? 'unmapped';
  const id = `naver-${artistId}-${publishedAt.slice(0, 10)}-${index + 1}`;

  return {
    id,
    artistId,
    title,
    summary,
    detail: summary,
    source: 'Naver News',
    sourceName: 'Naver',
    sourceType: 'News',
    url,
    publishedAt,
    relatedArtists: artist ? [artist.id] : [],
    relatedKeywords: artist
      ? Array.from(new Set([artist.profile.primaryQuery, ...artist.profile.includeKeywords]))
      : query.split(/\s+/).filter(Boolean),
    sourceStatus: 'Partially verified',
    importanceScore: getImportanceScore(item, query),
  };
}

export function naverNewsItemsToArtistNewsItems({
  items,
  query,
  artist,
}: {
  items: NaverNewsItem[];
  query: string;
  artist?: ArtistV4;
}) {
  return items.map((item, index) =>
    naverNewsItemToArtistNewsItem({
      item,
      index,
      query,
      artist,
    }),
  );
}
