import { artistUniverseV4, getArtistV4ById } from '@/app/data/v4/artistUniverse';
import { naverNewsItemsToArtistNewsItems } from '@/lib/services/newsAdapter';
import {
  buildArtistNewsQuery,
  hasNaverNewsCredentials,
  searchNaverNews,
  type NaverNewsSort,
} from '@/lib/services/naverNews';

export const dynamic = 'force-dynamic';

type ApiErrorCode =
  | 'missing_query'
  | 'missing_credentials'
  | 'upstream_error';

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

function parseDisplay(value: string | null) {
  if (!value) {
    return 10;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 10;
}

function parseStart(value: string | null) {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 1000) : 1;
}

function parseSort(value: string | null): NaverNewsSort {
  return value === 'sim' ? 'sim' : 'date';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const artistId = url.searchParams.get('artistId');
  const rawQuery = url.searchParams.get('q');
  const display = parseDisplay(url.searchParams.get('display'));
  const start = parseStart(url.searchParams.get('start'));
  const sort = parseSort(url.searchParams.get('sort'));
  const artist = artistId ? getArtistV4ById(artistId) : undefined;
  const query = rawQuery ?? (artist ? buildArtistNewsQuery(artist) : undefined);

  if (!query) {
    return errorResponse(
      400,
      'missing_query',
      'Provide q or artistId.',
      {
        availableArtistIds: artistUniverseV4.map((item) => item.id),
      },
    );
  }

  if (!hasNaverNewsCredentials()) {
    return errorResponse(
      503,
      'missing_credentials',
      'Naver News API credentials are not configured.',
      {
        requiredEnv: ['NAVER_NEWS_CLIENT_ID', 'NAVER_NEWS_CLIENT_SECRET'],
      },
    );
  }

  try {
    const result = await searchNaverNews({ query, display, start, sort });
    const items = naverNewsItemsToArtistNewsItems({
      items: result.items,
      query,
      artist,
    });

    return Response.json({
      artistId: artist?.id ?? null,
      artistName: artist?.nameEn ?? null,
      source: result.source,
      query: result.query,
      display: result.display,
      start: result.start,
      sort: result.sort,
      total: result.total,
      lastBuildDate: result.lastBuildDate,
      items,
    });
  } catch (error) {
    return errorResponse(
      502,
      'upstream_error',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
