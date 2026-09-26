import 'server-only';

import { readFile } from 'node:fs/promises';

import {
  evaluateMomentumLiveShadowProductReadiness,
  type MomentumLiveShadowProductReadinessResult,
  type MomentumLiveShadowSourceCurrentnessAudit,
} from '../../product/readiness/momentumLiveShadowProductReadiness';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from './momentumEvidenceConsensusRealProductRead';

const AUDIT_URL = new URL(
  '../../../data/momentum-product/iu_momentum_live_shadow_source_currentness_audit_v1.json',
  import.meta.url,
);

async function readSourceAudit():
  Promise<MomentumLiveShadowSourceCurrentnessAudit | null> {
  try {
    const raw = await readFile(AUDIT_URL, 'utf8');
    return JSON.parse(raw) as MomentumLiveShadowSourceCurrentnessAudit;
  } catch {
    return null;
  }
}

export async function getMomentumLiveShadowProductReadinessForIU():
  Promise<MomentumLiveShadowProductReadinessResult> {
  const [runtimeShadow, sourceAudit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readSourceAudit(),
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
      }),
      blockers: Object.freeze(['source-currentness-audit-read-failed']),
    });
  }

  return evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit,
  });
}
