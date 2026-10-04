import {
  ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  type ActivityExposureFandexVariableProductAdapterResult,
} from '../adapters/activityExposureFandexVariableProduct';
import {
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  type BrandFitPointFandexVariableProductAdapterResult,
} from '../adapters/brandFitPointFandexVariableProduct';
import {
  MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  type MomentumFandexVariableProductAdapterResult,
} from '../adapters/momentumFandexVariableProduct';
import {
  MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  type MusicAlbumPointFandexVariableProductAdapterResult,
} from '../adapters/musicAlbumPointFandexVariableProduct';
import {
  NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  type NewsIssuePointFandexVariableProductAdapterResult,
} from '../adapters/newsIssuePointFandexVariableProduct';
import {
  RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  type RiskAdjustmentFandexVariableProductAdapterResult,
} from '../adapters/riskAdjustmentFandexVariableProduct';
import {
  SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  type SnsFandomPointFandexVariableProductAdapterResult,
} from '../adapters/snsFandomPointFandexVariableProduct';
import {
  buildFandexArtistAvailabilityMatrix,
  type FandexArtistAvailabilityMatrix,
  type FandexArtistAvailabilityMatrixArtist,
  type FandexArtistAvailabilityMatrixRow,
  type FandexArtistVariableSupportClaim,
} from '../contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexProductCandidate,
  type FandexProductCandidate,
} from '../contracts/fandexProductCandidate';
import {
  createFandexProductExplainability,
  type FandexProductExplainability,
} from '../contracts/fandexProductExplainability';
import {
  createFandexProductInternalApiDataIssue,
  createFandexProductInternalApiOk,
  createFandexProductReadModel,
  type FandexProductInternalApiResult,
  type FandexProductReadModel,
} from '../contracts/fandexProductReadModel';
import {
  FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION,
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import {
  createFandexVariableProductSnapshot,
  type FandexVariableProductSnapshot,
} from '../contracts/fandexVariableProductSnapshot';

export const FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION =
  'fandex-product-assembly-v1' as const;

export const FANDEX_PRODUCT_ASSEMBLY_ADAPTER_PRODUCT_VERSIONS =
  Object.freeze({
    musicAlbumPoint:
      MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
    newsIssuePoint:
      NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
    snsFandomPoint:
      SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
    brandFitPoint:
      BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
    comebackActivityPoint:
      ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
    growthMomentumPoint:
      MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
    riskAdjustmentPoint:
      RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  } satisfies Readonly<Record<FandexVariableProductId, string>>);

export type FandexProductAssemblyAdapters = Readonly<{
  musicAlbumPoint: MusicAlbumPointFandexVariableProductAdapterResult;
  newsIssuePoint: NewsIssuePointFandexVariableProductAdapterResult;
  snsFandomPoint: SnsFandomPointFandexVariableProductAdapterResult;
  brandFitPoint: BrandFitPointFandexVariableProductAdapterResult;
  comebackActivityPoint: ActivityExposureFandexVariableProductAdapterResult;
  growthMomentumPoint: MomentumFandexVariableProductAdapterResult;
  riskAdjustmentPoint: RiskAdjustmentFandexVariableProductAdapterResult;
}>;

type SharedAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason: string;
    }>;

export type FandexProductAssemblyOk = Readonly<{
  contractVersion: typeof FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION;
  status: 'ok';
  records: readonly FandexVariableProductRecord[];
  snapshot: FandexVariableProductSnapshot;
  availabilityMatrix: FandexArtistAvailabilityMatrix;
  availabilityRow: FandexArtistAvailabilityMatrixRow;
  candidate: FandexProductCandidate;
  explainability: FandexProductExplainability;
  readModel: FandexProductReadModel;
  api: Extract<FandexProductInternalApiResult, { status: 'ok' }>;
}>;

export type FandexProductAssemblyDataIssue = Readonly<{
  contractVersion: typeof FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION;
  status: 'data-issue';
  blockedAdapterIds: readonly FandexVariableProductId[];
  api: Extract<FandexProductInternalApiResult, { status: 'data-issue' }>;
}>;

export type FandexProductAssemblyResult =
  | FandexProductAssemblyOk
  | FandexProductAssemblyDataIssue;

function dataIssue(
  reason: Extract<
    FandexProductInternalApiResult,
    { status: 'data-issue' }
  >['reason'],
  details: readonly string[],
  blockedAdapterIds: readonly FandexVariableProductId[] = [],
): FandexProductAssemblyDataIssue {
  const api = createFandexProductInternalApiDataIssue({
    reason,
    details,
  });
  if (api.status !== 'data-issue') {
    throw new Error('fandex_product_assembly_data_issue_envelope_invalid');
  }

  const blocked = new Set(blockedAdapterIds);

  return Object.freeze({
    contractVersion: FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION,
    status: 'data-issue' as const,
    blockedAdapterIds: Object.freeze(
      FANDEX_VARIABLE_PRODUCT_IDS.filter((variableId) =>
        blocked.has(variableId)),
    ),
    api,
  });
}

function errorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'fandex_product_assembly_unknown_error';
}

export function assembleFandexProduct(input: Readonly<{
  adapters: FandexProductAssemblyAdapters;
  universeVersion: string;
  artists: readonly FandexArtistAvailabilityMatrixArtist[];
  supportClaims?: readonly FandexArtistVariableSupportClaim[];
  generatedAt: string;
}>): FandexProductAssemblyResult {
  const adapterByVariable: Readonly<Record<
    FandexVariableProductId,
    SharedAdapterResult
  >> = Object.freeze({
    musicAlbumPoint: input.adapters.musicAlbumPoint,
    newsIssuePoint: input.adapters.newsIssuePoint,
    snsFandomPoint: input.adapters.snsFandomPoint,
    brandFitPoint: input.adapters.brandFitPoint,
    comebackActivityPoint: input.adapters.comebackActivityPoint,
    growthMomentumPoint: input.adapters.growthMomentumPoint,
    riskAdjustmentPoint: input.adapters.riskAdjustmentPoint,
  });

  const blockedAdapterIds: FandexVariableProductId[] = [];
  const blockedDetails: string[] = [];
  const records: FandexVariableProductRecord[] = [];

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    const adapter = adapterByVariable[variableId];

    if (adapter.status === 'blocked') {
      blockedAdapterIds.push(variableId);
      blockedDetails.push(`${variableId}:${adapter.reason}`);
      continue;
    }

    const record = adapter.record;
    if (
      record.contractVersion !== FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION
      || record.variableId !== variableId
      || record.productVersion
        !== FANDEX_PRODUCT_ASSEMBLY_ADAPTER_PRODUCT_VERSIONS[variableId]
    ) {
      return dataIssue(
        'source-contract-invalid',
        [
          `${variableId}:adapter-record-contract-or-provenance-invalid`,
        ],
      );
    }

    records.push(record);
  }

  if (blockedAdapterIds.length > 0) {
    return dataIssue(
      'product-candidate-unavailable',
      blockedDetails,
      blockedAdapterIds,
    );
  }

  try {
    const snapshot = createFandexVariableProductSnapshot(records);
    const canonicalArtistId = snapshot.canonicalArtistId;

    const artistKnown = input.artists.some(
      (artist) => artist.id.trim() === canonicalArtistId,
    );
    if (!artistKnown) {
      return dataIssue(
        'artist-not-known',
        [`canonical-artist-id:${canonicalArtistId}`],
      );
    }

    const availabilityMatrix = buildFandexArtistAvailabilityMatrix({
      universeVersion: input.universeVersion,
      artists: input.artists,
      products: records,
      supportClaims: input.supportClaims,
    });
    const availabilityRow = availabilityMatrix.rows.find(
      (row) => row.canonicalArtistId === canonicalArtistId,
    );

    if (!availabilityRow) {
      return dataIssue(
        'artist-not-known',
        [`canonical-artist-id:${canonicalArtistId}`],
      );
    }

    const candidate = createFandexProductCandidate({
      snapshot,
      availabilityRow,
    });
    const explainability = createFandexProductExplainability(candidate);
    const readModel = createFandexProductReadModel({
      candidate,
      explainability,
      generatedAt: input.generatedAt,
    });
    const api = createFandexProductInternalApiOk(readModel);

    if (api.status !== 'ok') {
      throw new Error('fandex_product_assembly_ok_envelope_invalid');
    }

    return Object.freeze({
      contractVersion: FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION,
      status: 'ok' as const,
      records: Object.freeze([...records]),
      snapshot,
      availabilityMatrix,
      availabilityRow,
      candidate,
      explainability,
      readModel,
      api,
    });
  } catch (error) {
    return dataIssue(
      'source-inconsistent',
      [errorDetail(error)],
    );
  }
}
