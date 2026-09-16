import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import {
  assembleNaverNewsCanonicalJobEvidence,
  type NaverNewsCanonicalJobEvidenceReadRepository,
  type NaverNewsCanonicalJobStoredEvidence,
} from './naverNewsCanonicalJobEvidence';
import { buildNaverNewsJobIdentity, canonicalJson } from './naverNewsContracts';
import { getOfficialNaverNewsShadowEpoch } from './naverNewsShadowEpoch';
import {
  evaluateNaverNewsShadowFirstSeenActivity,
  type NaverNewsShadowFirstSeenActivityResult,
  type NaverNewsShadowFirstSeenActivitySnapshot,
} from './naverNewsShadowFirstSeenActivity';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  NAVER_NEWS_SCHEDULER_VERSION,
} from './naverNewsScheduler';

export const NAVER_NEWS_SHADOW_FIRST_SEEN_SERIES_CONTRACT_VERSION =
  'v1_naver_news_shadow_first_seen_series' as const;

export type NaverNewsShadowFirstSeenExpectedSlot = Readonly<{
  slotStart: string;
  jobId: string;
}>;

export type NaverNewsShadowFirstSeenSeriesResult = Readonly<{
  contractVersion: typeof NAVER_NEWS_SHADOW_FIRST_SEEN_SERIES_CONTRACT_VERSION;
  lifecycle: 'shadow';
  directProductContributionEligible: false;
  canonicalArtistId: string;
  schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
  protocolStart: string;
  throughSlotStart: string;
  expectedSlots: readonly NaverNewsShadowFirstSeenExpectedSlot[];
  snapshots: readonly NaverNewsShadowFirstSeenActivitySnapshot[];
  status: 'available' | 'bootstrap' | 'unavailable';
  reason: NaverNewsShadowFirstSeenActivityResult['reason'] | 'expected_job_missing';
  missingSlotStart: string | null;
  missingJobId: string | null;
  activity: NaverNewsShadowFirstSeenActivityResult | null;
}>;

const CADENCE_MS = NAVER_NEWS_SCHEDULER_CADENCE_MINUTES * 60_000;

function canonicalSlotStart(query: string, value: string, errorCode: string): number {
  if (typeof value !== 'string') throw new Error(errorCode);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error(errorCode);
  }
  const plan = buildNaverNewsSchedulerPlan({
    query,
    at: value,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (plan.slotStart !== value) throw new Error(errorCode);
  return timestamp;
}

function oneJobRepository(
  expectedJobId: string,
  stored: NaverNewsCanonicalJobStoredEvidence,
): NaverNewsCanonicalJobEvidenceReadRepository {
  return Object.freeze({
    async readJobEvidence(jobId: string) {
      return jobId === expectedJobId ? stored : null;
    },
  });
}

export async function assembleNaverNewsShadowFirstSeenSeries(
  input: Readonly<{
    canonicalArtistId: string;
    protocolStart: string;
    throughSlotStart: string;
  }>,
  repository: NaverNewsCanonicalJobEvidenceReadRepository,
): Promise<NaverNewsShadowFirstSeenSeriesResult> {
  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);
  const startTimestamp = canonicalSlotStart(
    binding.query,
    input.protocolStart,
    'naver_news_shadow_first_seen_series_input_invalid',
  );
  const throughTimestamp = canonicalSlotStart(
    binding.query,
    input.throughSlotStart,
    'naver_news_shadow_first_seen_series_input_invalid',
  );
  if (throughTimestamp < startTimestamp) {
    throw new Error('naver_news_shadow_first_seen_series_input_invalid');
  }

  const expectedSlots: NaverNewsShadowFirstSeenExpectedSlot[] = [];
  for (let timestamp = startTimestamp; timestamp <= throughTimestamp; timestamp += CADENCE_MS) {
    const slotStart = new Date(timestamp).toISOString();
    const plan = buildNaverNewsSchedulerPlan({
      query: binding.query,
      at: slotStart,
      display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
    });
    const identity = buildNaverNewsJobIdentity(plan.command);
    expectedSlots.push(Object.freeze({ slotStart: plan.slotStart, jobId: identity.jobId }));
  }

  const snapshots: NaverNewsShadowFirstSeenActivitySnapshot[] = [];
  for (const expected of expectedSlots) {
    const stored = await repository.readJobEvidence(expected.jobId);
    if (!stored) {
      return Object.freeze({
        contractVersion: NAVER_NEWS_SHADOW_FIRST_SEEN_SERIES_CONTRACT_VERSION,
        lifecycle: 'shadow' as const,
        directProductContributionEligible: false as const,
        canonicalArtistId: binding.canonicalArtistId,
        schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
        protocolStart: input.protocolStart,
        throughSlotStart: input.throughSlotStart,
        expectedSlots: Object.freeze(expectedSlots),
        snapshots: Object.freeze(snapshots),
        status: 'unavailable' as const,
        reason: 'expected_job_missing' as const,
        missingSlotStart: expected.slotStart,
        missingJobId: expected.jobId,
        activity: null,
      });
    }

    const assembly = await assembleNaverNewsCanonicalJobEvidence(
      { canonicalArtistId: binding.canonicalArtistId, jobId: expected.jobId },
      oneJobRepository(expected.jobId, stored),
    );
    const expectedPlan = buildNaverNewsSchedulerPlan({
      query: binding.query,
      at: expected.slotStart,
      display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
    });
    const expectedRequest = buildNaverNewsJobIdentity(expectedPlan.command).request;
    if (canonicalJson(assembly.request) !== canonicalJson(expectedRequest)) {
      throw new Error('naver_news_shadow_first_seen_series_protocol_mismatch');
    }

    snapshots.push(Object.freeze({
      canonicalArtistId: binding.canonicalArtistId,
      jobId: expected.jobId,
      slotStart: expected.slotStart,
      request: assembly.request,
      completeness: assembly.completeness,
      observationSetCoverage: assembly.observationSetCoverage,
      observations: assembly.observations,
    }));
  }

  const activity = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: binding.canonicalArtistId,
    protocolStart: input.protocolStart,
    snapshots,
  });

  return Object.freeze({
    contractVersion: NAVER_NEWS_SHADOW_FIRST_SEEN_SERIES_CONTRACT_VERSION,
    lifecycle: 'shadow' as const,
    directProductContributionEligible: false as const,
    canonicalArtistId: binding.canonicalArtistId,
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    protocolStart: input.protocolStart,
    throughSlotStart: input.throughSlotStart,
    expectedSlots: Object.freeze(expectedSlots),
    snapshots: Object.freeze(snapshots),
    status: activity.status,
    reason: activity.reason,
    missingSlotStart: null,
    missingJobId: null,
    activity,
  });
}

export async function assembleOfficialNaverNewsShadowFirstSeenSeries(
  input: Readonly<{
    canonicalArtistId: string;
    throughSlotStart: string;
  }>,
  repository: NaverNewsCanonicalJobEvidenceReadRepository,
): Promise<NaverNewsShadowFirstSeenSeriesResult> {
  const epoch = getOfficialNaverNewsShadowEpoch(input.canonicalArtistId);
  return assembleNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: epoch.canonicalArtistId,
    protocolStart: epoch.protocolStart,
    throughSlotStart: input.throughSlotStart,
  }, repository);
}
