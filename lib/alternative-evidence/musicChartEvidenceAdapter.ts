import {
  buildMusicChartObservation,
  type MusicChartCoverage,
  type MusicChartObservation,
  type MusicChartObservationDraft,
  type MusicChartPlatform,
} from './musicChartObservation';

export const MUSIC_CHART_EVIDENCE_ADAPTER_VERSION = 'music-chart-evidence-adapter-v1' as const;

type UnknownRecord = Readonly<Record<string, unknown>>;

export type MusicChartCanonicalBinding = Readonly<{
  canonicalArtistId: string;
  artist: string;
}>;

export type MusicChartCoverageAssessment = Readonly<{
  platform: MusicChartPlatform;
  state: 'complete' | 'missing' | 'collection-failed';
  coverage: MusicChartCoverage | null;
  failureCode: string | null;
  evidenceIds: readonly string[];
}>;

export type MusicChartEvidenceAdapterResult = Readonly<{
  version: typeof MUSIC_CHART_EVIDENCE_ADAPTER_VERSION;
  snapshotDate: string;
  observations: readonly MusicChartObservation[];
  coverage: readonly MusicChartCoverageAssessment[];
  blockers: readonly string[];
  scoreFieldsPresent: false;
  featureBridgeEligible: false;
}>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function finitePositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function stringArrayFromPipe(value: unknown): readonly string[] {
  const text = nonEmpty(value);
  if (!text) return Object.freeze([]);
  return Object.freeze(text.split('|').map(part => part.trim()).filter(Boolean));
}

function fetchLogBySource(payload: UnknownRecord, sourceKey: string): UnknownRecord | null {
  const logs = Array.isArray(payload.fetchLogs) ? payload.fetchLogs : [];
  const match = logs.find(item => isRecord(item) && item.sourceKey === sourceKey);
  return isRecord(match) ? match : null;
}

function sourceCount(payload: UnknownRecord, sourceKey: string): number | null {
  if (!isRecord(payload.sourceCounts)) return null;
  return finitePositiveInteger(payload.sourceCounts[sourceKey]);
}

function successfulHttp200(log: UnknownRecord | null): boolean {
  if (!log) return false;
  return Number(log.statusCode) === 200;
}

function coverage(
  startRank: number,
  endRank: number,
  evidenceIds: readonly string[],
): MusicChartCoverage {
  return Object.freeze({
    startRank,
    endRank,
    evidenceIds: Object.freeze([...evidenceIds]),
  });
}

export function assessMusicChartCoverage(input: Readonly<{
  melonGeniePayload: unknown;
  bugsPayload: unknown;
  snapshotDate: string;
}>): readonly MusicChartCoverageAssessment[] {
  const mg = isRecord(input.melonGeniePayload) ? input.melonGeniePayload : null;
  const bugs = isRecord(input.bugsPayload) ? input.bugsPayload : null;

  const assessments: MusicChartCoverageAssessment[] = [];

  if (!mg) {
    assessments.push(Object.freeze({
      platform: 'melon',
      state: 'missing',
      coverage: null,
      failureCode: null,
      evidenceIds: Object.freeze([]),
    }));
    assessments.push(Object.freeze({
      platform: 'genie',
      state: 'missing',
      coverage: null,
      failureCode: null,
      evidenceIds: Object.freeze([]),
    }));
  } else {
    const melonLog = fetchLogBySource(mg, 'melon_top100');
    const melonCount = sourceCount(mg, 'melon_top100');
    const melonEvidence = Object.freeze([
      'music_chart_artist_candidates_v2_raw_latest.json#melon_top100',
    ]);

    if (melonLog && !successfulHttp200(melonLog)) {
      assessments.push(Object.freeze({
        platform: 'melon',
        state: 'collection-failed',
        coverage: null,
        failureCode: `http-${String(melonLog.statusCode ?? 'error')}`,
        evidenceIds: melonEvidence,
      }));
    } else if (successfulHttp200(melonLog) && melonCount === 100) {
      assessments.push(Object.freeze({
        platform: 'melon',
        state: 'complete',
        coverage: coverage(1, 100, melonEvidence),
        failureCode: null,
        evidenceIds: melonEvidence,
      }));
    } else {
      assessments.push(Object.freeze({
        platform: 'melon',
        state: 'missing',
        coverage: null,
        failureCode: null,
        evidenceIds: melonEvidence,
      }));
    }

    const genieKeys = [
      'genie_daily_page_1',
      'genie_daily_page_2',
      'genie_daily_page_3',
      'genie_daily_page_4',
    ] as const;
    const genieLogs = genieKeys.map(key => fetchLogBySource(mg, key));
    const genieCounts = genieKeys.map(key => sourceCount(mg, key));
    const genieEvidence = Object.freeze(
      genieKeys.map(key => `music_chart_artist_candidates_v2_raw_latest.json#${key}`),
    );

    if (genieLogs.some(log => log && !successfulHttp200(log))) {
      const failed = genieLogs.find(log => log && !successfulHttp200(log));
      assessments.push(Object.freeze({
        platform: 'genie',
        state: 'collection-failed',
        coverage: null,
        failureCode: `http-${String(failed?.statusCode ?? 'error')}`,
        evidenceIds: genieEvidence,
      }));
    } else if (
      genieLogs.every(successfulHttp200)
      && genieCounts.every(count => count === 50)
    ) {
      assessments.push(Object.freeze({
        platform: 'genie',
        state: 'complete',
        coverage: coverage(1, 200, genieEvidence),
        failureCode: null,
        evidenceIds: genieEvidence,
      }));
    } else {
      assessments.push(Object.freeze({
        platform: 'genie',
        state: 'missing',
        coverage: null,
        failureCode: null,
        evidenceIds: genieEvidence,
      }));
    }
  }

  const bugsEvidence = Object.freeze([
    'music_chart_bugs_all_targets_v1_latest.json#parsedChartRowCount',
  ]);

  if (!bugs) {
    assessments.push(Object.freeze({
      platform: 'bugs',
      state: 'missing',
      coverage: null,
      failureCode: null,
      evidenceIds: Object.freeze([]),
    }));
  } else {
    const chartDate = nonEmpty(bugs.chartDate);
    const rowCount = finitePositiveInteger(bugs.parsedChartRowCount);
    const source = nonEmpty(bugs.source);

    if (source !== 'bugs') {
      assessments.push(Object.freeze({
        platform: 'bugs',
        state: 'collection-failed',
        coverage: null,
        failureCode: 'bugs-source-invalid',
        evidenceIds: bugsEvidence,
      }));
    } else if (chartDate !== input.snapshotDate) {
      assessments.push(Object.freeze({
        platform: 'bugs',
        state: 'missing',
        coverage: null,
        failureCode: null,
        evidenceIds: bugsEvidence,
      }));
    } else if (rowCount === 100) {
      assessments.push(Object.freeze({
        platform: 'bugs',
        state: 'complete',
        coverage: coverage(1, 100, bugsEvidence),
        failureCode: null,
        evidenceIds: bugsEvidence,
      }));
    } else if (rowCount === null) {
      assessments.push(Object.freeze({
        platform: 'bugs',
        state: 'collection-failed',
        coverage: null,
        failureCode: 'bugs-chart-parse-failed',
        evidenceIds: bugsEvidence,
      }));
    } else {
      assessments.push(Object.freeze({
        platform: 'bugs',
        state: 'missing',
        coverage: null,
        failureCode: null,
        evidenceIds: bugsEvidence,
      }));
    }
  }

  return Object.freeze(assessments);
}

function normalizedCheckStatus(value: unknown): 'RANKED' | 'NOT_RANKED' | null {
  return value === 'RANKED' || value === 'NOT_RANKED' ? value : null;
}

function checkRows(payload: unknown): readonly UnknownRecord[] {
  if (!isRecord(payload) || !Array.isArray(payload.rows)) return Object.freeze([]);
  return Object.freeze(payload.rows.filter(isRecord));
}

function normalizeCollectorInstant(value: unknown): string | null {
  const text = nonEmpty(value);
  if (!text) return null;
  if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)) return text;

  // FANDEX Cloud v10 executes this collector with TZ=Asia/Seoul.
  // Legacy datetime.now() outputs therefore represent KST even though
  // the serialized value omitted the UTC offset.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)) {
    return `${text}+09:00`;
  }

  throw new Error(`music_chart_collector_timestamp_invalid:${text}`);
}

function checkedAt(row: UnknownRecord): string | null {
  return normalizeCollectorInstant(row.checkedAt);
}

function platformOf(row: UnknownRecord): MusicChartPlatform | null {
  const value = nonEmpty(row.platform)?.toLowerCase();
  return value === 'melon' || value === 'genie' || value === 'bugs'
    ? value
    : null;
}

function rowKey(artist: string, platform: MusicChartPlatform): string {
  return `${artist}\u0000${platform}`;
}

function observationPeriod(platform: MusicChartPlatform, snapshotDate: string): string {
  return platform === 'bugs'
    ? `realtime-check-date:${snapshotDate}`
    : `daily-check-date:${snapshotDate}`;
}

export function adaptMusicChartEvidence(input: Readonly<{
  checkHistoryPayload: unknown;
  melonGeniePayload: unknown;
  bugsPayload: unknown;
  bindings: readonly MusicChartCanonicalBinding[];
}>): MusicChartEvidenceAdapterResult {
  if (!isRecord(input.checkHistoryPayload)) {
    throw new Error('music_chart_check_history_payload_missing');
  }

  const snapshotDate = nonEmpty(input.checkHistoryPayload.latestCheckDate);
  if (!snapshotDate) throw new Error('music_chart_check_history_latest_date_missing');

  const bindingsByArtist = new Map<string, MusicChartCanonicalBinding>();
  const canonicalIds = new Set<string>();
  for (const binding of input.bindings) {
    if (!binding.artist.trim() || !binding.canonicalArtistId.trim()) {
      throw new Error('music_chart_binding_invalid');
    }
    if (bindingsByArtist.has(binding.artist) || canonicalIds.has(binding.canonicalArtistId)) {
      throw new Error('music_chart_binding_duplicate');
    }
    bindingsByArtist.set(binding.artist, binding);
    canonicalIds.add(binding.canonicalArtistId);
  }
  if (bindingsByArtist.size === 0) throw new Error('music_chart_bindings_empty');

  const coverageAssessments = assessMusicChartCoverage({
    melonGeniePayload: input.melonGeniePayload,
    bugsPayload: input.bugsPayload,
    snapshotDate,
  });
  const coverageByPlatform = new Map(
    coverageAssessments.map(item => [item.platform, item]),
  );

  const rows = checkRows(input.checkHistoryPayload);
  const rowsByKey = new Map<string, UnknownRecord>();
  for (const row of rows) {
    const artist = nonEmpty(row.artist);
    const platform = platformOf(row);
    const checkDate = nonEmpty(row.checkDate);
    if (!artist || !platform || checkDate !== snapshotDate) continue;
    const key = rowKey(artist, platform);
    if (rowsByKey.has(key)) throw new Error('music_chart_check_history_duplicate_row');
    rowsByKey.set(key, row);
  }

  const observations: MusicChartObservation[] = [];
  const blockers: string[] = [];
  const expectedPlatforms: readonly MusicChartPlatform[] = ['melon', 'genie', 'bugs'];

  for (const binding of input.bindings) {
    for (const platform of expectedPlatforms) {
      const evidence = coverageByPlatform.get(platform);
      if (!evidence) throw new Error('music_chart_coverage_assessment_missing');

      const row = rowsByKey.get(rowKey(binding.artist, platform));
      const collectedAt = row ? checkedAt(row) : null;
      const baseCollectedAt = collectedAt
        ?? normalizeCollectorInstant(input.checkHistoryPayload.createdAt)
        ?? `${snapshotDate}T00:00:00+09:00`;

      const base: Omit<MusicChartObservationDraft, 'status' | 'rank' | 'trackTitle' | 'coverage' | 'failureCode' | 'unsupportedReason'> = {
        canonicalArtistId: binding.canonicalArtistId,
        artistLabel: binding.artist,
        platform,
        chartName: platform === 'melon'
          ? 'TOP100'
          : platform === 'genie'
            ? 'Top 200 Daily'
            : 'Bugs Realtime',
        chartType: platform === 'bugs' ? 'realtime' : 'daily',
        providerPeriod: observationPeriod(platform, snapshotDate),
        observedAt: null,
        collectedAt: baseCollectedAt,
        sourceKeys: row ? stringArrayFromPipe(row.sourceKeys) : Object.freeze([]),
        evidenceFile: row ? nonEmpty(row.evidenceFile) : null,
        sourceVersion: row ? nonEmpty(row.sourceVersion) : null,
      };

      if (evidence.state === 'collection-failed') {
        observations.push(buildMusicChartObservation({
          ...base,
          status: 'collection-failed',
          rank: null,
          trackTitle: null,
          coverage: null,
          failureCode: evidence.failureCode ?? 'collection-failed',
          unsupportedReason: null,
        }));
        blockers.push(`collection-failed:${binding.canonicalArtistId}:${platform}`);
        continue;
      }

      if (evidence.state !== 'complete' || !evidence.coverage) {
        observations.push(buildMusicChartObservation({
          ...base,
          status: 'missing',
          rank: null,
          trackTitle: null,
          coverage: null,
          failureCode: null,
          unsupportedReason: null,
        }));
        blockers.push(`coverage-missing:${binding.canonicalArtistId}:${platform}`);
        continue;
      }

      if (!row) {
        observations.push(buildMusicChartObservation({
          ...base,
          status: 'missing',
          rank: null,
          trackTitle: null,
          coverage: null,
          failureCode: null,
          unsupportedReason: null,
        }));
        blockers.push(`check-history-missing:${binding.canonicalArtistId}:${platform}`);
        continue;
      }

      const status = normalizedCheckStatus(row.status);
      if (status === 'RANKED') {
        const rank = finitePositiveInteger(row.bestRank);
        const trackTitle = nonEmpty(row.bestTrackTitle);
        if (!rank || !trackTitle) {
          observations.push(buildMusicChartObservation({
            ...base,
            status: 'missing',
            rank: null,
            trackTitle: null,
            coverage: null,
            failureCode: null,
            unsupportedReason: null,
          }));
          blockers.push(`ranked-row-invalid:${binding.canonicalArtistId}:${platform}`);
          continue;
        }

        observations.push(buildMusicChartObservation({
          ...base,
          status: 'ranked',
          rank,
          trackTitle,
          coverage: evidence.coverage,
          failureCode: null,
          unsupportedReason: null,
        }));
        continue;
      }

      if (status === 'NOT_RANKED') {
        observations.push(buildMusicChartObservation({
          ...base,
          status: 'not-ranked',
          rank: null,
          trackTitle: null,
          coverage: evidence.coverage,
          failureCode: null,
          unsupportedReason: null,
        }));
        continue;
      }

      observations.push(buildMusicChartObservation({
        ...base,
        status: 'missing',
        rank: null,
        trackTitle: null,
        coverage: null,
        failureCode: null,
        unsupportedReason: null,
      }));
      blockers.push(`check-history-status-invalid:${binding.canonicalArtistId}:${platform}`);
    }
  }

  return Object.freeze({
    version: MUSIC_CHART_EVIDENCE_ADAPTER_VERSION,
    snapshotDate,
    observations: Object.freeze(observations),
    coverage: coverageAssessments,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    scoreFieldsPresent: false,
    featureBridgeEligible: false,
  });
}
