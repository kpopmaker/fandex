import type {
  FandexVariableProductAvailabilityState,
  FandexVariableProductId,
  FandexVariableProductReadinessState,
  FandexVariableProductRecord,
} from './fandexVariableProduct';
import { FANDEX_VARIABLE_PRODUCT_IDS } from './fandexVariableProduct';
import type { FandexConfidenceState } from '../../intelligence/confidence';
import type {
  FandexDataLifecycleState,
  FandexDataMaterialClass,
} from '../../intelligence/productionState';

export const FANDEX_ARTIST_AVAILABILITY_MATRIX_CONTRACT_VERSION =
  'fandex-artist-availability-matrix-v1' as const;

export const FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON =
  'awaiting-final-methodology' as const;

export type FandexArtistAvailabilityMatrixArtist = Readonly<{
  id: string;
}>;

export type FandexArtistVariableSupportClaim = Readonly<{
  canonicalArtistId: string;
  variableId: FandexVariableProductId;
  supported: boolean;
  reason: string;
  evidenceRefs?: readonly string[];
}>;

export type FandexArtistVariableAvailabilityCell = Readonly<{
  variableId: FandexVariableProductId;
  variableSupported: boolean | null;
  supportReason: string;
  variableProductionAvailable: boolean;
  productionAvailabilityReason: string;
  productAvailability: FandexVariableProductAvailabilityState | null;
  readinessState: FandexVariableProductReadinessState | null;
  lifecycleState: FandexDataLifecycleState | null;
  materialClass: FandexDataMaterialClass | null;
  confidence: FandexConfidenceState | null;
  coverage: FandexVariableProductRecord['coverage'] | null;
  freshness: FandexVariableProductRecord['freshness'] | null;
  evidenceRefs: readonly string[];
}>;

export type FandexArtistAvailabilityMatrixRow = Readonly<{
  canonicalArtistId: string;
  artistKnown: true;
  variables: Readonly<Record<
    FandexVariableProductId,
    FandexArtistVariableAvailabilityCell
  >>;
  fandexCandidateEligible: null;
  candidateEligibilityReason:
    typeof FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON;
}>;

export type FandexArtistAvailabilityMatrixSummary = Readonly<{
  totalArtists: number;
  artistKnownCount: number;
  candidateEligibilityDeterminedCount: 0;
  productionAvailableByVariable: Readonly<Record<FandexVariableProductId, number>>;
  unsupportedByVariable: Readonly<Record<FandexVariableProductId, number>>;
  supportUnknownByVariable: Readonly<Record<FandexVariableProductId, number>>;
}>;

export type FandexArtistAvailabilityMatrix = Readonly<{
  contractVersion: typeof FANDEX_ARTIST_AVAILABILITY_MATRIX_CONTRACT_VERSION;
  universeVersion: string;
  rows: readonly FandexArtistAvailabilityMatrixRow[];
  summary: FandexArtistAvailabilityMatrixSummary;
}>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function orderedUnique(values: readonly string[]): readonly string[] {
  if (values.some((value) => !isNonEmptyString(value))) {
    throw new Error('fandex_artist_availability_evidence_ref_invalid');
  }

  return Object.freeze(
    [...new Set(values.map((value) => value.trim()))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function emptyVariableCounts(): Record<FandexVariableProductId, number> {
  return Object.fromEntries(
    FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => [variableId, 0]),
  ) as Record<FandexVariableProductId, number>;
}

function keyFor(
  canonicalArtistId: string,
  variableId: FandexVariableProductId,
): string {
  return `${canonicalArtistId}::${variableId}`;
}

function productionAvailability(
  product: FandexVariableProductRecord | null,
  supported: boolean | null,
): Readonly<{ available: boolean; reason: string }> {
  if (supported === false) {
    return Object.freeze({
      available: false,
      reason: 'variable-unsupported',
    });
  }
  if (product === null) {
    return Object.freeze({
      available: false,
      reason: 'common-product-record-absent',
    });
  }
  if (product.lifecycleState !== 'production') {
    return Object.freeze({
      available: false,
      reason: `lifecycle-${product.lifecycleState}`,
    });
  }
  if (product.materialClass !== 'real') {
    return Object.freeze({
      available: false,
      reason: `material-${product.materialClass}`,
    });
  }
  if (product.readinessState !== 'production') {
    return Object.freeze({
      available: false,
      reason: `readiness-${product.readinessState}`,
    });
  }
  if (product.availability !== 'available') {
    return Object.freeze({
      available: false,
      reason: `availability-${product.availability}`,
    });
  }

  return Object.freeze({
    available: true,
    reason: 'common-product-production-available',
  });
}

export function buildFandexArtistAvailabilityMatrix(input: Readonly<{
  universeVersion: string;
  artists: readonly FandexArtistAvailabilityMatrixArtist[];
  products?: readonly FandexVariableProductRecord[];
  supportClaims?: readonly FandexArtistVariableSupportClaim[];
}>): FandexArtistAvailabilityMatrix {
  if (!isNonEmptyString(input.universeVersion)) {
    throw new Error('fandex_artist_availability_universe_version_invalid');
  }

  const artistIds = new Set<string>();
  for (const artist of input.artists) {
    if (!isNonEmptyString(artist.id)) {
      throw new Error('fandex_artist_availability_artist_id_invalid');
    }
    const canonicalArtistId = artist.id.trim();
    if (artistIds.has(canonicalArtistId)) {
      throw new Error(
        `fandex_artist_availability_duplicate_artist:${canonicalArtistId}`,
      );
    }
    artistIds.add(canonicalArtistId);
  }

  const productsByKey = new Map<string, FandexVariableProductRecord>();
  for (const product of input.products ?? []) {
    if (!artistIds.has(product.canonicalArtistId)) {
      throw new Error(
        `fandex_artist_availability_unknown_product_artist:${product.canonicalArtistId}`,
      );
    }
    const key = keyFor(product.canonicalArtistId, product.variableId);
    if (productsByKey.has(key)) {
      throw new Error(
        `fandex_artist_availability_duplicate_product:${key}`,
      );
    }
    productsByKey.set(key, product);
  }

  const supportClaimsByKey = new Map<string, FandexArtistVariableSupportClaim>();
  for (const claim of input.supportClaims ?? []) {
    if (!artistIds.has(claim.canonicalArtistId)) {
      throw new Error(
        `fandex_artist_availability_unknown_support_artist:${claim.canonicalArtistId}`,
      );
    }
    if (!isNonEmptyString(claim.reason)) {
      throw new Error('fandex_artist_availability_support_reason_required');
    }
    orderedUnique(claim.evidenceRefs ?? []);
    const key = keyFor(claim.canonicalArtistId, claim.variableId);
    if (supportClaimsByKey.has(key)) {
      throw new Error(
        `fandex_artist_availability_duplicate_support_claim:${key}`,
      );
    }
    supportClaimsByKey.set(key, claim);
  }

  const productionAvailableByVariable = emptyVariableCounts();
  const unsupportedByVariable = emptyVariableCounts();
  const supportUnknownByVariable = emptyVariableCounts();

  const rows = [...artistIds]
    .sort((left, right) => left.localeCompare(right))
    .map((canonicalArtistId): FandexArtistAvailabilityMatrixRow => {
      const variableEntries = FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => {
        const key = keyFor(canonicalArtistId, variableId);
        const product = productsByKey.get(key) ?? null;
        const supportClaim = supportClaimsByKey.get(key) ?? null;

        const productSupported = product === null
          ? null
          : product.availability !== 'unsupported';

        if (
          supportClaim !== null
          && productSupported !== null
          && supportClaim.supported !== productSupported
        ) {
          throw new Error(
            `fandex_artist_availability_support_conflict:${key}`,
          );
        }

        const variableSupported = supportClaim?.supported ?? productSupported;
        const supportReason = supportClaim?.reason
          ?? (product === null
            ? 'support-not-established'
            : product.availability === 'unsupported'
              ? product.unsupportedReason ?? 'common-product-unsupported'
              : 'common-product-record-present');

        const production = productionAvailability(
          product,
          variableSupported,
        );

        if (production.available) {
          productionAvailableByVariable[variableId] += 1;
        }
        if (variableSupported === false) {
          unsupportedByVariable[variableId] += 1;
        }
        if (variableSupported === null) {
          supportUnknownByVariable[variableId] += 1;
        }

        const evidenceRefs = orderedUnique([
          ...(supportClaim?.evidenceRefs ?? []),
          ...(product?.evidenceRefs ?? []),
        ]);

        const cell: FandexArtistVariableAvailabilityCell = Object.freeze({
          variableId,
          variableSupported,
          supportReason: supportReason.trim(),
          variableProductionAvailable: production.available,
          productionAvailabilityReason: production.reason,
          productAvailability: product?.availability ?? null,
          readinessState: product?.readinessState ?? null,
          lifecycleState: product?.lifecycleState ?? null,
          materialClass: product?.materialClass ?? null,
          confidence: product?.confidence ?? null,
          coverage: product?.coverage ?? null,
          freshness: product?.freshness ?? null,
          evidenceRefs,
        });

        return [variableId, cell] as const;
      });

      return Object.freeze({
        canonicalArtistId,
        artistKnown: true as const,
        variables: Object.freeze(
          Object.fromEntries(variableEntries),
        ) as Readonly<Record<
          FandexVariableProductId,
          FandexArtistVariableAvailabilityCell
        >>,
        fandexCandidateEligible: null,
        candidateEligibilityReason:
          FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON,
      });
    });

  return Object.freeze({
    contractVersion: FANDEX_ARTIST_AVAILABILITY_MATRIX_CONTRACT_VERSION,
    universeVersion: input.universeVersion.trim(),
    rows: Object.freeze(rows),
    summary: Object.freeze({
      totalArtists: rows.length,
      artistKnownCount: rows.length,
      candidateEligibilityDeterminedCount: 0 as const,
      productionAvailableByVariable: Object.freeze(
        productionAvailableByVariable,
      ),
      unsupportedByVariable: Object.freeze(unsupportedByVariable),
      supportUnknownByVariable: Object.freeze(supportUnknownByVariable),
    }),
  });
}
