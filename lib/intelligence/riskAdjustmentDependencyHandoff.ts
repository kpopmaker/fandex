import type {
  RiskAdjustmentRequiredQualityDimension,
} from './riskAdjustmentUpstreamMetadataRequirements';
import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_DEPENDENCY_HANDOFF_VERSION =
  'risk-adjustment-dependency-handoff-v1' as const;

export type RiskAdjustmentDependencyHandoff = Readonly<{
  contractVersion: typeof RISK_ADJUSTMENT_DEPENDENCY_HANDOFF_VERSION;
  upstreamVariableId: RiskAdjustmentUpstreamVariableId;
  dependencyStatus: 'requested' | 'blocked-until-production';
  requestedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  acceptanceBoundary: Readonly<{
    mustBeProductTruth: true;
    mustBeProduction: true;
    mustBeRealMaterial: true;
    deterministicProjectionAllowed: true;
    arbitraryThresholdAllowed: false;
    arbitraryWeightAllowed: false;
    missingToZeroAllowed: false;
    previewFallbackAllowed: false;
  }>;
  acceptedEvidenceForms: readonly [
    'explicit-upstream-product-field',
    'deterministic-projection-from-explicit-upstream-fields',
  ];
  notes: readonly string[];
}>;

export const NEWS_ISSUE_POINT_RISK_DEPENDENCY_HANDOFF:
  RiskAdjustmentDependencyHandoff = Object.freeze({
    contractVersion: RISK_ADJUSTMENT_DEPENDENCY_HANDOFF_VERSION,
    upstreamVariableId: 'newsIssuePoint',
    dependencyStatus: 'requested',
    requestedRequiredDimensions: Object.freeze([
      'confidence',
      'coverage',
      'freshness',
      'conflict',
      'revision',
    ] as const),
    acceptanceBoundary: Object.freeze({
      mustBeProductTruth: true as const,
      mustBeProduction: true as const,
      mustBeRealMaterial: true as const,
      deterministicProjectionAllowed: true as const,
      arbitraryThresholdAllowed: false as const,
      arbitraryWeightAllowed: false as const,
      missingToZeroAllowed: false as const,
      previewFallbackAllowed: false as const,
    }),
    acceptedEvidenceForms: Object.freeze([
      'explicit-upstream-product-field',
      'deterministic-projection-from-explicit-upstream-fields',
    ] as const),
    notes: Object.freeze([
      'Current Product truth already exposes availability, identity, historical baseline readiness, and stored-evidence lineage.',
      'Risk will not infer confidence from baseline readiness or infer freshness from collection recency without an upstream-approved semantic.',
      'Generic Product unavailable must not be relabeled provider-unavailable without explicit upstream cause.',
    ]),
  });

export const COMEBACK_ACTIVITY_RISK_DEPENDENCY_HANDOFF:
  RiskAdjustmentDependencyHandoff = Object.freeze({
    contractVersion: RISK_ADJUSTMENT_DEPENDENCY_HANDOFF_VERSION,
    upstreamVariableId: 'comebackActivityPoint',
    dependencyStatus: 'requested',
    requestedRequiredDimensions: Object.freeze([
      'confidence',
      'freshness',
      'revision',
      'history',
    ] as const),
    acceptanceBoundary: Object.freeze({
      mustBeProductTruth: true as const,
      mustBeProduction: true as const,
      mustBeRealMaterial: true as const,
      deterministicProjectionAllowed: true as const,
      arbitraryThresholdAllowed: false as const,
      arbitraryWeightAllowed: false as const,
      missingToZeroAllowed: false as const,
      previewFallbackAllowed: false as const,
    }),
    acceptedEvidenceForms: Object.freeze([
      'explicit-upstream-product-field',
      'deterministic-projection-from-explicit-upstream-fields',
    ] as const),
    notes: Object.freeze([
      'Activity Exposure already exposes provider coverage, provider availability, event identity, conflicts, and revision lineage identifiers.',
      'Risk does not define how old Activity Exposure becomes stale.',
      'Risk does not define how many revisions or historical events are sufficient to call revision stability or history sufficient.',
    ]),
  });

export const BLOCKED_NON_PRODUCTION_RISK_HANDOFFS:
  readonly RiskAdjustmentDependencyHandoff[] = Object.freeze([
    Object.freeze({
      contractVersion: RISK_ADJUSTMENT_DEPENDENCY_HANDOFF_VERSION,
      upstreamVariableId: 'growthMomentumPoint' as const,
      dependencyStatus: 'blocked-until-production' as const,
      requestedRequiredDimensions: Object.freeze([]),
      acceptanceBoundary: Object.freeze({
        mustBeProductTruth: true as const,
        mustBeProduction: true as const,
        mustBeRealMaterial: true as const,
        deterministicProjectionAllowed: true as const,
        arbitraryThresholdAllowed: false as const,
        arbitraryWeightAllowed: false as const,
        missingToZeroAllowed: false as const,
        previewFallbackAllowed: false as const,
      }),
      acceptedEvidenceForms: Object.freeze([
        'explicit-upstream-product-field',
        'deterministic-projection-from-explicit-upstream-fields',
      ] as const),
      notes: Object.freeze([
        'No Risk metadata request is active until the upstream categorical Product reaches Production publication/cutover.',
      ]),
    }),
    ...(['musicAlbumPoint', 'snsFandomPoint', 'brandFitPoint'] as const).map(
      (upstreamVariableId) => Object.freeze({
        contractVersion: RISK_ADJUSTMENT_DEPENDENCY_HANDOFF_VERSION,
        upstreamVariableId,
        dependencyStatus: 'blocked-until-production' as const,
        requestedRequiredDimensions: Object.freeze([]),
        acceptanceBoundary: Object.freeze({
          mustBeProductTruth: true as const,
          mustBeProduction: true as const,
          mustBeRealMaterial: true as const,
          deterministicProjectionAllowed: true as const,
          arbitraryThresholdAllowed: false as const,
          arbitraryWeightAllowed: false as const,
          missingToZeroAllowed: false as const,
          previewFallbackAllowed: false as const,
        }),
        acceptedEvidenceForms: Object.freeze([
          'explicit-upstream-product-field',
          'deterministic-projection-from-explicit-upstream-fields',
        ] as const),
        notes: Object.freeze([
          'Risk metadata integration remains dormant until upstream Real Product activation.',
        ]),
      })),
  ]);

export function listActiveRiskAdjustmentDependencyHandoffs():
  readonly RiskAdjustmentDependencyHandoff[] {
  return Object.freeze([
    NEWS_ISSUE_POINT_RISK_DEPENDENCY_HANDOFF,
    COMEBACK_ACTIVITY_RISK_DEPENDENCY_HANDOFF,
  ]);
}
