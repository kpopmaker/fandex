import {
  parseNaverNewsMediaActivityMethodResearchCommand,
  runNaverNewsMediaActivityMethodResearch,
} from './naverNewsMediaActivityMethodResearch';

export const NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_CONTRACT_VERSION =
  'v1_naver_news_media_activity_baseline_readiness_research' as const;

export const NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_KEY =
  'naverNewsMediaActivityBaselineReadinessResearch' as const;

const DIURNAL_CYCLE_SLOT_COUNT = 24;
const FLAGS = Object.freeze([
  '--artist',
  '--through-slot-start',
  '--window-slots',
  '--baseline-slots',
]);

export type NaverNewsMediaActivityBaselineReadinessResearchCommand = Readonly<{
  canonicalArtistId: string;
  throughSlotStart: string;
  candidateWindowSlotCounts: readonly number[];
  candidateBaselineSlotCounts: readonly number[];
}>;

type MethodResearchSummary = Awaited<ReturnType<typeof runNaverNewsMediaActivityMethodResearch>>;

export type NaverNewsMediaActivityBaselineCandidate = Readonly<{
  baselineSlotCount: number;
  status: 'history_available' | 'insufficient_history';
  availableSlotCount: number;
  fullBaselineBlockCount: number;
  productionSufficiencyImplied: false;
}>;

export type NaverNewsMediaActivityWindowReadiness = Readonly<{
  windowSlotCount: number;
  status: 'available' | 'insufficient_history' | 'activity_rate_undefined';
  rollingWindowCount: number;
  nonOverlappingWindowCount: number;
  rollingZeroActivityWindowRate: number | null;
  rollingPopulationStdDev: number | null;
  rollingMeanAbsoluteConsecutiveChange: number | null;
}>;

export type NaverNewsMediaActivityDiurnalReadiness = Readonly<{
  cycleSlotCount: typeof DIURNAL_CYCLE_SLOT_COUNT;
  utcHourCoverageCount: number;
  completeCycleCount: number;
  sameUtcHourReplicationFloor: number;
  sameUtcHourReplicationCeiling: number;
  status: 'full_cycle_unavailable' | 'single_cycle_only' | 'replicated_cycle_history';
}>;

export type NaverNewsMediaActivityBaselineReadinessResearchResult = Readonly<{
  contractVersion: typeof NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_CONTRACT_VERSION;
  researchKey: typeof NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_KEY;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  productMethodologyFrozen: false;
  productionBaselineSufficiencyRuleStatus: 'not_frozen';
  canonicalArtistId: string;
  protocolStart: string;
  throughSlotStart: string;
  sourceMetricKey: MethodResearchSummary['sourceMetricKey'];
  status: 'available' | 'unavailable';
  reason: 'baseline_readiness_research_available' | 'source_method_research_unavailable';
  analysisSlotCount: number;
  diurnalReadiness: NaverNewsMediaActivityDiurnalReadiness;
  windowReadiness: readonly NaverNewsMediaActivityWindowReadiness[];
  baselineCandidates: readonly NaverNewsMediaActivityBaselineCandidate[];
}>;

export type NaverNewsMediaActivityBaselineReadinessResearchDependencies = Readonly<{
  methodResearchRunner?: typeof runNaverNewsMediaActivityMethodResearch;
}>;

function invalid(): never {
  throw new Error('naver_news_media_activity_baseline_readiness_research_argument_invalid');
}

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) return invalid();
  return value;
}

function parsePositiveUniqueCounts(value: string): readonly number[] {
  const parts = value.split(',');
  if (parts.length === 0 || parts.some((part) => part.trim().length === 0)) return invalid();
  const counts = parts.map((part) => Number(part.trim()));
  if (counts.some((count) => !Number.isSafeInteger(count) || count <= 0)) return invalid();
  if (new Set(counts).size !== counts.length) return invalid();
  return Object.freeze([...counts]);
}

export function parseNaverNewsMediaActivityBaselineReadinessResearchCommand(
  argv: readonly string[],
): NaverNewsMediaActivityBaselineReadinessResearchCommand {
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
  const baselineSlots = values.get('--baseline-slots');
  if (!canonicalArtistId || !throughSlotStart || !windowSlots || !baselineSlots) return invalid();

  let methodCommand;
  try {
    methodCommand = parseNaverNewsMediaActivityMethodResearchCommand([
      '--artist', canonicalArtistId,
      '--through-slot-start', throughSlotStart,
      '--window-slots', windowSlots,
    ]);
  } catch {
    return invalid();
  }

  return Object.freeze({
    canonicalArtistId: methodCommand.canonicalArtistId,
    throughSlotStart: methodCommand.throughSlotStart,
    candidateWindowSlotCounts: methodCommand.candidateWindowSlotCounts,
    candidateBaselineSlotCounts: parsePositiveUniqueCounts(baselineSlots),
  });
}

export function evaluateNaverNewsMediaActivityDiurnalReadiness(
  analysisSlotCount: number,
): NaverNewsMediaActivityDiurnalReadiness {
  const completeCycleCount = Math.floor(analysisSlotCount / DIURNAL_CYCLE_SLOT_COUNT);
  const sameUtcHourReplicationFloor = completeCycleCount;
  const sameUtcHourReplicationCeiling = analysisSlotCount === 0
    ? 0
    : Math.ceil(analysisSlotCount / DIURNAL_CYCLE_SLOT_COUNT);

  return Object.freeze({
    cycleSlotCount: DIURNAL_CYCLE_SLOT_COUNT,
    utcHourCoverageCount: Math.min(analysisSlotCount, DIURNAL_CYCLE_SLOT_COUNT),
    completeCycleCount,
    sameUtcHourReplicationFloor,
    sameUtcHourReplicationCeiling,
    status: analysisSlotCount < DIURNAL_CYCLE_SLOT_COUNT
      ? 'full_cycle_unavailable' as const
      : analysisSlotCount < DIURNAL_CYCLE_SLOT_COUNT * 2
        ? 'single_cycle_only' as const
        : 'replicated_cycle_history' as const,
  });
}

export function evaluateNaverNewsMediaActivityBaselineReadinessResearch(input: Readonly<{
  methodResearch: MethodResearchSummary;
  candidateBaselineSlotCounts: readonly number[];
}>): NaverNewsMediaActivityBaselineReadinessResearchResult {
  const baselineCounts = [...input.candidateBaselineSlotCounts];
  if (baselineCounts.length === 0
      || baselineCounts.some((count) => !Number.isSafeInteger(count) || count <= 0)
      || new Set(baselineCounts).size !== baselineCounts.length) {
    throw new Error('naver_news_media_activity_baseline_readiness_research_input_invalid');
  }

  const analysisSlotCount = input.methodResearch.analysisSlotCount;
  const available = input.methodResearch.status === 'available';

  return Object.freeze({
    contractVersion: NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_CONTRACT_VERSION,
    researchKey: NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_KEY,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
    productMethodologyFrozen: false as const,
    productionBaselineSufficiencyRuleStatus: 'not_frozen' as const,
    canonicalArtistId: input.methodResearch.canonicalArtistId,
    protocolStart: input.methodResearch.protocolStart,
    throughSlotStart: input.methodResearch.throughSlotStart,
    sourceMetricKey: input.methodResearch.sourceMetricKey,
    status: available ? 'available' as const : 'unavailable' as const,
    reason: available
      ? 'baseline_readiness_research_available' as const
      : 'source_method_research_unavailable' as const,
    analysisSlotCount,
    diurnalReadiness: evaluateNaverNewsMediaActivityDiurnalReadiness(analysisSlotCount),
    windowReadiness: Object.freeze(input.methodResearch.candidates.map((candidate) => Object.freeze({
      windowSlotCount: candidate.windowSlotCount,
      status: candidate.status,
      rollingWindowCount: candidate.windowCount,
      nonOverlappingWindowCount: Math.floor(analysisSlotCount / candidate.windowSlotCount),
      rollingZeroActivityWindowRate: candidate.zeroActivityWindowRate,
      rollingPopulationStdDev: candidate.statistics.populationStdDev,
      rollingMeanAbsoluteConsecutiveChange: candidate.statistics.meanAbsoluteConsecutiveChange,
    }))),
    baselineCandidates: Object.freeze(baselineCounts.map((baselineSlotCount) => Object.freeze({
      baselineSlotCount,
      status: analysisSlotCount >= baselineSlotCount
        ? 'history_available' as const
        : 'insufficient_history' as const,
      availableSlotCount: analysisSlotCount,
      fullBaselineBlockCount: Math.floor(analysisSlotCount / baselineSlotCount),
      productionSufficiencyImplied: false as const,
    }))),
  });
}

export async function runNaverNewsMediaActivityBaselineReadinessResearch(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsMediaActivityBaselineReadinessResearchDependencies = {},
) {
  const command = parseNaverNewsMediaActivityBaselineReadinessResearchCommand(argv);
  const methodResearch = await (dependencies.methodResearchRunner
    ?? runNaverNewsMediaActivityMethodResearch)([
    '--artist', command.canonicalArtistId,
    '--through-slot-start', command.throughSlotStart,
    '--window-slots', command.candidateWindowSlotCounts.join(','),
  ], environment);

  return evaluateNaverNewsMediaActivityBaselineReadinessResearch({
    methodResearch,
    candidateBaselineSlotCounts: command.candidateBaselineSlotCounts,
  });
}
