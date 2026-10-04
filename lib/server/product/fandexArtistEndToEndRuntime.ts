import 'server-only';

import {
  assembleFandexArtistProductEndToEnd,
  type FandexArtistEndToEndProductAssemblyInput,
  type FandexArtistEndToEndProductAssemblyResult,
} from '../../product/assembly/fandexArtistEndToEndProductAssembly';
import {
  inspectFandexArtistRuntimeBinding,
  resolveFandexArtistRuntimeInputs,
  type FandexArtistRuntimeBindingStatus,
  type FandexArtistRuntimeLoaderMap,
} from '../../product/runtime/fandexArtistRuntimeBinding';
import {
  getNaverNewsIssuePointRealProductVariableAtLatestOfficialSlot,
} from './naverNewsIssuePointRealProductRead';
import {
  getActivityExposurePublicRouteForIU,
} from './activityExposureRealProductRead';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from './momentumEvidenceConsensusRealProductRead';
import {
  getMomentumLiveShadowProductReadinessForIU,
} from './momentumLiveShadowProductReadiness';

export const IU_FANDEX_ARTIST_RUNTIME_LOADERS:
  FandexArtistRuntimeLoaderMap = Object.freeze({
    musicAlbumPoint: null,
    newsIssuePoint:
      getNaverNewsIssuePointRealProductVariableAtLatestOfficialSlot,
    snsFandomPoint: null,
    brandFitPoint: null,
    comebackActivityPoint: getActivityExposurePublicRouteForIU,
    growthMomentumPoint: async () => {
      const [runtimeShadow, readiness] = await Promise.all([
        getMomentumEvidenceConsensusShadowProductForIU(),
        getMomentumLiveShadowProductReadinessForIU(),
      ]);

      return Object.freeze({
        runtimeShadow,
        readiness,
      });
    },
    riskAdjustmentPoint: null,
  });

export type FandexArtistEndToEndRuntimeContext = Pick<
  FandexArtistEndToEndProductAssemblyInput,
  'universeVersion' | 'artists' | 'supportClaims' | 'generatedAt'
>;

export type FandexArtistEndToEndRuntimeReadResult =
  | Readonly<{
      status: 'ok';
      binding: FandexArtistRuntimeBindingStatus;
      result: FandexArtistEndToEndProductAssemblyResult;
    }>
  | Readonly<{
      status: 'runtime-blocked';
      binding: FandexArtistRuntimeBindingStatus;
      blocker:
        | 'artist-id-invalid'
        | 'runtime-binding-incomplete'
        | 'runtime-loader-failed';
      failedVariableId:
        | import('../../product/contracts/fandexVariableProduct')
            .FandexVariableProductId
        | null;
      detail: string | null;
    }>;

export function getIuFandexArtistRuntimeBindingStatus():
  FandexArtistRuntimeBindingStatus {
  return inspectFandexArtistRuntimeBinding({
    canonicalArtistId: 'iu',
    runtime: IU_FANDEX_ARTIST_RUNTIME_LOADERS,
  });
}

export async function readIuFandexArtistProductEndToEnd(
  context: FandexArtistEndToEndRuntimeContext,
  runtime: FandexArtistRuntimeLoaderMap =
    IU_FANDEX_ARTIST_RUNTIME_LOADERS,
): Promise<FandexArtistEndToEndRuntimeReadResult> {
  const resolution = await resolveFandexArtistRuntimeInputs({
    canonicalArtistId: 'iu',
    runtime,
  });

  if (resolution.status === 'blocked') {
    return Object.freeze({
      status: 'runtime-blocked' as const,
      binding: resolution.binding,
      blocker: resolution.blocker,
      failedVariableId: resolution.failedVariableId,
      detail: resolution.detail,
    });
  }

  const result = assembleFandexArtistProductEndToEnd({
    ...resolution.orchestrationInput,
    universeVersion: context.universeVersion,
    artists: context.artists,
    supportClaims: context.supportClaims,
    generatedAt: context.generatedAt,
  });

  return Object.freeze({
    status: 'ok' as const,
    binding: resolution.binding,
    result,
  });
}
