export type AlternativeMetricOwner = 'album' | 'music' | 'youtube' | 'search' | 'news';

export type AlternativeSignalKind =
  | 'album-sales-claim'
  | 'retail-rank-observation'
  | 'lastfm-listening-observation'
  | 'apple-music-consumption-observation'
  | 'youtube-video-consumption-observation'
  | 'naver-datalab-search-interest-observation'
  | 'google-trends-search-interest-observation'
  | 'news-article-existence';

export const ALTERNATIVE_SIGNAL_METRIC_OWNER: Readonly<
  Record<AlternativeSignalKind, AlternativeMetricOwner>
> = Object.freeze({
  'album-sales-claim': 'album',
  'retail-rank-observation': 'album',
  'lastfm-listening-observation': 'music',
  'apple-music-consumption-observation': 'music',
  'youtube-video-consumption-observation': 'youtube',
  'naver-datalab-search-interest-observation': 'search',
  'google-trends-search-interest-observation': 'search',
  'news-article-existence': 'news',
});

export type MetricOwnershipValidation = Readonly<{
  valid: boolean;
  signalKind: AlternativeSignalKind;
  requestedOwner: AlternativeMetricOwner;
  expectedOwner: AlternativeMetricOwner;
  code: 'ownership-valid' | 'metric-owner-mismatch';
}>;

export function validateAlternativeMetricOwnership(input: Readonly<{
  signalKind: AlternativeSignalKind;
  metricOwner: AlternativeMetricOwner;
}>): MetricOwnershipValidation {
  const expectedOwner = ALTERNATIVE_SIGNAL_METRIC_OWNER[input.signalKind];
  const valid = input.metricOwner === expectedOwner;
  return Object.freeze({
    valid,
    signalKind: input.signalKind,
    requestedOwner: input.metricOwner,
    expectedOwner,
    code: valid ? 'ownership-valid' : 'metric-owner-mismatch',
  });
}

export type AlternativeMetricContributionAssignment = Readonly<{
  contributionId: string;
  signalKind: AlternativeSignalKind;
  metricOwner: AlternativeMetricOwner;
}>;

export function validateExclusiveMetricOwnership(
  assignments: readonly AlternativeMetricContributionAssignment[],
): Readonly<{
  valid: boolean;
  issues: readonly string[];
}> {
  const issues: string[] = [];
  const ownerByContribution = new Map<string, AlternativeMetricOwner>();
  for (const assignment of assignments) {
    const ownership = validateAlternativeMetricOwnership(assignment);
    if (!ownership.valid) {
      issues.push(
        `${assignment.contributionId}:expected-${ownership.expectedOwner}:received-${assignment.metricOwner}`,
      );
    }
    const existingOwner = ownerByContribution.get(assignment.contributionId);
    if (existingOwner && existingOwner !== assignment.metricOwner) {
      issues.push(
        `${assignment.contributionId}:multiple-metric-owners:${existingOwner},${assignment.metricOwner}`,
      );
    } else {
      ownerByContribution.set(assignment.contributionId, assignment.metricOwner);
    }
  }
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues.sort()),
  });
}
