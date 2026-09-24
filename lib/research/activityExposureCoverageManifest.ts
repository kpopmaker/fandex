import type {
  ActivityExposureProviderCoverage,
} from './activityExposureProductView';

export const ACTIVITY_EXPOSURE_COVERAGE_MANIFEST_VERSION =
  'activity-exposure-live-coverage-manifest-v1-research' as const;

export type ActivityExposureCoverageGateDecision =
  | 'pass_for_integration_review'
  | 'pass_bounded_partial_for_integration_review'
  | 'blocked_live_coverage'
  | 'blocked_invalid_evidence'
  | 'blocked_authorization'
  | 'blocked_identity';

export type ActivityExposureCoverageAuthorizationState =
  | 'resolved_for_research'
  | 'review_required'
  | 'blocked';

export type ActivityExposureProviderCoverageResult = Readonly<{
  provider: 'musicbrainz' | 'youtube';
  providerArtistId: string;
  coverage: ActivityExposureProviderCoverage;
  inventoryExhausted: boolean | null;
  discoveredEntityCount: number | null;
  normalizedEventCount: number;
  excludedEntityCount: number;
  missingEntityCount: number;
  invalidEntityCount: number;
  retainedObservationCount: number;
  digestOnlyObservationCount: number;
  unavailableObservationCount: number;
  authorizationState: ActivityExposureCoverageAuthorizationState;
  unresolvedIdentityCount: number;
  notes: readonly string[];
}>;

export type ActivityExposureLiveCoverageManifest = Readonly<{
  contractVersion: typeof ACTIVITY_EXPOSURE_COVERAGE_MANIFEST_VERSION;
  construct: 'Activity Exposure';
  artistId: string;
  generatedAt: string;
  sourceBranch: string;
  sourceHeadSha: string;
  currentMainSha: string;
  numericScoreProduced: false;
  providers: readonly ActivityExposureProviderCoverageResult[];
  gateDecision: ActivityExposureCoverageGateDecision;
  gateReasons: readonly string[];
}>;

function isNonNegativeIntegerOrNull(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 0);
}

function blockingDecision(
  providers: readonly ActivityExposureProviderCoverageResult[],
): Readonly<{ decision: ActivityExposureCoverageGateDecision; reasons: string[] }> {
  const reasons: string[] = [];

  if (
    providers.some(
      (item) =>
        item.coverage.state === 'identity_unresolved'
        || item.unresolvedIdentityCount > 0,
    )
  ) {
    reasons.push('provider-identity-unresolved');
    return { decision: 'blocked_identity', reasons };
  }

  if (
    providers.some(
      (item) =>
        item.coverage.state === 'invalid'
        || item.invalidEntityCount > 0,
    )
  ) {
    reasons.push('invalid-provider-evidence-present');
    return { decision: 'blocked_invalid_evidence', reasons };
  }

  if (
    providers.some(
      (item) =>
        item.coverage.state === 'provider_unavailable'
        || item.coverage.state === 'not_in_scope'
        || item.missingEntityCount > 0
        || item.inventoryExhausted === false,
    )
  ) {
    reasons.push('live-provider-coverage-incomplete');
    return { decision: 'blocked_live_coverage', reasons };
  }

  const partialProviders = providers.filter(
    (item) => item.coverage.state === 'partial',
  );

  if (partialProviders.length > 0) {
    const allBounded = partialProviders.every(
      (item) =>
        item.coverage.coverageScope === 'bounded_provider_query'
        || item.coverage.coverageScope === 'stored_evidence_set',
    );

    if (!allBounded) {
      reasons.push('unbounded-partial-coverage');
      return { decision: 'blocked_live_coverage', reasons };
    }
  }

  if (providers.some((item) => item.authorizationState === 'blocked')) {
    reasons.push('provider-authorization-blocked');
    return { decision: 'blocked_authorization', reasons };
  }

  if (
    providers.some(
      (item) =>
        item.authorizationState === 'review_required'
        || item.retainedObservationCount === 0,
    )
  ) {
    if (providers.some((item) => item.authorizationState === 'review_required')) {
      reasons.push('provider-authorization-review-required');
    }
    if (providers.some((item) => item.retainedObservationCount === 0)) {
      reasons.push('retained-evidence-required-for-integration-review');
    }
    return { decision: 'blocked_authorization', reasons };
  }

  if (partialProviders.length > 0) {
    return {
      decision: 'pass_bounded_partial_for_integration_review',
      reasons: ['bounded-partial-provider-scopes-explicitly-preserved'],
    };
  }

  return {
    decision: 'pass_for_integration_review',
    reasons: ['all-required-provider-scopes-complete-with-retained-evidence'],
  };
}

export function validateActivityExposureCoverageResult(
  result: ActivityExposureProviderCoverageResult,
) {
  const issues: string[] = [];

  for (const [field, value] of Object.entries({
    discoveredEntityCount: result.discoveredEntityCount,
    normalizedEventCount: result.normalizedEventCount,
    excludedEntityCount: result.excludedEntityCount,
    missingEntityCount: result.missingEntityCount,
    invalidEntityCount: result.invalidEntityCount,
    retainedObservationCount: result.retainedObservationCount,
    digestOnlyObservationCount: result.digestOnlyObservationCount,
    unavailableObservationCount: result.unavailableObservationCount,
    unresolvedIdentityCount: result.unresolvedIdentityCount,
  })) {
    if (!isNonNegativeIntegerOrNull(value)) {
      issues.push(`invalid-count:${field}`);
    }
  }

  if (
    result.coverage.state === 'complete'
    && result.inventoryExhausted !== true
  ) {
    issues.push('complete-coverage-without-inventory-exhaustion');
  }

  if (
    result.coverage.state === 'complete'
    && result.missingEntityCount > 0
  ) {
    issues.push('complete-coverage-with-missing-entities');
  }

  if (
    result.coverage.state === 'complete'
    && result.invalidEntityCount > 0
  ) {
    issues.push('complete-coverage-with-invalid-entities');
  }

  if (
    result.authorizationState === 'resolved_for_research'
    && result.retainedObservationCount === 0
  ) {
    issues.push('resolved-authorization-without-retained-evidence');
  }

  return issues;
}

export function buildActivityExposureLiveCoverageManifest(input: Readonly<{
  artistId: string;
  generatedAt: string;
  sourceBranch: string;
  sourceHeadSha: string;
  currentMainSha: string;
  providers: readonly ActivityExposureProviderCoverageResult[];
}>): ActivityExposureLiveCoverageManifest {
  const providerIssues = input.providers.flatMap((provider) =>
    validateActivityExposureCoverageResult(provider).map(
      (issue) => `${provider.provider}:${issue}`,
    ),
  );

  let gate = blockingDecision(input.providers);

  if (providerIssues.length > 0) {
    gate = {
      decision: 'blocked_invalid_evidence',
      reasons: providerIssues,
    };
  }

  return Object.freeze({
    contractVersion: ACTIVITY_EXPOSURE_COVERAGE_MANIFEST_VERSION,
    construct: 'Activity Exposure',
    artistId: input.artistId,
    generatedAt: input.generatedAt,
    sourceBranch: input.sourceBranch,
    sourceHeadSha: input.sourceHeadSha,
    currentMainSha: input.currentMainSha,
    numericScoreProduced: false,
    providers: Object.freeze([...input.providers]),
    gateDecision: gate.decision,
    gateReasons: Object.freeze([...gate.reasons]),
  });
}
