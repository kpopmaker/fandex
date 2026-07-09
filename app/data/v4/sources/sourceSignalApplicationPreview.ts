import {
  getCandidateEligibilityDecisions,
  getSourceEligibilityStatusLabel,
  getSourceEligibilitySummary,
} from './sourceEligibilityPreview';
import type {
  FandexCandidateEligibilityDecision,
  FandexSourceEligibilityReasonCode,
} from './sourceEligibilityTypes';
import type {
  FandexNormalizedSourceItem,
  FandexSourceVariableSignalKey,
} from './sourceIngestionTypes';
import type {
  FandexSourceSignalApplicationGroup,
  FandexSourceSignalApplicationMode,
  FandexSourceSignalApplicationPlan,
  FandexSourceSignalApplicationReasonCode,
  FandexSourceSignalApplicationSummary,
} from './sourceSignalApplicationTypes';

export type FandexSourceSignalApplicationShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-application-plans'
    | 'empty-application-groups'
    | 'invalid-application-mode'
    | 'missing-reason-codes'
    | 'duplicate-application-key'
    | 'duplicate-candidate-key'
    | 'missing-artist-id'
    | 'missing-variable-key'
    | 'invalid-summary-count'
    | 'invalid-average-blended-quality-score'
    | 'duplicate-ready-application-key'
    | 'duplicate-review-application-key'
    | 'duplicate-blocked-application-key';
  message: string;
  applicationKey?: string;
  candidateKey?: string;
};

export type FandexSourceSignalApplicationShapeCheckResult = {
  isValid: boolean;
  planCount: number;
  groupCount: number;
  issues: FandexSourceSignalApplicationShapeCheckIssue[];
};

type FandexSourceSignalApplicationGroupBucket = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  plans: FandexSourceSignalApplicationPlan[];
};

const allowedApplicationModes: readonly FandexSourceSignalApplicationMode[] = [
  'ready',
  'review',
  'limited',
  'blocked',
  'skipped',
];

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedApplicationMode(mode: string) {
  return allowedApplicationModes.includes(mode as FandexSourceSignalApplicationMode);
}

export function getSourceSignalApplicationModeFromEligibility(
  decision: FandexCandidateEligibilityDecision,
): FandexSourceSignalApplicationMode {
  if (
    decision.candidateKey.trim().length === 0
    || decision.sourceId.trim().length === 0
    || decision.artistId.trim().length === 0
    || decision.variableKey.trim().length === 0
  ) {
    return 'skipped';
  }

  if (decision.eligibilityStatus === 'eligible') {
    return 'ready';
  }

  if (decision.eligibilityStatus === 'review') {
    return 'review';
  }

  if (decision.eligibilityStatus === 'limited') {
    return 'limited';
  }

  return 'blocked';
}

function mapEligibilityReasonToApplicationReason(
  reasonCode: FandexSourceEligibilityReasonCode,
): FandexSourceSignalApplicationReasonCode | null {
  if (reasonCode === 'sufficient_confidence' || reasonCode === 'high_quality') {
    return 'eligible_candidate';
  }

  if (reasonCode === 'low_confidence') {
    return 'low_confidence';
  }

  if (reasonCode === 'warning_present') {
    return 'warning_present';
  }

  if (reasonCode === 'fixture_only') {
    return 'fixture_only';
  }

  if (reasonCode === 'duplicate_candidate') {
    return 'duplicate_variable_candidate';
  }

  if (reasonCode === 'missing_source') {
    return 'no_candidate';
  }

  return null;
}

function getApplicationReasonCodes(
  decision: FandexCandidateEligibilityDecision,
  applicationMode: FandexSourceSignalApplicationMode,
  isDuplicateVariableCandidate: boolean,
): FandexSourceSignalApplicationReasonCode[] {
  const reasonCodes = new Set<FandexSourceSignalApplicationReasonCode>([
    'preview_only',
    'fixture_only',
  ]);

  if (applicationMode === 'ready') {
    reasonCodes.add('eligible_candidate');
  }

  if (applicationMode === 'review') {
    reasonCodes.add('review_required');
  }

  if (applicationMode === 'limited') {
    reasonCodes.add('limited_candidate');
  }

  if (applicationMode === 'blocked') {
    reasonCodes.add('blocked_candidate');
  }

  if (applicationMode === 'skipped') {
    reasonCodes.add('no_candidate');
  }

  if (decision.confidenceScore < 64) {
    reasonCodes.add('low_confidence');
  }

  if (decision.warnings.length > 0) {
    reasonCodes.add('warning_present');
  }

  if (isDuplicateVariableCandidate) {
    reasonCodes.add('duplicate_variable_candidate');
  }

  decision.reasonCodes.forEach((eligibilityReasonCode) => {
    const applicationReasonCode = mapEligibilityReasonToApplicationReason(
      eligibilityReasonCode,
    );

    if (applicationReasonCode) {
      reasonCodes.add(applicationReasonCode);
    }
  });

  return Array.from(reasonCodes).sort();
}

export function getSourceSignalApplicationModeLabel(
  mode: FandexSourceSignalApplicationMode,
) {
  const labels: Record<FandexSourceSignalApplicationMode, string> = {
    ready: '반영 준비 후보',
    review: '검토 필요',
    limited: '제한 후보',
    blocked: '제외 후보',
    skipped: '스킵',
  };

  return labels[mode];
}

export function getSourceSignalApplicationReasonLabel(
  reasonCode: FandexSourceSignalApplicationReasonCode,
) {
  const labels: Record<FandexSourceSignalApplicationReasonCode, string> = {
    eligible_candidate: 'eligibility 통과 candidate',
    review_required: '검토 필요',
    limited_candidate: '제한 후보',
    blocked_candidate: '제외 후보',
    low_confidence: '낮은 신뢰도',
    warning_present: 'warning 존재',
    fixture_only: 'fixture 기반 preview',
    no_candidate: 'candidate 확인 필요',
    duplicate_variable_candidate: '중복 변수 candidate',
    preview_only: '실제 반영 없음',
  };

  return labels[reasonCode];
}

export function getSourceSignalApplicationPlans(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalApplicationPlan[] {
  const variableCandidateCounts = new Map<string, number>();
  const decisions = getCandidateEligibilityDecisions(items);

  decisions.forEach((decision) => {
    const groupKey = `${decision.artistId}::${decision.variableKey}`;

    variableCandidateCounts.set(
      groupKey,
      (variableCandidateCounts.get(groupKey) ?? 0) + 1,
    );
  });

  return decisions.map((decision): FandexSourceSignalApplicationPlan => {
    const groupKey = `${decision.artistId}::${decision.variableKey}`;
    const applicationMode = getSourceSignalApplicationModeFromEligibility(decision);
    const reasonCodes = getApplicationReasonCodes(
      decision,
      applicationMode,
      (variableCandidateCounts.get(groupKey) ?? 0) > 1,
    );

    return {
      applicationKey: `${decision.candidateKey}::application-preview`,
      candidateKey: decision.candidateKey,
      sourceId: decision.sourceId,
      artistId: decision.artistId,
      variableKey: decision.variableKey,
      applicationMode,
      eligibilityStatus: decision.eligibilityStatus,
      candidateScore: decision.candidateScore,
      confidenceScore: decision.confidenceScore,
      sourceQualityScore: decision.sourceQualityScore,
      blendedQualityScore: decision.blendedQualityScore,
      reasonCodes,
      warnings: decision.warnings,
      summaryLabel: `${decision.artistId} / ${decision.variableKey} application preview`,
      summaryNote:
        `Read-only plan from ${getSourceEligibilityStatusLabel(
          decision.eligibilityStatus,
        )}. Not connected to FANDEX scoring, ranking, chart, or storage.`,
      previewOnly: true,
    };
  });
}

function getModeCount(
  plans: FandexSourceSignalApplicationPlan[],
  mode: FandexSourceSignalApplicationMode,
) {
  return plans.filter((plan) => plan.applicationMode === mode).length;
}

export function getSourceSignalApplicationGroups(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalApplicationGroup[] {
  const groupMap = new Map<string, FandexSourceSignalApplicationGroupBucket>();

  getSourceSignalApplicationPlans(items).forEach((plan) => {
    const groupKey = `${plan.artistId}::${plan.variableKey}`;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.plans.push(plan);
      return;
    }

    groupMap.set(groupKey, {
      groupKey,
      artistId: plan.artistId,
      variableKey: plan.variableKey,
      plans: [plan],
    });
  });

  return Array.from(groupMap.values())
    .map(({ groupKey, artistId, variableKey, plans }): FandexSourceSignalApplicationGroup => {
      const sortedPlans = [...plans].sort(
        (first, second) =>
          second.blendedQualityScore - first.blendedQualityScore
          || first.candidateKey.localeCompare(second.candidateKey),
      );
      const blockedCandidateKeys = sortedPlans
        .filter((plan) => plan.applicationMode === 'blocked')
        .map((plan) => plan.candidateKey)
        .slice(0, 5);

      return {
        groupKey,
        artistId,
        variableKey,
        planCount: plans.length,
        readyCount: getModeCount(plans, 'ready'),
        reviewCount: getModeCount(plans, 'review'),
        limitedCount: getModeCount(plans, 'limited'),
        blockedCount: getModeCount(plans, 'blocked'),
        skippedCount: getModeCount(plans, 'skipped'),
        averageBlendedQualityScore: getAverage(
          plans.map((plan) => plan.blendedQualityScore),
        ),
        topCandidateKeys: sortedPlans
          .map((plan) => plan.candidateKey)
          .slice(0, 5),
        blockedCandidateKeys,
        summaryLabel: `${artistId} / ${variableKey} application group preview`,
        summaryNote:
          'Grouped read-only source signal application preview. No FANDEX score delta is calculated.',
        previewOnly: true,
      };
    })
    .sort((first, second) => second.planCount - first.planCount
      || first.groupKey.localeCompare(second.groupKey));
}

export function getSourceSignalApplicationSummary(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalApplicationSummary {
  const plans = getSourceSignalApplicationPlans(items);
  const groups = getSourceSignalApplicationGroups(items);
  const eligibilitySummary = getSourceEligibilitySummary(items);

  return {
    planCount: plans.length,
    groupCount: groups.length,
    readyPlanCount: getModeCount(plans, 'ready'),
    reviewPlanCount: getModeCount(plans, 'review'),
    limitedPlanCount: getModeCount(plans, 'limited'),
    blockedPlanCount: getModeCount(plans, 'blocked'),
    skippedPlanCount: getModeCount(plans, 'skipped'),
    artistCount: new Set(plans.map((plan) => plan.artistId)).size,
    variableCount: new Set(plans.map((plan) => plan.variableKey)).size,
    warningCount: plans.flatMap((plan) => plan.warnings).length,
    readyApplicationKeys: getUniqueValues(
      plans
        .filter((plan) => plan.applicationMode === 'ready')
        .map((plan) => plan.applicationKey),
    ),
    reviewApplicationKeys: getUniqueValues(
      plans
        .filter((plan) => plan.applicationMode === 'review')
        .map((plan) => plan.applicationKey),
    ),
    blockedApplicationKeys: getUniqueValues(
      plans
        .filter((plan) => plan.applicationMode === 'blocked')
        .map((plan) => plan.applicationKey),
    ),
    summaryLabel: 'source signal application preview',
    summaryNote:
      `${eligibilitySummary.summaryLabel}. Application plans are read-only and are not used by FANDEX scoring.`,
    previewOnly: true,
  };
}

export function runSourceSignalApplicationShapeCheck(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalApplicationShapeCheckResult {
  const issues: FandexSourceSignalApplicationShapeCheckIssue[] = [];
  const plans = getSourceSignalApplicationPlans(items);
  const groups = getSourceSignalApplicationGroups(items);
  const summary = getSourceSignalApplicationSummary(items);

  if (plans.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-application-plans',
      message: 'Source signal application plans must not be empty.',
    });
  }

  if (groups.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-application-groups',
      message: 'Source signal application groups must not be empty.',
    });
  }

  plans.forEach((plan) => {
    if (!isAllowedApplicationMode(plan.applicationMode)) {
      issues.push({
        severity: 'error',
        code: 'invalid-application-mode',
        message: `Invalid applicationMode: ${plan.applicationKey}`,
        applicationKey: plan.applicationKey,
        candidateKey: plan.candidateKey,
      });
    }

    if (plan.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Application plan reasonCodes must not be empty: ${plan.applicationKey}`,
        applicationKey: plan.applicationKey,
        candidateKey: plan.candidateKey,
      });
    }

    if (plan.artistId.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-artist-id',
        message: `Application plan artistId must not be empty: ${plan.applicationKey}`,
        applicationKey: plan.applicationKey,
        candidateKey: plan.candidateKey,
      });
    }

    if (plan.variableKey.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-variable-key',
        message: `Application plan variableKey must not be empty: ${plan.applicationKey}`,
        applicationKey: plan.applicationKey,
        candidateKey: plan.candidateKey,
      });
    }
  });

  if (hasDuplicateValues(plans.map((plan) => plan.applicationKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-application-key',
      message: 'Application plan keys must be unique.',
    });
  }

  if (hasDuplicateValues(plans.map((plan) => plan.candidateKey))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-candidate-key',
      message: 'Candidate keys are duplicated across application plans.',
    });
  }

  if (summary.planCount !== plans.length || summary.groupCount !== groups.length) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Application summary counts must match plan and group arrays.',
    });
  }

  groups.forEach((group) => {
    if (!Number.isFinite(group.averageBlendedQualityScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-average-blended-quality-score',
        message: `Group averageBlendedQualityScore must be finite: ${group.groupKey}`,
      });
    }
  });

  if (hasDuplicateValues(summary.readyApplicationKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-ready-application-key',
      message: 'readyApplicationKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.reviewApplicationKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-review-application-key',
      message: 'reviewApplicationKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.blockedApplicationKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-blocked-application-key',
      message: 'blockedApplicationKeys must be unique.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    planCount: plans.length,
    groupCount: groups.length,
    issues,
  };
}
