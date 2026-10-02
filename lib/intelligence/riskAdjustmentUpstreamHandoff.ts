import type {
  FandexDataLifecycleState,
  FandexDataMaterialClass,
} from './productionState';
import {
  COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  evaluateRiskAdjustmentUpstreamMetadataGap,
  NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS,
  RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS,
  type RiskAdjustmentOptionalQualityDimension,
  type RiskAdjustmentRequiredQualityDimension,
  type RiskAdjustmentUpstreamMetadataCapability,
  type RiskAdjustmentUpstreamMetadataGap,
} from './riskAdjustmentUpstreamMetadataRequirements';
import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_UPSTREAM_HANDOFF_CONTRACT_VERSION =
  'risk-adjustment-upstream-handoff-v1' as const;

export type RiskAdjustmentUpstreamOwnerScope =
  | 'news-issue-product-owner'
  | 'activity-exposure-product-owner'
  | 'momentum-product-owner'
  | 'music-album-product-owner'
  | 'sns-fandom-product-owner'
  | 'brand-fit-product-owner';

export const RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE:
  Readonly<Record<RiskAdjustmentUpstreamVariableId, RiskAdjustmentUpstreamOwnerScope>> =
  Object.freeze({
    newsIssuePoint: 'news-issue-product-owner',
    comebackActivityPoint: 'activity-exposure-product-owner',
    growthMomentumPoint: 'momentum-product-owner',
    musicAlbumPoint: 'music-album-product-owner',
    snsFandomPoint: 'sns-fandom-product-owner',
    brandFitPoint: 'brand-fit-product-owner',
  });

export type RiskAdjustmentUpstreamAcceptanceStatus =
  | 'accepted'
  | 'not-production-eligible'
  | 'required-metadata-blocked';

export type RiskAdjustmentUpstreamHandoffAssessment = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_UPSTREAM_HANDOFF_CONTRACT_VERSION;
  variableId: RiskAdjustmentUpstreamVariableId;
  ownerScope: RiskAdjustmentUpstreamOwnerScope;
  status: RiskAdjustmentUpstreamAcceptanceStatus;
  lifecycleState: FandexDataLifecycleState;
  materialClass: FandexDataMaterialClass;
  metadataGap: RiskAdjustmentUpstreamMetadataGap;
  missingRequiredDimensions: readonly RiskAdjustmentRequiredQualityDimension[];
  unknownRequiredDimensions: readonly RiskAdjustmentRequiredQualityDimension[];
  optionalDimensionsNotExplicit: readonly RiskAdjustmentOptionalQualityDimension[];
  blockers: readonly string[];
  acceptedForRiskConsumption: boolean;
}>;

export const RISK_ADJUSTMENT_UPSTREAM_HANDOFF_REQUIREMENTS = Object.freeze({
  lifecycleState: 'production' as const,
  materialClass: 'real' as const,
  requiredQualityDimensions: RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS,
  optionalQualityDimensions: RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS,
  rules: Object.freeze([
    'Preview/Synthetic/Legacy-derived material is never accepted as Real Risk input.',
    'Unknown required metadata is not equivalent to explicit metadata.',
    'Missing required metadata is returned to the upstream owner; Risk does not infer replacements.',
    'Optional volatility metadata cannot by itself block an otherwise complete dependency.',
    'Acceptance authorizes dependency consumption only; it does not authorize Risk Product activation or numeric derivation.',
  ] as const),
});

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

export function evaluateRiskAdjustmentUpstreamHandoff(input: Readonly<{
  lifecycleState: FandexDataLifecycleState;
  materialClass: FandexDataMaterialClass;
  capability: RiskAdjustmentUpstreamMetadataCapability;
}>): RiskAdjustmentUpstreamHandoffAssessment {
  const metadataGap = evaluateRiskAdjustmentUpstreamMetadataGap(
    input.capability,
  );
  const lifecycleBlockers: string[] = [];

  if (input.lifecycleState !== 'production') {
    lifecycleBlockers.push('upstream-not-production');
  }
  if (input.materialClass !== 'real') {
    lifecycleBlockers.push('upstream-not-real');
  }

  const metadataBlockers = [...metadataGap.blockers];
  let status: RiskAdjustmentUpstreamAcceptanceStatus;
  if (lifecycleBlockers.length > 0) {
    status = 'not-production-eligible';
  } else if (metadataGap.status !== 'ready') {
    status = 'required-metadata-blocked';
  } else {
    status = 'accepted';
  }

  return Object.freeze({
    contractVersion: RISK_ADJUSTMENT_UPSTREAM_HANDOFF_CONTRACT_VERSION,
    variableId: input.capability.variableId,
    ownerScope: RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE[
      input.capability.variableId
    ],
    status,
    lifecycleState: input.lifecycleState,
    materialClass: input.materialClass,
    metadataGap,
    missingRequiredDimensions: metadataGap.missingRequiredDimensions,
    unknownRequiredDimensions: metadataGap.unknownRequiredDimensions,
    optionalDimensionsNotExplicit: metadataGap.absentOptionalDimensions,
    blockers: orderedUnique([
      ...lifecycleBlockers,
      ...(lifecycleBlockers.length === 0 ? metadataBlockers : []),
    ]),
    acceptedForRiskConsumption: status === 'accepted',
  });
}


export const RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS = Object.freeze([
  evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  }),
  evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: 'production',
    materialClass: 'real',
    capability: COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  }),
] as const);

export const RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_READINESS = Object.freeze({
  candidateCount: RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.length,
  acceptedCount: RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.filter(
    (handoff) => handoff.acceptedForRiskConsumption,
  ).length,
  metadataBlockedCount: RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.filter(
    (handoff) => handoff.status === 'required-metadata-blocked',
  ).length,
  notProductionEligibleCount:
    RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.filter(
      (handoff) => handoff.status === 'not-production-eligible',
    ).length,
});
