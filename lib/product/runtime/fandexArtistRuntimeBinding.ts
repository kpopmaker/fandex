import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from '../contracts/fandexVariableProduct';
import type {
  FandexArtistVariableProductOrchestrationInput,
} from '../adapters/fandexArtistVariableProductOrchestrator';

export const FANDEX_ARTIST_RUNTIME_BINDING_VERSION =
  'fandex-artist-runtime-binding-v1' as const;

type RuntimeInputKey = Exclude<
  keyof FandexArtistVariableProductOrchestrationInput,
  'canonicalArtistId'
>;

type RuntimeInputPayloads = Pick<
  FandexArtistVariableProductOrchestrationInput,
  RuntimeInputKey
>;

export type FandexArtistRuntimeResolvedPayloads =
  Readonly<Partial<RuntimeInputPayloads>>;

export type FandexArtistRuntimeLoaderMap = Readonly<{
  [K in RuntimeInputKey]:
    | ((
        resolved: FandexArtistRuntimeResolvedPayloads,
      ) => Promise<FandexArtistVariableProductOrchestrationInput[K]>)
    | null;
}>;

export type FandexArtistRuntimeBindingStatus = Readonly<{
  contractVersion: typeof FANDEX_ARTIST_RUNTIME_BINDING_VERSION;
  canonicalArtistId: string;
  ready: boolean;
  boundVariableIds: readonly FandexVariableProductId[];
  missingVariableIds: readonly FandexVariableProductId[];
}>;

export type FandexArtistRuntimeInputResolution =
  | Readonly<{
      contractVersion: typeof FANDEX_ARTIST_RUNTIME_BINDING_VERSION;
      status: 'ok';
      binding: FandexArtistRuntimeBindingStatus;
      orchestrationInput: FandexArtistVariableProductOrchestrationInput;
    }>
  | Readonly<{
      contractVersion: typeof FANDEX_ARTIST_RUNTIME_BINDING_VERSION;
      status: 'blocked';
      blocker:
        | 'artist-id-invalid'
        | 'runtime-binding-incomplete'
        | 'runtime-loader-failed';
      binding: FandexArtistRuntimeBindingStatus;
      failedVariableId: FandexVariableProductId | null;
      detail: string | null;
    }>;

function freezeIds(
  ids: readonly FandexVariableProductId[],
): readonly FandexVariableProductId[] {
  return Object.freeze([...ids]);
}

export function inspectFandexArtistRuntimeBinding(input: Readonly<{
  canonicalArtistId: string;
  runtime: FandexArtistRuntimeLoaderMap;
}>): FandexArtistRuntimeBindingStatus {
  const canonicalArtistId = input.canonicalArtistId.trim();

  const boundVariableIds = FANDEX_VARIABLE_PRODUCT_IDS.filter(
    (variableId) => input.runtime[variableId] !== null,
  );
  const missingVariableIds = FANDEX_VARIABLE_PRODUCT_IDS.filter(
    (variableId) => input.runtime[variableId] === null,
  );

  return Object.freeze({
    contractVersion: FANDEX_ARTIST_RUNTIME_BINDING_VERSION,
    canonicalArtistId,
    ready:
      canonicalArtistId.length > 0
      && missingVariableIds.length === 0,
    boundVariableIds: freezeIds(boundVariableIds),
    missingVariableIds: freezeIds(missingVariableIds),
  });
}

function blocked(
  binding: FandexArtistRuntimeBindingStatus,
  blocker: Extract<
    FandexArtistRuntimeInputResolution,
    { status: 'blocked' }
  >['blocker'],
  failedVariableId: FandexVariableProductId | null,
  detail: string | null,
): FandexArtistRuntimeInputResolution {
  return Object.freeze({
    contractVersion: FANDEX_ARTIST_RUNTIME_BINDING_VERSION,
    status: 'blocked' as const,
    blocker,
    binding,
    failedVariableId,
    detail,
  });
}

export async function resolveFandexArtistRuntimeInputs(input: Readonly<{
  canonicalArtistId: string;
  runtime: FandexArtistRuntimeLoaderMap;
}>): Promise<FandexArtistRuntimeInputResolution> {
  const binding = inspectFandexArtistRuntimeBinding(input);

  if (!binding.canonicalArtistId) {
    return blocked(
      binding,
      'artist-id-invalid',
      null,
      'canonical-artist-id-empty',
    );
  }

  if (binding.missingVariableIds.length > 0) {
    return blocked(
      binding,
      'runtime-binding-incomplete',
      null,
      binding.missingVariableIds.join('|'),
    );
  }

  const payloads: Partial<RuntimeInputPayloads> = {};

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    const loader = input.runtime[variableId];
    if (loader === null) {
      return blocked(
        binding,
        'runtime-binding-incomplete',
        variableId,
        'loader-missing-after-readiness-check',
      );
    }

    try {
      const value = await loader(
        Object.freeze({ ...payloads }),
      );
      (
        payloads as Record<FandexVariableProductId, unknown>
      )[variableId] = value;
    } catch (error) {
      const detail =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : 'unknown-runtime-loader-error';

      return blocked(
        binding,
        'runtime-loader-failed',
        variableId,
        detail,
      );
    }
  }

  return Object.freeze({
    contractVersion: FANDEX_ARTIST_RUNTIME_BINDING_VERSION,
    status: 'ok' as const,
    binding,
    orchestrationInput: Object.freeze({
      canonicalArtistId: binding.canonicalArtistId,
      ...(payloads as RuntimeInputPayloads),
    }),
  });
}
