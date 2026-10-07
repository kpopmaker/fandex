import 'server-only';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  evaluateMomentumLiveShadowProductReadiness,
  type MomentumLiveShadowProductReadinessResult,
  type MomentumLiveShadowSourceCurrentnessAudit,
} from '../../product/readiness/momentumLiveShadowProductReadiness';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from './momentumEvidenceConsensusRealProductRead';

const AUDIT_PATH = resolve(
  process.cwd(),
  'data/momentum-product/iu_momentum_live_shadow_source_currentness_audit_v1.json',
);

const LASTFM_STATUS_URL = new URL(
  '../../../data/lastfm-cloud/lastfm_cloud_status_latest.json',
  import.meta.url,
);

type CurrentLastfmStatus = Readonly<{
  snapshotDate: string;
  snapshotAppended: boolean;
  historyRowCount: number;
  snapshotDateCount: number;
  deltaReadyCount: number;
  needsReviewCount: number;
}>;

async function readCurrentLastfmStatus():
  Promise<CurrentLastfmStatus | null> {
  try {
    const raw = await readFile(LASTFM_STATUS_URL, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CurrentLastfmStatus>;
    if (
      typeof parsed.snapshotDate !== 'string'
      || typeof parsed.snapshotAppended !== 'boolean'
      || !Number.isSafeInteger(parsed.historyRowCount)
      || !Number.isSafeInteger(parsed.snapshotDateCount)
      || !Number.isSafeInteger(parsed.deltaReadyCount)
      || !Number.isSafeInteger(parsed.needsReviewCount)
    ) {
      return null;
    }
    return parsed as CurrentLastfmStatus;
  } catch {
    return null;
  }
}

export function momentumLastfmAuditMatchesCurrentStatus(
  audit: MomentumLiveShadowSourceCurrentnessAudit,
  current: CurrentLastfmStatus,
): boolean {
  return (
    current.snapshotAppended === true
    && current.snapshotDate === audit.lastfm.snapshotDate
    && current.historyRowCount === audit.lastfm.historyRowCount
    && current.snapshotDateCount === audit.lastfm.snapshotDateCount
    && current.deltaReadyCount === audit.lastfm.deltaReadyCount
    && current.needsReviewCount === audit.lastfm.needsReviewCount
  );
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
  const [runtimeShadow, sourceAudit, currentLastfmStatus] =
    await Promise.all([
      getMomentumEvidenceConsensusShadowProductForIU(),
      readSourceAudit(),
      readCurrentLastfmStatus(),
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

  const evaluated = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit,
  });

  if (currentLastfmStatus === null) {
    return Object.freeze({
      ...evaluated,
      state: 'blocked' as const,
      publicRouteDesignReady: false,
      blockers: Object.freeze([
        ...evaluated.blockers,
        'current-lastfm-status-read-failed',
      ]),
    });
  }

  if (
    !momentumLastfmAuditMatchesCurrentStatus(
      sourceAudit,
      currentLastfmStatus,
    )
  ) {
    return Object.freeze({
      ...evaluated,
      state: 'blocked' as const,
      publicRouteDesignReady: false,
      blockers: Object.freeze([
        ...evaluated.blockers,
        'lastfm-source-audit-stale',
      ]),
    });
  }

  return evaluated;
}
