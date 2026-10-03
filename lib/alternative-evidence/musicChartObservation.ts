import { sha256Canonical } from '../shared/canonicalDigest';

export const MUSIC_CHART_OBSERVATION_CONTRACT_VERSION = 'music-chart-observation-v1' as const;

export type MusicChartPlatform = 'melon' | 'genie' | 'bugs';

export type MusicChartObservationStatus =
  | 'ranked'
  | 'not-ranked'
  | 'missing'
  | 'unsupported'
  | 'collection-failed';

export type MusicChartCoverage = Readonly<{
  startRank: number;
  endRank: number;
  evidenceIds: readonly string[];
}>;

export type MusicChartObservation = Readonly<{
  contractVersion: typeof MUSIC_CHART_OBSERVATION_CONTRACT_VERSION;
  observationId: string;
  canonicalArtistId: string;
  artistLabel: string | null;
  platform: MusicChartPlatform;
  chartName: string | null;
  chartType: string | null;
  providerPeriod: string | null;
  observedAt: string | null;
  collectedAt: string;
  status: MusicChartObservationStatus;
  rank: number | null;
  trackTitle: string | null;
  coverage: MusicChartCoverage | null;
  sourceKeys: readonly string[];
  evidenceFile: string | null;
  sourceVersion: string | null;
  failureCode: string | null;
  unsupportedReason: string | null;
}>;

export type MusicChartObservationDraft = Omit<
  MusicChartObservation,
  'contractVersion' | 'observationId'
>;

export type MusicChartObservationValidation = Readonly<{
  valid: boolean;
  issues: readonly string[];
}>;

function nonEmpty(value: string | null): boolean {
  return value !== null && value.trim() !== '';
}

function validInstant(value: string | null): boolean {
  if (value === null) return true;
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  return hasExplicitOffset && !Number.isNaN(Date.parse(value));
}

function validCoverage(coverage: MusicChartCoverage | null): boolean {
  if (coverage === null) return false;
  return Number.isInteger(coverage.startRank)
    && Number.isInteger(coverage.endRank)
    && coverage.startRank > 0
    && coverage.endRank >= coverage.startRank
    && coverage.evidenceIds.length > 0
    && coverage.evidenceIds.every((value) => value.trim() !== '');
}

export function validateMusicChartObservationDraft(
  draft: MusicChartObservationDraft,
): MusicChartObservationValidation {
  const issues: string[] = [];

  if (draft.canonicalArtistId.trim() === '') issues.push('canonical-artist-id-missing');
  if (!validInstant(draft.observedAt)) issues.push('observed-at-invalid');
  if (!validInstant(draft.collectedAt)) issues.push('collected-at-invalid');
  if (draft.collectedAt.trim() === '') issues.push('collected-at-missing');

  if (draft.rank !== null && (!Number.isInteger(draft.rank) || draft.rank <= 0)) {
    issues.push('rank-invalid');
  }

  switch (draft.status) {
    case 'ranked': {
      if (!nonEmpty(draft.providerPeriod)) issues.push('ranked-provider-period-missing');
      if (draft.rank === null) issues.push('ranked-rank-missing');
      if (!nonEmpty(draft.trackTitle)) issues.push('ranked-track-title-missing');
      if (!validCoverage(draft.coverage)) issues.push('ranked-coverage-unproven');
      if (
        draft.rank !== null
        && draft.coverage !== null
        && validCoverage(draft.coverage)
        && (draft.rank < draft.coverage.startRank || draft.rank > draft.coverage.endRank)
      ) {
        issues.push('rank-outside-proven-coverage');
      }
      if (draft.failureCode !== null) issues.push('ranked-failure-code-forbidden');
      if (draft.unsupportedReason !== null) issues.push('ranked-unsupported-reason-forbidden');
      break;
    }
    case 'not-ranked': {
      if (!nonEmpty(draft.providerPeriod)) issues.push('not-ranked-provider-period-missing');
      if (draft.rank !== null) issues.push('not-ranked-rank-forbidden');
      if (draft.trackTitle !== null) issues.push('not-ranked-track-title-forbidden');
      if (!validCoverage(draft.coverage)) issues.push('not-ranked-coverage-unproven');
      if (draft.failureCode !== null) issues.push('not-ranked-failure-code-forbidden');
      if (draft.unsupportedReason !== null) issues.push('not-ranked-unsupported-reason-forbidden');
      break;
    }
    case 'missing': {
      if (draft.rank !== null) issues.push('missing-rank-forbidden');
      if (draft.trackTitle !== null) issues.push('missing-track-title-forbidden');
      if (draft.coverage !== null) issues.push('missing-coverage-forbidden');
      if (draft.failureCode !== null) issues.push('missing-failure-code-forbidden');
      if (draft.unsupportedReason !== null) issues.push('missing-unsupported-reason-forbidden');
      break;
    }
    case 'unsupported': {
      if (draft.rank !== null) issues.push('unsupported-rank-forbidden');
      if (draft.trackTitle !== null) issues.push('unsupported-track-title-forbidden');
      if (draft.coverage !== null) issues.push('unsupported-coverage-forbidden');
      if (draft.failureCode !== null) issues.push('unsupported-failure-code-forbidden');
      if (!nonEmpty(draft.unsupportedReason)) issues.push('unsupported-reason-missing');
      break;
    }
    case 'collection-failed': {
      if (draft.rank !== null) issues.push('collection-failed-rank-forbidden');
      if (draft.trackTitle !== null) issues.push('collection-failed-track-title-forbidden');
      if (draft.coverage !== null) issues.push('collection-failed-coverage-forbidden');
      if (!nonEmpty(draft.failureCode)) issues.push('collection-failed-code-missing');
      if (draft.unsupportedReason !== null) issues.push('collection-failed-unsupported-reason-forbidden');
      break;
    }
  }

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...new Set(issues)].sort()),
  });
}

export function buildMusicChartObservationId(
  draft: MusicChartObservationDraft,
): string {
  return sha256Canonical({
    contractVersion: MUSIC_CHART_OBSERVATION_CONTRACT_VERSION,
    canonicalArtistId: draft.canonicalArtistId,
    platform: draft.platform,
    chartName: draft.chartName,
    chartType: draft.chartType,
    providerPeriod: draft.providerPeriod,
    observedAt: draft.observedAt,
    status: draft.status,
    rank: draft.rank,
    trackTitle: draft.trackTitle,
    coverage: draft.coverage,
    sourceKeys: [...draft.sourceKeys].sort(),
    evidenceFile: draft.evidenceFile,
    sourceVersion: draft.sourceVersion,
    failureCode: draft.failureCode,
    unsupportedReason: draft.unsupportedReason,
  });
}

export function buildMusicChartObservation(
  draft: MusicChartObservationDraft,
): MusicChartObservation {
  const validation = validateMusicChartObservationDraft(draft);
  if (!validation.valid) {
    throw new Error(`music_chart_observation_invalid:${validation.issues.join(',')}`);
  }

  return Object.freeze({
    contractVersion: MUSIC_CHART_OBSERVATION_CONTRACT_VERSION,
    observationId: buildMusicChartObservationId(draft),
    ...draft,
    sourceKeys: Object.freeze([...draft.sourceKeys]),
    coverage: draft.coverage === null
      ? null
      : Object.freeze({
          ...draft.coverage,
          evidenceIds: Object.freeze([...draft.coverage.evidenceIds]),
        }),
  });
}

export type MusicChartCurrentPresenceReadiness = Readonly<{
  state: 'eligible' | 'blocked';
  canonicalArtistId: string;
  expectedPlatforms: readonly MusicChartPlatform[];
  observedPlatforms: readonly MusicChartPlatform[];
  rankedPlatforms: readonly MusicChartPlatform[];
  notRankedPlatforms: readonly MusicChartPlatform[];
  blockers: readonly string[];
}>;

export function evaluateMusicChartCurrentPresenceReadiness(input: Readonly<{
  canonicalArtistId: string;
  expectedPlatforms: readonly MusicChartPlatform[];
  observations: readonly MusicChartObservation[];
}>): MusicChartCurrentPresenceReadiness {
  if (input.canonicalArtistId.trim() === '') {
    throw new Error('music_chart_readiness_canonical_artist_id_missing');
  }

  const expected = [...new Set(input.expectedPlatforms)].sort();
  if (expected.length === 0) {
    throw new Error('music_chart_readiness_expected_platforms_empty');
  }

  const byPlatform = new Map<MusicChartPlatform, MusicChartObservation>();
  const blockers: string[] = [];

  for (const observation of input.observations) {
    if (observation.canonicalArtistId !== input.canonicalArtistId) {
      throw new Error('music_chart_readiness_cross_artist_observation');
    }
    if (!expected.includes(observation.platform)) {
      throw new Error('music_chart_readiness_unexpected_platform');
    }
    if (byPlatform.has(observation.platform)) {
      throw new Error('music_chart_readiness_duplicate_platform_observation');
    }
    byPlatform.set(observation.platform, observation);
  }

  for (const platform of expected) {
    const observation = byPlatform.get(platform);
    if (!observation) {
      blockers.push(`missing-provider-observation:${platform}`);
      continue;
    }

    if (observation.status === 'missing') blockers.push(`missing:${platform}`);
    if (observation.status === 'unsupported') blockers.push(`unsupported:${platform}`);
    if (observation.status === 'collection-failed') blockers.push(`collection-failed:${platform}`);
  }

  const observedPlatforms = [...byPlatform.keys()].sort();
  const rankedPlatforms = [...byPlatform.values()]
    .filter((value) => value.status === 'ranked')
    .map((value) => value.platform)
    .sort();
  const notRankedPlatforms = [...byPlatform.values()]
    .filter((value) => value.status === 'not-ranked')
    .map((value) => value.platform)
    .sort();

  return Object.freeze({
    state: blockers.length === 0 ? 'eligible' : 'blocked',
    canonicalArtistId: input.canonicalArtistId,
    expectedPlatforms: Object.freeze(expected),
    observedPlatforms: Object.freeze(observedPlatforms),
    rankedPlatforms: Object.freeze(rankedPlatforms),
    notRankedPlatforms: Object.freeze(notRankedPlatforms),
    blockers: Object.freeze(blockers.sort()),
  });
}

export function musicChartStatusIsZeroValue(status: MusicChartObservationStatus): false {
  return false;
}
