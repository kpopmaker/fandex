import {
  BRAND_FIT_POINT_CONSTRUCT,
  BRAND_FIT_POINT_CONTRACT_VERSION,
  evaluateBrandFitProductReadiness,
  type BrandFitPartnershipEvidence,
} from '../../intelligence/brandFitPointConstruct';
import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';

export const BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION =
  'brand-fit-point-fandex-variable-product-adapter-v1' as const;

export type BrandFitPointFandexVariableProductAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'evidence-contract-invalid'
        | 'artist-identity-mismatch'
        | 'numeric-boundary-violated';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

export function adaptBrandFitPointToFandexVariableProduct(input: Readonly<{
  canonicalArtistId: string;
  evidence: readonly BrandFitPartnershipEvidence[];
}>): BrandFitPointFandexVariableProductAdapterResult {
  if (
    input.evidence.some(
      (item) =>
        item.contractVersion !== BRAND_FIT_POINT_CONTRACT_VERSION
        || item.variableId !== 'brandFitPoint'
        || item.constructId !== BRAND_FIT_POINT_CONSTRUCT.constructId,
    )
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'evidence-contract-invalid' as const,
    });
  }

  if (
    input.evidence.some(
      (item) => item.identity.canonicalArtistId !== input.canonicalArtistId,
    )
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'artist-identity-mismatch' as const,
    });
  }

  const readiness = evaluateBrandFitProductReadiness(input.evidence);
  if (
    readiness.numericEligible !== false
    || readiness.productForm !== 'categorical-event-stream'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'numeric-boundary-violated' as const,
    });
  }

  const isBlocked = readiness.status === 'blocked';
  const hasCandidate = readiness.status === 'categorical_candidate';

  const latestSourcePublishedAt =
    input.evidence
      .map((item) => item.source.sourcePublishedAt)
      .sort()
      .at(-1) ?? null;
  const latestCollectedAt =
    input.evidence
      .map((item) => item.time.collectedAt)
      .sort()
      .at(-1) ?? null;

  const record = createFandexVariableProductRecord({
    variableId: 'brandFitPoint',
    canonicalArtistId: input.canonicalArtistId,
    lifecycleState: 'research',
    materialClass: 'real',
    readinessState: isBlocked
      ? 'blocked'
      : hasCandidate
        ? 'research-only'
        : 'building-history',
    availability: isBlocked
      ? 'blocked'
      : hasCandidate
        ? 'available'
        : 'unavailable',
    valueRepresentation: isBlocked
      ? {
          kind: 'none',
          reason: 'blocked',
        }
      : hasCandidate
        ? {
            kind: 'event',
            state: BRAND_FIT_POINT_CONSTRUCT.constructId,
          }
        : {
            kind: 'none',
            reason: 'not-produced',
          },
    asOf: latestSourcePublishedAt,
    observationTime:
      latestSourcePublishedAt === null
        ? { kind: 'unknown' }
        : {
            kind: 'instant',
            observedAt: latestSourcePublishedAt,
          },
    collectionTime:
      latestCollectedAt === null
        ? null
        : {
            collectedAt: latestCollectedAt,
          },
    confidence: 'insufficient',
    coverage: hasCandidate ? 'incomplete' : 'unknown',
    freshness: 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason:
      isBlocked
        ? readiness.blockers.join('|') || 'brand-fit-readiness-blocked'
        : null,
    evidenceRefs: orderedUnique([
      `contract:${BRAND_FIT_POINT_CONTRACT_VERSION}`,
      `brand-fit-readiness-status:${readiness.status}`,
      `brand-fit-evidence-count:${readiness.evidenceCount}`,
      ...readiness.blockers.map(
        (blocker) => `brand-fit-readiness-blocker:${blocker}`,
      ),
      ...readiness.limitations.map(
        (limitation) => `brand-fit-limitation:${limitation}`,
      ),
      ...input.evidence.flatMap((item) => [
        `brand-fit-event:${item.eventId}`,
        `brand-fit-revision:${item.revision.revisionId}`,
        item.source.sourceUrl,
      ]),
    ]),
    methodologyVersion: BRAND_FIT_POINT_CONTRACT_VERSION,
    sourceVersion: BRAND_FIT_POINT_CONTRACT_VERSION,
    productVersion:
      BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  });

  return Object.freeze({
    status: 'ok' as const,
    record,
  });
}
