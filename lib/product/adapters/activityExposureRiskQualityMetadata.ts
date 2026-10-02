import {
  FANDEX_CONFIDENCE_CONTRACT_VERSION,
  FANDEX_CONFIDENCE_POLICY,
  type FandexConfidenceState,
} from '../../intelligence/confidence';
import type {
  ProductActivityExposureProviderCoverage,
} from '../contracts/productActivityExposure';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../contracts/productActivityExposurePublicRoute';

export const ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION =
  'activity-exposure-risk-quality-metadata-v1' as const;

export type ActivityExposureRiskAvailabilityState =
  | 'available'
  | 'source-missing'
  | 'provider-unavailable'
  | 'upstream-unavailable-ambiguous'
  | 'unsupported';

export type ActivityExposureRiskCoverageState =
  | 'complete'
  | 'incomplete';

export type ActivityExposureRiskIdentityState =
  | 'resolved'
  | 'unresolved';

export type ActivityExposureRiskQualitySemantic = Readonly<{
  semanticId: string;
  semanticVersion:
    typeof ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  stateValue: string;
  reason: string;
  evidenceRefs: readonly string[];
}>;

export type ActivityExposureRiskQualityMetadata = Readonly<{
  contractVersion:
    typeof ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  producerContractVersion: 'product-activity-exposure-v1';
  variableId: 'comebackActivityPoint';
  constructId: 'activityExposure';
  lifecycleState: 'production';
  materialClass: 'real';
  confidenceContractVersion: typeof FANDEX_CONFIDENCE_CONTRACT_VERSION;
  confidencePolicy: typeof FANDEX_CONFIDENCE_POLICY;
  availabilityState: ActivityExposureRiskAvailabilityState;
  identityState: ActivityExposureRiskIdentityState;
  confidenceState: FandexConfidenceState;
  coverageState: ActivityExposureRiskCoverageState;
  freshnessState: 'unknown';
  conflictState: 'unknown';
  revisionState: 'unknown';
  historyState: 'unknown';
  evidenceRefs: readonly string[];
  requiredDimensionSemantics: Readonly<{
    availability: ActivityExposureRiskQualitySemantic;
    identity: ActivityExposureRiskQualitySemantic;
    confidence: ActivityExposureRiskQualitySemantic;
    coverage: ActivityExposureRiskQualitySemantic;
    freshness: ActivityExposureRiskQualitySemantic;
    conflict: ActivityExposureRiskQualitySemantic;
    revision: ActivityExposureRiskQualitySemantic;
    history: ActivityExposureRiskQualitySemantic;
  }>;
}>;

export type ActivityExposureRiskQualityMetadataResult =
  | Readonly<{
      status: 'ok';
      metadata: ActivityExposureRiskQualityMetadata;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'upstream-read-not-ok'
        | 'upstream-identity-mismatch'
        | 'upstream-not-real-production'
        | 'upstream-quality-state-invalid';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function invalidCoverage(
  coverage: readonly ProductActivityExposureProviderCoverage[],
): boolean {
  return coverage.some(
    (entry) =>
      entry.collectionStatus === 'invalid'
      || entry.coverageState === 'invalid',
  );
}

function availabilityState(
  coverage: readonly ProductActivityExposureProviderCoverage[],
): ActivityExposureRiskAvailabilityState {
  if (
    coverage.some(
      (entry) =>
        entry.collectionStatus === 'provider_unavailable'
        || entry.coverageState === 'provider_unavailable',
    )
  ) {
    return 'provider-unavailable';
  }

  if (
    coverage.some(
      (entry) => entry.collectionStatus === 'credential_blocked',
    )
  ) {
    return 'upstream-unavailable-ambiguous';
  }

  if (
    coverage.some(
      (entry) => entry.coverageState === 'missing_source_data',
    )
  ) {
    return 'source-missing';
  }

  if (
    coverage.some(
      (entry) => entry.coverageState === 'not_in_scope',
    )
  ) {
    return 'unsupported';
  }

  return 'available';
}

function coverageState(
  coverage: readonly ProductActivityExposureProviderCoverage[],
): ActivityExposureRiskCoverageState {
  return coverage.every(
    (entry) =>
      entry.collectionStatus === 'succeeded'
      && entry.coverageState === 'covered',
  )
    ? 'complete'
    : 'incomplete';
}

function semantic(
  dimension: string,
  stateValue: string,
  reason: string,
  evidenceRefs: readonly string[],
): ActivityExposureRiskQualitySemantic {
  return Object.freeze({
    semanticId: `activity-exposure:${dimension}`,
    semanticVersion:
      ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION,
    stateValue,
    reason,
    evidenceRefs: orderedUnique(evidenceRefs),
  });
}

export function buildActivityExposureRiskQualityMetadata(
  result: ProductActivityExposurePublicRouteResult,
): ActivityExposureRiskQualityMetadataResult {
  if (result.status !== 'ok') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-read-not-ok' as const,
    });
  }

  const model = result.model;
  if (
    model.identity.sourceArtistId !== 'iu'
    || model.identity.constructId !== 'activityExposure'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-identity-mismatch' as const,
    });
  }

  if (
    model.dataOrigin !== 'observed'
    || model.publication !== 'production'
    || model.presentation !== 'standard'
    || model.contractVersion !== 'product-activity-exposure-v1'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-not-real-production' as const,
    });
  }

  if (
    model.providerCoverage.length < 2
    || invalidCoverage(model.providerCoverage)
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-quality-state-invalid' as const,
    });
  }

  const eventEvidenceRefs = model.events.flatMap((event) =>
    event.storedEvidenceTrace
      ? [
          `activity-exposure-event:${event.storedEvidenceTrace.eventRecordId}`,
        ]
      : [],
  );
  const providerEvidenceRefs = model.providerCoverage.map(
    (entry) =>
      [
        'activity-exposure-provider-coverage',
        entry.provider,
        entry.collectedAt ?? 'uncollected',
        entry.collectionStatus,
        entry.coverageState,
      ].join(':'),
  );
  const evidenceRefs = orderedUnique([
    ...eventEvidenceRefs,
    ...providerEvidenceRefs,
  ]);
  const contractEvidence = Object.freeze([
    ...evidenceRefs,
    `contract:${ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION}`,
  ]);

  const availability = availabilityState(model.providerCoverage);
  const coverage = coverageState(model.providerCoverage);
  const identity = model.events.some(
    (event) => event.missingState === 'identity_unresolved',
  )
    ? 'unresolved' as const
    : 'resolved' as const;
  const confidence: FandexConfidenceState = 'insufficient';
  const freshness = 'unknown' as const;
  const conflict = 'unknown' as const;
  const revision = 'unknown' as const;
  const history = 'unknown' as const;

  return Object.freeze({
    status: 'ok' as const,
    metadata: Object.freeze({
      contractVersion:
        ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION,
      producerContractVersion: 'product-activity-exposure-v1' as const,
      variableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
      lifecycleState: 'production' as const,
      materialClass: 'real' as const,
      confidenceContractVersion: FANDEX_CONFIDENCE_CONTRACT_VERSION,
      confidencePolicy: FANDEX_CONFIDENCE_POLICY,
      availabilityState: availability,
      identityState: identity,
      confidenceState: confidence,
      coverageState: coverage,
      freshnessState: freshness,
      conflictState: conflict,
      revisionState: revision,
      historyState: history,
      evidenceRefs,
      requiredDimensionSemantics: Object.freeze({
        availability: semantic(
          'availability',
          availability,
          'provider-collection-and-coverage-state',
          contractEvidence,
        ),
        identity: semantic(
          'identity',
          identity,
          'product-read-model-identity-and-missing-state',
          contractEvidence,
        ),
        confidence: semantic(
          'confidence',
          confidence,
          'producer-quality-dimensions-not-fully-explicit',
          contractEvidence,
        ),
        coverage: semantic(
          'coverage',
          coverage,
          'typed-provider-coverage-contract',
          contractEvidence,
        ),
        freshness: semantic(
          'freshness',
          freshness,
          'no-validated-product-freshness-policy',
          contractEvidence,
        ),
        conflict: semantic(
          'conflict',
          conflict,
          'event-conflict-state-not-typed-product-quality',
          contractEvidence,
        ),
        revision: semantic(
          'revision',
          revision,
          'revision-lineage-not-revision-stability',
          contractEvidence,
        ),
        history: semantic(
          'history',
          history,
          'no-validated-history-sufficiency-rule',
          contractEvidence,
        ),
      }),
    }),
  });
}
