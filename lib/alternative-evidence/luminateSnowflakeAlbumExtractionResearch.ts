import { sha256Canonical } from '../shared/canonicalDigest';
import {
  buildDirectAlbumObservation,
  DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
  type DirectAlbumObservation,
} from './directAlbumProvider';
import { buildLuminateTrackedFirstWeekWindow } from './luminateAlbumSalesProductionCandidateResearch';

export const LUMINATE_SNOWFLAKE_ALBUM_EXTRACTION_RESEARCH_VERSION =
  'luminate-snowflake-album-extraction-research-v1' as const;

export const LUMINATE_SNOWFLAKE_ALBUM_EXTRACTION_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: LUMINATE_SNOWFLAKE_ALBUM_EXTRACTION_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  accessSurface: 'snowflake-data-share' as const,
  liveConnectionImplemented: false as const,
  credentialsRequiredToRenderPlan: false as const,
  credentialsRequiredToExecute: true as const,
  executionAllowedWithoutExecutedLicense: false as const,
  networkCallsPerformedByThisModule: 0 as const,
  factView: 'VW_DAILY_FACT_MRELG_DETAIL_DS' as const,
  metadataView: 'VW_MUSICAL_RELEASE_GROUP_DS' as const,
  factValuesView: 'VW_FACT_VALUES_DS' as const,
  barcodeMappingViews: Object.freeze([
    'VW_MR_MP_MAP_DS',
    'VW_MP_MREL_MAP_DS',
    'VW_MREL_MRELG_MAP_DS',
  ] as const),
  primaryQuantityField: 'REPORTED_QUANTITY' as const,
  modeledQuantityFieldsForbidden: Object.freeze(['QUANTITY', 'EQUIVALENT_QUANTITY'] as const),
  transactionTypesIncluded: Object.freeze(['S', 'R'] as const),
  transactionTypesExcluded: Object.freeze(['CMA'] as const),
  correctionPolicy: 'sum-all-related-activity-and-recompute-canonical-snapshot' as const,
  productAggregationScope: 'all-authorized-physical-product-formats-release-total' as const,
});

export type LuminateSnowflakeResolvedBreakouts = Readonly<{
  sourceView: 'VW_FACT_VALUES_DS';
  metricCategoryProductSales: string;
  distributionChannelPhysical: string;
  purchaseMethodOnline: string;
  purchaseMethodStorefront: string;
  physicalProductFormats: readonly string[];
  evidenceDigest: string;
}>;

export type LuminateReleaseGroupDiscoveryTarget = Readonly<{
  fandexReleaseId: string;
  canonicalTitle: string;
  artistDisplayName: string;
  releaseDate: string;
  barcode: string | null;
}>;

export type LuminateReleaseGroupDiscoveryPlan = Readonly<{
  target: LuminateReleaseGroupDiscoveryTarget;
  state: 'provider-id-resolution-required';
  metadataView: 'VW_MUSICAL_RELEASE_GROUP_DS';
  exactMetadataCandidateQueryTemplate: string;
  barcodeMappingQueryTemplate: string | null;
  acceptanceRule:
    | 'exactly-one-reviewed-mrelg-candidate-required'
    | 'exactly-one-reviewed-mrelg-candidate-with-barcode-crosscheck-required';
  blockers: readonly string[];
}>;

export type LuminateSnowflakeExtractionPlan = Readonly<{
  state: 'ready-after-license-and-provider-id-resolution' | 'blocked';
  view: 'VW_DAILY_FACT_MRELG_DETAIL_DS';
  mrelgId: string;
  territory: 'US' | 'CA';
  providerPeriod: string;
  queryTemplate: string;
  bindValues: Readonly<{
    mrelgId: string;
    territory: 'US' | 'CA';
    startDate: string;
    endDate: string;
    metricCategory: string;
    distributionChannel: string;
    purchaseMethods: readonly [string, string];
    productFormats: readonly string[];
    transactionTypes: readonly ['S', 'R'];
  }>;
  blockers: readonly string[];
}>;

export type LuminateSnowflakeFirstWeekRow = Readonly<{
  MRELG_ID: string;
  COUNTRY_CODE: 'US' | 'CA';
  PRODUCT_FORMAT: string;
  TRANSACTION_TYPE: 'S' | 'R';
  REPORT_DATE: string;
  REPORTED_QUANTITY: number;
  MODIFIED_AT: string;
}>;

export type LuminateSnowflakeFirstWeekAggregate = Readonly<{
  providerReleaseId: string;
  territory: 'US' | 'CA';
  providerPeriod: string;
  reportedPhysicalUnits: number;
  productFormats: readonly string[];
  reportDates: readonly string[];
  maxModifiedAt: string;
  sourceRowsDigest: string;
  rowCount: number;
}>;

export type LuminateObservationSnapshotPredecessor = Readonly<{
  observationId: string;
  storedRecordId: string;
  sourceRowsDigest: string;
}>;

export type LuminateObservationSnapshotBuild = Readonly<{
  state: 'new-original' | 'new-revision' | 'unchanged-noop';
  observation: DirectAlbumObservation | null;
  supersedesStoredRecordId: string | null;
}>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/;

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function assertReleaseDate(value: string): void {
  if (!ISO_DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error('luminate_snowflake_release_date_invalid');
  }
}

export function validateLuminateSnowflakeBreakouts(
  value: LuminateSnowflakeResolvedBreakouts,
): readonly string[] {
  const issues: string[] = [];
  if (value.sourceView !== 'VW_FACT_VALUES_DS') issues.push('luminate-fact-values-source-invalid');
  if (!nonEmpty(value.metricCategoryProductSales)) issues.push('luminate-product-sales-breakout-unresolved');
  if (!nonEmpty(value.distributionChannelPhysical)) issues.push('luminate-physical-channel-breakout-unresolved');
  if (!nonEmpty(value.purchaseMethodOnline)) issues.push('luminate-online-purchase-method-unresolved');
  if (!nonEmpty(value.purchaseMethodStorefront)) issues.push('luminate-storefront-purchase-method-unresolved');
  if (value.purchaseMethodOnline === value.purchaseMethodStorefront) {
    issues.push('luminate-purchase-methods-not-distinct');
  }
  if (value.physicalProductFormats.length === 0 || value.physicalProductFormats.some((item) => !nonEmpty(item))) {
    issues.push('luminate-physical-product-formats-unresolved');
  }
  const expectedDigest = sha256Canonical({
    sourceView: value.sourceView,
    metricCategoryProductSales: value.metricCategoryProductSales,
    distributionChannelPhysical: value.distributionChannelPhysical,
    purchaseMethodOnline: value.purchaseMethodOnline,
    purchaseMethodStorefront: value.purchaseMethodStorefront,
    physicalProductFormats: [...value.physicalProductFormats].sort(),
  });
  if (value.evidenceDigest !== expectedDigest) issues.push('luminate-fact-values-evidence-digest-mismatch');
  return Object.freeze([...new Set(issues)]);
}

export function buildLuminateSnowflakeBreakoutEvidence(
  input: Omit<LuminateSnowflakeResolvedBreakouts, 'sourceView' | 'evidenceDigest'>,
): LuminateSnowflakeResolvedBreakouts {
  const base = {
    sourceView: 'VW_FACT_VALUES_DS' as const,
    metricCategoryProductSales: input.metricCategoryProductSales,
    distributionChannelPhysical: input.distributionChannelPhysical,
    purchaseMethodOnline: input.purchaseMethodOnline,
    purchaseMethodStorefront: input.purchaseMethodStorefront,
    physicalProductFormats: Object.freeze([...input.physicalProductFormats]),
  };
  return Object.freeze({
    ...base,
    evidenceDigest: sha256Canonical({
      ...base,
      physicalProductFormats: [...base.physicalProductFormats].sort(),
    }),
  });
}

export function buildLuminateReleaseGroupDiscoveryPlan(
  target: LuminateReleaseGroupDiscoveryTarget,
): LuminateReleaseGroupDiscoveryPlan {
  assertReleaseDate(target.releaseDate);
  if (!nonEmpty(target.canonicalTitle) || !nonEmpty(target.artistDisplayName) || !nonEmpty(target.fandexReleaseId)) {
    throw new Error('luminate_release_group_discovery_target_invalid');
  }

  const metadataQuery = `SELECT MRELG_ID, TITLE, DISPLAY_ARTIST, RELEASE_DATE, PRODUCT_FORMAT, RELEASE_TYPE, MERGED_IDS, MODIFIED_AT
FROM {{LUMINATE_DATA_SHARE}}.VW_MUSICAL_RELEASE_GROUP_DS
WHERE UPPER(TITLE) = UPPER(?)
  AND UPPER(DISPLAY_ARTIST) = UPPER(?)
  AND RELEASE_DATE = ?;`;

  const barcodeQuery = target.barcode
    ? `SELECT DISTINCT m2g.MRELG_ID
FROM {{LUMINATE_DATA_SHARE}}.VW_MR_MP_MAP_DS mrmp
JOIN {{LUMINATE_DATA_SHARE}}.VW_MP_MREL_MAP_DS mpmr
  ON mpmr.MP_ID = mrmp.MP_ID
JOIN {{LUMINATE_DATA_SHARE}}.VW_MREL_MRELG_MAP_DS m2g
  ON m2g.MREL_ID = mpmr.MREL_ID
WHERE mrmp.ICPN = ?;`
    : null;

  return Object.freeze({
    target,
    state: 'provider-id-resolution-required' as const,
    metadataView: 'VW_MUSICAL_RELEASE_GROUP_DS' as const,
    exactMetadataCandidateQueryTemplate: metadataQuery,
    barcodeMappingQueryTemplate: barcodeQuery,
    acceptanceRule: target.barcode
      ? 'exactly-one-reviewed-mrelg-candidate-with-barcode-crosscheck-required' as const
      : 'exactly-one-reviewed-mrelg-candidate-required' as const,
    blockers: Object.freeze([
      'luminate-license-and-data-share-access-required',
      'luminate-mrelg-id-not-yet-resolved',
    ]),
  });
}

export function buildLuminateSnowflakeFirstWeekExtractionPlan(input: Readonly<{
  mrelgId: string;
  territory: 'US' | 'CA';
  releaseDate: string;
  breakouts: LuminateSnowflakeResolvedBreakouts;
}>): LuminateSnowflakeExtractionPlan {
  assertReleaseDate(input.releaseDate);
  const blockers = [...validateLuminateSnowflakeBreakouts(input.breakouts)];
  if (!nonEmpty(input.mrelgId)) blockers.push('luminate-mrelg-id-required');

  const window = buildLuminateTrackedFirstWeekWindow(input.releaseDate);
  const formatPlaceholders = input.breakouts.physicalProductFormats.map(() => '?').join(', ');
  const queryTemplate = `SELECT
  MRELG_ID,
  COUNTRY_CODE,
  PRODUCT_FORMAT,
  TRANSACTION_TYPE,
  REPORT_DATE,
  SUM(REPORTED_QUANTITY) AS REPORTED_QUANTITY,
  MAX(MODIFIED_AT) AS MODIFIED_AT
FROM {{LUMINATE_DATA_SHARE}}.VW_DAILY_FACT_MRELG_DETAIL_DS
WHERE MRELG_ID = ?
  AND COUNTRY_CODE = ?
  AND REPORT_DATE BETWEEN ? AND ?
  AND METRIC_CATEGORY = ?
  AND DISTRIBUTION_CHANNEL = ?
  AND PURCHASE_METHOD IN (?, ?)
  AND PRODUCT_FORMAT IN (${formatPlaceholders})
  AND TRANSACTION_TYPE IN ('S', 'R')
GROUP BY MRELG_ID, COUNTRY_CODE, PRODUCT_FORMAT, TRANSACTION_TYPE, REPORT_DATE
ORDER BY REPORT_DATE, PRODUCT_FORMAT, TRANSACTION_TYPE;`;

  return Object.freeze({
    state: blockers.length === 0
      ? 'ready-after-license-and-provider-id-resolution' as const
      : 'blocked' as const,
    view: 'VW_DAILY_FACT_MRELG_DETAIL_DS' as const,
    mrelgId: input.mrelgId,
    territory: input.territory,
    providerPeriod: `${window.startDate}/${window.endDate}`,
    queryTemplate,
    bindValues: Object.freeze({
      mrelgId: input.mrelgId,
      territory: input.territory,
      startDate: window.startDate,
      endDate: window.endDate,
      metricCategory: input.breakouts.metricCategoryProductSales,
      distributionChannel: input.breakouts.distributionChannelPhysical,
      purchaseMethods: Object.freeze([
        input.breakouts.purchaseMethodOnline,
        input.breakouts.purchaseMethodStorefront,
      ] as [string, string]),
      productFormats: Object.freeze([...input.breakouts.physicalProductFormats]),
      transactionTypes: Object.freeze(['S', 'R'] as const),
    }),
    blockers: Object.freeze([...new Set(blockers)]),
  });
}

function enumerateDates(startDate: string, endDate: string): readonly string[] {
  const out: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return Object.freeze(out);
}

export function aggregateLuminateSnowflakeFirstWeekRows(input: Readonly<{
  rows: readonly LuminateSnowflakeFirstWeekRow[];
  mrelgId: string;
  territory: 'US' | 'CA';
  releaseDate: string;
  allowedPhysicalProductFormats: readonly string[];
}>): LuminateSnowflakeFirstWeekAggregate {
  assertReleaseDate(input.releaseDate);
  if (!nonEmpty(input.mrelgId)) throw new Error('luminate_snowflake_aggregate_mrelg_id_missing');
  if (input.rows.length === 0) throw new Error('luminate_snowflake_aggregate_rows_missing');

  const window = buildLuminateTrackedFirstWeekWindow(input.releaseDate);
  const expectedDates = new Set(enumerateDates(window.startDate, window.endDate));
  const allowedFormats = new Set(input.allowedPhysicalProductFormats);
  let total = 0;
  let maxModifiedAt = '';
  const formats = new Set<string>();
  const dates = new Set<string>();

  for (const row of input.rows) {
    if (row.MRELG_ID !== input.mrelgId) throw new Error('luminate_snowflake_aggregate_release_mismatch');
    if (row.COUNTRY_CODE !== input.territory) throw new Error('luminate_snowflake_aggregate_territory_mismatch');
    if (!allowedFormats.has(row.PRODUCT_FORMAT)) throw new Error('luminate_snowflake_aggregate_product_format_unapproved');
    if (row.TRANSACTION_TYPE !== 'S' && row.TRANSACTION_TYPE !== 'R') {
      throw new Error('luminate_snowflake_aggregate_transaction_type_invalid');
    }
    if (!expectedDates.has(row.REPORT_DATE)) throw new Error('luminate_snowflake_aggregate_report_date_outside_first_week');
    if (!Number.isSafeInteger(row.REPORTED_QUANTITY)) {
      throw new Error('luminate_snowflake_aggregate_reported_quantity_invalid');
    }
    if (!ISO_TIMESTAMP_RE.test(row.MODIFIED_AT) || Number.isNaN(Date.parse(row.MODIFIED_AT))) {
      throw new Error('luminate_snowflake_aggregate_modified_at_invalid');
    }
    total += row.REPORTED_QUANTITY;
    formats.add(row.PRODUCT_FORMAT);
    dates.add(row.REPORT_DATE);
    if (!maxModifiedAt || Date.parse(row.MODIFIED_AT) > Date.parse(maxModifiedAt)) {
      maxModifiedAt = row.MODIFIED_AT;
    }
  }

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new Error('luminate_snowflake_aggregate_positive_physical_units_required');
  }

  const canonicalRows = [...input.rows]
    .map((row) => ({ ...row }))
    .sort((a, b) =>
      a.REPORT_DATE.localeCompare(b.REPORT_DATE)
      || a.PRODUCT_FORMAT.localeCompare(b.PRODUCT_FORMAT)
      || a.TRANSACTION_TYPE.localeCompare(b.TRANSACTION_TYPE)
      || a.MODIFIED_AT.localeCompare(b.MODIFIED_AT)
      || a.REPORTED_QUANTITY - b.REPORTED_QUANTITY);

  return Object.freeze({
    providerReleaseId: input.mrelgId,
    territory: input.territory,
    providerPeriod: `${window.startDate}/${window.endDate}`,
    reportedPhysicalUnits: total,
    productFormats: Object.freeze([...formats].sort()),
    reportDates: Object.freeze([...dates].sort()),
    maxModifiedAt,
    sourceRowsDigest: sha256Canonical(canonicalRows),
    rowCount: input.rows.length,
  });
}

export function buildLuminateObservationSnapshotFromSnowflakeAggregate(input: Readonly<{
  aggregate: LuminateSnowflakeFirstWeekAggregate;
  fandexArtistId: string;
  fandexReleaseId: string;
  fandexReleaseFamilyId: string;
  providerArtistId: string | null;
  collectedAt: string;
  predecessor?: LuminateObservationSnapshotPredecessor | null;
}>): LuminateObservationSnapshotBuild {
  if (!nonEmpty(input.fandexArtistId) || !nonEmpty(input.fandexReleaseId) || !nonEmpty(input.fandexReleaseFamilyId)) {
    throw new Error('luminate_snowflake_snapshot_fandex_identity_missing');
  }
  if (Number.isNaN(Date.parse(input.collectedAt))) {
    throw new Error('luminate_snowflake_snapshot_collected_at_invalid');
  }

  const predecessor = input.predecessor ?? null;
  if (predecessor && predecessor.sourceRowsDigest === input.aggregate.sourceRowsDigest) {
    return Object.freeze({
      state: 'unchanged-noop' as const,
      observation: null,
      supersedesStoredRecordId: null,
    });
  }

  const revisionId = predecessor
    ? sha256Canonical({
        providerReleaseId: input.aggregate.providerReleaseId,
        territory: input.aggregate.territory,
        providerPeriod: input.aggregate.providerPeriod,
        sourceRowsDigest: input.aggregate.sourceRowsDigest,
        maxModifiedAt: input.aggregate.maxModifiedAt,
      })
    : null;

  const observation = buildDirectAlbumObservation({
    contractVersion: DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
    providerId: 'luminate-music',
    providerObservationId: sha256Canonical({
      providerId: 'luminate-music',
      providerReleaseId: input.aggregate.providerReleaseId,
      territory: input.aggregate.territory,
      providerPeriod: input.aggregate.providerPeriod,
      sourceRowsDigest: input.aggregate.sourceRowsDigest,
    }),
    providerArtistId: input.providerArtistId,
    providerReleaseId: input.aggregate.providerReleaseId,
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: input.fandexArtistId,
    fandexReleaseId: input.fandexReleaseId,
    fandexReleaseFamilyId: input.fandexReleaseFamilyId,
    semantic: 'first-week-sale',
    value: input.aggregate.reportedPhysicalUnits,
    unit: 'physical-units',
    territory: input.aggregate.territory,
    format: 'physical',
    providerPeriod: input.aggregate.providerPeriod,
    providerPublishedAt: null,
    observedAt: input.collectedAt,
    collectedAt: input.collectedAt,
    revisionId,
    revisionObservedAt: predecessor ? input.aggregate.maxModifiedAt : null,
    supersedesObservationId: predecessor?.observationId ?? null,
    knowledgeMode: 'current-research',
    scopeRole: 'release-total',
    parentObservationId: null,
    evidenceDigest: input.aggregate.sourceRowsDigest,
    syntheticFixture: false,
  });

  return Object.freeze({
    state: predecessor ? 'new-revision' as const : 'new-original' as const,
    observation,
    supersedesStoredRecordId: predecessor?.storedRecordId ?? null,
  });
}
