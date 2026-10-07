import {
  FANDEX_CONFIDENCE_CONTRACT_VERSION,
  FANDEX_CONFIDENCE_POLICY,
  type FandexConfidenceState,
} from '../../intelligence/confidence';
import type {
  RiskAdjustmentAvailabilityState,
  RiskAdjustmentConflictState,
  RiskAdjustmentCoverageState,
  RiskAdjustmentFreshnessState,
  RiskAdjustmentHistoryState,
  RiskAdjustmentIdentityState,
  RiskAdjustmentRevisionState,
} from '../../intelligence/riskAdjustmentPointConstruct';
import type {
  ReportedAlbumSalesCurrentReleaseRead,
} from '../../alternative-evidence/reportedAlbumSalesCurrentRelease';

export const MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION =
  'music-album-point-risk-quality-metadata-v1' as const;

export type MusicAlbumPointRiskQualitySemantic = Readonly<{
  semanticId: string;
  semanticVersion:
    typeof MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  stateValue: string;
  reason: string;
  evidenceRefs: readonly string[];
}>;

export type MusicAlbumPointRiskQualityMetadata = Readonly<{
  contractVersion:
    typeof MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  producerContractVersion: 'reported-album-sales-current-release-v1';
  variableId: 'musicAlbumPoint';
  lifecycleState: 'production-candidate';
  materialClass: 'real';
  confidenceContractVersion: typeof FANDEX_CONFIDENCE_CONTRACT_VERSION;
  confidencePolicy: typeof FANDEX_CONFIDENCE_POLICY;
  availabilityState: RiskAdjustmentAvailabilityState;
  identityState: RiskAdjustmentIdentityState;
  confidenceState: FandexConfidenceState;
  coverageState: RiskAdjustmentCoverageState;
  freshnessState: RiskAdjustmentFreshnessState;
  conflictState: RiskAdjustmentConflictState;
  revisionState: RiskAdjustmentRevisionState;
  historyState: RiskAdjustmentHistoryState;
  evidenceRefs: readonly string[];
  requiredDimensionSemantics: Readonly<{
    availability: MusicAlbumPointRiskQualitySemantic;
    identity: MusicAlbumPointRiskQualitySemantic;
    confidence: MusicAlbumPointRiskQualitySemantic;
    coverage: MusicAlbumPointRiskQualitySemantic;
    freshness: MusicAlbumPointRiskQualitySemantic;
    conflict: MusicAlbumPointRiskQualitySemantic;
    revision: MusicAlbumPointRiskQualitySemantic;
    history: MusicAlbumPointRiskQualitySemantic;
  }>;
  riskConsumptionAuthorized: false;
  numericScoreDefined: false;
}>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map(value => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function semantic(
  dimension: string,
  stateValue: string,
  reason: string,
  evidenceRefs: readonly string[],
): MusicAlbumPointRiskQualitySemantic {
  return Object.freeze({
    semanticId: `music-album-point:${dimension}`,
    semanticVersion:
      MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
    stateValue,
    reason,
    evidenceRefs: orderedUnique(evidenceRefs),
  });
}

function currentEvidenceRefs(
  current: ReportedAlbumSalesCurrentReleaseRead,
): readonly string[] {
  const base = [
    `contract:${MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION}`,
    `producer-contract:${current.contractVersion}`,
    `reported-web-current-status:${current.status}`,
  ];

  if (current.status === 'available') {
    return orderedUnique([
      ...base,
      `reported-web-release:${current.canonicalReleaseId}`,
      `reported-web-observation:${current.observationId}`,
      `reported-web-evidence-digest:${current.evidenceDigest}`,
      `reported-web-source-candidate-digest:${current.sourceCandidateDigest}`,
      ...current.evidenceRefs,
    ]);
  }

  return orderedUnique([
    ...base,
    `reported-web-current-reason:${current.reason}`,
    ...(
      current.status === 'pending'
        ? [`reported-web-release:${current.canonicalReleaseId}`]
        : []
    ),
  ]);
}

export function buildMusicAlbumPointRiskQualityMetadata(
  current: ReportedAlbumSalesCurrentReleaseRead,
): MusicAlbumPointRiskQualityMetadata {
  const evidenceRefs = currentEvidenceRefs(current);

  const availability: RiskAdjustmentAvailabilityState =
    current.status === 'available'
      ? 'available'
      : 'upstream-unavailable-ambiguous';

  const identity: RiskAdjustmentIdentityState =
    current.status === 'available' || current.status === 'pending'
      ? 'resolved'
      : current.status === 'data-issue'
        && current.reason === 'latest-release-conflicting'
        ? 'conflict'
        : 'unresolved';

  const confidence: FandexConfidenceState = 'insufficient';
  const coverage: RiskAdjustmentCoverageState = 'unknown';
  const freshness: RiskAdjustmentFreshnessState =
    current.status === 'available' ? 'current' : 'unknown';

  const conflict: RiskAdjustmentConflictState =
    current.status === 'available'
      ? 'none'
      : current.status === 'data-issue'
        && (
          current.reason === 'latest-release-conflicting'
          || current.reason === 'stored-evidence-release-conflict'
          || current.reason === 'multiple-active-observations'
          || current.reason === 'stored-evidence-duplicate-observation'
        )
        ? 'detected'
        : 'unknown';

  const revision: RiskAdjustmentRevisionState =
    current.status === 'available'
      ? current.revisionState === 'explicit-correction'
        ? 'revised-stable'
        : 'stable'
      : 'unknown';

  const history: RiskAdjustmentHistoryState = 'unknown';

  return Object.freeze({
    contractVersion:
      MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
    producerContractVersion:
      'reported-album-sales-current-release-v1' as const,
    variableId: 'musicAlbumPoint' as const,
    lifecycleState: 'production-candidate' as const,
    materialClass: 'real' as const,
    confidenceContractVersion: FANDEX_CONFIDENCE_CONTRACT_VERSION,
    confidencePolicy: FANDEX_CONFIDENCE_POLICY,
    availabilityState: availability,
    identityState: identity,
    confidenceState: confidence,
    coverageState: coverage,
    freshnessState: freshness,
    conflictState: conflict,
    revisionState: revision,
    historyState: history,
    evidenceRefs,
    requiredDimensionSemantics: Object.freeze({
      availability: semantic(
        'availability',
        availability,
        current.status === 'available'
          ? 'verified-current-release-reported-web-observation'
          : 'current-release-source-not-product-available',
        evidenceRefs,
      ),
      identity: semantic(
        'identity',
        identity,
        current.status === 'available' || current.status === 'pending'
          ? 'human-reviewed-current-release-binding'
          : 'current-release-identity-not-resolved-for-product',
        evidenceRefs,
      ),
      confidence: semantic(
        'confidence',
        confidence,
        'methodology-and-quality-acceptance-not-finalized',
        evidenceRefs,
      ),
      coverage: semantic(
        'coverage',
        coverage,
        'no-validated-current-release-coverage-sufficiency-rule',
        evidenceRefs,
      ),
      freshness: semantic(
        'freshness',
        freshness,
        current.status === 'available'
          ? 'verified-current-physical-release'
          : 'current-release-not-yet-verified-and-observed',
        evidenceRefs,
      ),
      conflict: semantic(
        'conflict',
        conflict,
        current.status === 'available'
          ? 'single-active-revision-aware-observation'
          : 'current-release-conflict-state-not-clear',
        evidenceRefs,
      ),
      revision: semantic(
        'revision',
        revision,
        current.status === 'available'
          ? 'active-observation-revision-state'
          : 'no-current-active-observation-revision-assessment',
        evidenceRefs,
      ),
      history: semantic(
        'history',
        history,
        'corpus-exists-but-no-arbitrary-history-sufficiency-threshold-defined',
        evidenceRefs,
      ),
    }),
    riskConsumptionAuthorized: false as const,
    numericScoreDefined: false as const,
  });
}
