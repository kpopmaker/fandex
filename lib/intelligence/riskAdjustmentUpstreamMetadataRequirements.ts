import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_UPSTREAM_METADATA_REQUIREMENTS_VERSION =
  'risk-adjustment-upstream-metadata-requirements-v1' as const;

export const RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS = Object.freeze([
  'availability',
  'identity',
  'confidence',
  'coverage',
  'freshness',
  'conflict',
  'revision',
  'history',
] as const);

export const RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS = Object.freeze([
  'volatility',
] as const);

export type RiskAdjustmentRequiredQualityDimension =
  typeof RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS[number];

export type RiskAdjustmentOptionalQualityDimension =
  typeof RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS[number];

export type RiskAdjustmentUpstreamMetadataCapability = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  lifecycleExposed: boolean;
  materialClassExposed: boolean;
  qualityDimensions: Readonly<
    Partial<Record<
      RiskAdjustmentRequiredQualityDimension | RiskAdjustmentOptionalQualityDimension,
      'explicit' | 'unknown' | 'absent'
    >>
  >;
}>;

export type RiskAdjustmentUpstreamMetadataGap = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  status: 'ready' | 'blocked';
  missingRequiredDimensions: readonly RiskAdjustmentRequiredQualityDimension[];
  unknownRequiredDimensions: readonly RiskAdjustmentRequiredQualityDimension[];
  absentOptionalDimensions: readonly RiskAdjustmentOptionalQualityDimension[];
  blockers: readonly string[];
}>;

function orderedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

export function evaluateRiskAdjustmentUpstreamMetadataGap(
  capability: RiskAdjustmentUpstreamMetadataCapability,
): RiskAdjustmentUpstreamMetadataGap {
  const missingRequiredDimensions: RiskAdjustmentRequiredQualityDimension[] = [];
  const unknownRequiredDimensions: RiskAdjustmentRequiredQualityDimension[] = [];
  const absentOptionalDimensions: RiskAdjustmentOptionalQualityDimension[] = [];
  const blockers: string[] = [];

  if (!capability.lifecycleExposed) {
    blockers.push('upstream-lifecycle-state-not-exposed');
  }
  if (!capability.materialClassExposed) {
    blockers.push('upstream-material-class-not-exposed');
  }

  for (const dimension of RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS) {
    const state = capability.qualityDimensions[dimension] ?? 'absent';
    if (state === 'absent') {
      missingRequiredDimensions.push(dimension);
    } else if (state === 'unknown') {
      unknownRequiredDimensions.push(dimension);
    }
  }

  for (const dimension of RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS) {
    const state = capability.qualityDimensions[dimension] ?? 'absent';
    if (state !== 'explicit') {
      absentOptionalDimensions.push(dimension);
    }
  }

  if (missingRequiredDimensions.length > 0) {
    blockers.push('required-quality-metadata-absent');
  }
  if (unknownRequiredDimensions.length > 0) {
    blockers.push('required-quality-metadata-unknown');
  }

  const normalizedBlockers = orderedUnique(blockers);
  return Object.freeze({
    variableId: capability.variableId,
    status:
      normalizedBlockers.length === 0 ? 'ready' as const : 'blocked' as const,
    missingRequiredDimensions: orderedUnique(missingRequiredDimensions),
    unknownRequiredDimensions: orderedUnique(unknownRequiredDimensions),
    absentOptionalDimensions: orderedUnique(absentOptionalDimensions),
    blockers: normalizedBlockers,
  });
}

export const NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY:
  RiskAdjustmentUpstreamMetadataCapability = Object.freeze({
    variableId: 'newsIssuePoint',
    lifecycleExposed: true,
    materialClassExposed: true,
    qualityDimensions: Object.freeze({
      availability: 'explicit',
      identity: 'explicit',
      confidence: 'explicit',
      coverage: 'explicit',
      freshness: 'explicit',
      conflict: 'explicit',
      revision: 'explicit',
      history: 'explicit',
      volatility: 'absent',
    }),
  });

export const NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_GAP =
  evaluateRiskAdjustmentUpstreamMetadataGap(
    NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  );


export const COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY:
  RiskAdjustmentUpstreamMetadataCapability = Object.freeze({
    variableId: 'comebackActivityPoint',
    lifecycleExposed: true,
    materialClassExposed: true,
    qualityDimensions: Object.freeze({
      availability: 'explicit',
      identity: 'explicit',
      confidence: 'explicit',
      coverage: 'explicit',
      freshness: 'explicit',
      conflict: 'explicit',
      revision: 'explicit',
      history: 'explicit',
      volatility: 'absent',
    }),
  });

export const COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_GAP =
  evaluateRiskAdjustmentUpstreamMetadataGap(
    COMEBACK_ACTIVITY_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  );


export const MUSIC_ALBUM_POINT_CURRENT_RISK_METADATA_CAPABILITY:
  RiskAdjustmentUpstreamMetadataCapability = Object.freeze({
    variableId: 'musicAlbumPoint',
    lifecycleExposed: true,
    materialClassExposed: true,
    qualityDimensions: Object.freeze({
      availability: 'explicit',
      identity: 'explicit',
      confidence: 'explicit',
      coverage: 'explicit',
      freshness: 'explicit',
      conflict: 'explicit',
      revision: 'explicit',
      history: 'explicit',
      volatility: 'absent',
    }),
  });

export const MUSIC_ALBUM_POINT_CURRENT_RISK_METADATA_GAP =
  evaluateRiskAdjustmentUpstreamMetadataGap(
    MUSIC_ALBUM_POINT_CURRENT_RISK_METADATA_CAPABILITY,
  );
