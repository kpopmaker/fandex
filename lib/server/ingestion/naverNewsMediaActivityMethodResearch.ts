import { Pool } from 'pg';

import { requireRuntimeDatabaseUrl } from '../persistence/contracts';
import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
  type NaverNewsCanonicalJobEvidenceReadRepository,
} from './naverNewsCanonicalJobEvidence';
import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import { getOfficialNaverNewsShadowEpoch } from './naverNewsShadowEpoch';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
  type NaverNewsShadowFirstSeenSeriesResult,
} from './naverNewsShadowFirstSeenSeries';
import {
  NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_METRIC_KEY,
  type NaverNewsShadowFirstSeenActivitySlot,
} from './naverNewsShadowFirstSeenActivity';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from './naverNewsScheduler';
import type { NaverNewsIngestionPool } from './naverNewsRepository';

export const NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_CONTRACT_VERSION =
  'v1_naver_news_media_activity_method_research' as const;

export const NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_KEY =
  'naverNewsMediaActivityMethodResearch' as const;

export type NaverNewsMediaActivityResearchWindow = Readonly<{
  windowSlotCount: number;
  startSlotStart: string;
  endSlotStart: string;
  firstSeenObservationCount: number;
  observedObservationCount: number;
  observedActivityRate: number | null;
}>;

export type NaverNewsMediaActivityResearchStatistics = Readonly<{
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  populationStdDev: number | null;
  meanAbsoluteConsecutiveChange: number | null;
}>;

export type NaverNewsMediaActivityResearchPriorComparison = Readonly<{
  priorDefinedWindowCount: number;
  priorLessThanLatestCount: number;
  priorEqualToLatestCount: number;
  priorGreaterThanLatestCount: number;
}>;

export type NaverNewsMediaActivityResearchCandidate = Readonly<{
  windowSlotCount: number;
  status: 'available' | 'insufficient_history' | 'activity_rate_undefined';
  rollingWindowSemantics: 'overlapping';
  windowCount: number;
  definedActivityWindowCount: number;
  undefinedActivityWindowCount: number;
  zeroActivityWindowCount: number;
  zeroActivityWindowRate: number | null;
  statistics: NaverNewsMediaActivityResearchStatistics;
  latestWindow: NaverNewsMediaActivityResearchWindow | null;
  latestVsPrior: NaverNewsMediaActivityResearchPriorComparison | null;
  windows: readonly NaverNewsMediaActivityResearchWindow[];
}>;

export type NaverNewsMediaActivityMethodResearchResult = Readonly<{
  contractVersion: typeof NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_CONTRACT_VERSION;
  researchKey: typeof NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_KEY;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  sourceMetricKey: typeof NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_METRIC_KEY;
  canonicalArtistId: string;
  protocolStart: string;
  throughSlotStart: string;
  baselineScope: 'same_artist_same_official_shadow_epoch';
  bootstrapExcluded: true;
  missingOrGapAsZeroAllowed: false;
  status: 'available' | 'unavailable';
  reason: 'method_research_available' | 'source_series_unavailable';
  analysisSlotCount: number;
  candidateWindowSlotCounts: readonly number[];
  candidates: readonly NaverNewsMediaActivityResearchCandidate[];
}>;

const FLAGS = Object.freeze(['--artist', '--through-slot-start', '--window-slots']);
const ARTIST_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export type NaverNewsMediaActivityMethodResearchCommand = Readonly<{
  canonicalArtistId: string;
  throughSlotStart: string;
  candidateWindowSlotCounts: readonly number[];
}>;

export type NaverNewsMediaActivityMethodResearchPoolConfig = Readonly<{
  connectionString: string;
  max: 1;
  connectionTimeoutMillis: 5_000;
  query_timeout: 15_000;
  statement_timeout: 15_000;
  ssl: Readonly<{ rejectUnauthorized: true }>;
}>;

type ResearchPool = NaverNewsIngestionPool & { end(): Promise<void> };

type OfficialSeriesAssembler = (
  input: Readonly<{ canonicalArtistId: string; throughSlotStart: string }>,
  repository: NaverNewsCanonicalJobEvidenceReadRepository,
) => Promise<NaverNewsShadowFirstSeenSeriesResult>;

export type NaverNewsMediaActivityMethodResearchDependencies = Readonly<{
  poolFactory?: (config: NaverNewsMediaActivityMethodResearchPoolConfig) => ResearchPool;
  repositoryFactory?: (pool: NaverNewsIngestionPool) => NaverNewsCanonicalJobEvidenceReadRepository;
  assembleOfficialSeries?: OfficialSeriesAssembler;
}>;

function invalid(): never {
  throw new Error('naver_news_media_activity_method_research_argument_invalid');
}

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) return invalid();
  return value;
}

function exactIso(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) return invalid();
  return timestamp;
}

function parseWindowSlotCounts(value: string): readonly number[] {
  const parts = value.split(',');
  if (parts.length === 0 || parts.some((part) => part.trim().length === 0)) return invalid();

  const counts = parts.map((part) => Number(part.trim()));
  if (counts.some((count) => !Number.isSafeInteger(count) || count <= 0)) return invalid();
  if (new Set(counts).size !== counts.length) return invalid();

  return Object.freeze([...counts]);
}

export function parseNaverNewsMediaActivityMethodResearchCommand(
  argv: readonly string[],
): NaverNewsMediaActivityMethodResearchCommand {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!FLAGS.includes(flag) || values.has(flag)) return invalid();
    values.set(flag, valueAfter(argv, index));
    index += 1;
  }

  const canonicalArtistId = values.get('--artist');
  const throughSlotStart = values.get('--through-slot-start');
  const windowSlots = values.get('--window-slots');
  if (!canonicalArtistId || !ARTIST_ID.test(canonicalArtistId)
      || !throughSlotStart || !windowSlots) {
    return invalid();
  }

  exactIso(throughSlotStart);

  let query: string;
  try {
    query = bindCanonicalArtistToNaverNews(canonicalArtistId).query;
    getOfficialNaverNewsShadowEpoch(canonicalArtistId);
  } catch {
    return invalid();
  }

  const plan = buildNaverNewsSchedulerPlan({
    query,
    at: throughSlotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (plan.slotStart !== throughSlotStart) return invalid();

  return Object.freeze({
    canonicalArtistId,
    throughSlotStart,
    candidateWindowSlotCounts: parseWindowSlotCounts(windowSlots),
  });
}

function round(value: number, digits = 12): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function populationStdDev(values: readonly number[]): number | null {
  const average = mean(values);
  if (average === null) return null;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0)
    / values.length;
  return Math.sqrt(variance);
}

function meanAbsoluteConsecutiveChange(
  windows: readonly NaverNewsMediaActivityResearchWindow[],
): number | null {
  const changes: number[] = [];
  for (let index = 1; index < windows.length; index += 1) {
    const previous = windows[index - 1].observedActivityRate;
    const current = windows[index].observedActivityRate;
    if (previous === null || current === null) continue;
    changes.push(Math.abs(current - previous));
  }
  return mean(changes);
}

function frozenStatistics(
  windows: readonly NaverNewsMediaActivityResearchWindow[],
): NaverNewsMediaActivityResearchStatistics {
  const rates = windows
    .map((window) => window.observedActivityRate)
    .filter((value): value is number => value !== null);
  const average = mean(rates);
  const middle = median(rates);
  const deviation = populationStdDev(rates);
  const consecutiveChange = meanAbsoluteConsecutiveChange(windows);

  return Object.freeze({
    min: rates.length === 0 ? null : round(Math.min(...rates)),
    max: rates.length === 0 ? null : round(Math.max(...rates)),
    mean: average === null ? null : round(average),
    median: middle === null ? null : round(middle),
    populationStdDev: deviation === null ? null : round(deviation),
    meanAbsoluteConsecutiveChange:
      consecutiveChange === null ? null : round(consecutiveChange),
  });
}

function validateAnalysisSlots(
  series: NaverNewsShadowFirstSeenSeriesResult,
): readonly NaverNewsShadowFirstSeenActivitySlot[] | null {
  if (series.lifecycle !== 'shadow' || series.directProductContributionEligible !== false
      || series.status !== 'available' || !series.activity
      || series.activity.status !== 'available'
      || series.activity.lifecycle !== 'shadow'
      || series.activity.directProductContributionEligible !== false
      || series.activity.canonicalArtistId !== series.canonicalArtistId
      || series.activity.protocolStart !== series.protocolStart) {
    return null;
  }

  const slots = series.activity.slots;
  if (slots.length < 2 || !slots[0].bootstrap || slots[0].firstSeenObservationCount !== null) {
    throw new Error('naver_news_media_activity_method_research_series_invalid');
  }

  const analysisSlots = slots.slice(1);
  for (const slot of analysisSlots) {
    const firstSeen = slot.firstSeenObservationCount;
    if (slot.bootstrap || firstSeen === null || !Number.isSafeInteger(firstSeen) || firstSeen < 0
        || !Number.isSafeInteger(slot.observedObservationCount)
        || slot.observedObservationCount < 0 || firstSeen > slot.observedObservationCount) {
      throw new Error('naver_news_media_activity_method_research_series_invalid');
    }
  }

  return Object.freeze([...analysisSlots]);
}

function buildResearchWindows(
  slots: readonly NaverNewsShadowFirstSeenActivitySlot[],
  windowSlotCount: number,
): readonly NaverNewsMediaActivityResearchWindow[] {
  if (windowSlotCount > slots.length) return Object.freeze([]);
  const windows: NaverNewsMediaActivityResearchWindow[] = [];

  for (let endIndex = windowSlotCount - 1; endIndex < slots.length; endIndex += 1) {
    const startIndex = endIndex - windowSlotCount + 1;
    const selected = slots.slice(startIndex, endIndex + 1);
    const firstSeenObservationCount = selected.reduce(
      (sum, slot) => sum + (slot.firstSeenObservationCount ?? 0),
      0,
    );
    const observedObservationCount = selected.reduce(
      (sum, slot) => sum + slot.observedObservationCount,
      0,
    );
    const observedActivityRate = observedObservationCount === 0
      ? null
      : round(firstSeenObservationCount / observedObservationCount);

    windows.push(Object.freeze({
      windowSlotCount,
      startSlotStart: selected[0].slotStart,
      endSlotStart: selected[selected.length - 1].slotStart,
      firstSeenObservationCount,
      observedObservationCount,
      observedActivityRate,
    }));
  }

  return Object.freeze(windows);
}

function compareLatestToPrior(
  windows: readonly NaverNewsMediaActivityResearchWindow[],
): NaverNewsMediaActivityResearchPriorComparison | null {
  if (windows.length < 2) return null;
  const latestRate = windows[windows.length - 1].observedActivityRate;
  if (latestRate === null) return null;

  const priorRates = windows
    .slice(0, -1)
    .map((window) => window.observedActivityRate)
    .filter((value): value is number => value !== null);
  if (priorRates.length === 0) return null;

  return Object.freeze({
    priorDefinedWindowCount: priorRates.length,
    priorLessThanLatestCount: priorRates.filter((value) => value < latestRate).length,
    priorEqualToLatestCount: priorRates.filter((value) => value === latestRate).length,
    priorGreaterThanLatestCount: priorRates.filter((value) => value > latestRate).length,
  });
}

function evaluateCandidate(
  slots: readonly NaverNewsShadowFirstSeenActivitySlot[],
  windowSlotCount: number,
): NaverNewsMediaActivityResearchCandidate {
  const windows = buildResearchWindows(slots, windowSlotCount);
  const defined = windows.filter((window) => window.observedActivityRate !== null);
  const undefinedCount = windows.length - defined.length;
  const zeroCount = defined.filter((window) => window.firstSeenObservationCount === 0).length;
  const status = windows.length === 0
    ? 'insufficient_history' as const
    : defined.length === 0
      ? 'activity_rate_undefined' as const
      : 'available' as const;

  return Object.freeze({
    windowSlotCount,
    status,
    rollingWindowSemantics: 'overlapping' as const,
    windowCount: windows.length,
    definedActivityWindowCount: defined.length,
    undefinedActivityWindowCount: undefinedCount,
    zeroActivityWindowCount: zeroCount,
    zeroActivityWindowRate: defined.length === 0 ? null : round(zeroCount / defined.length),
    statistics: frozenStatistics(windows),
    latestWindow: windows.length === 0 ? null : windows[windows.length - 1],
    latestVsPrior: compareLatestToPrior(windows),
    windows,
  });
}

export function evaluateNaverNewsMediaActivityMethodResearch(input: Readonly<{
  series: NaverNewsShadowFirstSeenSeriesResult;
  candidateWindowSlotCounts: readonly number[];
}>): NaverNewsMediaActivityMethodResearchResult {
  const candidateWindowSlotCounts = [...input.candidateWindowSlotCounts];
  if (candidateWindowSlotCounts.length === 0
      || candidateWindowSlotCounts.some((count) => !Number.isSafeInteger(count) || count <= 0)
      || new Set(candidateWindowSlotCounts).size !== candidateWindowSlotCounts.length) {
    throw new Error('naver_news_media_activity_method_research_input_invalid');
  }

  const analysisSlots = validateAnalysisSlots(input.series);
  const base = {
    contractVersion: NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_CONTRACT_VERSION,
    researchKey: NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_KEY,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
    sourceMetricKey: NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_METRIC_KEY,
    canonicalArtistId: input.series.canonicalArtistId,
    protocolStart: input.series.protocolStart,
    throughSlotStart: input.series.throughSlotStart,
    baselineScope: 'same_artist_same_official_shadow_epoch' as const,
    bootstrapExcluded: true as const,
    missingOrGapAsZeroAllowed: false as const,
    candidateWindowSlotCounts: Object.freeze(candidateWindowSlotCounts),
  };

  if (analysisSlots === null) {
    return Object.freeze({
      ...base,
      status: 'unavailable' as const,
      reason: 'source_series_unavailable' as const,
      analysisSlotCount: 0,
      candidates: Object.freeze([]),
    });
  }

  return Object.freeze({
    ...base,
    status: 'available' as const,
    reason: 'method_research_available' as const,
    analysisSlotCount: analysisSlots.length,
    candidates: Object.freeze(
      candidateWindowSlotCounts.map((count) => evaluateCandidate(analysisSlots, count)),
    ),
  });
}

function defaultPool(config: NaverNewsMediaActivityMethodResearchPoolConfig): ResearchPool {
  return new Pool(config) as unknown as ResearchPool;
}

export function summarizeNaverNewsMediaActivityMethodResearch(
  result: NaverNewsMediaActivityMethodResearchResult,
) {
  return Object.freeze({
    contractVersion: result.contractVersion,
    researchKey: result.researchKey,
    lifecycle: result.lifecycle,
    directProductContributionEligible: result.directProductContributionEligible,
    productScorePublished: result.productScorePublished,
    sourceMetricKey: result.sourceMetricKey,
    canonicalArtistId: result.canonicalArtistId,
    protocolStart: result.protocolStart,
    throughSlotStart: result.throughSlotStart,
    baselineScope: result.baselineScope,
    bootstrapExcluded: result.bootstrapExcluded,
    missingOrGapAsZeroAllowed: result.missingOrGapAsZeroAllowed,
    status: result.status,
    reason: result.reason,
    analysisSlotCount: result.analysisSlotCount,
    candidateWindowSlotCounts: result.candidateWindowSlotCounts,
    candidates: Object.freeze(result.candidates.map((candidate) => Object.freeze({
      windowSlotCount: candidate.windowSlotCount,
      status: candidate.status,
      rollingWindowSemantics: candidate.rollingWindowSemantics,
      windowCount: candidate.windowCount,
      definedActivityWindowCount: candidate.definedActivityWindowCount,
      undefinedActivityWindowCount: candidate.undefinedActivityWindowCount,
      zeroActivityWindowCount: candidate.zeroActivityWindowCount,
      zeroActivityWindowRate: candidate.zeroActivityWindowRate,
      statistics: candidate.statistics,
      latestWindow: candidate.latestWindow,
      latestVsPrior: candidate.latestVsPrior,
    }))),
  });
}

export async function runNaverNewsMediaActivityMethodResearch(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsMediaActivityMethodResearchDependencies = {},
) {
  const command = parseNaverNewsMediaActivityMethodResearchCommand(argv);
  let pool: ResearchPool | null = null;
  let result: ReturnType<typeof summarizeNaverNewsMediaActivityMethodResearch> | null = null;
  let failed = false;

  try {
    const connectionString = requireRuntimeDatabaseUrl(environment);
    const activePool = (dependencies.poolFactory ?? defaultPool)({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      statement_timeout: 15_000,
      ssl: { rejectUnauthorized: true },
    });
    pool = activePool;
    const repository = (dependencies.repositoryFactory
      ?? createPostgresNaverNewsCanonicalJobEvidenceReadRepository)(activePool);
    const series = await (dependencies.assembleOfficialSeries
      ?? assembleOfficialNaverNewsShadowFirstSeenSeries)({
      canonicalArtistId: command.canonicalArtistId,
      throughSlotStart: command.throughSlotStart,
    }, repository);
    result = summarizeNaverNewsMediaActivityMethodResearch(
      evaluateNaverNewsMediaActivityMethodResearch({
        series,
        candidateWindowSlotCounts: command.candidateWindowSlotCounts,
      }),
    );
  } catch {
    failed = true;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch {
        failed = true;
      }
    }
  }

  if (failed || result === null) {
    throw new Error('naver_news_media_activity_method_research_failed');
  }
  return result;
}
