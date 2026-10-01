import {
  type SnsFandomYoutubeContentAgeAlignmentResult,
} from './snsFandomPointYoutubeContentAgeAlignment';

export const SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION =
  'sns-fandom-reaction-aggregation-methodology-v1' as const;

export type SnsFandomReactionAggregationConstruct =
  | 'typical-content-reaction-intensity'
  | 'window-total-reaction-volume';

export type SnsFandomReactionAggregationDecision = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION;
  state: 'research-only' | 'approved';
  construct: SnsFandomReactionAggregationConstruct;
  metricId:
    | 'youtube.video.view-count'
    | 'youtube.video.like-count'
    | 'youtube.video.comment-count';
  methodId: string;
  contentSelectionRule:
    'official-channel-all-uploads-in-published-window';
  contentAgeRequirement: 'exact-age-aligned';
  releaseVolumeTreatment:
    | 'part-of-construct'
    | 'held-separate-from-reaction-intensity';
  missingPolicy: 'block';
  evidenceRef: string;
  decidedAt: string;
  empiricalValidation: Readonly<{
    datasetRef: string;
    materialClass: 'real';
    distinctCanonicalArtistCount: number;
    comparedMethodIds: readonly string[];
    contentAgeSensitivityReviewed: boolean;
    releaseVolumeSensitivityReviewed: boolean;
    missingnessSensitivityReviewed: boolean;
    revisionStabilityReviewed: boolean;
  }>;
}>;

export type SnsFandomReactionAggregationMethodologyValidation =
  Readonly<{
    ok: boolean;
    blockers: readonly string[];
  }>;

export type SnsFandomReactionAggregationMethodologyReadiness =
  Readonly<{
    contractVersion:
      typeof SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION;
    state:
      | 'age-alignment-blocked'
      | 'methodology-missing'
      | 'methodology-research-only'
      | 'methodology-invalid'
      | 'methodology-approved';
    construct: SnsFandomReactionAggregationConstruct | null;
    metricId: SnsFandomReactionAggregationDecision['metricId'] | null;
    methodId: string | null;
    executionImplemented: false;
    aggregateValue: null;
    normalizedValue: null;
    crossMetricCombinationAllowed: false;
    crossPlatformCombinationAllowed: false;
    blockers: readonly string[];
  }>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function validateSnsFandomReactionAggregationDecision(
  decision: SnsFandomReactionAggregationDecision,
): SnsFandomReactionAggregationMethodologyValidation {
  const blockers: string[] = [];

  if (
    decision.contractVersion
      !== SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION
  ) {
    blockers.push('reaction-aggregation-decision-version-invalid');
  }
  if (decision.methodId.trim().length === 0) {
    blockers.push('reaction-aggregation-method-id-empty');
  }
  if (decision.evidenceRef.trim().length === 0) {
    blockers.push('reaction-aggregation-decision-evidence-empty');
  }
  if (!validIso(decision.decidedAt)) {
    blockers.push('reaction-aggregation-decision-time-invalid');
  }
  if (decision.empiricalValidation.datasetRef.trim().length === 0) {
    blockers.push('reaction-aggregation-validation-dataset-empty');
  }
  if (
    !Number.isSafeInteger(
      decision.empiricalValidation.distinctCanonicalArtistCount,
    )
    || decision.empiricalValidation.distinctCanonicalArtistCount < 2
  ) {
    blockers.push(
      'reaction-aggregation-validation-multi-artist-evidence-insufficient',
    );
  }
  if (
    !decision.empiricalValidation.comparedMethodIds.includes(
      decision.methodId,
    )
  ) {
    blockers.push('reaction-aggregation-selected-method-not-compared');
  }

  if (decision.state === 'approved') {
    if (
      !decision.empiricalValidation.contentAgeSensitivityReviewed
    ) {
      blockers.push(
        'reaction-aggregation-content-age-sensitivity-not-reviewed',
      );
    }
    if (
      !decision.empiricalValidation.releaseVolumeSensitivityReviewed
    ) {
      blockers.push(
        'reaction-aggregation-release-volume-sensitivity-not-reviewed',
      );
    }
    if (!decision.empiricalValidation.missingnessSensitivityReviewed) {
      blockers.push(
        'reaction-aggregation-missingness-sensitivity-not-reviewed',
      );
    }
    if (!decision.empiricalValidation.revisionStabilityReviewed) {
      blockers.push(
        'reaction-aggregation-revision-stability-not-reviewed',
      );
    }
  }

  return Object.freeze({
    ok: blockers.length === 0,
    blockers: Object.freeze(blockers),
  });
}

export function evaluateSnsFandomReactionAggregationMethodology(
  input: Readonly<{
    ageAlignment: SnsFandomYoutubeContentAgeAlignmentResult;
    decision: SnsFandomReactionAggregationDecision | null;
  }>,
): SnsFandomReactionAggregationMethodologyReadiness {
  const blockers: string[] = [];

  if (input.ageAlignment.state !== 'age-alignment-ready') {
    blockers.push('reaction-aggregation-content-age-alignment-not-ready');
    return Object.freeze({
      contractVersion:
        SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION,
      state: 'age-alignment-blocked' as const,
      construct: input.decision?.construct ?? null,
      metricId: input.decision?.metricId ?? null,
      methodId: input.decision?.methodId ?? null,
      executionImplemented: false as const,
      aggregateValue: null,
      normalizedValue: null,
      crossMetricCombinationAllowed: false as const,
      crossPlatformCombinationAllowed: false as const,
      blockers: Object.freeze(blockers),
    });
  }

  if (input.decision === null) {
    blockers.push('reaction-aggregation-methodology-decision-missing');
    return Object.freeze({
      contractVersion:
        SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION,
      state: 'methodology-missing' as const,
      construct: null,
      metricId: null,
      methodId: null,
      executionImplemented: false as const,
      aggregateValue: null,
      normalizedValue: null,
      crossMetricCombinationAllowed: false as const,
      crossPlatformCombinationAllowed: false as const,
      blockers: Object.freeze(blockers),
    });
  }

  const validation =
    validateSnsFandomReactionAggregationDecision(input.decision);

  if (!validation.ok) {
    return Object.freeze({
      contractVersion:
        SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION,
      state: 'methodology-invalid' as const,
      construct: input.decision.construct,
      metricId: input.decision.metricId,
      methodId: input.decision.methodId,
      executionImplemented: false as const,
      aggregateValue: null,
      normalizedValue: null,
      crossMetricCombinationAllowed: false as const,
      crossPlatformCombinationAllowed: false as const,
      blockers: validation.blockers,
    });
  }

  if (input.decision.state !== 'approved') {
    blockers.push('reaction-aggregation-methodology-not-approved');
    return Object.freeze({
      contractVersion:
        SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION,
      state: 'methodology-research-only' as const,
      construct: input.decision.construct,
      metricId: input.decision.metricId,
      methodId: input.decision.methodId,
      executionImplemented: false as const,
      aggregateValue: null,
      normalizedValue: null,
      crossMetricCombinationAllowed: false as const,
      crossPlatformCombinationAllowed: false as const,
      blockers: Object.freeze(blockers),
    });
  }

  blockers.push('reaction-aggregation-execution-not-implemented');

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_REACTION_AGGREGATION_METHODOLOGY_VERSION,
    state: 'methodology-approved' as const,
    construct: input.decision.construct,
    metricId: input.decision.metricId,
    methodId: input.decision.methodId,
    executionImplemented: false as const,
    aggregateValue: null,
    normalizedValue: null,
    crossMetricCombinationAllowed: false as const,
    crossPlatformCombinationAllowed: false as const,
    blockers: Object.freeze(blockers),
  });
}
