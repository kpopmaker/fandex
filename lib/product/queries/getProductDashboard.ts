import {
  artistMetadata,
  type ArtistMetadata,
} from '../../../app/data/v4/charts/artistMetadata';
import { getArtistMonthlyMetrics } from '../../../app/data/v4/metrics/artistMonthlyMetricHelpers';
import type { ArtistMonthlyMetricPoint } from '../../../app/data/v4/metrics/fandexMetricTypes';
import type {
  ProductDashboardArtistDisplay,
  ProductDashboardArtistEntry,
  ProductDashboardArtistIssueModel,
  ProductDashboardArtistModel,
  ProductDashboardIssue,
  ProductDashboardReadModel,
  ProductDashboardSourceMetadata,
} from '../contracts/productDashboard';
import {
  makeAvailableProductNumericFact,
  makeMissingProductNumericFact,
} from '../contracts/productNumericFact';

export type ProductDashboardRuntime = Readonly<{
  getArtists: () => readonly ArtistMetadata[];
  getArtistMonthlyMetrics: (
    artistId: string,
  ) => readonly ArtistMonthlyMetricPoint[];
}>;

const DEFAULT_RUNTIME: ProductDashboardRuntime = Object.freeze({
  getArtists: () => artistMetadata,
  getArtistMonthlyMetrics,
});

const SYNTHETIC_PREVIEW_STATE = Object.freeze({
  dataOrigin: 'synthetic' as const,
  presentation: 'preview' as const,
});

function createDisplay(artist: ArtistMetadata): ProductDashboardArtistDisplay {
  return Object.freeze({
    artistName: artist.displayName,
    koreanName: artist.koreanName,
    ticker: artist.ticker,
    searchTerms: Object.freeze([
      artist.artistId,
      artist.displayName,
      artist.koreanName,
      artist.ticker,
      ...artist.aliases,
    ]),
  });
}

function createSource(
  point: ArtistMonthlyMetricPoint,
): ProductDashboardSourceMetadata {
  return Object.freeze({
    sourceKind: 'v4-artist-monthly-metric-seed',
    sourceArtistId: point.artistId,
    sourceMonth: point.month,
    sourceTimeLabel: point.label,
    sourceType: point.sourceType,
    quality: point.quality,
    observationTime: Object.freeze({ kind: 'unknown' as const }),
  });
}

function createMissingEntry(
  artistId: string,
  display: ProductDashboardArtistDisplay,
): ProductDashboardArtistModel {
  return Object.freeze({
    status: 'ok',
    identity: Object.freeze({ artistId }),
    display,
    rank: null,
    currentFandex: makeMissingProductNumericFact(),
    ...SYNTHETIC_PREVIEW_STATE,
    source: null,
  });
}

function createDataIssueEntry(
  artistId: string,
  display: ProductDashboardArtistDisplay,
  code: ProductDashboardArtistIssueModel['issues'][number]['code'],
  source: ProductDashboardSourceMetadata | null,
): ProductDashboardArtistIssueModel {
  return Object.freeze({
    status: 'data-issue',
    identity: Object.freeze({ artistId }),
    display,
    rank: null,
    currentFandex: null,
    ...SYNTHETIC_PREVIEW_STATE,
    source,
    issues: Object.freeze([Object.freeze({ code })]),
  });
}

function selectLatestPoint(
  points: readonly ArtistMonthlyMetricPoint[],
): ArtistMonthlyMetricPoint | null {
  return [...points].sort(
    (left, right) =>
      right.month.localeCompare(left.month) ||
      right.label.localeCompare(left.label),
  )[0] ?? null;
}

function createEntry(
  artist: ArtistMetadata,
  runtime: ProductDashboardRuntime,
): ProductDashboardArtistEntry {
  const artistId = artist.artistId.trim();
  const display = createDisplay(artist);
  let points: readonly ArtistMonthlyMetricPoint[];

  try {
    points = runtime.getArtistMonthlyMetrics(artistId);
  } catch {
    return createDataIssueEntry(
      artistId,
      display,
      'source-read-failed',
      null,
    );
  }

  const latest = selectLatestPoint(points);

  if (!latest) {
    return createMissingEntry(artistId, display);
  }

  const source = createSource(latest);

  if (!latest.month.trim() || !latest.label.trim()) {
    return createDataIssueEntry(
      artistId,
      display,
      'invalid-source-time',
      source,
    );
  }

  const latestMonthCount = points.filter(
    (point) => point.month === latest.month,
  ).length;

  if (latestMonthCount !== 1 || latest.artistId !== artistId) {
    return createDataIssueEntry(
      artistId,
      display,
      'source-state-conflict',
      source,
    );
  }

  if (
    typeof latest.fandexPoint !== 'number' ||
    !Number.isFinite(latest.fandexPoint)
  ) {
    return createDataIssueEntry(
      artistId,
      display,
      'invalid-current-fandex',
      source,
    );
  }

  return Object.freeze({
    status: 'ok',
    identity: Object.freeze({ artistId }),
    display,
    rank: null,
    currentFandex: makeAvailableProductNumericFact(latest.fandexPoint),
    ...SYNTHETIC_PREVIEW_STATE,
    source,
  });
}

function isRankable(
  entry: ProductDashboardArtistEntry,
): entry is ProductDashboardArtistModel & Readonly<{
  currentFandex: Readonly<{ availability: 'available'; value: number }>;
}> {
  return (
    entry.status === 'ok' &&
    entry.currentFandex.availability === 'available'
  );
}

export function getProductDashboard(
  runtime: ProductDashboardRuntime = DEFAULT_RUNTIME,
): ProductDashboardReadModel {
  const identities = new Set<string>();
  const issues: ProductDashboardIssue[] = [];
  const entries: ProductDashboardArtistEntry[] = [];

  for (const artist of runtime.getArtists()) {
    const artistId = artist.artistId.trim();

    if (!artistId) {
      issues.push(
        Object.freeze({
          code: 'invalid-artist-identity',
          rawArtistId: artist.artistId,
        }),
      );
      continue;
    }

    if (identities.has(artistId)) {
      issues.push(
        Object.freeze({
          code: 'duplicate-artist-identity',
          artistId,
        }),
      );
      continue;
    }

    identities.add(artistId);
    entries.push(createEntry(artist, runtime));
  }

  const rankedEntries = entries.filter(isRankable).sort(
    (left, right) =>
      right.currentFandex.value - left.currentFandex.value ||
      left.identity.artistId.localeCompare(right.identity.artistId),
  );
  const rankedIds = new Map(
    rankedEntries.map((entry, index) => [entry.identity.artistId, index + 1]),
  );
  const unrankedEntries = entries
    .filter((entry) => !rankedIds.has(entry.identity.artistId))
    .sort((left, right) =>
      left.identity.artistId.localeCompare(right.identity.artistId),
    );
  const orderedEntries = [
    ...rankedEntries.map((entry) =>
      Object.freeze({
        ...entry,
        rank: rankedIds.get(entry.identity.artistId) ?? null,
      }),
    ),
    ...unrankedEntries,
  ];
  const dataBasisByMonth = new Map<string, string>();

  for (const entry of rankedEntries) {
    if (entry.source) {
      dataBasisByMonth.set(
        entry.source.sourceMonth,
        entry.source.sourceTimeLabel,
      );
    }
  }

  const dataBasis = [...dataBasisByMonth.entries()]
    .sort(([leftMonth], [rightMonth]) => leftMonth.localeCompare(rightMonth))
    .map(([sourceMonth, sourceTimeLabel]) =>
      Object.freeze({ sourceMonth, sourceTimeLabel }),
    );

  return Object.freeze({
    entries: Object.freeze(orderedEntries),
    rankedArtistCount: rankedEntries.length,
    dataBasis: Object.freeze(dataBasis),
    issues: Object.freeze(issues),
  });
}
