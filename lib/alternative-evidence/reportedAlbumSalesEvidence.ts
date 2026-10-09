import { sha256Canonical } from '../shared/canonicalDigest';

export const REPORTED_ALBUM_SALES_OBSERVATION_CONTRACT_VERSION =
  'reported-album-sales-observation-v1' as const;
export const REPORTED_ALBUM_SALES_HISTORY_CONTRACT_VERSION =
  'reported-album-sales-history-v1' as const;

export type ReportedAlbumSalesSourceTier =
  | 'tier-a-primary-official'
  | 'tier-b-provider-attributed-reputable'
  | 'tier-c-discovery-only';

export type ReportedAlbumSalesEvidenceQuality =
  | 'primary-official'
  | 'provider-attributed-secondary'
  | 'corroborated-secondary'
  | 'discovery-only'
  | 'unresolved'
  | 'conflicting'
  | 'superseded';

export type ReportedAlbumSalesMetricSemantic =
  | 'hanteo-first-day-sales'
  | 'hanteo-first-week-sales'
  | 'hanteo-daily-sales'
  | 'hanteo-weekly-sales'
  | 'hanteo-monthly-sales'
  | 'hanteo-cumulative-sales'
  | 'circle-retail-period-sales'
  | 'circle-album-distribution-volume'
  | 'shipment'
  | 'preorder'
  | 'stock-preorder'
  | 'oricon-physical-sales'
  | 'unknown';

export type ReportedAlbumSalesReleaseIdentity = Readonly<{
  canonicalReleaseId: string | null;
  identityState: 'resolved' | 'candidate' | 'unresolved' | 'conflicting';
  releaseTitle: string;
  releaseDate: string | null;
  edition: string | null;
  skuOrBarcode: string | null;
  providerReleaseId: string | null;
}>;

export type ReportedAlbumSalesSupportingEvidence = Readonly<{
  evidenceId: string;
  sourceTier: ReportedAlbumSalesSourceTier;
  reportingSource: string;
  sourceUrl: string;
  sourcePublicationDate: string | null;
  sourcePublishedAt: string | null;
  reportedAt: string | null;
  collectedAt: string;
  extractionMethod:
    | 'manual-reviewed-web-research'
    | 'structured-extractor'
    | 'imported-reviewed-dataset';
  underlyingProvider: string | null;
}>;

export type ReportedAlbumSalesRevision = Readonly<{
  state: 'original' | 'possible-correction' | 'explicit-correction';
  supersedesObservationId: string | null;
  revisionObservedAt: string | null;
}>;

export type ReportedAlbumSalesObservationDraft = Readonly<{
  canonicalArtistId: string;
  artistName: string;
  release: ReportedAlbumSalesReleaseIdentity;
  metricSemantic: ReportedAlbumSalesMetricSemantic;
  value: number | null;
  unit: 'physical-copies' | null;
  providerPeriodStart: string | null;
  providerPeriodEnd: string | null;
  observedAt: string | null;
  reportedAt: string | null;
  collectedAt: string;
  underlyingProvider: string | null;
  territory: string | null;
  format: string | null;
  revision?: Partial<ReportedAlbumSalesRevision>;
  supportingEvidence: readonly ReportedAlbumSalesSupportingEvidence[];
  lifecycle: 'research' | 'shadow';
}>;

export type ReportedAlbumSalesObservation = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_OBSERVATION_CONTRACT_VERSION;
  observationId: string;
  observationScopeId: string;
  canonicalArtistId: string;
  artistName: string;
  release: ReportedAlbumSalesReleaseIdentity;
  metricSemantic: ReportedAlbumSalesMetricSemantic;
  value: number | null;
  unit: 'physical-copies' | null;
  providerPeriodStart: string | null;
  providerPeriodEnd: string | null;
  observedAt: string | null;
  reportedAt: string | null;
  collectedAt: string;
  underlyingProvider: string | null;
  territory: string | null;
  format: string | null;
  revision: ReportedAlbumSalesRevision;
  supportingEvidence:
    readonly ReportedAlbumSalesSupportingEvidence[];
  sourceTiers: readonly ReportedAlbumSalesSourceTier[];
  evidenceQuality: ReportedAlbumSalesEvidenceQuality;
  lifecycle: 'research' | 'shadow';
  researchUsable: boolean;
  productEligible: false;
  directProviderReplacementAllowed: false;
  scoreFieldsPresent: false;
  blockers: readonly string[];
}>;

export type ReportedAlbumSalesHistory = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_HISTORY_CONTRACT_VERSION;
  historyClass: 'reported-web-research-shadow';
  observations: readonly ReportedAlbumSalesObservation[];
  conflicts: readonly Readonly<{
    observationScopeId: string;
    observationIds: readonly string[];
    state: 'conflicting-evidence';
  }>[];
  productEligible: false;
  directProviderReplacementAllowed: false;
  numericNormalizationDefined: false;
  scoreFieldsPresent: false;
}>;

export type ReportedAlbumSalesAsOfRead = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_HISTORY_CONTRACT_VERSION;
  asOf: string;
  visibleObservations:
    readonly ReportedAlbumSalesObservation[];
  activeObservations:
    readonly ReportedAlbumSalesObservation[];
  supersededObservations:
    readonly ReportedAlbumSalesObservation[];
  conflictingScopeIds: readonly string[];
  productEligible: false;
  scoreFieldsPresent: false;
}>;

function normalized(value: string | null): string | null {
  if (value === null) return null;
  const result = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  return result === '' ? null : result;
}

function validInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function assertInstant(
  label: string,
  value: string | null,
): void {
  if (value !== null && !validInstant(value)) {
    throw new Error(
      `reported_album_sales_${label}_invalid:${value}`,
    );
  }
}

// Strict civil-calendar dates: JS Date.parse normalizes impossible days
// (for example, 2025-02-30 becomes 2025-03-02). No implicit repair is allowed.
export function isReportedAlbumSalesCalendarDate(
  value: string | null,
): value is string {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const instant = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(instant)
    && new Date(instant).toISOString().slice(0, 10) === value;
}

function validateDate(
  label: string,
  value: string | null,
): void {
  if (value !== null && !isReportedAlbumSalesCalendarDate(value)) {
    throw new Error(
      `reported_album_sales_${label}_invalid:${value}`,
    );
  }
}

function releaseIdentityShape(
  release: ReportedAlbumSalesReleaseIdentity,
) {
  return Object.freeze({
    canonicalReleaseId:
      normalized(release.canonicalReleaseId),
    identityState: release.identityState,
    releaseTitle: normalized(release.releaseTitle),
    releaseDate: release.releaseDate,
    edition: normalized(release.edition),
    skuOrBarcode: normalized(release.skuOrBarcode),
    providerReleaseId: normalized(release.providerReleaseId),
  });
}

export function buildReportedAlbumSalesObservationScopeId(
  draft: ReportedAlbumSalesObservationDraft,
): string {
  return sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_OBSERVATION_CONTRACT_VERSION,
    canonicalArtistId: normalized(draft.canonicalArtistId),
    release: releaseIdentityShape(draft.release),
    metricSemantic: draft.metricSemantic,
    providerPeriodStart: draft.providerPeriodStart,
    providerPeriodEnd: draft.providerPeriodEnd,
    underlyingProvider: normalized(draft.underlyingProvider),
    territory: normalized(draft.territory),
    format: normalized(draft.format),
  });
}

export function buildReportedAlbumSalesObservationId(
  draft: ReportedAlbumSalesObservationDraft,
): string {
  return sha256Canonical({
    observationScopeId:
      buildReportedAlbumSalesObservationScopeId(draft),
    value: draft.value,
    unit: draft.unit,
  });
}

function dedupeSupportingEvidence(
  evidence: readonly ReportedAlbumSalesSupportingEvidence[],
): readonly ReportedAlbumSalesSupportingEvidence[] {
  const byId =
    new Map<string, ReportedAlbumSalesSupportingEvidence>();

  for (const item of evidence) {
    if (item.evidenceId.trim() === '') {
      throw new Error(
        'reported_album_sales_evidence_id_missing',
      );
    }
    if (item.reportingSource.trim() === '') {
      throw new Error(
        'reported_album_sales_reporting_source_missing',
      );
    }
    if (!/^https?:\/\//i.test(item.sourceUrl)) {
      throw new Error(
        'reported_album_sales_source_url_invalid',
      );
    }
    if (!validInstant(item.collectedAt)) {
      throw new Error(
        'reported_album_sales_evidence_collected_at_invalid',
      );
    }
    validateDate(
      'evidence_source_publication_date',
      item.sourcePublicationDate,
    );
    assertInstant(
      'evidence_reported_at',
      item.reportedAt,
    );
    assertInstant(
      'evidence_source_published_at',
      item.sourcePublishedAt,
    );

    const previous = byId.get(item.evidenceId);
    if (previous) {
      if (
        sha256Canonical(previous)
        !== sha256Canonical(item)
      ) {
        throw new Error(
          'reported_album_sales_evidence_id_collision',
        );
      }
      continue;
    }
    byId.set(item.evidenceId, Object.freeze({ ...item }));
  }

  return Object.freeze(
    [...byId.values()].sort((a, b) =>
      a.evidenceId.localeCompare(b.evidenceId)),
  );
}

function evidenceQuality(
  supportingEvidence:
    readonly ReportedAlbumSalesSupportingEvidence[],
  blockers: readonly string[],
): ReportedAlbumSalesEvidenceQuality {
  const discoveryOnly =
    supportingEvidence.length > 0
    && supportingEvidence.every(
      item => item.sourceTier === 'tier-c-discovery-only',
    );
  if (discoveryOnly) return 'discovery-only';
  if (blockers.length > 0) return 'unresolved';

  const primary = supportingEvidence.some(
    item => item.sourceTier === 'tier-a-primary-official',
  );
  if (primary) return 'primary-official';

  const secondarySources = new Set(
    supportingEvidence
      .filter(item =>
        item.sourceTier
          === 'tier-b-provider-attributed-reputable')
      .map(item => item.reportingSource),
  );
  if (secondarySources.size >= 2) {
    return 'corroborated-secondary';
  }
  if (secondarySources.size === 1) {
    return 'provider-attributed-secondary';
  }

  return 'discovery-only';
}

function buildBlockers(
  draft: ReportedAlbumSalesObservationDraft,
  supportingEvidence:
    readonly ReportedAlbumSalesSupportingEvidence[],
): readonly string[] {
  const blockers: string[] = [];

  if (draft.canonicalArtistId.trim() === '') {
    blockers.push('canonical-artist-id-missing');
  }
  if (draft.release.releaseTitle.trim() === '') {
    blockers.push('release-title-missing');
  }
  if (
    draft.release.identityState === 'unresolved'
    || draft.release.identityState === 'conflicting'
  ) {
    blockers.push('release-identity-not-reviewable');
  }
  if (draft.metricSemantic === 'unknown') {
    blockers.push('metric-semantic-unknown');
  }
  if (draft.value === null) {
    blockers.push('exact-value-unavailable');
  }
  if (draft.unit === null) {
    blockers.push('unit-unknown');
  }
  if (draft.underlyingProvider === null) {
    blockers.push('underlying-provider-unknown');
  }
  if (supportingEvidence.length === 0) {
    blockers.push('supporting-evidence-missing');
  }
  if (
    supportingEvidence.length > 0
    && supportingEvidence.every(
      item => item.sourceTier === 'tier-c-discovery-only',
    )
  ) {
    blockers.push('discovery-only');
  }

  return Object.freeze([...new Set(blockers)].sort());
}

function earliestInstant(
  values: readonly (string | null)[],
): string | null {
  const valid = values.filter(
    (value): value is string => value !== null,
  );
  if (valid.length === 0) return null;
  return [...valid].sort(
    (a, b) => Date.parse(a) - Date.parse(b),
  )[0];
}

export function createReportedAlbumSalesObservation(
  draft: ReportedAlbumSalesObservationDraft,
): ReportedAlbumSalesObservation {
  validateDate('release_date', draft.release.releaseDate);
  validateDate(
    'provider_period_start',
    draft.providerPeriodStart,
  );
  validateDate(
    'provider_period_end',
    draft.providerPeriodEnd,
  );
  assertInstant('observed_at', draft.observedAt);
  assertInstant('reported_at', draft.reportedAt);
  assertInstant('collected_at', draft.collectedAt);

  if (
    draft.value !== null
    && (
      !Number.isSafeInteger(draft.value)
      || draft.value < 0
    )
  ) {
    throw new Error(
      'reported_album_sales_value_invalid',
    );
  }
  if (draft.value === 0) {
    throw new Error(
      'reported_album_sales_missing_must_not_be_zero',
    );
  }
  if (
    draft.providerPeriodStart !== null
    && draft.providerPeriodEnd !== null
    && draft.providerPeriodStart > draft.providerPeriodEnd
  ) {
    throw new Error(
      'reported_album_sales_provider_period_invalid',
    );
  }

  const revision: ReportedAlbumSalesRevision =
    Object.freeze({
      state: draft.revision?.state ?? 'original',
      supersedesObservationId:
        draft.revision?.supersedesObservationId ?? null,
      revisionObservedAt:
        draft.revision?.revisionObservedAt ?? null,
    });
  assertInstant(
    'revision_observed_at',
    revision.revisionObservedAt,
  );
  if (
    revision.state === 'explicit-correction'
    && !revision.supersedesObservationId
  ) {
    throw new Error(
      'reported_album_sales_explicit_revision_target_required',
    );
  }
  if (
    revision.supersedesObservationId
    && revision.state !== 'explicit-correction'
  ) {
    throw new Error(
      'reported_album_sales_supersession_requires_explicit_revision',
    );
  }

  const supportingEvidence =
    dedupeSupportingEvidence(draft.supportingEvidence);
  const blockers = buildBlockers(draft, supportingEvidence);
  const quality = evidenceQuality(
    supportingEvidence,
    blockers,
  );
  const sourceTiers = Object.freeze(
    [...new Set(
      supportingEvidence.map(item => item.sourceTier),
    )].sort(),
  );

  const firstEvidenceCollectedAt =
    earliestInstant(
      supportingEvidence.map(item => item.collectedAt),
    );
  const collectedAt =
    firstEvidenceCollectedAt !== null
      && Date.parse(firstEvidenceCollectedAt)
        < Date.parse(draft.collectedAt)
      ? firstEvidenceCollectedAt
      : draft.collectedAt;

  const researchUsable =
    blockers.length === 0
    && quality !== 'discovery-only'
    && quality !== 'unresolved';

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_OBSERVATION_CONTRACT_VERSION,
    observationId:
      buildReportedAlbumSalesObservationId(draft),
    observationScopeId:
      buildReportedAlbumSalesObservationScopeId(draft),
    canonicalArtistId: draft.canonicalArtistId,
    artistName: draft.artistName,
    release: Object.freeze({ ...draft.release }),
    metricSemantic: draft.metricSemantic,
    value: draft.value,
    unit: draft.unit,
    providerPeriodStart: draft.providerPeriodStart,
    providerPeriodEnd: draft.providerPeriodEnd,
    observedAt: draft.observedAt,
    reportedAt: draft.reportedAt,
    collectedAt,
    underlyingProvider: draft.underlyingProvider,
    territory: draft.territory,
    format: draft.format,
    revision,
    supportingEvidence,
    sourceTiers,
    evidenceQuality: quality,
    lifecycle: draft.lifecycle,
    researchUsable,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
    scoreFieldsPresent: false as const,
    blockers,
  });
}

function mergeSameUnderlyingObservation(
  observations: readonly ReportedAlbumSalesObservation[],
): ReportedAlbumSalesObservation {
  const first = observations[0];
  const evidence = dedupeSupportingEvidence(
    observations.flatMap(item =>
      [...item.supportingEvidence]),
  );
  const hasNonDiscoveryEvidence = evidence.some(
    item => item.sourceTier !== 'tier-c-discovery-only',
  );
  const blockers = Object.freeze(
    [...new Set(
      observations
        .flatMap(item => [...item.blockers])
        .filter(blocker =>
          blocker !== 'discovery-only'
          || !hasNonDiscoveryEvidence),
    )].sort(),
  );
  const quality = evidenceQuality(evidence, blockers);
  const collectedAt =
    earliestInstant(
      observations.map(item => item.collectedAt),
    ) ?? first.collectedAt;

  return Object.freeze({
    ...first,
    collectedAt,
    supportingEvidence: evidence,
    sourceTiers: Object.freeze(
      [...new Set(evidence.map(item => item.sourceTier))].sort(),
    ),
    evidenceQuality: quality,
    researchUsable:
      blockers.length === 0
      && quality !== 'discovery-only'
      && quality !== 'unresolved',
    blockers,
  });
}

export function dedupeReportedAlbumSalesObservations(
  observations: readonly ReportedAlbumSalesObservation[],
): readonly ReportedAlbumSalesObservation[] {
  const byObservationId =
    new Map<string, ReportedAlbumSalesObservation[]>();
  for (const observation of observations) {
    const group =
      byObservationId.get(observation.observationId) ?? [];
    group.push(observation);
    byObservationId.set(observation.observationId, group);
  }
  return Object.freeze(
    [...byObservationId.values()]
      .map(mergeSameUnderlyingObservation)
      .sort((a, b) =>
        a.observationId.localeCompare(b.observationId)),
  );
}

function validateRevisionGraph(
  observations: readonly ReportedAlbumSalesObservation[],
): void {
  const byId = new Map(
    observations.map(item => [item.observationId, item]),
  );

  for (const observation of observations) {
    const parentId =
      observation.revision.supersedesObservationId;
    if (!parentId) continue;
    const parent = byId.get(parentId);
    if (!parent) {
      throw new Error(
        'reported_album_sales_revision_parent_missing',
      );
    }
    if (
      parent.observationScopeId
      !== observation.observationScopeId
    ) {
      throw new Error(
        'reported_album_sales_revision_scope_mismatch',
      );
    }
    if (
      Date.parse(parent.collectedAt)
      > Date.parse(observation.collectedAt)
    ) {
      throw new Error(
        'reported_album_sales_revision_known_before_parent',
      );
    }
  }
}

function activeConflictScopes(
  observations: readonly ReportedAlbumSalesObservation[],
): readonly Readonly<{
  observationScopeId: string;
  observationIds: readonly string[];
  state: 'conflicting-evidence';
}>[] {
  const superseded = new Set(
    observations
      .map(item => item.revision.supersedesObservationId)
      .filter((value): value is string => value !== null),
  );
  const active = observations.filter(
    item => !superseded.has(item.observationId),
  );
  const byScope =
    new Map<string, ReportedAlbumSalesObservation[]>();
  for (const item of active) {
    const group = byScope.get(item.observationScopeId) ?? [];
    group.push(item);
    byScope.set(item.observationScopeId, group);
  }

  return Object.freeze(
    [...byScope.entries()]
      .filter(([, group]) =>
        new Set(group.map(item => item.observationId)).size > 1)
      .map(([observationScopeId, group]) =>
        Object.freeze({
          observationScopeId,
          observationIds: Object.freeze(
            group.map(item => item.observationId).sort(),
          ),
          state: 'conflicting-evidence' as const,
        }))
      .sort((a, b) =>
        a.observationScopeId.localeCompare(
          b.observationScopeId,
        )),
  );
}

export function buildReportedAlbumSalesHistory(
  observations: readonly ReportedAlbumSalesObservation[],
): ReportedAlbumSalesHistory {
  const deduped =
    dedupeReportedAlbumSalesObservations(observations);
  validateRevisionGraph(deduped);
  const conflicts = activeConflictScopes(deduped);
  const conflictingIds = new Set(
    conflicts.flatMap(item => [...item.observationIds]),
  );
  const observationsWithConflictState = Object.freeze(
    deduped.map(item =>
      conflictingIds.has(item.observationId)
        ? Object.freeze({
            ...item,
            evidenceQuality: 'conflicting' as const,
            researchUsable: false,
            blockers: Object.freeze(
              [...new Set([
                ...item.blockers,
                'conflicting-evidence',
              ])].sort(),
            ),
          })
        : item),
  );

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_HISTORY_CONTRACT_VERSION,
    historyClass:
      'reported-web-research-shadow' as const,
    observations: observationsWithConflictState,
    conflicts,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
    numericNormalizationDefined: false as const,
    scoreFieldsPresent: false as const,
  });
}

export function readReportedAlbumSalesHistoryAsOf(
  history: ReportedAlbumSalesHistory,
  asOf: string,
): ReportedAlbumSalesAsOfRead {
  if (!validInstant(asOf)) {
    throw new Error(
      'reported_album_sales_as_of_invalid',
    );
  }
  const asOfMs = Date.parse(asOf);
  const visible = history.observations
    .filter(item => Date.parse(item.collectedAt) <= asOfMs)
    .sort((a, b) =>
      a.observationId.localeCompare(b.observationId));

  const visibleIds = new Set(
    visible.map(item => item.observationId),
  );
  const supersededIds = new Set(
    visible
      .map(item => item.revision.supersedesObservationId)
      .filter(
        (value): value is string =>
          value !== null && visibleIds.has(value),
      ),
  );

  const active = visible.filter(
    item => !supersededIds.has(item.observationId),
  );
  const superseded = visible.filter(
    item => supersededIds.has(item.observationId),
  );
  const conflicts = activeConflictScopes(active);

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_HISTORY_CONTRACT_VERSION,
    asOf,
    visibleObservations: Object.freeze(visible),
    activeObservations: Object.freeze(active),
    supersededObservations: Object.freeze(superseded),
    conflictingScopeIds: Object.freeze(
      conflicts.map(item => item.observationScopeId),
    ),
    productEligible: false as const,
    scoreFieldsPresent: false as const,
  });
}
