import {
  FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION,
  orchestrateFandexArtistVariableProducts,
  type FandexArtistVariableProductOrchestrationInput,
  type FandexArtistVariableProductOrchestrationResult,
} from '../adapters/fandexArtistVariableProductOrchestrator';
import {
  assembleFandexProductFromSnapshot,
  FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION,
  type FandexProductAssemblyDataIssue,
  type FandexProductAssemblyOk,
} from './fandexProductAssembly';
import {
  type FandexArtistAvailabilityMatrixArtist,
  type FandexArtistVariableSupportClaim,
} from '../contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexProductInternalApiDataIssue,
  type FandexProductInternalApiResult,
} from '../contracts/fandexProductReadModel';

export const FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION =
  'fandex-artist-end-to-end-product-assembly-v1' as const;

export type FandexArtistEndToEndProductAssemblyInput =
  FandexArtistVariableProductOrchestrationInput
  & Readonly<{
    universeVersion: string;
    artists: readonly FandexArtistAvailabilityMatrixArtist[];
    supportClaims?: readonly FandexArtistVariableSupportClaim[];
    generatedAt: string;
  }>;

export type FandexArtistEndToEndProductAssemblyResult =
  | Readonly<{
      contractVersion:
        typeof FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION;
      status: 'ok';
      orchestration: Extract<
        FandexArtistVariableProductOrchestrationResult,
        { status: 'ok' }
      >;
      assembly: FandexProductAssemblyOk;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION;
      status: 'data-issue';
      stage: 'orchestration';
      orchestration: Extract<
        FandexArtistVariableProductOrchestrationResult,
        { status: 'blocked' }
      >;
      api: Extract<FandexProductInternalApiResult, { status: 'data-issue' }>;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION;
      status: 'data-issue';
      stage: 'assembly';
      orchestration: Extract<
        FandexArtistVariableProductOrchestrationResult,
        { status: 'ok' }
      >;
      assembly: FandexProductAssemblyDataIssue;
      api: Extract<FandexProductInternalApiResult, { status: 'data-issue' }>;
    }>;

function orchestrationFailureDetails(
  result: Extract<
    FandexArtistVariableProductOrchestrationResult,
    { status: 'blocked' }
  >,
): readonly string[] {
  return Object.freeze(
    result.failures.map((failure) =>
      failure.variableId === null
        ? `orchestration:${failure.reason}`
        : `${failure.variableId}:${failure.reason}`,
    ),
  );
}

export function assembleFandexArtistProductEndToEnd(
  input: FandexArtistEndToEndProductAssemblyInput,
): FandexArtistEndToEndProductAssemblyResult {
  const orchestration = orchestrateFandexArtistVariableProducts(input);

  if (orchestration.status === 'blocked') {
    const api = createFandexProductInternalApiDataIssue({
      reason: 'product-candidate-unavailable',
      details: orchestrationFailureDetails(orchestration),
    });
    if (api.status !== 'data-issue') {
      throw new Error(
        'fandex_artist_end_to_end_orchestration_api_envelope_invalid',
      );
    }

    return Object.freeze({
      contractVersion:
        FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION,
      status: 'data-issue' as const,
      stage: 'orchestration' as const,
      orchestration,
      api,
    });
  }

  if (
    orchestration.orchestratorVersion
      !== FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION
  ) {
    throw new Error(
      'fandex_artist_end_to_end_orchestrator_version_invalid',
    );
  }

  const assembly = assembleFandexProductFromSnapshot({
    snapshot: orchestration.snapshot,
    universeVersion: input.universeVersion,
    artists: input.artists,
    supportClaims: input.supportClaims,
    generatedAt: input.generatedAt,
  });

  if (assembly.status === 'data-issue') {
    return Object.freeze({
      contractVersion:
        FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION,
      status: 'data-issue' as const,
      stage: 'assembly' as const,
      orchestration,
      assembly,
      api: assembly.api,
    });
  }

  if (
    assembly.contractVersion !== FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION
  ) {
    throw new Error(
      'fandex_artist_end_to_end_assembly_version_invalid',
    );
  }

  return Object.freeze({
    contractVersion:
      FANDEX_ARTIST_END_TO_END_PRODUCT_ASSEMBLY_VERSION,
    status: 'ok' as const,
    orchestration,
    assembly,
  });
}
