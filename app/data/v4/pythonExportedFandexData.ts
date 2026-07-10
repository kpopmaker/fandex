import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type {
  ArtistIndexConfidenceLevel,
  ArtistIndexCoverageStatus,
  ArtistIndexGroupType,
  ArtistIndexTrendBand,
} from './charts/artistIndexChartData';
import { artistIndexChartProfiles } from './charts/artistIndexChartData';

export type FandexPythonExportSourceKey = 'naver' | 'youtube' | 'musicChart';

export type FandexPythonExportSourcePoint = {
  rank?: number;
  rawPoint?: number;
  normalizedPoint?: number;
  cumulativePoint?: number;
  available?: boolean;
  coreSignal?: string;
};

export type FandexPythonExportRankingEntry = {
  rank?: number;
  artist: string;
  fandexFinalPoint: number;
  mainSource?: FandexPythonExportSourceKey | string;
  sourcePoints?: Partial<
    Record<FandexPythonExportSourceKey, FandexPythonExportSourcePoint>
  >;
};

export type FandexPythonExportRankingFile = {
  version: string;
  createdAt: string;
  scoreScale?: string;
  scoreMode?: string;
  activeSources?: FandexPythonExportSourceKey[];
  ranking: FandexPythonExportRankingEntry[];
};

export type FandexPythonExportArtistReportsFile = {
  version: string;
  createdAt: string;
  scoreScale?: string;
  scoreMode?: string;
  activeSources?: FandexPythonExportSourceKey[];
  reports: FandexPythonExportRankingEntry[];
};

export type FandexPythonExportManifestFile = {
  version: string;
  createdAt: string;
  sourceVersion?: string;
  scoreMode?: string;
  copiedFiles?: string[];
  topRanking?: Array<{
    rank: number;
    artist: string;
    fandexFinalPoint: number;
  }>;
};

export type FandexPythonExportRankingRow = {
  artistId: string;
  artistName: string;
  ticker: string;
  groupType: ArtistIndexGroupType;
  coverageStatus: ArtistIndexCoverageStatus;
  currentFandexPoint: number;
  sixMonthDelta: number | null;
  trendBand: ArtistIndexTrendBand;
  confidenceLevel: ArtistIndexConfidenceLevel;
  lastUpdated: string;
  topMetricLabels: string[];
  metricScores: Record<string, never>;
  metricMonthLabel: string;
  sourcePoints: Record<FandexPythonExportSourceKey, number | null>;
  sourceRanks: Record<FandexPythonExportSourceKey, number | null>;
  mainSourceLabel: string;
  searchAliases: string[];
  detailHref?: string;
  compareHref?: string;
};

export type FandexPythonExportRankingData = {
  version: string;
  createdAt: string;
  scoreMode: string;
  activeSources: FandexPythonExportSourceKey[];
  rows: FandexPythonExportRankingRow[];
  reportCount: number;
  manifestVersion: string;
};

const dataDirectory = join(process.cwd(), 'public', 'data');

const exportArtistMetadata: Record<
  string,
  {
    artistId: string;
    ticker: string;
    groupType: ArtistIndexGroupType;
    displayName?: string;
    searchAliases: string[];
  }
> = {
  아이유: {
    artistId: 'iu',
    ticker: 'IU',
    groupType: 'solo',
    displayName: '아이유',
    searchAliases: ['IU', 'Lee Jieun', '이지은'],
  },
  에스파: {
    artistId: 'aespa',
    ticker: 'AESPA',
    groupType: 'girl_group',
    displayName: '에스파',
    searchAliases: ['aespa', 'Aespa'],
  },
  에이티즈: {
    artistId: 'ateez',
    ticker: 'ATZ',
    groupType: 'boy_group',
    displayName: '에이티즈',
    searchAliases: ['ATEEZ'],
  },
  보이넥스트도어: {
    artistId: 'boynextdoor',
    ticker: 'BND',
    groupType: 'boy_group',
    displayName: '보이넥스트도어',
    searchAliases: ['BOYNEXTDOOR', 'BND', '보넥도'],
  },
};

function readJsonFile<T>(fileName: string, fallback: T): T {
  const filePath = join(dataDirectory, fileName);

  if (!existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function getExportSourcePoint(
  entry: FandexPythonExportRankingEntry,
  sourceKey: FandexPythonExportSourceKey,
) {
  return entry.sourcePoints?.[sourceKey];
}

function getExportSourceCumulativePoint(
  entry: FandexPythonExportRankingEntry,
  sourceKey: FandexPythonExportSourceKey,
) {
  const value = getExportSourcePoint(entry, sourceKey)?.cumulativePoint;

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getExportSourceRank(
  entry: FandexPythonExportRankingEntry,
  sourceKey: FandexPythonExportSourceKey,
) {
  const value = getExportSourcePoint(entry, sourceKey)?.rank;

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function createFallbackArtistId(artistName: string) {
  return artistName
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getExportArtistMetadata(artistName: string) {
  const explicitMetadata = exportArtistMetadata[artistName];

  if (explicitMetadata) {
    return explicitMetadata;
  }

  return {
    artistId: createFallbackArtistId(artistName),
    ticker: artistName,
    groupType: 'solo' as ArtistIndexGroupType,
    displayName: artistName,
    searchAliases: [],
  };
}

function createRankingRow(
  entry: FandexPythonExportRankingEntry,
  createdAt: string,
  reportByArtist: Map<string, FandexPythonExportRankingEntry>,
): FandexPythonExportRankingRow {
  const exportMetadata = getExportArtistMetadata(entry.artist);
  const profile = artistIndexChartProfiles.find(
    (item) => item.artistId === exportMetadata.artistId,
  );
  const hasArtistDetailPage = Boolean(profile);
  const report = reportByArtist.get(entry.artist);

  return {
    artistId: exportMetadata.artistId,
    artistName: exportMetadata.displayName ?? entry.artist,
    ticker: profile?.ticker ?? exportMetadata.ticker,
    groupType: profile?.groupType ?? exportMetadata.groupType,
    coverageStatus: profile?.coverageStatus ?? 'preview',
    currentFandexPoint: entry.fandexFinalPoint,
    sixMonthDelta: null,
    trendBand: 'insufficient_data',
    confidenceLevel: 'high',
    lastUpdated: createdAt,
    topMetricLabels: [
      report?.mainSource
        ? `main source: ${report.mainSource}`
        : `main source: ${entry.mainSource ?? '-'}`,
    ],
    metricScores: {},
    metricMonthLabel: 'Python export JSON',
    sourcePoints: {
      naver: getExportSourceCumulativePoint(entry, 'naver'),
      youtube: getExportSourceCumulativePoint(entry, 'youtube'),
      musicChart: getExportSourceCumulativePoint(entry, 'musicChart'),
    },
    sourceRanks: {
      naver: getExportSourceRank(entry, 'naver'),
      youtube: getExportSourceRank(entry, 'youtube'),
      musicChart: getExportSourceRank(entry, 'musicChart'),
    },
    mainSourceLabel: String(entry.mainSource ?? '-'),
    searchAliases: [
      entry.artist,
      profile?.artistName,
      profile?.ticker,
      ...exportMetadata.searchAliases,
    ].filter((value): value is string => Boolean(value)),
    detailHref: hasArtistDetailPage ? `/artists/${exportMetadata.artistId}` : undefined,
    compareHref: hasArtistDetailPage
      ? `/compare?artists=${exportMetadata.artistId}`
      : undefined,
  };
}

export function getFandexPythonExportRankingData(): FandexPythonExportRankingData {
  const rankingFile = readJsonFile<FandexPythonExportRankingFile>(
    'fandex_master_ranking_latest.json',
    {
      version: 'missing',
      createdAt: '',
      ranking: [],
    },
  );
  const artistReportsFile = readJsonFile<FandexPythonExportArtistReportsFile>(
    'fandex_master_artist_reports_latest.json',
    {
      version: 'missing',
      createdAt: '',
      reports: [],
    },
  );
  const manifestFile = readJsonFile<FandexPythonExportManifestFile>(
    'fandex_data_manifest_latest.json',
    {
      version: 'missing',
      createdAt: '',
    },
  );
  const reportByArtist = new Map(
    artistReportsFile.reports.map((report) => [report.artist, report]),
  );
  const createdAt =
    rankingFile.createdAt || manifestFile.createdAt || artistReportsFile.createdAt;

  return {
    version: rankingFile.version,
    createdAt,
    scoreMode:
      rankingFile.scoreMode
      ?? manifestFile.scoreMode
      ?? artistReportsFile.scoreMode
      ?? 'unknown',
    activeSources: rankingFile.activeSources ?? ['naver', 'youtube', 'musicChart'],
    rows: rankingFile.ranking.map((entry) =>
      createRankingRow(entry, createdAt, reportByArtist),
    ),
    reportCount: artistReportsFile.reports.length,
    manifestVersion: manifestFile.version,
  };
}
