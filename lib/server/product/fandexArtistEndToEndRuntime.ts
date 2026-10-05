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
  getNaverNewsIssuePointBlobReauthorizedProductionVariableAtLatestOfficialSlot,
} from './naverNewsIssuePointBlobRuntimeRead';
import {
  getActivityExposurePublicRouteForIU,
} from './activityExposureRealProductRead';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from './momentumEvidenceConsensusRealProductRead';
import {
  getMomentumLiveShadowProductReadinessForIU,
} from './momentumLiveShadowProductReadiness';
import {
  getMusicAlbumPointCurrentRuntimeForIU,
} from './musicAlbumPointCurrentRuntimeRead';
import {
  getSnsFandomPointCurrentRuntimeForIU,
} from './snsFandomPointCurrentRuntimeRead';
import {
  deriveRiskAdjustmentCurrentRuntimeForIU,
} from './riskAdjustmentCurrentRuntimeRead';
import {
  getBrandFitStoredEvidenceCurrentRuntimeForIU,
} from './brandFitStoredEvidenceRuntime';

export const IU_FANDEX_ARTIST_RUNTIME_LOADERS:
  FandexArtistRuntimeLoaderMap = Object.freeze({
    musicAlbumPoint: async () => {
      const result = await getMusicAlbumPointCurrentRuntimeForIU();
      if (result.status !== 'ok') {
        throw new Error(
          `music-album-runtime-read-failed:${result.reason}`,
        );
      }
      return Object.freeze({
        candidate: result.candidate,
        readiness: result.readiness,
      });
    },
    newsIssuePoint: async () =>
      getNaverNewsIssuePointBlobReauthorizedProductionVariableAtLatestOfficialSlot(),
    snsFandomPoint: async () => {
      const result = await getSnsFandomPointCurrentRuntimeForIU();
      return Object.freeze({
        readiness: result.readiness,
      });
    },
    brandFitPoint: async () => {
      const result = await getBrandFitStoredEvidenceCurrentRuntimeForIU();
      if (result.status !== 'ok') {
        throw new Error(
          `brand-fit-runtime-read-failed:${result.reason}`,
        );
      }
      return Object.freeze({
        evidence: result.evidence,
      });
    },
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
    riskAdjustmentPoint: async (resolved) => {
      const newsIssuePoint = resolved.newsIssuePoint;
      const comebackActivityPoint = resolved.comebackActivityPoint;
      if (!newsIssuePoint || !comebackActivityPoint) {
        throw new Error(
          'risk-adjustment-runtime-dependencies-missing',
        );
      }

      const result = deriveRiskAdjustmentCurrentRuntimeForIU({
        newsIssuePoint,
        comebackActivityPoint,
      });
      if (result.status !== 'ok') {
        throw new Error(
          `risk-adjustment-runtime-read-failed:${result.reason}:${result.detail}`,
        );
      }

      return Object.freeze({
        candidate: result.candidate,
        readiness: result.readiness,
      });
    },
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
