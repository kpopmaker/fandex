import {
  SNS_FANDOM_POINT_CONTRACT_VERSION,
  type SnsFandomPointReadinessResult,
} from '../../intelligence/snsFandomPointContracts';
import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';

export const SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION =
  'sns-fandom-point-fandex-variable-product-adapter-v1' as const;

export type SnsFandomPointFandexVariableProductAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'upstream-readiness-contract-mismatch'
        | 'upstream-product-boundary-violated';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

export function adaptSnsFandomPointToFandexVariableProduct(input: Readonly<{
  canonicalArtistId: string;
  readiness: SnsFandomPointReadinessResult;
}>): SnsFandomPointFandexVariableProductAdapterResult {
  const readiness = input.readiness;

  if (readiness.contractVersion !== SNS_FANDOM_POINT_CONTRACT_VERSION) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-readiness-contract-mismatch' as const,
    });
  }

  if (
    readiness.snsFandomPoint !== null
    || readiness.numericProductEligible !== false
    || readiness.productActivationReady !== false
    || readiness.productPublicationReady !== false
    || readiness.previewFallbackAllowed !== false
    || readiness.crossPlatformRawAverageAllowed !== false
    || readiness.followerCountAloneAllowedAsFandom !== false
    || readiness.mentionCountAloneAllowedAsSnsFandom !== false
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-product-boundary-violated' as const,
    });
  }

  const rightsBlocked = readiness.state === 'provider-rights-blocked';
  const evidenceIncomplete =
    readiness.state === 'source-evidence-incomplete';

  const lifecycleState = 'research' as const;
  const readinessState = rightsBlocked
    ? 'blocked' as const
    : evidenceIncomplete
      ? 'building-history' as const
      : 'research-only' as const;
  const availability = rightsBlocked
    ? 'blocked' as const
    : 'unavailable' as const;

  const providerRefs = [
    ...readiness.productionReadyProviders.map(
      (providerId) => `sns-fandom-production-ready-provider:${providerId}`,
    ),
    ...readiness.providerApprovedProviders.map(
      (providerId) => `sns-fandom-provider-approved:${providerId}`,
    ),
    ...readiness.artistAuthorizedProviders.map(
      (providerId) => `sns-fandom-artist-authorized:${providerId}`,
    ),
    ...readiness.evidenceEligibleProviders.map(
      (providerId) => `sns-fandom-evidence-eligible-provider:${providerId}`,
    ),
  ];

  const record = createFandexVariableProductRecord({
    variableId: 'snsFandomPoint',
    canonicalArtistId: input.canonicalArtistId,
    lifecycleState,
    materialClass: 'real',
    readinessState,
    availability,
    valueRepresentation: {
      kind: 'none',
      reason: rightsBlocked ? 'blocked' : 'not-produced',
    },
    asOf: null,
    observationTime: { kind: 'unknown' },
    collectionTime: null,
    confidence: 'insufficient',
    coverage:
      readiness.state === 'dual-dimension-evidence-ready'
        ? 'complete'
        : readiness.state === 'source-evidence-incomplete'
          ? 'incomplete'
          : 'unknown',
    freshness: 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason:
      rightsBlocked
        ? readiness.blockers.join('|') || 'provider-rights-blocked'
        : null,
    evidenceRefs: orderedUnique([
      `contract:${readiness.contractVersion}`,
      `sns-fandom-readiness-state:${readiness.state}`,
      `sns-fandom-observed-reaction-count:${readiness.observedReactionEvidenceCount}`,
      `sns-fandom-content-reaction-count:${readiness.contentLevelReactionEvidenceCount}`,
      `sns-fandom-persistence-count:${readiness.temporalPersistenceEvidenceCount}`,
      ...readiness.blockers.map(
        (blocker) => `sns-fandom-readiness-blocker:${blocker}`,
      ),
      ...providerRefs,
    ]),
    methodologyVersion: SNS_FANDOM_POINT_CONTRACT_VERSION,
    sourceVersion: SNS_FANDOM_POINT_CONTRACT_VERSION,
    productVersion:
      SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  });

  return Object.freeze({
    status: 'ok' as const,
    record,
  });
}
