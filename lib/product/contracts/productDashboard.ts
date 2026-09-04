import type {
  MetricQuality,
  MetricSourceType,
} from '../../../app/data/v4/metrics/fandexMetricTypes';
import type { ProductNumericFact } from './productNumericFact';
import type {
  ProductDataOrigin,
  ProductPresentation,
} from './productState';
import type { ProductObservationTime } from './productTime';

export type ProductDashboardArtistIdentity = Readonly<{
  artistId: string;
}>;

export type ProductDashboardArtistDisplay = Readonly<{
  artistName: string;
  koreanName: string;
  ticker: string;
  searchTerms: readonly string[];
}>;

export type ProductDashboardSourceMetadata = Readonly<{
  sourceKind: 'v4-artist-monthly-metric-seed';
  sourceArtistId: string;
  sourceMonth: string;
  sourceTimeLabel: string;
  sourceType: MetricSourceType;
  quality: MetricQuality;
  observationTime: ProductObservationTime;
}>;

export type ProductDashboardArtistModel = Readonly<{
  status: 'ok';
  identity: ProductDashboardArtistIdentity;
  display: ProductDashboardArtistDisplay;
  rank: number | null;
  currentFandex: ProductNumericFact;
  dataOrigin: ProductDataOrigin;
  presentation: ProductPresentation;
  source: ProductDashboardSourceMetadata | null;
}>;

export type ProductDashboardArtistDataIssue = Readonly<{
  code:
    | 'invalid-current-fandex'
    | 'invalid-source-time'
    | 'source-state-conflict'
    | 'source-read-failed';
}>;

export type ProductDashboardArtistIssueModel = Readonly<{
  status: 'data-issue';
  identity: ProductDashboardArtistIdentity;
  display: ProductDashboardArtistDisplay;
  rank: null;
  currentFandex: null;
  dataOrigin: ProductDataOrigin;
  presentation: ProductPresentation;
  source: ProductDashboardSourceMetadata | null;
  issues: readonly ProductDashboardArtistDataIssue[];
}>;

export type ProductDashboardArtistEntry =
  | ProductDashboardArtistModel
  | ProductDashboardArtistIssueModel;

export type ProductDashboardIssue =
  | Readonly<{
      code: 'invalid-artist-identity';
      rawArtistId: string;
    }>
  | Readonly<{
      code: 'duplicate-artist-identity';
      artistId: string;
    }>;

export type ProductDashboardDataBasis = Readonly<{
  sourceMonth: string;
  sourceTimeLabel: string;
}>;

export type ProductDashboardReadModel = Readonly<{
  entries: readonly ProductDashboardArtistEntry[];
  rankedArtistCount: number;
  dataBasis: readonly ProductDashboardDataBasis[];
  issues: readonly ProductDashboardIssue[];
}>;
