import { artistUniverseV4, getArtistV4ById } from '@/app/data/v4/artistUniverse';
import {
  buildArtistNewsQuery,
  hasNaverNewsCredentials,
  searchNaverNews,
  type NaverNewsSort,
} from '@/lib/services/naverNews';

export const dynamic = 'force-dynamic';

function parseDisplay(value: string | null) {
  if (!value) {
    return 10;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 10;
}

function parseSort(value: string | null): NaverNewsSort {
  return value === 'sim' ? 'sim' : 'date';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const artistId = url.searchParams.get('artistId');
  const rawQuery = url.searchParams.get('q');
  const display = parseDisplay(url.searchParams.get('display'));
  const sort = parseSort(url.searchParams.get('sort'));
  const artist = artistId ? getArtistV4ById(artistId) : undefined;
  const query = rawQuery ?? (artist ? buildArtistNewsQuery(artist) : undefined);

  if (!query) {
    return Response.json(
      {
        error: 'Missing query',
        message: 'Provide q or artistId.',
        availableArtistIds: artistUniverseV4.map((item) => item.id),
      },
      { status: 400 },
    );
  }

  if (!hasNaverNewsCredentials()) {
    return Response.json(
      {
        error: 'Naver News API credentials are not configured',
        requiredEnv: ['NAVER_NEWS_CLIENT_ID', 'NAVER_NEWS_CLIENT_SECRET'],
      },
      { status: 503 },
    );
  }

  try {
    const result = await searchNaverNews({ query, display, sort });

    return Response.json({
      artistId: artist?.id ?? null,
      artistName: artist?.nameEn ?? null,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        error: 'Naver News API request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 },
    );
  }
}
