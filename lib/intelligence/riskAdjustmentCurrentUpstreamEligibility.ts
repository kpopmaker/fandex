import {
  RISK_ADJUSTMENT_UPSTREAM_CANDIDATES,
  type RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';
import {
  RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS,
  RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE,
  type RiskAdjustmentUpstreamOwnerScope,
} from './riskAdjustmentUpstreamHandoff';

export const RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY_VERSION =
  'risk-adjustment-current-upstream-eligibility-v1' as const;

export type RiskAdjustmentCurrentUpstreamEligibilityState =
  | 'current-real-production'
  | 'not-current-real-production';

export type RiskAdjustmentCurrentUpstreamExclusionReason =
  | 'momentum-publication-not-production'
  | 'music-album-reported-web-current-production-not-ready'
  | 'sns-fandom-provider-and-product-gates-open'
  | 'brand-fit-product-activation-not-authorized';

export type RiskAdjustmentCurrentUpstreamEligibilityEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  ownerScope: RiskAdjustmentUpstreamOwnerScope;
  eligibilityState: RiskAdjustmentCurrentUpstreamEligibilityState;
  acceptedForRiskConsumption: boolean;
  exclusionReason: RiskAdjustmentCurrentUpstreamExclusionReason | null;
  evidenceRefs: readonly string[];
}>;

const CURRENT_ELIGIBILITY: Readonly<
  Record<
    RiskAdjustmentUpstreamVariableId,
    Omit<
      RiskAdjustmentCurrentUpstreamEligibilityEntry,
      'variableId' | 'ownerScope'
    >
  >
> = Object.freeze({
  newsIssuePoint: Object.freeze({
    eligibilityState: 'current-real-production' as const,
    acceptedForRiskConsumption: true,
    exclusionReason: null,
    evidenceRefs: Object.freeze([
      'producer-contract:news-issue-point-risk-quality-metadata-v1',
      'risk-handoff:newsIssuePoint:accepted',
    ]),
  }),
  comebackActivityPoint: Object.freeze({
    eligibilityState: 'current-real-production' as const,
    acceptedForRiskConsumption: true,
    exclusionReason: null,
    evidenceRefs: Object.freeze([
      'producer-contract:activity-exposure-risk-quality-metadata-v1',
      'risk-handoff:comebackActivityPoint:accepted',
    ]),
  }),
  growthMomentumPoint: Object.freeze({
    eligibilityState: 'not-current-real-production' as const,
    acceptedForRiskConsumption: false,
    exclusionReason: 'momentum-publication-not-production' as const,
    evidenceRefs: Object.freeze([
      'risk-readiness-issue:413:growthMomentumPoint',
      'product-shape:momentumEvidenceConsensus',
    ]),
  }),
  musicAlbumPoint: Object.freeze({
    eligibilityState: 'not-current-real-production' as const,
    acceptedForRiskConsumption: false,
    exclusionReason:
      'music-album-reported-web-current-production-not-ready' as const,
    evidenceRefs: Object.freeze([
      'risk-readiness-issue:413:musicAlbumPoint',
      'producer-contract:music-album-point-risk-quality-metadata-v1',
      'source-contract:reported-album-sales-production-source-v1',
      'current-source:reported-album-sales-current-release-v1',
      'current-gap:iu_music_album_current_release_evidence_gap_v1',
    ]),
  }),
  snsFandomPoint: Object.freeze({
    eligibilityState: 'not-current-real-production' as const,
    acceptedForRiskConsumption: false,
    exclusionReason: 'sns-fandom-provider-and-product-gates-open' as const,
    evidenceRefs: Object.freeze([
      'risk-readiness-issue:413:snsFandomPoint',
      'product-contract:sns-fandom-point-production-contract-v1',
      'audit-evidence:sns_fandom_youtube_audit_evidence_refs_v1',
      'owner-handoff:sns-fandom-youtube-provider-client-owner-handoff-v1',
    ]),
  }),
  brandFitPoint: Object.freeze({
    eligibilityState: 'not-current-real-production' as const,
    acceptedForRiskConsumption: false,
    exclusionReason: 'brand-fit-product-activation-not-authorized' as const,
    evidenceRefs: Object.freeze([
      'risk-readiness-issue:413:brandFitPoint',
      'brand-fit-handoff:issue-367',
      'producer-contract:brand-fit-point-risk-quality-metadata-v1',
    ]),
  }),
});

export const RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY:
  readonly RiskAdjustmentCurrentUpstreamEligibilityEntry[] =
  Object.freeze(
    RISK_ADJUSTMENT_UPSTREAM_CANDIDATES.map((variableId) =>
      Object.freeze({
        variableId,
        ownerScope: RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE[variableId],
        ...CURRENT_ELIGIBILITY[variableId],
      })
    ),
  );

export const RISK_ADJUSTMENT_CURRENT_ELIGIBLE_UPSTREAM_VARIABLE_IDS =
  Object.freeze(
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY
      .filter((entry) => entry.acceptedForRiskConsumption)
      .map((entry) => entry.variableId),
  );

export function assertRiskAdjustmentCurrentEligibilityConsistency(): true {
  const inventoryIds =
    RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS
      .map((handoff) => handoff.variableId)
      .sort((left, right) => left.localeCompare(right));

  const eligibleIds =
    [...RISK_ADJUSTMENT_CURRENT_ELIGIBLE_UPSTREAM_VARIABLE_IDS]
      .sort((left, right) => left.localeCompare(right));

  if (
    inventoryIds.length !== eligibleIds.length
    || inventoryIds.some(
      (variableId, index) => variableId !== eligibleIds[index],
    )
  ) {
    throw new Error(
      'risk_adjustment_current_upstream_eligibility_inventory_mismatch',
    );
  }

  for (const entry of RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY) {
    if (
      entry.acceptedForRiskConsumption
      !== (entry.eligibilityState === 'current-real-production')
    ) {
      throw new Error(
        'risk_adjustment_current_upstream_eligibility_state_mismatch',
      );
    }

    if (
      entry.acceptedForRiskConsumption
      && entry.exclusionReason !== null
    ) {
      throw new Error(
        'risk_adjustment_current_upstream_eligibility_reason_unexpected',
      );
    }

    if (
      !entry.acceptedForRiskConsumption
      && entry.exclusionReason === null
    ) {
      throw new Error(
        'risk_adjustment_current_upstream_eligibility_reason_missing',
      );
    }

    if (
      entry.evidenceRefs.length === 0
      || entry.evidenceRefs.some((ref) => ref.trim().length === 0)
    ) {
      throw new Error(
        'risk_adjustment_current_upstream_eligibility_evidence_missing',
      );
    }
  }

  return true;
}
