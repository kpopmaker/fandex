import type {
  BrandFitPartnershipEvidence,
} from '../../intelligence/brandFitPointConstruct';
import {
  projectActivityExposureForRiskAdjustment,
} from '../../intelligence/riskAdjustmentActivityExposureProjection';
import {
  buildRiskAdjustmentCurrentReadinessReport,
} from '../../intelligence/riskAdjustmentCurrentReadinessReport';
import {
  projectNewsIssuePointForRiskAdjustment,
} from '../../intelligence/riskAdjustmentNewsIssuePointProjection';
import {
  createRiskAdjustmentProductContractCandidate,
} from '../../intelligence/riskAdjustmentProductContractCandidate';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../../intelligence/riskAdjustmentQualitySufficiencyWitness';
import type {
  SnsFandomPointReadinessResult,
} from '../../intelligence/snsFandomPointContracts';
import {
  adaptActivityExposureToFandexVariableProduct,
} from '../adapters/activityExposureFandexVariableProduct';
import {
  adaptBrandFitPointToFandexVariableProduct,
} from '../adapters/brandFitPointFandexVariableProduct';
import {
  executeBrandFitProductionLifecycleCutover,
} from '../activation/brandFitProductionLifecycleCutoverExecution';
import {
  adaptMomentumToFandexVariableProduct,
} from '../adapters/momentumFandexVariableProduct';
import {
  adaptMusicAlbumPointToFandexVariableProduct,
} from '../adapters/musicAlbumPointFandexVariableProduct';
import {
  adaptNewsIssuePointToFandexVariableProduct,
} from '../adapters/newsIssuePointFandexVariableProduct';
import {
  adaptRiskAdjustmentToFandexVariableProduct,
} from '../adapters/riskAdjustmentFandexVariableProduct';
import {
  adaptSnsFandomPointToFandexVariableProduct,
} from '../adapters/snsFandomPointFandexVariableProduct';
import {
  assembleFandexProduct,
  type FandexProductAssemblyResult,
} from '../assembly/fandexProductAssembly';
import type {
  FandexArtistAvailabilityMatrixArtist,
  FandexArtistVariableSupportClaim,
} from '../contracts/fandexArtistAvailabilityMatrix';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../contracts/productActivityExposurePublicRoute';
import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../contracts/productMomentumEvidenceConsensus';
import type {
  ProductMusicAlbumPointCandidateResult,
} from '../contracts/productMusicAlbumPointCandidate';
import type {
  ProductVariableReadModelResult,
} from '../contracts/productVariable';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import type {
  MomentumLiveShadowProductReadinessResult,
} from '../readiness/momentumLiveShadowProductReadiness';
import type {
  MusicAlbumPointProductReadiness,
} from '../readiness/musicAlbumPointProductReadiness';

export const FANDEX_CURRENT_RUNTIME_ASSEMBLY_READINESS_VERSION =
  'fandex-current-runtime-assembly-readiness-v1' as const;

export type FandexCurrentRuntimeMusicAlbumSource =
  | Readonly<{
      status: 'ok';
      candidate: ProductMusicAlbumPointCandidateResult;
      readiness: MusicAlbumPointProductReadiness;
    }>
  | Readonly<{
      status: 'data-issue';
      reason: string;
    }>;

export type FandexCurrentRuntimeSnsFandomSource =
  | Readonly<{
      status: 'ok';
      readiness: SnsFandomPointReadinessResult;
    }>
  | Readonly<{
      status: 'data-issue';
      reason: string;
    }>;

export type FandexCurrentRuntimeBrandFitSource =
  | Readonly<{
      status: 'ok';
      evidence: readonly BrandFitPartnershipEvidence[];
    }>
  | Readonly<{
      status: 'unavailable';
      reason:
        | 'durable-stored-evidence-reader-not-implemented'
        | 'durable-stored-evidence-runtime-unavailable'
        | 'durable-stored-evidence-not-found';
    }>
  | Readonly<{
      status: 'data-issue';
      reason: string;
    }>;

export type FandexCurrentRuntimeMomentumSource = Readonly<{
  runtimeShadow: ProductMomentumEvidenceConsensusReadModelResult;
  readiness: MomentumLiveShadowProductReadinessResult;
}>;

export type FandexCurrentRuntimeSourceBundle = Readonly<{
  musicAlbumPoint: FandexCurrentRuntimeMusicAlbumSource;
  newsIssuePoint: ProductVariableReadModelResult;
  snsFandomPoint: FandexCurrentRuntimeSnsFandomSource;
  brandFitPoint: FandexCurrentRuntimeBrandFitSource;
  comebackActivityPoint: ProductActivityExposurePublicRouteResult;
  growthMomentumPoint: FandexCurrentRuntimeMomentumSource;
}>;

export type FandexCurrentRuntimeVariableState = Readonly<{
  variableId: FandexVariableProductId;
  sourceState:
    | 'resolved'
    | 'data-issue'
    | 'runtime-source-unavailable'
    | 'derived';
  adapterState: 'ok' | 'blocked' | 'not-run';
  reason: string | null;
}>;

export type FandexCurrentRuntimeAssemblyReadiness = Readonly<{
  contractVersion:
    typeof FANDEX_CURRENT_RUNTIME_ASSEMBLY_READINESS_VERSION;
  canonicalArtistId: 'iu';
  status: 'assembly-ready' | 'blocked';
  variableStates: readonly FandexCurrentRuntimeVariableState[];
  resolvedVariableIds: readonly FandexVariableProductId[];
  blockedVariableIds: readonly FandexVariableProductId[];
  records: readonly FandexVariableProductRecord[];
  assembly: FandexProductAssemblyResult | null;
  scoreCalculated: false;
  methodologyFinalized: false;
  publicRouteActivated: false;
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

function state(
  variableId: FandexVariableProductId,
  sourceState: FandexCurrentRuntimeVariableState['sourceState'],
  adapterState: FandexCurrentRuntimeVariableState['adapterState'],
  reason: string | null,
): FandexCurrentRuntimeVariableState {
  return Object.freeze({
    variableId,
    sourceState,
    adapterState,
    reason,
  });
}

function sourceBlocked(
  variableId: FandexVariableProductId,
  sourceState: 'data-issue' | 'runtime-source-unavailable',
  reason: string,
): Readonly<{
  state: FandexCurrentRuntimeVariableState;
  adapter: null;
}> {
  return Object.freeze({
    state: state(variableId, sourceState, 'not-run', reason),
    adapter: null,
  });
}

function adapterState(
  variableId: FandexVariableProductId,
  sourceState: 'resolved' | 'derived',
  result: SharedAdapterResult,
): Readonly<{
  state: FandexCurrentRuntimeVariableState;
  adapter: SharedAdapterResult;
}> {
  return Object.freeze({
    state: state(
      variableId,
      sourceState,
      result.status === 'ok' ? 'ok' : 'blocked',
      result.status === 'blocked' ? result.reason : null,
    ),
    adapter: result,
  });
}

function adaptSafely(
  invoke: () => SharedAdapterResult,
): SharedAdapterResult {
  try {
    return invoke();
  } catch (error) {
    return Object.freeze({
      status: 'blocked' as const,
      reason:
        error instanceof Error && error.message.trim().length > 0
          ? `adapter-exception:${error.message.trim()}`
          : 'adapter-exception:unknown',
    });
  }
}

export function buildFandexCurrentRuntimeAssemblyReadiness(
  input: Readonly<{
    sources: FandexCurrentRuntimeSourceBundle;
    universeVersion: string;
    artists: readonly FandexArtistAvailabilityMatrixArtist[];
    supportClaims?: readonly FandexArtistVariableSupportClaim[];
    generatedAt: string;
  }>,
): FandexCurrentRuntimeAssemblyReadiness {
  const states: FandexCurrentRuntimeVariableState[] = [];
  const adapters = new Map<FandexVariableProductId, SharedAdapterResult>();

  const musicAlbumSource = input.sources.musicAlbumPoint;
  if (musicAlbumSource.status === 'ok') {
    const adapted = adaptSafely(() =>
      adaptMusicAlbumPointToFandexVariableProduct({
        candidate: musicAlbumSource.candidate,
        readiness: musicAlbumSource.readiness,
      }),
    );
    const result = adapterState('musicAlbumPoint', 'resolved', adapted);
    states.push(result.state);
    adapters.set('musicAlbumPoint', result.adapter);
  } else {
    states.push(
      sourceBlocked(
        'musicAlbumPoint',
        'data-issue',
        musicAlbumSource.reason,
      ).state,
    );
  }

  const news = adaptSafely(() =>
    adaptNewsIssuePointToFandexVariableProduct(
      input.sources.newsIssuePoint,
    ),
  );
  {
    const result = adapterState('newsIssuePoint', 'resolved', news);
    states.push(result.state);
    adapters.set('newsIssuePoint', result.adapter);
  }

  const snsFandomSource = input.sources.snsFandomPoint;
  if (snsFandomSource.status === 'ok') {
    const adapted = adaptSafely(() =>
      adaptSnsFandomPointToFandexVariableProduct({
        canonicalArtistId: 'iu',
        readiness: snsFandomSource.readiness,
      }),
    );
    const result = adapterState('snsFandomPoint', 'resolved', adapted);
    states.push(result.state);
    adapters.set('snsFandomPoint', result.adapter);
  } else {
    states.push(
      sourceBlocked(
        'snsFandomPoint',
        'data-issue',
        snsFandomSource.reason,
      ).state,
    );
  }

  const brandFitSource = input.sources.brandFitPoint;
  if (brandFitSource.status === 'ok') {
    const adapted = adaptSafely(() => {
      const source = adaptBrandFitPointToFandexVariableProduct({
        canonicalArtistId: 'iu',
        evidence: brandFitSource.evidence,
      });
      if (source.status !== 'ok') return source;
      return executeBrandFitProductionLifecycleCutover(source.record);
    });
    const result = adapterState('brandFitPoint', 'resolved', adapted);
    states.push(result.state);
    adapters.set('brandFitPoint', result.adapter);
  } else {
    states.push(
      sourceBlocked(
        'brandFitPoint',
        brandFitSource.status === 'unavailable'
          ? 'runtime-source-unavailable'
          : 'data-issue',
        brandFitSource.reason,
      ).state,
    );
  }

  const activity = adaptSafely(() =>
    adaptActivityExposureToFandexVariableProduct(
      input.sources.comebackActivityPoint,
    ),
  );
  {
    const result = adapterState(
      'comebackActivityPoint',
      'resolved',
      activity,
    );
    states.push(result.state);
    adapters.set('comebackActivityPoint', result.adapter);
  }

  const momentum = adaptSafely(() =>
    adaptMomentumToFandexVariableProduct(
      input.sources.growthMomentumPoint,
    ),
  );
  {
    const result = adapterState(
      'growthMomentumPoint',
      'resolved',
      momentum,
    );
    const upstreamBlockers =
      input.sources.growthMomentumPoint.readiness.blockers;
    states.push(
      result.state.reason === 'upstream-readiness-blocked'
        ? Object.freeze({
            ...result.state,
            reason: [
              result.state.reason,
              ...new Set(upstreamBlockers),
            ].join('|'),
          })
        : result.state,
    );
    adapters.set('growthMomentumPoint', result.adapter);
  }

  const newsProjection =
    projectNewsIssuePointForRiskAdjustment(
      input.sources.newsIssuePoint,
    );
  const activityProjection =
    projectActivityExposureForRiskAdjustment(
      input.sources.comebackActivityPoint,
    );

  if (
    newsProjection.status === 'ok'
    && activityProjection.status === 'ok'
  ) {
    const riskInputs = Object.freeze([
      newsProjection.input,
      activityProjection.input,
    ]);
    const risk = adaptSafely(() =>
      adaptRiskAdjustmentToFandexVariableProduct({
        candidate: createRiskAdjustmentProductContractCandidate({
          artistId: 'iu',
          inputs: riskInputs,
        }),
        readiness: buildRiskAdjustmentCurrentReadinessReport(
          deriveRiskAdjustmentQualitySufficiencyWitness(riskInputs),
        ),
      }),
    );
    const result = adapterState(
      'riskAdjustmentPoint',
      'derived',
      risk,
    );
    states.push(result.state);
    adapters.set('riskAdjustmentPoint', result.adapter);
  } else {
    const reasons = [
      newsProjection.status === 'blocked'
        ? `newsIssuePoint:${newsProjection.reason}`
        : null,
      activityProjection.status === 'blocked'
        ? `comebackActivityPoint:${activityProjection.reason}`
        : null,
    ].filter((value): value is string => value !== null);

    states.push(
      sourceBlocked(
        'riskAdjustmentPoint',
        'data-issue',
        reasons.join('|') || 'risk-projection-unavailable',
      ).state,
    );
  }

  const stateByVariable = new Map(
    states.map((entry) => [entry.variableId, entry] as const),
  );
  const orderedStates = Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => {
      const entry = stateByVariable.get(variableId);
      if (!entry) {
        throw new Error(
          `fandex_current_runtime_variable_state_missing:${variableId}`,
        );
      }
      return entry;
    }),
  );
  const blockedVariableIds = Object.freeze(
    orderedStates
      .filter((entry) => entry.adapterState !== 'ok')
      .map((entry) => entry.variableId),
  );
  const resolvedVariableIds = Object.freeze(
    orderedStates
      .filter((entry) => entry.adapterState === 'ok')
      .map((entry) => entry.variableId),
  );
  const records = Object.freeze(
    [...adapters.values()]
      .filter(
        (entry): entry is Extract<
          SharedAdapterResult,
          { status: 'ok' }
        > => entry.status === 'ok',
      )
      .map((entry) => entry.record),
  );

  if (blockedVariableIds.length > 0) {
    return Object.freeze({
      contractVersion:
        FANDEX_CURRENT_RUNTIME_ASSEMBLY_READINESS_VERSION,
      canonicalArtistId: 'iu' as const,
      status: 'blocked' as const,
      variableStates: orderedStates,
      resolvedVariableIds,
      blockedVariableIds,
      records,
      assembly: null,
      scoreCalculated: false as const,
      methodologyFinalized: false as const,
      publicRouteActivated: false as const,
    });
  }

  const requireOk = (
    variableId: FandexVariableProductId,
  ): Extract<SharedAdapterResult, { status: 'ok' }> => {
    const adapter = adapters.get(variableId);
    if (!adapter || adapter.status !== 'ok') {
      throw new Error(
        `fandex_current_runtime_adapter_not_ok:${variableId}`,
      );
    }
    return adapter;
  };

  const completeAdapters = {
    musicAlbumPoint: requireOk('musicAlbumPoint'),
    newsIssuePoint: requireOk('newsIssuePoint'),
    snsFandomPoint: requireOk('snsFandomPoint'),
    brandFitPoint: requireOk('brandFitPoint'),
    comebackActivityPoint: requireOk('comebackActivityPoint'),
    growthMomentumPoint: requireOk('growthMomentumPoint'),
    riskAdjustmentPoint: requireOk('riskAdjustmentPoint'),
  };

  const assembly = assembleFandexProduct({
    adapters: completeAdapters,
    universeVersion: input.universeVersion,
    artists: input.artists,
    supportClaims: input.supportClaims,
    generatedAt: input.generatedAt,
  });

  return Object.freeze({
    contractVersion:
      FANDEX_CURRENT_RUNTIME_ASSEMBLY_READINESS_VERSION,
    canonicalArtistId: 'iu' as const,
    status:
      assembly.status === 'ok'
        ? 'assembly-ready' as const
        : 'blocked' as const,
    variableStates: orderedStates,
    resolvedVariableIds,
    blockedVariableIds: Object.freeze(
      [] as FandexVariableProductId[],
    ),
    records,
    assembly,
    scoreCalculated: false as const,
    methodologyFinalized: false as const,
    publicRouteActivated: false as const,
  });
}
