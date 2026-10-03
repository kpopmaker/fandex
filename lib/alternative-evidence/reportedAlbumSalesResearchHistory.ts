import type {
  ReportedAlbumSalesObservation,
} from './reportedAlbumSalesEvidence';

export const REPORTED_ALBUM_SALES_RESEARCH_HISTORY_CONTRACT_VERSION =
  'reported-album-sales-research-history-v1' as const;

type MetricHistory = Readonly<{
  metricSemantic: ReportedAlbumSalesObservation['metricSemantic'];
  observations: readonly ReportedAlbumSalesObservation[];
}>;

export type ReportedAlbumSalesReleaseHistory = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_HISTORY_CONTRACT_VERSION;
  canonicalArtistId: string;
  releaseTitle: string;
  releaseHistory: readonly MetricHistory[];
  observationCount: number;
  conflictCount: number;
  researchUsableObservationCount: number;
  productEligible: false;
  scoreFieldsPresent: false;
}>;

export type ReportedAlbumSalesArtistHistory = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_HISTORY_CONTRACT_VERSION;
  canonicalArtistId: string;
  releases: readonly ReportedAlbumSalesReleaseHistory[];
  observationCount: number;
  conflictCount: number;
  researchUsableObservationCount: number;
  productEligible: false;
  scoreFieldsPresent: false;
}>;

function metricGroups(
  observations: readonly ReportedAlbumSalesObservation[],
): readonly MetricHistory[] {
  const grouped = new Map<string, ReportedAlbumSalesObservation[]>();
  for (const observation of observations) {
    const current = grouped.get(observation.metricSemantic) ?? [];
    current.push(observation);
    grouped.set(observation.metricSemantic, current);
  }

  return Object.freeze(
    [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([metricSemantic, items]) => Object.freeze({
        metricSemantic: metricSemantic as ReportedAlbumSalesObservation['metricSemantic'],
        observations: Object.freeze(
          [...items].sort((a, b) =>
            a.observationId.localeCompare(b.observationId)),
        ),
      })),
  );
}

export function buildReportedAlbumSalesReleaseHistory(
  observations: readonly ReportedAlbumSalesObservation[],
): ReportedAlbumSalesReleaseHistory[] {
  const grouped = new Map<string, ReportedAlbumSalesObservation[]>();

  for (const observation of observations) {
    const key = [
      observation.canonicalArtistId,
      observation.release.releaseTitle,
      observation.release.releaseDate ?? 'unknown-date',
    ].join('|');
    const current = grouped.get(key) ?? [];
    current.push(observation);
    grouped.set(key, current);
  }

  return [...grouped.values()].map(items => Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_HISTORY_CONTRACT_VERSION,
    canonicalArtistId: items[0].canonicalArtistId,
    releaseTitle: items[0].release.releaseTitle,
    releaseHistory: metricGroups(items),
    observationCount: items.length,
    conflictCount: items.filter(
      item => item.evidenceQuality === 'conflicting',
    ).length,
    researchUsableObservationCount: items.filter(
      item => item.researchUsable,
    ).length,
    productEligible: false as const,
    scoreFieldsPresent: false as const,
  }));
}

export function buildReportedAlbumSalesArtistHistory(
  observations: readonly ReportedAlbumSalesObservation[],
): ReportedAlbumSalesArtistHistory[] {
  const grouped = new Map<string, ReportedAlbumSalesObservation[]>();

  for (const observation of observations) {
    const current = grouped.get(observation.canonicalArtistId) ?? [];
    current.push(observation);
    grouped.set(observation.canonicalArtistId, current);
  }

  return [...grouped.entries()].map(([canonicalArtistId, items]) => Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_HISTORY_CONTRACT_VERSION,
    canonicalArtistId,
    releases: Object.freeze(
      buildReportedAlbumSalesReleaseHistory(items),
    ),
    observationCount: items.length,
    conflictCount: items.filter(
      item => item.evidenceQuality === 'conflicting',
    ).length,
    researchUsableObservationCount: items.filter(
      item => item.researchUsable,
    ).length,
    productEligible: false as const,
    scoreFieldsPresent: false as const,
  }));
}
