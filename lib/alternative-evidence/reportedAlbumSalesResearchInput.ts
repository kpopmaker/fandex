import { sha256Canonical } from '../shared/canonicalDigest';
import {
  readReportedAlbumSalesHistoryAsOf,
  type ReportedAlbumSalesAsOfRead,
  type ReportedAlbumSalesHistory,
  type ReportedAlbumSalesObservation,
} from './reportedAlbumSalesEvidence';

export const REPORTED_ALBUM_SALES_RESEARCH_INPUT_CONTRACT_VERSION =
  'reported-album-sales-research-input-v1' as const;

export const REPORTED_ALBUM_SALES_RESEARCH_INPUT_TARGET =
  Object.freeze({
    underlyingProvider: 'Hanteo Chart' as const,
    metricSemantic: 'hanteo-first-week-sales' as const,
    unit: 'physical-copies' as const,
    periodShape: 'explicit-seven-calendar-days' as const,
  });

export type ReportedAlbumSalesResearchInputExclusionReason =
  | 'provider-mismatch'
  | 'metric-semantic-mismatch'
  | 'not-research-usable'
  | 'value-missing'
  | 'unit-mismatch'
  | 'release-identity-unreviewable'
  | 'provider-period-incomplete'
  | 'provider-period-invalid'
  | 'provider-period-not-seven-calendar-days'
  | 'conflicting-active-scope';

export type ReportedAlbumSalesResearchInputEntry = Readonly<{
  observationId: string;
  observationScopeId: string;
  canonicalArtistId: string;
  canonicalReleaseId: string | null;
  releaseIdentityState:
    ReportedAlbumSalesObservation['release']['identityState'];
  releaseTitle: string;
  releaseDate: string | null;
  value: number;
  unit: 'physical-copies';
  underlyingProvider: 'Hanteo Chart';
  metricSemantic: 'hanteo-first-week-sales';
  providerPeriodStart: string;
  providerPeriodEnd: string;
  evidenceQuality:
    ReportedAlbumSalesObservation['evidenceQuality'];
  evidenceIds: readonly string[];
}>;

export type ReportedAlbumSalesResearchInputExclusion = Readonly<{
  observationId: string;
  observationScopeId: string;
  canonicalArtistId: string;
  releaseTitle: string;
  reasons:
    readonly [
      ReportedAlbumSalesResearchInputExclusionReason,
      ...ReportedAlbumSalesResearchInputExclusionReason[],
    ];
}>;

export type ReportedAlbumSalesResearchInput = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_INPUT_CONTRACT_VERSION;
  lifecycle: 'research-shadow';
  asOf: string;
  inputFingerprint: string;
  target: typeof REPORTED_ALBUM_SALES_RESEARCH_INPUT_TARGET;
  state:
    | 'reviewable'
    | 'insufficient-evidence'
    | 'conflicting-evidence';
  entries: readonly ReportedAlbumSalesResearchInputEntry[];
  exclusions: readonly ReportedAlbumSalesResearchInputExclusion[];
  includedObservationIds: readonly string[];
  includedArtistIds: readonly string[];
  releaseCount: number;
  artistCount: number;
  minimumCohortSizeDefined: false;
  sameSemanticOnly: true;
  sameUnderlyingProviderOnly: true;
  explicitPeriodRequired: true;
  periodInferenceAllowed: false;
  crossProviderCombinationAllowed: false;
  crossSemanticCombinationAllowed: false;
  rawAdditionAllowed: false;
  rawAverageAllowed: false;
  numericNormalizationDefined: false;
  calibrationMethodDefined: false;
  scoreFieldsPresent: false;
  productEligible: false;
  directProviderReplacementAllowed: false;
}>;

function dayDifferenceInclusive(
  start: string,
  end: string,
): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start)
    || !/^\d{4}-\d{2}-\d{2}$/.test(end)
  ) {
    return null;
  }

  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (
    Number.isNaN(startMs)
    || Number.isNaN(endMs)
    || endMs < startMs
  ) {
    return null;
  }

  return Math.floor(
    (endMs - startMs) / (24 * 60 * 60 * 1000),
  ) + 1;
}

function exclusionReasons(
  observation: ReportedAlbumSalesObservation,
  conflictingScopeIds: ReadonlySet<string>,
): readonly ReportedAlbumSalesResearchInputExclusionReason[] {
  const reasons: ReportedAlbumSalesResearchInputExclusionReason[] = [];

  if (
    observation.underlyingProvider
      !== REPORTED_ALBUM_SALES_RESEARCH_INPUT_TARGET.underlyingProvider
  ) {
    reasons.push('provider-mismatch');
  }
  if (
    observation.metricSemantic
      !== REPORTED_ALBUM_SALES_RESEARCH_INPUT_TARGET.metricSemantic
  ) {
    reasons.push('metric-semantic-mismatch');
  }
  if (!observation.researchUsable) {
    reasons.push('not-research-usable');
  }
  if (observation.value === null) {
    reasons.push('value-missing');
  }
  if (
    observation.unit
      !== REPORTED_ALBUM_SALES_RESEARCH_INPUT_TARGET.unit
  ) {
    reasons.push('unit-mismatch');
  }
  if (
    observation.release.identityState === 'unresolved'
    || observation.release.identityState === 'conflicting'
  ) {
    reasons.push('release-identity-unreviewable');
  }

  if (
    observation.providerPeriodStart === null
    || observation.providerPeriodEnd === null
  ) {
    reasons.push('provider-period-incomplete');
  } else {
    const days = dayDifferenceInclusive(
      observation.providerPeriodStart,
      observation.providerPeriodEnd,
    );
    if (days === null) {
      reasons.push('provider-period-invalid');
    } else if (days !== 7) {
      reasons.push('provider-period-not-seven-calendar-days');
    }
  }

  if (conflictingScopeIds.has(observation.observationScopeId)) {
    reasons.push('conflicting-active-scope');
  }

  return Object.freeze([...new Set(reasons)].sort());
}

function toEntry(
  observation: ReportedAlbumSalesObservation,
): ReportedAlbumSalesResearchInputEntry {
  if (
    observation.value === null
    || observation.unit !== 'physical-copies'
    || observation.underlyingProvider !== 'Hanteo Chart'
    || observation.metricSemantic !== 'hanteo-first-week-sales'
    || observation.providerPeriodStart === null
    || observation.providerPeriodEnd === null
  ) {
    throw new Error(
      'reported_album_sales_research_input_entry_not_eligible',
    );
  }

  return Object.freeze({
    observationId: observation.observationId,
    observationScopeId: observation.observationScopeId,
    canonicalArtistId: observation.canonicalArtistId,
    canonicalReleaseId: observation.release.canonicalReleaseId,
    releaseIdentityState: observation.release.identityState,
    releaseTitle: observation.release.releaseTitle,
    releaseDate: observation.release.releaseDate,
    value: observation.value,
    unit: 'physical-copies' as const,
    underlyingProvider: 'Hanteo Chart' as const,
    metricSemantic: 'hanteo-first-week-sales' as const,
    providerPeriodStart: observation.providerPeriodStart,
    providerPeriodEnd: observation.providerPeriodEnd,
    evidenceQuality: observation.evidenceQuality,
    evidenceIds: Object.freeze(
      observation.supportingEvidence
        .map(item => item.evidenceId)
        .sort(),
    ),
  });
}

function buildFromAsOfRead(
  read: ReportedAlbumSalesAsOfRead,
): ReportedAlbumSalesResearchInput {
  const conflictingScopeIds = new Set(
    read.conflictingScopeIds,
  );
  const entries: ReportedAlbumSalesResearchInputEntry[] = [];
  const exclusions: ReportedAlbumSalesResearchInputExclusion[] = [];

  for (const observation of read.activeObservations) {
    const reasons = exclusionReasons(
      observation,
      conflictingScopeIds,
    );

    if (reasons.length === 0) {
      entries.push(toEntry(observation));
      continue;
    }

    exclusions.push(Object.freeze({
      observationId: observation.observationId,
      observationScopeId: observation.observationScopeId,
      canonicalArtistId: observation.canonicalArtistId,
      releaseTitle: observation.release.releaseTitle,
      reasons: reasons as readonly [
        ReportedAlbumSalesResearchInputExclusionReason,
        ...ReportedAlbumSalesResearchInputExclusionReason[],
      ],
    }));
  }

  entries.sort((a, b) => {
    const artist =
      a.canonicalArtistId.localeCompare(b.canonicalArtistId);
    if (artist !== 0) return artist;
    const release =
      (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '');
    return release !== 0
      ? release
      : a.observationId.localeCompare(b.observationId);
  });
  exclusions.sort((a, b) =>
    a.observationId.localeCompare(b.observationId));

  const includedObservationIds = Object.freeze(
    entries.map(entry => entry.observationId),
  );
  const includedArtistIds = Object.freeze(
    [...new Set(
      entries.map(entry => entry.canonicalArtistId),
    )].sort(),
  );

  const hasTargetConflict = exclusions.some(exclusion =>
    exclusion.reasons.includes('conflicting-active-scope')
    && !exclusion.reasons.includes('provider-mismatch')
    && !exclusion.reasons.includes('metric-semantic-mismatch'),
  );

  const state: ReportedAlbumSalesResearchInput['state'] =
    hasTargetConflict
      ? 'conflicting-evidence'
      : entries.length > 0
        ? 'reviewable'
        : 'insufficient-evidence';

  const inputFingerprint = sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_INPUT_CONTRACT_VERSION,
    lifecycle: 'research-shadow',
    asOf: read.asOf,
    target: REPORTED_ALBUM_SALES_RESEARCH_INPUT_TARGET,
    entries: entries.map(entry => ({
      observationId: entry.observationId,
      observationScopeId: entry.observationScopeId,
      canonicalArtistId: entry.canonicalArtistId,
      canonicalReleaseId: entry.canonicalReleaseId,
      releaseIdentityState: entry.releaseIdentityState,
      releaseTitle: entry.releaseTitle,
      releaseDate: entry.releaseDate,
      value: entry.value,
      providerPeriodStart: entry.providerPeriodStart,
      providerPeriodEnd: entry.providerPeriodEnd,
      evidenceQuality: entry.evidenceQuality,
      evidenceIds: entry.evidenceIds,
    })),
    exclusions: exclusions.map(exclusion => ({
      observationId: exclusion.observationId,
      reasons: exclusion.reasons,
    })),
  });

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_INPUT_CONTRACT_VERSION,
    lifecycle: 'research-shadow' as const,
    asOf: read.asOf,
    inputFingerprint,
    target: REPORTED_ALBUM_SALES_RESEARCH_INPUT_TARGET,
    state,
    entries: Object.freeze(entries),
    exclusions: Object.freeze(exclusions),
    includedObservationIds,
    includedArtistIds,
    releaseCount: entries.length,
    artistCount: includedArtistIds.length,
    minimumCohortSizeDefined: false as const,
    sameSemanticOnly: true as const,
    sameUnderlyingProviderOnly: true as const,
    explicitPeriodRequired: true as const,
    periodInferenceAllowed: false as const,
    crossProviderCombinationAllowed: false as const,
    crossSemanticCombinationAllowed: false as const,
    rawAdditionAllowed: false as const,
    rawAverageAllowed: false as const,
    numericNormalizationDefined: false as const,
    calibrationMethodDefined: false as const,
    scoreFieldsPresent: false as const,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
  });
}

export function buildReportedAlbumSalesResearchInput(
  history: ReportedAlbumSalesHistory,
  asOf: string,
): ReportedAlbumSalesResearchInput {
  if (
    history.historyClass !== 'reported-web-research-shadow'
    || history.productEligible !== false
    || history.directProviderReplacementAllowed !== false
    || history.numericNormalizationDefined !== false
    || history.scoreFieldsPresent !== false
  ) {
    throw new Error(
      'reported_album_sales_research_input_history_boundary_invalid',
    );
  }

  return buildFromAsOfRead(
    readReportedAlbumSalesHistoryAsOf(history, asOf),
  );
}
