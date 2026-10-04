import {
  adaptActivityExposureToFandexVariableProduct,
} from './activityExposureFandexVariableProduct';
import {
  adaptBrandFitPointToFandexVariableProduct,
} from './brandFitPointFandexVariableProduct';
import {
  adaptMomentumToFandexVariableProduct,
} from './momentumFandexVariableProduct';
import {
  adaptMusicAlbumPointToFandexVariableProduct,
} from './musicAlbumPointFandexVariableProduct';
import {
  adaptNewsIssuePointToFandexVariableProduct,
} from './newsIssuePointFandexVariableProduct';
import {
  adaptRiskAdjustmentToFandexVariableProduct,
} from './riskAdjustmentFandexVariableProduct';
import {
  adaptSnsFandomPointToFandexVariableProduct,
} from './snsFandomPointFandexVariableProduct';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import {
  createFandexVariableProductSnapshot,
  type FandexVariableProductSnapshot,
} from '../contracts/fandexVariableProductSnapshot';

export const FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION =
  'fandex-artist-variable-product-orchestrator-v1' as const;

type CommonAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason: string;
    }>;

export type FandexArtistVariableProductAdapterEnvelope = Readonly<{
  variableId: FandexVariableProductId;
  result: CommonAdapterResult;
}>;

export type FandexArtistVariableProductOrchestrationFailure = Readonly<{
  variableId: FandexVariableProductId | null;
  reason: string;
}>;

export type FandexArtistVariableProductOrchestrationResult =
  | Readonly<{
      status: 'ok';
      orchestratorVersion:
        typeof FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION;
      snapshot: FandexVariableProductSnapshot;
    }>
  | Readonly<{
      status: 'blocked';
      orchestratorVersion:
        typeof FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION;
      blocker:
        | 'artist-id-invalid'
        | 'adapter-result-set-invalid'
        | 'adapter-output-blocked'
        | 'snapshot-validation-failed';
      failures: readonly FandexArtistVariableProductOrchestrationFailure[];
    }>;

export type FandexArtistVariableProductOrchestrationInput = Readonly<{
  canonicalArtistId: string;
  musicAlbumPoint: Parameters<
    typeof adaptMusicAlbumPointToFandexVariableProduct
  >[0];
  newsIssuePoint: Parameters<
    typeof adaptNewsIssuePointToFandexVariableProduct
  >[0];
  snsFandomPoint: Omit<
    Parameters<typeof adaptSnsFandomPointToFandexVariableProduct>[0],
    'canonicalArtistId'
  >;
  brandFitPoint: Omit<
    Parameters<typeof adaptBrandFitPointToFandexVariableProduct>[0],
    'canonicalArtistId'
  >;
  comebackActivityPoint: Parameters<
    typeof adaptActivityExposureToFandexVariableProduct
  >[0];
  growthMomentumPoint: Parameters<
    typeof adaptMomentumToFandexVariableProduct
  >[0];
  riskAdjustmentPoint: Parameters<
    typeof adaptRiskAdjustmentToFandexVariableProduct
  >[0];
}>;

function freezeFailures(
  failures: readonly FandexArtistVariableProductOrchestrationFailure[],
): readonly FandexArtistVariableProductOrchestrationFailure[] {
  return Object.freeze(
    failures.map((failure) => Object.freeze({ ...failure })),
  );
}

function blocked(
  blocker: Extract<
    FandexArtistVariableProductOrchestrationResult,
    { status: 'blocked' }
  >['blocker'],
  failures: readonly FandexArtistVariableProductOrchestrationFailure[],
): FandexArtistVariableProductOrchestrationResult {
  return Object.freeze({
    status: 'blocked' as const,
    orchestratorVersion:
      FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION,
    blocker,
    failures: freezeFailures(failures),
  });
}

function safeInvoke(
  variableId: FandexVariableProductId,
  invoke: () => CommonAdapterResult,
): FandexArtistVariableProductAdapterEnvelope {
  try {
    return Object.freeze({
      variableId,
      result: invoke(),
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message.trim().length > 0
        ? error.message.trim()
        : 'unknown';

    return Object.freeze({
      variableId,
      result: Object.freeze({
        status: 'blocked' as const,
        reason: `adapter-exception:${detail}`,
      }),
    });
  }
}

export function createFandexArtistVariableProductSnapshotFromAdapterResults(
  input: Readonly<{
    canonicalArtistId: string;
    results: readonly FandexArtistVariableProductAdapterEnvelope[];
  }>,
): FandexArtistVariableProductOrchestrationResult {
  const canonicalArtistId = input.canonicalArtistId.trim();
  if (!canonicalArtistId) {
    return blocked('artist-id-invalid', [
      {
        variableId: null,
        reason: 'canonical-artist-id-empty',
      },
    ]);
  }

  const structuralFailures: FandexArtistVariableProductOrchestrationFailure[] =
    [];

  if (input.results.length !== FANDEX_VARIABLE_PRODUCT_IDS.length) {
    structuralFailures.push({
      variableId: null,
      reason: `adapter-result-count:${input.results.length}`,
    });
  }

  const byVariableId = new Map<
    FandexVariableProductId,
    FandexArtistVariableProductAdapterEnvelope
  >();

  for (const envelope of input.results) {
    if (!FANDEX_VARIABLE_PRODUCT_IDS.includes(envelope.variableId)) {
      structuralFailures.push({
        variableId: null,
        reason: `adapter-variable-id-invalid:${String(envelope.variableId)}`,
      });
      continue;
    }

    if (byVariableId.has(envelope.variableId)) {
      structuralFailures.push({
        variableId: envelope.variableId,
        reason: 'adapter-result-duplicate',
      });
      continue;
    }

    byVariableId.set(envelope.variableId, envelope);
  }

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    if (!byVariableId.has(variableId)) {
      structuralFailures.push({
        variableId,
        reason: 'adapter-result-missing',
      });
    }
  }

  if (structuralFailures.length > 0) {
    return blocked('adapter-result-set-invalid', structuralFailures);
  }

  const records: FandexVariableProductRecord[] = [];
  const outputFailures: FandexArtistVariableProductOrchestrationFailure[] =
    [];

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    const envelope = byVariableId.get(variableId);
    if (!envelope) {
      return blocked('adapter-result-set-invalid', [
        {
          variableId,
          reason: 'adapter-result-missing',
        },
      ]);
    }

    if (envelope.result.status === 'blocked') {
      outputFailures.push({
        variableId,
        reason:
          envelope.result.reason.trim().length > 0
            ? `adapter-blocked:${envelope.result.reason.trim()}`
            : 'adapter-blocked:unspecified',
      });
      continue;
    }

    const record = envelope.result.record;
    if (record.variableId !== variableId) {
      outputFailures.push({
        variableId,
        reason: `adapter-variable-id-mismatch:${record.variableId}`,
      });
      continue;
    }

    if (record.canonicalArtistId.trim() !== canonicalArtistId) {
      outputFailures.push({
        variableId,
        reason: `artist-identity-mismatch:${record.canonicalArtistId}`,
      });
      continue;
    }

    records.push(record);
  }

  if (outputFailures.length > 0) {
    return blocked('adapter-output-blocked', outputFailures);
  }

  try {
    return Object.freeze({
      status: 'ok' as const,
      orchestratorVersion:
        FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION,
      snapshot: createFandexVariableProductSnapshot(records),
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message.trim().length > 0
        ? error.message.trim()
        : 'unknown';

    return blocked('snapshot-validation-failed', [
      {
        variableId: null,
        reason: `snapshot-validation-failed:${detail}`,
      },
    ]);
  }
}

export function orchestrateFandexArtistVariableProducts(
  input: FandexArtistVariableProductOrchestrationInput,
): FandexArtistVariableProductOrchestrationResult {
  const canonicalArtistId = input.canonicalArtistId.trim();
  if (!canonicalArtistId) {
    return blocked('artist-id-invalid', [
      {
        variableId: null,
        reason: 'canonical-artist-id-empty',
      },
    ]);
  }

  const results: readonly FandexArtistVariableProductAdapterEnvelope[] =
    Object.freeze([
      safeInvoke('musicAlbumPoint', () =>
        adaptMusicAlbumPointToFandexVariableProduct(input.musicAlbumPoint),
      ),
      safeInvoke('newsIssuePoint', () =>
        adaptNewsIssuePointToFandexVariableProduct(input.newsIssuePoint),
      ),
      safeInvoke('snsFandomPoint', () =>
        adaptSnsFandomPointToFandexVariableProduct({
          ...input.snsFandomPoint,
          canonicalArtistId,
        }),
      ),
      safeInvoke('brandFitPoint', () =>
        adaptBrandFitPointToFandexVariableProduct({
          ...input.brandFitPoint,
          canonicalArtistId,
        }),
      ),
      safeInvoke('comebackActivityPoint', () =>
        adaptActivityExposureToFandexVariableProduct(
          input.comebackActivityPoint,
        ),
      ),
      safeInvoke('growthMomentumPoint', () =>
        adaptMomentumToFandexVariableProduct(input.growthMomentumPoint),
      ),
      safeInvoke('riskAdjustmentPoint', () =>
        adaptRiskAdjustmentToFandexVariableProduct(
          input.riskAdjustmentPoint,
        ),
      ),
    ]);

  return createFandexArtistVariableProductSnapshotFromAdapterResults({
    canonicalArtistId,
    results,
  });
}
