import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  ReportedAlbumSalesObservation,
  ReportedAlbumSalesSourceTier,
} from './reportedAlbumSalesEvidence';

export const REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION =
  'reported-album-sales-production-evidence-qualification-v1' as const;

export type ReportedAlbumSalesProductionEvidenceClaim =
  | 'exact-value'
  | 'explicit-provider-period'
  | 'metric-semantic'
  | 'underlying-provider';

export type ReportedAlbumSalesProductionEvidenceQualificationRequest =
  Readonly<{
    contractVersion:
      typeof REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION;
    requestId: string;
    observationId: string;
    observationScopeId: string;
    canonicalArtistId: string;
    metricSemantic: ReportedAlbumSalesObservation['metricSemantic'];
    value: number | null;
    unit: ReportedAlbumSalesObservation['unit'];
    providerPeriodStart: string | null;
    providerPeriodEnd: string | null;
    underlyingProvider: string | null;
    candidateEvidence: readonly Readonly<{
      evidenceId: string;
      sourceTier: ReportedAlbumSalesSourceTier;
      reportingSource: string;
      sourceUrl: string;
      sourcePublicationDate: string | null;
      underlyingProvider: string | null;
    }>[];
    requiredProductionClaims: readonly [
      'exact-value',
      'explicit-provider-period',
      'metric-semantic',
      'underlying-provider'
    ];
    reviewerConclusionRequired: true;
    autoQualified: false;
  }>;

export type ReportedAlbumSalesProductionEvidenceQualificationDecision =
  Readonly<{
    requestId: string;
    evidenceId: string;
    supportedClaims:
      readonly ReportedAlbumSalesProductionEvidenceClaim[];
    reviewEvidenceRefs: readonly string[];
    reviewerRef: string;
    reviewedAt: string;
  }>;

export type ReportedAlbumSalesProductionEvidenceQualificationBinding =
  Readonly<{
    contractVersion:
      typeof REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION;
    bindingId: string;
    requestId: string;
    observationId: string;
    observationScopeId: string;
    canonicalArtistId: string;
    evidenceId: string;
    sourceTier:
      | 'tier-a-primary-official'
      | 'tier-b-provider-attributed-reputable';
    reportingSource: string;
    sourceUrl: string;
    sourcePublicationDate: string | null;
    supportedClaims:
      readonly ReportedAlbumSalesProductionEvidenceClaim[];
    confirmedValue: number | null;
    confirmedUnit: ReportedAlbumSalesObservation['unit'];
    confirmedProviderPeriodStart: string | null;
    confirmedProviderPeriodEnd: string | null;
    confirmedMetricSemantic:
      ReportedAlbumSalesObservation['metricSemantic'] | null;
    confirmedUnderlyingProvider: string | null;
    reviewEvidenceRefs: readonly string[];
    reviewerRef: string;
    reviewedAt: string;
    reviewState: 'human-reviewed';
    autoQualified: false;
  }>;

const REQUIRED_CLAIMS = Object.freeze([
  'exact-value',
  'explicit-provider-period',
  'metric-semantic',
  'underlying-provider',
] as const);

function validInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function cleanStrings(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map(value => value.trim()).filter(Boolean))].sort(),
  );
}

function cleanClaims(
  values: readonly ReportedAlbumSalesProductionEvidenceClaim[],
): readonly ReportedAlbumSalesProductionEvidenceClaim[] {
  const allowed = new Set<ReportedAlbumSalesProductionEvidenceClaim>(
    REQUIRED_CLAIMS,
  );
  const result = [...new Set(values)].filter(value => allowed.has(value));
  return Object.freeze(result.sort());
}

function productionEligibleTier(
  tier: ReportedAlbumSalesSourceTier,
): tier is
  | 'tier-a-primary-official'
  | 'tier-b-provider-attributed-reputable' {
  return tier === 'tier-a-primary-official'
    || tier === 'tier-b-provider-attributed-reputable';
}

export function buildReportedAlbumSalesProductionEvidenceQualificationRequest(
  observation: ReportedAlbumSalesObservation,
): ReportedAlbumSalesProductionEvidenceQualificationRequest {
  const candidateEvidence = Object.freeze(
    observation.supportingEvidence
      .map(item => Object.freeze({
        evidenceId: item.evidenceId,
        sourceTier: item.sourceTier,
        reportingSource: item.reportingSource,
        sourceUrl: item.sourceUrl,
        sourcePublicationDate: item.sourcePublicationDate,
        underlyingProvider: item.underlyingProvider,
      }))
      .sort((left, right) =>
        left.evidenceId.localeCompare(right.evidenceId)),
  );

  const shape = {
    observationId: observation.observationId,
    observationScopeId: observation.observationScopeId,
    canonicalArtistId: observation.canonicalArtistId,
    metricSemantic: observation.metricSemantic,
    value: observation.value,
    unit: observation.unit,
    providerPeriodStart: observation.providerPeriodStart,
    providerPeriodEnd: observation.providerPeriodEnd,
    underlyingProvider: observation.underlyingProvider,
    candidateEvidence,
    requiredProductionClaims: REQUIRED_CLAIMS,
    reviewerConclusionRequired: true as const,
    autoQualified: false as const,
  };

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION,
    requestId: sha256Canonical({
      contractVersion:
        REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION,
      ...shape,
    }),
    ...shape,
  });
}

export function createReportedAlbumSalesProductionEvidenceQualificationBinding(
  input: Readonly<{
    request: ReportedAlbumSalesProductionEvidenceQualificationRequest;
    decision: ReportedAlbumSalesProductionEvidenceQualificationDecision;
  }>,
): ReportedAlbumSalesProductionEvidenceQualificationBinding {
  const { request, decision } = input;
  if (
    request.contractVersion
      !== REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION
    || decision.requestId !== request.requestId
  ) {
    throw new Error(
      'reported_album_sales_production_evidence_qualification_request_mismatch',
    );
  }

  const evidence = request.candidateEvidence.find(
    item => item.evidenceId === decision.evidenceId,
  );
  if (!evidence || !productionEligibleTier(evidence.sourceTier)) {
    throw new Error(
      'reported_album_sales_production_evidence_qualification_source_ineligible',
    );
  }

  const supportedClaims = cleanClaims(decision.supportedClaims);
  const reviewEvidenceRefs = cleanStrings(decision.reviewEvidenceRefs);
  const reviewerRef = decision.reviewerRef.trim();
  if (
    supportedClaims.length === 0
    || reviewEvidenceRefs.length === 0
    || reviewerRef === ''
    || !validInstant(decision.reviewedAt)
  ) {
    throw new Error(
      'reported_album_sales_production_evidence_qualification_review_invalid',
    );
  }

  if (
    supportedClaims.includes('exact-value')
    && (request.value === null || request.unit === null)
  ) {
    throw new Error(
      'reported_album_sales_production_evidence_qualification_exact_value_missing',
    );
  }
  if (
    supportedClaims.includes('explicit-provider-period')
    && (
      request.providerPeriodStart === null
      || request.providerPeriodEnd === null
    )
  ) {
    throw new Error(
      'reported_album_sales_production_evidence_qualification_period_missing',
    );
  }
  if (
    supportedClaims.includes('underlying-provider')
    && (
      request.underlyingProvider === null
      || evidence.underlyingProvider !== request.underlyingProvider
    )
  ) {
    throw new Error(
      'reported_album_sales_production_evidence_qualification_provider_mismatch',
    );
  }

  const shape = {
    requestId: request.requestId,
    observationId: request.observationId,
    observationScopeId: request.observationScopeId,
    canonicalArtistId: request.canonicalArtistId,
    evidenceId: evidence.evidenceId,
    sourceTier: evidence.sourceTier,
    reportingSource: evidence.reportingSource,
    sourceUrl: evidence.sourceUrl,
    sourcePublicationDate: evidence.sourcePublicationDate,
    supportedClaims,
    confirmedValue:
      supportedClaims.includes('exact-value') ? request.value : null,
    confirmedUnit:
      supportedClaims.includes('exact-value') ? request.unit : null,
    confirmedProviderPeriodStart:
      supportedClaims.includes('explicit-provider-period')
        ? request.providerPeriodStart
        : null,
    confirmedProviderPeriodEnd:
      supportedClaims.includes('explicit-provider-period')
        ? request.providerPeriodEnd
        : null,
    confirmedMetricSemantic:
      supportedClaims.includes('metric-semantic')
        ? request.metricSemantic
        : null,
    confirmedUnderlyingProvider:
      supportedClaims.includes('underlying-provider')
        ? request.underlyingProvider
        : null,
    reviewEvidenceRefs,
    reviewerRef,
    reviewedAt: decision.reviewedAt,
    reviewState: 'human-reviewed' as const,
    autoQualified: false as const,
  };

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION,
    bindingId: sha256Canonical({
      contractVersion:
        REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION,
      ...shape,
    }),
    ...shape,
  });
}

export function validateReportedAlbumSalesProductionEvidenceQualificationBinding(
  binding: ReportedAlbumSalesProductionEvidenceQualificationBinding,
  observation: ReportedAlbumSalesObservation,
): boolean {
  const evidence = observation.supportingEvidence.find(
    item => item.evidenceId === binding.evidenceId,
  );
  if (
    binding.contractVersion
      !== REPORTED_ALBUM_SALES_PRODUCTION_EVIDENCE_QUALIFICATION_VERSION
    || binding.bindingId.trim() === ''
    || binding.requestId.trim() === ''
    || binding.observationId !== observation.observationId
    || binding.observationScopeId !== observation.observationScopeId
    || binding.canonicalArtistId !== observation.canonicalArtistId
    || !evidence
    || !productionEligibleTier(evidence.sourceTier)
    || binding.sourceTier !== evidence.sourceTier
    || binding.reportingSource !== evidence.reportingSource
    || binding.sourceUrl !== evidence.sourceUrl
    || binding.sourcePublicationDate !== evidence.sourcePublicationDate
    || binding.supportedClaims.length === 0
    || binding.reviewEvidenceRefs.length === 0
    || binding.reviewerRef.trim() === ''
    || !validInstant(binding.reviewedAt)
    || binding.reviewState !== 'human-reviewed'
    || binding.autoQualified !== false
  ) {
    return false;
  }

  const claims = new Set(binding.supportedClaims);
  if (
    claims.has('exact-value')
    && (
      binding.confirmedValue !== observation.value
      || binding.confirmedUnit !== observation.unit
      || observation.value === null
      || observation.unit === null
    )
  ) {
    return false;
  }
  if (
    claims.has('explicit-provider-period')
    && (
      binding.confirmedProviderPeriodStart
        !== observation.providerPeriodStart
      || binding.confirmedProviderPeriodEnd
        !== observation.providerPeriodEnd
      || observation.providerPeriodStart === null
      || observation.providerPeriodEnd === null
    )
  ) {
    return false;
  }
  if (
    claims.has('metric-semantic')
    && binding.confirmedMetricSemantic !== observation.metricSemantic
  ) {
    return false;
  }
  if (
    claims.has('underlying-provider')
    && (
      binding.confirmedUnderlyingProvider
        !== observation.underlyingProvider
      || evidence.underlyingProvider
        !== observation.underlyingProvider
      || observation.underlyingProvider === null
    )
  ) {
    return false;
  }

  if (
    !claims.has('exact-value')
    && (
      binding.confirmedValue !== null
      || binding.confirmedUnit !== null
    )
  ) return false;
  if (
    !claims.has('explicit-provider-period')
    && (
      binding.confirmedProviderPeriodStart !== null
      || binding.confirmedProviderPeriodEnd !== null
    )
  ) return false;
  if (
    !claims.has('metric-semantic')
    && binding.confirmedMetricSemantic !== null
  ) return false;
  if (
    !claims.has('underlying-provider')
    && binding.confirmedUnderlyingProvider !== null
  ) return false;

  const { bindingId, ...payload } = binding;
  return bindingId === sha256Canonical(payload);
}
