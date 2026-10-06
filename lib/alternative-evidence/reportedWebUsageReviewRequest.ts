import { sha256Canonical } from '../shared/canonicalDigest';
import {
  type SourceAuthorizationDimensions,
  type SourceAuthorizationState,
} from './onboarding';
import type {
  ReportedAlbumSalesObservation,
} from './reportedAlbumSalesEvidence';

export const REPORTED_WEB_USAGE_REVIEW_REQUEST_VERSION =
  'reported-web-usage-review-request-v1' as const;

export type ReportedWebRightsReviewReference = Readonly<{
  referenceId: string;
  sourceUrl: string;
  kind:
    | 'underlying-provider-restriction'
    | 'reporting-source-terms'
    | 'reporting-source-usage-policy'
    | 'legal-review-memo';
  observedAt: string;
  reviewSignal: string;
  authorizationStateNotInferred: true;
}>;

export type ReportedWebUsageReviewRequest = Readonly<{
  contractVersion:
    typeof REPORTED_WEB_USAGE_REVIEW_REQUEST_VERSION;
  requestId: string;
  sourceType: 'reported-web-evidence';
  accessMode: 'manual-reviewed';
  underlyingProvider: string;
  observationId: string;
  reportingSources: readonly Readonly<{
    evidenceId: string;
    reportingSource: string;
    sourceUrl: string;
    sourceTier: string;
    sourcePublicationDate: string | null;
  }>[];
  rightsReviewReferences: readonly ReportedWebRightsReviewReference[];
  requestedDimensions: readonly [
    'acquisitionState',
    'normalizedStorageState',
    'retentionState',
    'commercialUseState',
    'derivedPublicationState'
  ];
  fixedManualOnlyStates: Readonly<{
    automationState: 'blocked';
    rawStorageState: 'blocked';
    rawRedistributionState: 'blocked';
  }>;
  materialBoundary: 'factual-values-and-provenance-only';
  copyrightedArticleExpressionRequestedForStorage: false;
  reviewerConclusionRequired: true;
  autoAuthorized: false;
  productionAuthorizationContained: false;
  publicPublicationAuthorizationContained: false;
}>;

export type ReportedWebUsageReviewDecision = Readonly<{
  requestId: string;
  states: Readonly<{
    acquisitionState: SourceAuthorizationState;
    normalizedStorageState: SourceAuthorizationState;
    retentionState: SourceAuthorizationState;
    commercialUseState: SourceAuthorizationState;
    derivedPublicationState: SourceAuthorizationState;
  }>;
  evidenceRefs: readonly string[];
  conditionRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
}>;

export type ReportedWebUsageReviewMaterialized = Readonly<{
  requestId: string;
  rights: SourceAuthorizationDimensions;
  evidenceRefs: readonly string[];
  conditionRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
  autoAuthorized: false;
  productActivationAuthorized: false;
  publicPublicationAuthorized: false;
}>;

function validInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map(value => value.trim()).filter(Boolean))]
      .sort(),
  );
}

export function buildReportedWebUsageReviewRequest(
  input: Readonly<{
    observation: ReportedAlbumSalesObservation;
    rightsReviewReferences:
      readonly ReportedWebRightsReviewReference[];
  }>,
): ReportedWebUsageReviewRequest {
  const observation = input.observation;
  if (
    observation.underlyingProvider === null
    || observation.underlyingProvider.trim() === ''
    || observation.supportingEvidence.length === 0
  ) {
    throw new Error(
      'reported_web_usage_review_request_source_invalid',
    );
  }

  for (const reference of input.rightsReviewReferences) {
    if (
      reference.referenceId.trim() === ''
      || !/^https?:\/\//i.test(reference.sourceUrl)
      || !validInstant(reference.observedAt)
      || reference.reviewSignal.trim() === ''
      || reference.authorizationStateNotInferred !== true
    ) {
      throw new Error(
        'reported_web_usage_review_request_reference_invalid',
      );
    }
  }

  const reportingSources = Object.freeze(
    [...observation.supportingEvidence]
      .sort((left, right) =>
        left.evidenceId.localeCompare(right.evidenceId))
      .map(evidence => Object.freeze({
        evidenceId: evidence.evidenceId,
        reportingSource: evidence.reportingSource,
        sourceUrl: evidence.sourceUrl,
        sourceTier: evidence.sourceTier,
        sourcePublicationDate: evidence.sourcePublicationDate,
      })),
  );
  const rightsReviewReferences = Object.freeze(
    [...input.rightsReviewReferences]
      .sort((left, right) =>
        left.referenceId.localeCompare(right.referenceId))
      .map(reference => Object.freeze({ ...reference })),
  );

  const requestShape = {
    sourceType: 'reported-web-evidence' as const,
    accessMode: 'manual-reviewed' as const,
    underlyingProvider: observation.underlyingProvider,
    observationId: observation.observationId,
    reportingSources,
    rightsReviewReferences,
    requestedDimensions: Object.freeze([
      'acquisitionState',
      'normalizedStorageState',
      'retentionState',
      'commercialUseState',
      'derivedPublicationState',
    ] as const),
    fixedManualOnlyStates: Object.freeze({
      automationState: 'blocked' as const,
      rawStorageState: 'blocked' as const,
      rawRedistributionState: 'blocked' as const,
    }),
    materialBoundary:
      'factual-values-and-provenance-only' as const,
    copyrightedArticleExpressionRequestedForStorage:
      false as const,
    reviewerConclusionRequired: true as const,
    autoAuthorized: false as const,
    productionAuthorizationContained: false as const,
    publicPublicationAuthorizationContained: false as const,
  };

  return Object.freeze({
    contractVersion:
      REPORTED_WEB_USAGE_REVIEW_REQUEST_VERSION,
    requestId: sha256Canonical({
      contractVersion:
        REPORTED_WEB_USAGE_REVIEW_REQUEST_VERSION,
      ...requestShape,
    }),
    ...requestShape,
  });
}

export function materializeReportedWebUsageReview(
  input: Readonly<{
    request: ReportedWebUsageReviewRequest;
    decision: ReportedWebUsageReviewDecision;
  }>,
): ReportedWebUsageReviewMaterialized {
  const { request, decision } = input;
  if (decision.requestId !== request.requestId) {
    throw new Error(
      'reported_web_usage_review_request_mismatch',
    );
  }
  if (
    decision.reviewerRef.trim() === ''
    || !validInstant(decision.reviewedAt)
  ) {
    throw new Error(
      'reported_web_usage_review_reviewer_invalid',
    );
  }

  const evidenceRefs = orderedUnique(decision.evidenceRefs);
  const conditionRefs = orderedUnique(decision.conditionRefs);
  const states = Object.values(decision.states);
  const anyGranted = states.some(
    state =>
      state === 'allowed'
      || state === 'allowed-with-conditions',
  );
  if (anyGranted && evidenceRefs.length === 0) {
    throw new Error(
      'reported_web_usage_review_granted_state_requires_evidence',
    );
  }
  if (
    states.includes('allowed-with-conditions')
    && conditionRefs.length === 0
  ) {
    throw new Error(
      'reported_web_usage_review_conditional_requires_conditions',
    );
  }

  return Object.freeze({
    requestId: request.requestId,
    rights: Object.freeze({
      acquisitionState: decision.states.acquisitionState,
      automationState: request.fixedManualOnlyStates.automationState,
      rawStorageState: request.fixedManualOnlyStates.rawStorageState,
      normalizedStorageState:
        decision.states.normalizedStorageState,
      retentionState: decision.states.retentionState,
      commercialUseState: decision.states.commercialUseState,
      derivedPublicationState:
        decision.states.derivedPublicationState,
      rawRedistributionState:
        request.fixedManualOnlyStates.rawRedistributionState,
    }),
    evidenceRefs,
    conditionRefs,
    reviewerRef: decision.reviewerRef.trim(),
    reviewedAt: decision.reviewedAt,
    autoAuthorized: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
  });
}
