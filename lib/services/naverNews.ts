import type { ArtistV4 } from '@/app/data/v4/types';

const NAVER_NEWS_ENDPOINT = 'https://openapi.naver.com/v1/search/news.json';

export type NaverNewsSort = 'date' | 'sim';

export type NaverNewsItem = {
  title: string;
  originallink?: string;
  link: string;
  description: string;
  pubDate: string;
};

export type NaverNewsSearchResult = {
  source: 'naver_news';
  query: string;
  display: number;
  start: number;
  sort: NaverNewsSort;
  total: number;
  lastBuildDate: string;
  items: NaverNewsItem[];
};

export type NaverNewsSearchOptions = {
  query: string;
  display?: number;
  start?: number;
  sort?: NaverNewsSort;
};

export function hasNaverNewsCredentials() {
  return Boolean(process.env.NAVER_NEWS_CLIENT_ID && process.env.NAVER_NEWS_CLIENT_SECRET);
}

export function buildArtistNewsQuery(artist: ArtistV4) {
  if (artist.profile.naverNewsQuery) {
    return artist.profile.naverNewsQuery;
  }

  return [artist.profile.primaryQuery, artist.agency]
    .filter(Boolean)
    .join(' ');
}

export async function searchNaverNews({
  query,
  display = 10,
  start = 1,
  sort = 'date',
}: NaverNewsSearchOptions): Promise<NaverNewsSearchResult> {
  const clientId = process.env.NAVER_NEWS_CLIENT_ID;
  const clientSecret = process.env.NAVER_NEWS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Naver News API credentials');
  }

  const url = new URL(NAVER_NEWS_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(Math.min(Math.max(display, 1), 100)));
  url.searchParams.set('start', String(Math.min(Math.max(start, 1), 1000)));
  url.searchParams.set('sort', sort);

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Naver News API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    lastBuildDate: string;
    total: number;
    start: number;
    display: number;
    items: NaverNewsItem[];
  };

  return {
    source: 'naver_news',
    query,
    display: payload.display,
    start: payload.start,
    sort,
    total: payload.total,
    lastBuildDate: payload.lastBuildDate,
    items: payload.items,
  };
}
