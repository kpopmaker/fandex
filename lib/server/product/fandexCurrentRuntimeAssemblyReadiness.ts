import 'server-only';

import {
  artistUniverseV4,
} from '../../../app/data/v4/artistUniverse';
import type {
  ProductVariableReadModelResult,
} from '../../product/contracts/productVariable';
import {
  getArtistProductVariablePublicRoute,
} from '../../product/queries/getArtistProductVariablePublicRoute';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../../product/contracts/productActivityExposurePublicRoute';
import {
  buildFandexCurrentRuntimeAssemblyReadiness,
  type FandexCurrentRuntimeAssemblyReadiness,
} from '../../product/runtime/fandexCurrentRuntimeAssemblyReadiness';
import {
  getActivityExposurePublicRouteForIU,
} from './activityExposureRealProductRead';
import {
  getBrandFitStoredEvidenceCurrentRuntimeForIU,
} from './brandFitStoredEvidenceRuntime';
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
  getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot,
} from './naverNewsIssuePointBlobRuntimeRead';
import {
  getSnsFandomPointCurrentRuntimeForIU,
} from './snsFandomPointCurrentRuntimeRead';

export const FANDEX_CURRENT_RUNTIME_ARTIST_UNIVERSE_VERSION =
  'artist-universe-v4+artist-universe-expansion-v1' as const;

function newsRuntimeReadFailed(): ProductVariableReadModelResult {
  return Object.freeze({
    status: 'data-issue' as const,
    issues: Object.freeze([
      Object.freeze({
        code: 'real-source-data-issue' as const,
        reason: 'runtime-read-failed' as const,
      }),
    ]),
    sourceMetadata: Object.freeze({
      sourceArtistId: 'iu',
      rawVariableId: 'newsIssuePoint',
      sourceTimeLabel: null,
    }),
  });
}

function activityRuntimeReadFailed():
  ProductActivityExposurePublicRouteResult {
  return Object.freeze({
    status: 'data-issue' as const,
    reason: 'runtime-read-failed' as const,
  });
}

export async function getFandexCurrentRuntimeAssemblyReadinessForIU(
  input: Readonly<{ generatedAt?: string }> = {},
): Promise<FandexCurrentRuntimeAssemblyReadiness> {
  const [
    musicAlbumSettled,
    newsSettled,
    snsSettled,
    brandFitSettled,
    activitySettled,
    momentumSettled,
    momentumReadinessSettled,
  ] = await Promise.allSettled([
    getMusicAlbumPointCurrentRuntimeForIU(),
    getArtistProductVariablePublicRoute(
      {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
      },
      {
        readNewsIssuePointReal:
          getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot,
      },
    ),
    getSnsFandomPointCurrentRuntimeForIU(),
    getBrandFitStoredEvidenceCurrentRuntimeForIU(),
    getActivityExposurePublicRouteForIU(),
    getMomentumEvidenceConsensusShadowProductForIU(),
    getMomentumLiveShadowProductReadinessForIU(),
  ]);

  const musicAlbumPoint =
    musicAlbumSettled.status === 'fulfilled'
      ? musicAlbumSettled.value
      : Object.freeze({
          status: 'data-issue' as const,
          reason: 'repository-state-read-failed',
        });

  const newsIssuePoint =
    newsSettled.status === 'fulfilled'
      ? newsSettled.value
      : newsRuntimeReadFailed();

  const snsFandomPoint =
    snsSettled.status === 'fulfilled'
      ? snsSettled.value
      : Object.freeze({
          status: 'data-issue' as const,
          reason: 'canonical-runtime-read-failed',
        });

  const brandFitPoint =
    brandFitSettled.status === 'fulfilled'
      ? brandFitSettled.value
      : Object.freeze({
          status: 'data-issue' as const,
          reason: 'durable-stored-evidence-read-failed',
        });

  const comebackActivityPoint =
    activitySettled.status === 'fulfilled'
      ? activitySettled.value
      : activityRuntimeReadFailed();

  const growthMomentumPoint = Object.freeze({
    runtimeShadow:
      momentumSettled.status === 'fulfilled'
        ? momentumSettled.value
        : Object.freeze({
            status: 'data-issue' as const,
            issues: Object.freeze([
              Object.freeze({
                code: 'runtime-read-failed' as const,
              }),
            ]) as readonly [
              Readonly<{ code: 'runtime-read-failed' }>,
            ],
            previewFallbackUsed: false as const,
            productMetricReadPerformed: false as const,
          }),
    readiness:
      momentumReadinessSettled.status === 'fulfilled'
        ? momentumReadinessSettled.value
        : Object.freeze({
            contractVersion:
              'momentum-live-shadow-product-readiness-v1' as const,
            state: 'blocked' as const,
            productActivationReady: false as const,
            productPublicationReady: false as const,
            publicRouteDesignReady: false,
            productMomentumScore: null,
            numericProductEligible: false as const,
            previewFallbackAllowed: false as const,
            runtimeShadowReadVerified: false,
            currentCarrier: Object.freeze({
              carrierRecordId: null,
              alignmentCutoffAt: null,
              directionalConsensus: null,
              persistenceConsensus: null,
              historicalOnly: true,
            }),
            sourceCurrentness: Object.freeze({
              lastfmSourceAdvancedBeyondCarrierCutoff: false,
              naverSchedulerObservedAfterCarrierCutoff: false,
              naverCurrentStoredEvidenceReproducedForReadiness: false,
              sourceAdvancementObserved: false,
            }),
            freshnessPolicy: Object.freeze({
              arbitraryAgeThresholdAllowed: false as const,
              maximumAgeDays: null,
              currentCategoricalEvaluationRequiredAfterSourceAdvancement:
                true as const,
              newHistoryObservationRequiredBeforeEvaluation: false as const,
              historyAppendDecision:
                'defer-until-current-evaluation' as const,
            }),
            currentEvaluation: Object.freeze({
              performed: false,
              currentCarrierProduced: false,
              currentNoOpEvaluationAttested: false,
              satisfiesFreshness: false,
              evaluatedAlignmentCutoffAt: null,
              directionalConsensus: null,
              persistenceConsensus: null,
              attestationPath: null,
              attestationDigest: null,
            }),
            blockers: Object.freeze([
              'current-runtime-read-failed',
            ]),
          }),
  });

  return buildFandexCurrentRuntimeAssemblyReadiness({
    sources: {
      musicAlbumPoint,
      newsIssuePoint,
      snsFandomPoint,
      brandFitPoint,
      comebackActivityPoint,
      growthMomentumPoint,
    },
    universeVersion: FANDEX_CURRENT_RUNTIME_ARTIST_UNIVERSE_VERSION,
    artists: artistUniverseV4.map((artist) =>
      Object.freeze({ id: artist.id }),
    ),
    generatedAt:
      input.generatedAt ?? new Date().toISOString(),
  });
}
