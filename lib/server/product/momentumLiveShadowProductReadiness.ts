import 'server-only';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  evaluateMomentumLiveShadowProductReadiness,
  type MomentumLiveShadowProductReadinessResult,
  type MomentumLiveShadowSourceCurrentnessAudit,
} from '../../product/readiness/momentumLiveShadowProductReadiness';
import {
  evaluateFandexMomentumRecoveryContinuityFromRepository,
} from '../../intelligence/fandexMomentumRecoveryContinuityGate';
import {
  createProductionNaverNewsBlobEvidenceReadStore,
} from '../ingestion/naverNewsBlobMirrorRuntime';
import {
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
} from '../ingestion/naverNewsStoredEvidenceMirror';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from './momentumEvidenceConsensusRealProductRead';

const AUDIT_PATH = resolve(
  process.cwd(),
  'data/momentum-product/iu_momentum_live_shadow_source_currentness_audit_v1.json',
);

const LASTFM_STATUS_PATH = resolve(
  process.cwd(),
  'data/lastfm-cloud/lastfm_cloud_status_latest.json',
);

function isProductionRuntime(env: NodeJS.ProcessEnv): boolean {
  return (
    env.FANDEX_PRODUCT_RUNTIME_ENV === 'production'
    || env.VERCEL_ENV === 'production'
    || env.VERCEL_TARGET_ENV === 'production'
  );
}

async function readCurrentLastfmSnapshotDate(): Promise<
  Readonly<{ readOk: boolean; snapshotDate: string | null }>
> {
  try {
    const raw = await readFile(LASTFM_STATUS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Readonly<{
      snapshotDate?: unknown;
    }>;

    return Object.freeze({
      readOk: true,
      snapshotDate:
        typeof parsed.snapshotDate === 'string'
          ? parsed.snapshotDate
          : null,
    });
  } catch {
    return Object.freeze({
      readOk: false,
      snapshotDate: null,
    });
  }
}

async function readCurrentNaverLatestOfficialSlot(): Promise<
  Readonly<{ readOk: boolean; slotStart: string | null }>
> {
  if (!isProductionRuntime(process.env)) {
    return Object.freeze({
      readOk: true,
      slotStart: null,
    });
  }

  try {
    const store = createProductionNaverNewsBlobEvidenceReadStore(
      process.env,
    );
    const repository =
      createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
        store,
      );
    const continuity =
      await evaluateFandexMomentumRecoveryContinuityFromRepository(
        repository,
      );

    return Object.freeze({
      readOk: true,
      slotStart: continuity.latestSuccessfulSlotStart,
    });
  } catch {
    return Object.freeze({
      readOk: false,
      slotStart: null,
    });
  }
}

async function readSourceAudit():
  Promise<MomentumLiveShadowSourceCurrentnessAudit | null> {
  try {
    const raw = await readFile(AUDIT_PATH, 'utf8');
    return JSON.parse(raw) as MomentumLiveShadowSourceCurrentnessAudit;
  } catch {
    return null;
  }
}

export async function getMomentumLiveShadowProductReadinessForIU():
  Promise<MomentumLiveShadowProductReadinessResult> {
  const [
    runtimeShadow,
    sourceAudit,
    currentLastfm,
    currentNaver,
  ] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readSourceAudit(),
    readCurrentLastfmSnapshotDate(),
    readCurrentNaverLatestOfficialSlot(),
  ]);

  if (sourceAudit === null) {
    return Object.freeze({
      contractVersion: 'momentum-live-shadow-product-readiness-v1' as const,
      state: 'blocked' as const,
      productActivationReady: false as const,
      productPublicationReady: false as const,
      publicRouteDesignReady: false,
      productMomentumScore: null,
      numericProductEligible: false as const,
      previewFallbackAllowed: false as const,
      runtimeShadowReadVerified: runtimeShadow.status === 'ok',
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
      blockers: Object.freeze(['source-currentness-audit-read-failed']),
    });
  }

  return evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit,
    observedSourceCurrentness: Object.freeze({
      lastfmReadOk: currentLastfm.readOk,
      lastfmSnapshotDate: currentLastfm.snapshotDate,
      naverReadOk: currentNaver.readOk,
      naverLatestOfficialSlotStart: currentNaver.slotStart,
    }),
  });
}
