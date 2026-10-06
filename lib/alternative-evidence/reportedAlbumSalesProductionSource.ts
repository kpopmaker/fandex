import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  ReportedAlbumSalesObservation,
  ReportedAlbumSalesSupportingEvidence,
} from './reportedAlbumSalesEvidence';

export const REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_VERSION =
  'reported-album-sales-production-source-v1' as const;

export type ReportedWebUsageDecision =
  | 'allowed'
  | 'conditional'
  | 'restricted'
  | 'unknown'
  | 'not-required'
  | 'not-used';

export type ReportedWebUsageReview = Readonly<{
  reviewStatus: 'unreviewed' | 'reviewed';
  accessMode: 'manual-reviewed' | 'automated';
  sourceTermsState: ReportedWebUsageDecision;
  automatedAccessState: ReportedWebUsageDecision;
  factualValueStorageState: ReportedWebUsageDecision;
  attributionState: ReportedWebUsageDecision;
  commercialProductUseState: ReportedWebUsageDecision;
  publicDerivedPublicationState: ReportedWebUsageDecision;
  evidenceRefs: readonly string[];
  conditionRefs: readonly string[];
  reviewerRef: string | null;
  reviewedAt: string | null;
}>;

export type ReportedAlbumSalesProductionConflictState =
  | 'clear'
  | 'conflicting'
  | 'unknown';

export type ReportedAlbumSalesProductionSourceCandidate = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_VERSION;
  candidateId: string;
  sourceType: 'reported-web-evidence';
  observationSource: 'public-reporting-source';
  extractionMethod: 'reviewed-web-evidence';
  underlyingProvider: 'Hanteo Chart';
  metricSemantic: 'reported-hanteo-first-week-sales';
  underlyingMetricSemantic: 'hanteo-first-week-sales';
  canonicalArtistId: string;
  canonicalReleaseId: string | null;
  releaseTitle: string;
  releaseDate: string | null;
  edition: string | null;
  value: number | null;
  unit: 'physical-copies' | null;
  providerPeriodStart: string | null;
  providerPeriodEnd: string | null;
  qualifyingEvidenceRefs: readonly string[];
  discoveryEvidenceRefs: readonly string[];
  reportingSources: readonly string[];
  sourcePublicationDates: readonly string[];
  evidenceQuality: ReportedAlbumSalesObservation['evidenceQuality'];
  availability: 'available' | 'unavailable';
  rightsUsageReview: ReportedWebUsageReview;
  storedMaterialClass: 'factual-values-and-provenance-only';
  copyrightedExpressionStored: false;
  revisionState: ReportedAlbumSalesObservation['revision']['state'];
  supersedesObservationId: string | null;
  conflictState: ReportedAlbumSalesProductionConflictState;
  lifecycle: 'production-candidate';
  productionObservationEligible: boolean;
  blockers: readonly string[];
  licensedFeedClaimAllowed: false;
  directProviderApiClaimAllowed: false;
  directProviderReplacementAllowed: false;
  productActivationAuthorized: false;
  productPublicationAuthorized: false;
  numericScoreDefined: false;
}>;

function isValidInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function inclusiveDayCount(
  start: string | null,
  end: string | null,
): number | null {
  if (
    start === null
    || end === null
    || !/^\d{4}-\d{2}-\d{2}$/.test(start)
    || !/^\d{4}-\d{2}-\d{2}$/.test(end)
  ) {
    return null;
  }

  const [startYear, startMonth, startDay] =
    start.split('-').map(Number);
  const [endYear, endMonth, endDay] =
    end.split('-').map(Number);
  const startMs = Date.UTC(startYear, startMonth - 1, startDay);
  const endMs = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.filter(value => value.trim() !== ''))].sort(),
  );
}

function isQualifyingEvidence(
  evidence: ReportedAlbumSalesSupportingEvidence,
): boolean {
  return evidence.sourceTier === 'tier-a-primary-official'
    || evidence.sourceTier
      === 'tier-b-provider-attributed-reputable';
}

function usageBlocks(
  rights: ReportedWebUsageReview,
): readonly string[] {
  const blockers: string[] = [];

  if (
    rights.reviewStatus !== 'reviewed'
    || rights.reviewerRef === null
    || rights.reviewerRef.trim() === ''
    || rights.reviewedAt === null
    || !isValidInstant(rights.reviewedAt)
    || rights.evidenceRefs.length === 0
  ) {
    blockers.push('rights-usage-review-incomplete');
  }

  const blockedState = (
    label: string,
    state: ReportedWebUsageDecision,
    allowed: readonly ReportedWebUsageDecision[],
  ) => {
    if (!allowed.includes(state)) {
      blockers.push(`rights-${label}-not-cleared`);
    }
  };

  blockedState(
    'source-terms',
    rights.sourceTermsState,
    ['allowed', 'conditional'],
  );
  blockedState(
    'factual-value-storage',
    rights.factualValueStorageState,
    ['allowed', 'conditional', 'not-required'],
  );
  blockedState(
    'attribution',
    rights.attributionState,
    ['allowed', 'conditional', 'not-required'],
  );
  blockedState(
    'commercial-product-use',
    rights.commercialProductUseState,
    ['allowed', 'conditional', 'not-required'],
  );
  blockedState(
    'public-derived-publication',
    rights.publicDerivedPublicationState,
    ['allowed', 'conditional', 'not-required'],
  );

  if (rights.accessMode === 'automated') {
    blockedState(
      'automated-access',
      rights.automatedAccessState,
      ['allowed', 'conditional'],
    );
  } else if (rights.automatedAccessState !== 'not-used') {
    blockers.push('rights-automated-access-state-inconsistent');
  }

  const hasConditional = [
    rights.sourceTermsState,
    rights.automatedAccessState,
    rights.factualValueStorageState,
    rights.attributionState,
    rights.commercialProductUseState,
    rights.publicDerivedPublicationState,
  ].includes('conditional');

  if (hasConditional && rights.conditionRefs.length === 0) {
    blockers.push('rights-conditional-terms-unbound');
  }

  return Object.freeze([...new Set(blockers)].sort());
}

export function buildReportedAlbumSalesProductionSourceCandidate(
  input: Readonly<{
    observation: ReportedAlbumSalesObservation;
    conflictState: ReportedAlbumSalesProductionConflictState;
    rightsUsageReview: ReportedWebUsageReview;
  }>,
): ReportedAlbumSalesProductionSourceCandidate {
  const { observation } = input;
  const blockers: string[] = [];

  if (observation.metricSemantic !== 'hanteo-first-week-sales') {
    blockers.push('metric-semantic-not-hanteo-first-week');
  }
  if (observation.underlyingProvider !== 'Hanteo Chart') {
    blockers.push('underlying-provider-not-hanteo-chart');
  }
  if (observation.unit !== 'physical-copies') {
    blockers.push('unit-not-physical-copies');
  }
  if (observation.value === null || observation.value <= 0) {
    blockers.push('exact-value-unavailable');
  }
  if (
    observation.providerPeriodStart === null
    || observation.providerPeriodEnd === null
  ) {
    blockers.push('provider-period-incomplete');
  } else if (
    inclusiveDayCount(
      observation.providerPeriodStart,
      observation.providerPeriodEnd,
    ) !== 7
  ) {
    blockers.push('provider-period-not-explicit-seven-day');
  }

  if (
    observation.release.identityState !== 'resolved'
    || observation.release.canonicalReleaseId === null
    || observation.release.canonicalReleaseId.trim() === ''
  ) {
    blockers.push('canonical-release-identity-not-resolved');
  }
  if (observation.release.releaseDate === null) {
    blockers.push('release-date-unavailable');
  }

  const qualifyingEvidence =
    observation.supportingEvidence.filter(isQualifyingEvidence);
  const discoveryEvidence =
    observation.supportingEvidence.filter(
      evidence =>
        evidence.sourceTier === 'tier-c-discovery-only',
    );

  if (qualifyingEvidence.length === 0) {
    blockers.push('tier-a-or-b-production-source-required');
  }
  if (
    observation.evidenceQuality === 'discovery-only'
    || observation.evidenceQuality === 'unresolved'
    || observation.evidenceQuality === 'conflicting'
    || observation.evidenceQuality === 'superseded'
  ) {
    blockers.push('evidence-quality-not-production-candidate');
  }

  if (input.conflictState !== 'clear') {
    blockers.push(
      input.conflictState === 'conflicting'
        ? 'observation-conflict-unresolved'
        : 'observation-conflict-state-unknown',
    );
  }

  if (observation.revision.state === 'possible-correction') {
    blockers.push('revision-possible-correction-unresolved');
  }

  blockers.push(...usageBlocks(input.rightsUsageReview));

  const qualifyingEvidenceRefs = uniqueSorted(
    qualifyingEvidence.map(evidence => evidence.evidenceId),
  );
  const discoveryEvidenceRefs = uniqueSorted(
    discoveryEvidence.map(evidence => evidence.evidenceId),
  );
  const reportingSources = uniqueSorted(
    observation.supportingEvidence.map(
      evidence => evidence.reportingSource,
    ),
  );
  const sourcePublicationDates = uniqueSorted(
    observation.supportingEvidence.flatMap(evidence =>
      evidence.sourcePublicationDate === null
        ? []
        : [evidence.sourcePublicationDate]),
  );
  const finalBlockers = Object.freeze(
    [...new Set(blockers)].sort(),
  );

  const candidateShape = {
    sourceType: 'reported-web-evidence' as const,
    observationSource: 'public-reporting-source' as const,
    extractionMethod: 'reviewed-web-evidence' as const,
    underlyingProvider: 'Hanteo Chart' as const,
    metricSemantic: 'reported-hanteo-first-week-sales' as const,
    underlyingMetricSemantic: 'hanteo-first-week-sales' as const,
    observationId: observation.observationId,
    canonicalArtistId: observation.canonicalArtistId,
    canonicalReleaseId: observation.release.canonicalReleaseId,
    releaseTitle: observation.release.releaseTitle,
    releaseDate: observation.release.releaseDate,
    edition: observation.release.edition,
    value: observation.value,
    unit: observation.unit,
    providerPeriodStart: observation.providerPeriodStart,
    providerPeriodEnd: observation.providerPeriodEnd,
    qualifyingEvidenceRefs,
    discoveryEvidenceRefs,
    reportingSources,
    sourcePublicationDates,
    evidenceQuality: observation.evidenceQuality,
    revisionState: observation.revision.state,
    supersedesObservationId:
      observation.revision.supersedesObservationId,
    conflictState: input.conflictState,
    rightsUsageReview: input.rightsUsageReview,
    blockers: finalBlockers,
  };

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_VERSION,
    candidateId: sha256Canonical({
      contractVersion:
        REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_VERSION,
      ...candidateShape,
    }),
    ...candidateShape,
    availability:
      observation.value === null ? 'unavailable' : 'available',
    storedMaterialClass:
      'factual-values-and-provenance-only' as const,
    copyrightedExpressionStored: false as const,
    lifecycle: 'production-candidate' as const,
    productionObservationEligible: finalBlockers.length === 0,
    licensedFeedClaimAllowed: false as const,
    directProviderApiClaimAllowed: false as const,
    directProviderReplacementAllowed: false as const,
    productActivationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    numericScoreDefined: false as const,
  });
}
