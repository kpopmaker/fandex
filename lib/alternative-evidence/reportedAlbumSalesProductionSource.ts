import { sha256Canonical } from '../shared/canonicalDigest';
import {
  createDefaultOffAuthorization,
  isAuthorizationGranted,
  type SourceAuthorizationDimensions,
} from './onboarding';
import {
  readReportedAlbumSalesHistoryAsOf,
  type ReportedAlbumSalesEvidenceQuality,
  type ReportedAlbumSalesHistory,
  type ReportedAlbumSalesObservation,
  type ReportedAlbumSalesSourceTier,
} from './reportedAlbumSalesEvidence';
import {
  validateReportedAlbumSalesProductionEvidenceQualificationBinding,
  type ReportedAlbumSalesProductionEvidenceClaim,
  type ReportedAlbumSalesProductionEvidenceQualificationBinding,
} from './reportedAlbumSalesProductionEvidenceQualification';
import {
  validateReportedAlbumSalesProductionIdentityBinding,
  type ReportedAlbumSalesProductionIdentityBinding,
} from './reportedAlbumSalesProductionIdentity';
import {
  validateReportedWebUsageReview,
  type ReportedWebUsageReviewMaterialized,
} from './reportedWebUsageReviewRequest';

export const REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION =
  'reported-album-sales-production-source-v1' as const;

export const REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID =
  'reported-web-hanteo-first-week-sales-v1' as const;

export type ReportedAlbumSalesProductionRightsState =
  | 'authorized'
  | 'review-required'
  | 'blocked';

export type ReportedAlbumSalesProductionAvailability =
  | 'available'
  | 'pending'
  | 'unavailable';

export type ReportedAlbumSalesProductionConflictState =
  | 'none'
  | 'conflicting-evidence';

export type ReportedAlbumSalesProductionBlocker =
  | 'research-observation-not-usable'
  | 'metric-semantic-not-hanteo-first-week'
  | 'underlying-provider-mismatch'
  | 'unit-mismatch'
  | 'exact-value-unavailable'
  | 'provider-period-incomplete'
  | 'provider-period-invalid'
  | 'provider-period-not-seven-calendar-days'
  | 'first-week-period-incomplete'
  | 'release-identity-not-resolved'
  | 'release-identity-binding-required'
  | 'release-identity-binding-invalid'
  | 'source-tier-not-production-eligible'
  | 'source-publication-date-missing'
  | 'production-evidence-qualification-required'
  | 'production-evidence-qualification-invalid'
  | 'tier-a-or-b-exact-value-evidence-missing'
  | 'tier-a-or-b-provider-period-evidence-missing'
  | 'tier-a-or-b-metric-semantic-evidence-missing'
  | 'tier-a-or-b-underlying-provider-evidence-missing'
  | 'conflicting-evidence'
  | 'rights-review-binding-required'
  | 'rights-review-binding-invalid'
  | 'rights-acquisition-not-authorized'
  | 'rights-normalized-storage-not-authorized'
  | 'rights-retention-not-authorized'
  | 'rights-commercial-use-not-authorized'
  | 'rights-derived-publication-not-authorized';

export type ReportedAlbumSalesProductionEvidenceRef = Readonly<{
  evidenceId: string;
  reportingSource: string;
  sourceTier: ReportedAlbumSalesSourceTier;
  sourceUrl: string;
  sourcePublicationDate: string | null;
  sourcePublishedAt: string | null;
  collectedAt: string;
  extractionMethod:
    | 'manual-reviewed-web-research'
    | 'structured-extractor'
    | 'imported-reviewed-dataset';
}>;

export type ReportedAlbumSalesProductionSourceCandidate = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION;
  sourceId: typeof REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID;
  sourceType: 'reported-web-evidence';
  lifecycle: 'production-candidate';
  observationId: string;
  observationScopeId: string;
  canonicalArtistId: string;
  canonicalReleaseId: string | null;
  releaseIdentityState:
    ReportedAlbumSalesObservation['release']['identityState'];
  releaseIdentityBindingId: string | null;
  releaseIdentityReviewState: 'unbound' | 'human-reviewed';
  releaseTitle: string;
  releaseDate: string | null;
  edition: string | null;
  editionResolutionState: 'release-level' | 'edition-specific' | 'unbound';
  canonicalEditionId: string | null;
  providerReleaseId: string | null;
  metricSemantic: 'reported-hanteo-first-week-sales';
  underlyingMetricSemantic: 'hanteo-first-week-sales';
  underlyingProvider: 'Hanteo Chart';
  observationSource: 'public-reporting-source';
  extractionMethod: 'reviewed-web-evidence';
  value: number | null;
  unit: 'physical-copies' | null;
  providerPeriodStart: string | null;
  providerPeriodEnd: string | null;
  evidenceQuality: ReportedAlbumSalesEvidenceQuality;
  evidenceRefs: readonly ReportedAlbumSalesProductionEvidenceRef[];
  evidenceQualificationBindingIds: readonly string[];
  evidenceClaimCoverage:
    readonly ReportedAlbumSalesProductionEvidenceClaim[];
  revision: ReportedAlbumSalesObservation['revision'];
  conflictState: ReportedAlbumSalesProductionConflictState;
  availability: ReportedAlbumSalesProductionAvailability;
  rightsReviewId: string | null;
  rightsReviewEvidenceRefs: readonly string[];
  rights: SourceAuthorizationDimensions;
  rightsState: ReportedAlbumSalesProductionRightsState;
  evidenceDigest: string;
  blockers: readonly ReportedAlbumSalesProductionBlocker[];
  durableNormalizedStorageEligible: boolean;
  productSourceEligible: boolean;
  periodInferenceUsed: false;
  directProviderClaim: false;
  licensedFeedClaim: false;
  numericScoreProduced: false;
}>;

export type ReportedAlbumSalesProductionSourceSnapshot = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION;
  sourceId: typeof REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID;
  sourceType: 'reported-web-evidence';
  lifecycle: 'production-candidate';
  asOf: string;
  candidates: readonly ReportedAlbumSalesProductionSourceCandidate[];
  eligibleObservationIds: readonly string[];
  blockedObservationIds: readonly string[];
  minimumCorpusSizeDefined: false;
  collectionExpansionRequiredByContract: false;
  productActivationAuthorized: false;
  publicPublicationAuthorized: false;
  methodologyLocked: false;
  numericScoreProduced: false;
}>;

const REQUIRED_RIGHTS = Object.freeze([
  ['acquisitionState', 'rights-acquisition-not-authorized'],
  ['normalizedStorageState', 'rights-normalized-storage-not-authorized'],
  ['retentionState', 'rights-retention-not-authorized'],
  ['commercialUseState', 'rights-commercial-use-not-authorized'],
  ['derivedPublicationState', 'rights-derived-publication-not-authorized'],
] as const satisfies readonly (
  readonly [
    keyof SourceAuthorizationDimensions,
    ReportedAlbumSalesProductionBlocker,
  ]
)[]);

function validDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function inclusiveDays(
  start: string | null,
  end: string | null,
): number | null {
  if (!validDate(start) || !validDate(end)) return null;
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (
    Number.isNaN(startMs)
    || Number.isNaN(endMs)
    || endMs < startMs
  ) {
    return null;
  }
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

function rightsState(
  rights: SourceAuthorizationDimensions,
): ReportedAlbumSalesProductionRightsState {
  const states = REQUIRED_RIGHTS.map(([key]) => rights[key]);
  if (states.some(state => state === 'blocked')) return 'blocked';
  if (states.every(isAuthorizationGranted)) return 'authorized';
  return 'review-required';
}

function availability(
  observation: ReportedAlbumSalesObservation,
  asOfDate: string,
): ReportedAlbumSalesProductionAvailability {
  if (
    observation.value === null
    || !validDate(observation.providerPeriodStart)
    || !validDate(observation.providerPeriodEnd)
  ) {
    return 'unavailable';
  }
  return observation.providerPeriodEnd <= asOfDate
    ? 'available'
    : 'pending';
}

function productionBlockers(input: Readonly<{
  observation: ReportedAlbumSalesObservation;
  asOfDate: string;
  conflict: boolean;
  rights: SourceAuthorizationDimensions;
  identityBindingProvided: boolean;
  identityBindingValid: boolean;
  identityResolved: boolean;
  evidenceQualificationsProvided: boolean;
  evidenceQualificationsValid: boolean;
  evidenceClaimCoverage:
    ReadonlySet<ReportedAlbumSalesProductionEvidenceClaim>;
}>): readonly ReportedAlbumSalesProductionBlocker[] {
  const { observation } = input;
  const blockers: ReportedAlbumSalesProductionBlocker[] = [];

  if (!observation.researchUsable) {
    blockers.push('research-observation-not-usable');
  }
  if (observation.metricSemantic !== 'hanteo-first-week-sales') {
    blockers.push('metric-semantic-not-hanteo-first-week');
  }
  if (observation.underlyingProvider !== 'Hanteo Chart') {
    blockers.push('underlying-provider-mismatch');
  }
  if (observation.unit !== 'physical-copies') {
    blockers.push('unit-mismatch');
  }
  if (observation.value === null) {
    blockers.push('exact-value-unavailable');
  }

  if (
    observation.providerPeriodStart === null
    || observation.providerPeriodEnd === null
  ) {
    blockers.push('provider-period-incomplete');
  } else {
    const days = inclusiveDays(
      observation.providerPeriodStart,
      observation.providerPeriodEnd,
    );
    if (days === null) {
      blockers.push('provider-period-invalid');
    } else if (days !== 7) {
      blockers.push('provider-period-not-seven-calendar-days');
    }
  }

  if (
    validDate(observation.providerPeriodEnd)
    && observation.providerPeriodEnd > input.asOfDate
  ) {
    blockers.push('first-week-period-incomplete');
  }

  if (!input.identityBindingProvided) {
    blockers.push('release-identity-binding-required');
  } else if (!input.identityBindingValid) {
    blockers.push('release-identity-binding-invalid');
  }
  if (!input.identityResolved) {
    blockers.push('release-identity-not-resolved');
  }

  const eligibleEvidence = observation.supportingEvidence.filter(
    item =>
      item.sourceTier === 'tier-a-primary-official'
      || item.sourceTier === 'tier-b-provider-attributed-reputable',
  );
  if (eligibleEvidence.length === 0) {
    blockers.push('source-tier-not-production-eligible');
  }
  if (
    eligibleEvidence.length > 0
    && eligibleEvidence.every(
      item => item.sourcePublicationDate === null,
    )
  ) {
    blockers.push('source-publication-date-missing');
  }

  if (!input.evidenceQualificationsProvided) {
    blockers.push('production-evidence-qualification-required');
  } else if (!input.evidenceQualificationsValid) {
    blockers.push('production-evidence-qualification-invalid');
  }
  if (!input.evidenceClaimCoverage.has('exact-value')) {
    blockers.push('tier-a-or-b-exact-value-evidence-missing');
  }
  if (!input.evidenceClaimCoverage.has('explicit-provider-period')) {
    blockers.push('tier-a-or-b-provider-period-evidence-missing');
  }
  if (!input.evidenceClaimCoverage.has('metric-semantic')) {
    blockers.push('tier-a-or-b-metric-semantic-evidence-missing');
  }
  if (!input.evidenceClaimCoverage.has('underlying-provider')) {
    blockers.push('tier-a-or-b-underlying-provider-evidence-missing');
  }

  if (input.conflict) {
    blockers.push('conflicting-evidence');
  }

  for (const [key, blocker] of REQUIRED_RIGHTS) {
    if (!isAuthorizationGranted(input.rights[key])) {
      blockers.push(blocker);
    }
  }

  return Object.freeze([...new Set(blockers)].sort());
}

export function buildReportedAlbumSalesProductionSourceCandidate(
  input: Readonly<{
    observation: ReportedAlbumSalesObservation;
    asOfDate: string;
    rightsReview?: ReportedWebUsageReviewMaterialized | null;
    conflict?: boolean;
    releaseIdentityBinding?:
      ReportedAlbumSalesProductionIdentityBinding | null;
    evidenceQualifications?:
      readonly ReportedAlbumSalesProductionEvidenceQualificationBinding[];
  }>,
): ReportedAlbumSalesProductionSourceCandidate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.asOfDate)) {
    throw new Error(
      'reported_album_sales_production_source_as_of_date_invalid',
    );
  }

  const conflict = input.conflict ?? false;
  const rightsReview = input.rightsReview ?? null;
  const rightsReviewValid =
    rightsReview !== null
    && validateReportedWebUsageReview(
      rightsReview,
      input.observation,
    );
  const rights = rightsReviewValid
    ? rightsReview.rights
    : createDefaultOffAuthorization();
  const releaseIdentityBinding =
    input.releaseIdentityBinding ?? null;
  const identityBindingValid =
    releaseIdentityBinding !== null
    && validateReportedAlbumSalesProductionIdentityBinding(
      releaseIdentityBinding,
      input.observation,
    );
  const canonicalReleaseId = identityBindingValid
    ? releaseIdentityBinding.canonicalReleaseId
    : input.observation.release.canonicalReleaseId;
  const releaseIdentityState = identityBindingValid
    ? 'resolved' as const
    : input.observation.release.identityState;
  const identityResolved =
    identityBindingValid
    && releaseIdentityState === 'resolved'
    && canonicalReleaseId !== null;
  const evidenceQualifications =
    input.evidenceQualifications ?? [];
  const validEvidenceQualifications =
    evidenceQualifications.filter(binding =>
      validateReportedAlbumSalesProductionEvidenceQualificationBinding(
        binding,
        input.observation,
      ),
    );
  const evidenceQualificationsValid =
    validEvidenceQualifications.length === evidenceQualifications.length;
  const evidenceClaimCoverage = new Set<
    ReportedAlbumSalesProductionEvidenceClaim
  >(
    validEvidenceQualifications.flatMap(
      binding => [...binding.supportedClaims],
    ),
  );
  const evidenceQualificationBindingIds = Object.freeze(
    validEvidenceQualifications
      .map(binding => binding.bindingId)
      .sort(),
  );
  const evidenceClaimCoverageList = Object.freeze(
    [...evidenceClaimCoverage].sort(),
  );
  const blockers = [
    ...productionBlockers({
      observation: input.observation,
      asOfDate: input.asOfDate,
      conflict,
      rights,
      identityBindingProvided: releaseIdentityBinding !== null,
      identityBindingValid,
      identityResolved,
      evidenceQualificationsProvided:
        evidenceQualifications.length > 0,
      evidenceQualificationsValid,
      evidenceClaimCoverage,
    }),
    ...(
      rightsReview === null
        ? ['rights-review-binding-required' as const]
        : rightsReviewValid
          ? []
          : ['rights-review-binding-invalid' as const]
    ),
  ].sort();
  const currentAvailability = availability(
    input.observation,
    input.asOfDate,
  );
  const currentRightsState = rightsState(rights);
  const evidenceRefs = Object.freeze(
    input.observation.supportingEvidence
      .map(item => Object.freeze({
        evidenceId: item.evidenceId,
        reportingSource: item.reportingSource,
        sourceTier: item.sourceTier,
        sourceUrl: item.sourceUrl,
        sourcePublicationDate: item.sourcePublicationDate,
        sourcePublishedAt: item.sourcePublishedAt,
        collectedAt: item.collectedAt,
        extractionMethod: item.extractionMethod,
      }))
      .sort((left, right) =>
        left.evidenceId.localeCompare(right.evidenceId)),
  );
  const evidenceDigest = sha256Canonical({
    observationId: input.observation.observationId,
    observationScopeId: input.observation.observationScopeId,
    supportingEvidence: evidenceRefs,
    revision: input.observation.revision,
    releaseIdentityBindingId:
      identityBindingValid
        ? releaseIdentityBinding.bindingId
        : null,
    editionResolutionState:
      identityBindingValid
        ? releaseIdentityBinding.editionResolutionState
        : 'unbound',
    canonicalEditionId:
      identityBindingValid
        ? releaseIdentityBinding.canonicalEditionId
        : null,
    evidenceQualificationBindingIds,
    evidenceClaimCoverage: evidenceClaimCoverageList,
  });
  const durableNormalizedStorageEligible =
    currentRightsState === 'authorized'
    && currentAvailability === 'available'
    && blockers.length === 0;

  const productSourceEligible =
    durableNormalizedStorageEligible;

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION,
    sourceId: REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID,
    sourceType: 'reported-web-evidence' as const,
    lifecycle: 'production-candidate' as const,
    observationId: input.observation.observationId,
    observationScopeId: input.observation.observationScopeId,
    canonicalArtistId: input.observation.canonicalArtistId,
    canonicalReleaseId,
    releaseIdentityState,
    releaseIdentityBindingId:
      identityBindingValid
        ? releaseIdentityBinding.bindingId
        : null,
    releaseIdentityReviewState:
      identityBindingValid
        ? 'human-reviewed' as const
        : 'unbound' as const,
    releaseTitle: input.observation.release.releaseTitle,
    releaseDate: input.observation.release.releaseDate,
    edition: input.observation.release.edition,
    editionResolutionState:
      identityBindingValid
        ? releaseIdentityBinding.editionResolutionState
        : 'unbound' as const,
    canonicalEditionId:
      identityBindingValid
        ? releaseIdentityBinding.canonicalEditionId
        : null,
    providerReleaseId:
      input.observation.release.providerReleaseId,
    metricSemantic: 'reported-hanteo-first-week-sales' as const,
    underlyingMetricSemantic:
      'hanteo-first-week-sales' as const,
    underlyingProvider: 'Hanteo Chart' as const,
    observationSource: 'public-reporting-source' as const,
    extractionMethod: 'reviewed-web-evidence' as const,
    value: input.observation.value,
    unit: input.observation.unit,
    providerPeriodStart:
      input.observation.providerPeriodStart,
    providerPeriodEnd:
      input.observation.providerPeriodEnd,
    evidenceQuality: input.observation.evidenceQuality,
    evidenceRefs,
    evidenceQualificationBindingIds,
    evidenceClaimCoverage: evidenceClaimCoverageList,
    revision: input.observation.revision,
    conflictState:
      conflict
        ? 'conflicting-evidence' as const
        : 'none' as const,
    availability: currentAvailability,
    rightsReviewId:
      rightsReviewValid ? rightsReview.reviewId : null,
    rightsReviewEvidenceRefs:
      rightsReviewValid
        ? Object.freeze([...rightsReview.evidenceRefs])
        : Object.freeze([]),
    rights: Object.freeze({ ...rights }),
    rightsState: currentRightsState,
    evidenceDigest,
    blockers,
    durableNormalizedStorageEligible,
    productSourceEligible,
    periodInferenceUsed: false as const,
    directProviderClaim: false as const,
    licensedFeedClaim: false as const,
    numericScoreProduced: false as const,
  });
}

export function buildReportedAlbumSalesProductionSourceSnapshot(
  input: Readonly<{
    history: ReportedAlbumSalesHistory;
    asOf: string;
    rightsReviews?: readonly ReportedWebUsageReviewMaterialized[];
    identityBindings?:
      readonly ReportedAlbumSalesProductionIdentityBinding[];
    evidenceQualifications?:
      readonly ReportedAlbumSalesProductionEvidenceQualificationBinding[];
  }>,
): ReportedAlbumSalesProductionSourceSnapshot {
  if (
    input.history.historyClass !== 'reported-web-research-shadow'
    || input.history.productEligible !== false
    || input.history.directProviderReplacementAllowed !== false
  ) {
    throw new Error(
      'reported_album_sales_production_source_history_boundary_invalid',
    );
  }
  if (
    !/(?:Z|[+-]\d{2}:\d{2})$/i.test(input.asOf)
    || Number.isNaN(Date.parse(input.asOf))
  ) {
    throw new Error(
      'reported_album_sales_production_source_as_of_invalid',
    );
  }

  const read = readReportedAlbumSalesHistoryAsOf(
    input.history,
    input.asOf,
  );
  const asOfDate = input.asOf.slice(0, 10);
  const conflicts = new Set(read.conflictingScopeIds);
  const rightsReviews = new Map<
    string,
    ReportedWebUsageReviewMaterialized
  >();
  for (const review of input.rightsReviews ?? []) {
    if (rightsReviews.has(review.observationId)) {
      throw new Error(
        'reported_album_sales_production_rights_review_duplicate',
      );
    }
    rightsReviews.set(review.observationId, review);
  }

  const identityBindings = new Map<
    string,
    ReportedAlbumSalesProductionIdentityBinding
  >();
  for (const binding of input.identityBindings ?? []) {
    if (identityBindings.has(binding.observationId)) {
      throw new Error(
        'reported_album_sales_production_identity_binding_duplicate',
      );
    }
    identityBindings.set(binding.observationId, binding);
  }
  const evidenceQualifications = new Map<
    string,
    ReportedAlbumSalesProductionEvidenceQualificationBinding[]
  >();
  const seenEvidenceQualificationIds = new Set<string>();
  for (const binding of input.evidenceQualifications ?? []) {
    if (seenEvidenceQualificationIds.has(binding.bindingId)) {
      throw new Error(
        'reported_album_sales_production_evidence_qualification_duplicate',
      );
    }
    seenEvidenceQualificationIds.add(binding.bindingId);
    const list =
      evidenceQualifications.get(binding.observationId) ?? [];
    list.push(binding);
    evidenceQualifications.set(binding.observationId, list);
  }

  const candidates = Object.freeze(
    read.activeObservations
      .filter(observation =>
        observation.underlyingProvider === 'Hanteo Chart'
        && observation.metricSemantic === 'hanteo-first-week-sales')
      .map(observation =>
        buildReportedAlbumSalesProductionSourceCandidate({
          observation,
          asOfDate,
          rightsReview:
            rightsReviews.get(observation.observationId) ?? null,
          conflict: conflicts.has(observation.observationScopeId),
          releaseIdentityBinding:
            identityBindings.get(observation.observationId) ?? null,
          evidenceQualifications:
            evidenceQualifications.get(observation.observationId) ?? [],
        }))
      .sort((left, right) =>
        left.observationId.localeCompare(right.observationId)),
  );

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION,
    sourceId: REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID,
    sourceType: 'reported-web-evidence' as const,
    lifecycle: 'production-candidate' as const,
    asOf: input.asOf,
    candidates,
    eligibleObservationIds: Object.freeze(
      candidates
        .filter(candidate => candidate.productSourceEligible)
        .map(candidate => candidate.observationId),
    ),
    blockedObservationIds: Object.freeze(
      candidates
        .filter(candidate => !candidate.productSourceEligible)
        .map(candidate => candidate.observationId),
    ),
    minimumCorpusSizeDefined: false as const,
    collectionExpansionRequiredByContract: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
    methodologyLocked: false as const,
    numericScoreProduced: false as const,
  });
}
