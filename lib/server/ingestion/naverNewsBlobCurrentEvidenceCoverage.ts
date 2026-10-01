import type {
  MomentumCurrentDualSourceEvaluationEvidence,
} from '../../intelligence/fandexMomentumCategoricalOutputAttestation';
import {
  assembleNaverNewsCanonicalJobEvidence,
  type NaverNewsCanonicalJobEvidenceReadRepository,
  type NaverNewsCanonicalJobStoredEvidence,
} from './naverNewsCanonicalJobEvidence';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
  isSha256,
} from './naverNewsContracts';
import {
  bindCanonicalArtistToNaverNews,
} from './naverNewsArtistBinding';
import {
  getOfficialNaverNewsShadowEpoch,
} from './naverNewsShadowEpoch';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  NAVER_NEWS_SCHEDULER_VERSION,
} from './naverNewsScheduler';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  NAVER_NEWS_MIRROR_JOB_PREFIX,
} from './naverNewsStoredEvidenceMirror';
import type {
  ImmutableTextObjectStore,
} from '../storage/immutableTextObjectStore';

export const NAVER_NEWS_BLOB_CURRENT_EVIDENCE_COVERAGE_VERSION =
  'naver-news-blob-current-evidence-coverage-v1' as const;

type ReadOnlyObjectStore = Pick<
  ImmutableTextObjectStore,
  'readText' | 'listPathnames'
>;

type ExpectedSlot = Readonly<{
  slotStart: string;
  jobId: string;
  collectionKey: string;
}>;

export type NaverNewsBlobCurrentEvidenceCoverage = Readonly<{
  contractVersion:
    typeof NAVER_NEWS_BLOB_CURRENT_EVIDENCE_COVERAGE_VERSION;
  lifecycle: 'shadow';
  canonicalArtistId: string;
  schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
  exactOfficialProtocol: true;
  evidenceSource: 'immutable-blob-staged-job';
  schedulerCompletionClaimed: false;
  schedulerManifestRequiredForCoverage: false;
  protocolStart: string;
  throughSlotStart: string | null;
  latestStagedJobId: string | null;
  latestStagedCollectionKey: string | null;
  latestStagedJobValidated: boolean;
  seriesStatus: 'available' | 'unavailable';
  expectedSlotCount: number;
  reproducedSnapshotCount: number;
  missingSlotCount: number;
  firstMissingSlotStart: string | null;
  firstMissingJobId: string | null;
  currentStoredEvidenceReproducedForReadiness: boolean;
  databaseReads: 0;
  databaseWrites: 0;
  blobWrites: 0;
}>;

const CADENCE_MS = NAVER_NEWS_SCHEDULER_CADENCE_MINUTES * 60_000;
const MAX_EXPECTED_SLOTS = 20_000;

function jobIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(NAVER_NEWS_MIRROR_JOB_PREFIX)) return null;
  const suffix = pathname.slice(NAVER_NEWS_MIRROR_JOB_PREFIX.length);
  const match = /^([0-9a-f]{64})\.json$/.exec(suffix);
  return match && isSha256(match[1]) ? match[1] : null;
}

function canonicalSlot(
  query: string,
  at: string,
): ExpectedSlot {
  const plan = buildNaverNewsSchedulerPlan({
    query,
    at,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  const identity = buildNaverNewsJobIdentity(plan.command);
  return Object.freeze({
    slotStart: plan.slotStart,
    jobId: identity.jobId,
    collectionKey: plan.collectionKey,
  });
}

function expectedSlotsThrough(
  canonicalArtistId: string,
  throughSlotStart: string,
): readonly ExpectedSlot[] {
  const binding = bindCanonicalArtistToNaverNews(canonicalArtistId);
  const epoch = getOfficialNaverNewsShadowEpoch(binding.canonicalArtistId);
  const start = Date.parse(epoch.protocolStart);
  const through = Date.parse(throughSlotStart);
  if (
    !Number.isFinite(start)
    || !Number.isFinite(through)
    || through < start
  ) {
    throw new Error('naver_news_blob_current_evidence_range_invalid');
  }

  const slots: ExpectedSlot[] = [];
  for (
    let timestamp = start;
    timestamp <= through;
    timestamp += CADENCE_MS
  ) {
    if (slots.length >= MAX_EXPECTED_SLOTS) {
      throw new Error('naver_news_blob_current_evidence_range_invalid');
    }
    const expected = canonicalSlot(
      binding.query,
      new Date(timestamp).toISOString(),
    );
    if (expected.slotStart !== new Date(timestamp).toISOString()) {
      throw new Error('naver_news_blob_current_evidence_range_invalid');
    }
    slots.push(expected);
  }
  return Object.freeze(slots);
}

function oneJobRepository(
  jobId: string,
  stored: NaverNewsCanonicalJobStoredEvidence,
): NaverNewsCanonicalJobEvidenceReadRepository {
  return Object.freeze({
    async readJobEvidence(candidate: string) {
      return candidate === jobId ? stored : null;
    },
  });
}

async function validateStoredSnapshot(
  canonicalArtistId: string,
  expected: ExpectedSlot,
  stored: NaverNewsCanonicalJobStoredEvidence,
): Promise<boolean> {
  const assembly = await assembleNaverNewsCanonicalJobEvidence(
    {
      canonicalArtistId,
      jobId: expected.jobId,
    },
    oneJobRepository(expected.jobId, stored),
  );
  const expectedPlan = buildNaverNewsSchedulerPlan({
    query: bindCanonicalArtistToNaverNews(canonicalArtistId).query,
    at: expected.slotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  const expectedRequest =
    buildNaverNewsJobIdentity(expectedPlan.command).request;

  if (
    canonicalJson(assembly.request) !== canonicalJson(expectedRequest)
    || assembly.request.collectionKey !== expected.collectionKey
  ) {
    throw new Error(
      'naver_news_blob_current_evidence_protocol_mismatch',
    );
  }

  return (
    assembly.completeness.status === 'available'
    && assembly.observationSetCoverage.status === 'proven'
  );
}

export async function evaluateNaverNewsBlobCurrentEvidenceCoverage(
  input: Readonly<{
    canonicalArtistId: string;
    now?: Date;
  }>,
  store: ReadOnlyObjectStore,
): Promise<NaverNewsBlobCurrentEvidenceCoverage> {
  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);
  const epoch = getOfficialNaverNewsShadowEpoch(binding.canonicalArtistId);
  const now = input.now ?? new Date();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('naver_news_blob_current_evidence_clock_invalid');
  }

  const currentSlot = canonicalSlot(
    binding.query,
    now.toISOString(),
  );
  const candidates = expectedSlotsThrough(
    binding.canonicalArtistId,
    currentSlot.slotStart,
  );

  const pathnames = await store.listPathnames(
    NAVER_NEWS_MIRROR_JOB_PREFIX,
  );
  const listedJobIds = new Set(
    pathnames
      .map(jobIdFromPath)
      .filter((value): value is string => value !== null),
  );

  const latest = [...candidates]
    .reverse()
    .find((candidate) => listedJobIds.has(candidate.jobId)) ?? null;

  if (latest === null) {
    return Object.freeze({
      contractVersion:
        NAVER_NEWS_BLOB_CURRENT_EVIDENCE_COVERAGE_VERSION,
      lifecycle: 'shadow' as const,
      canonicalArtistId: binding.canonicalArtistId,
      schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
      exactOfficialProtocol: true as const,
      evidenceSource: 'immutable-blob-staged-job' as const,
      schedulerCompletionClaimed: false as const,
      schedulerManifestRequiredForCoverage: false as const,
      protocolStart: epoch.protocolStart,
      throughSlotStart: null,
      latestStagedJobId: null,
      latestStagedCollectionKey: null,
      latestStagedJobValidated: false,
      seriesStatus: 'unavailable' as const,
      expectedSlotCount: 0,
      reproducedSnapshotCount: 0,
      missingSlotCount: 0,
      firstMissingSlotStart: null,
      firstMissingJobId: null,
      currentStoredEvidenceReproducedForReadiness: false,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      blobWrites: 0 as const,
    });
  }

  const expected = expectedSlotsThrough(
    binding.canonicalArtistId,
    latest.slotStart,
  );
  const present = expected.filter((slot) =>
    listedJobIds.has(slot.jobId)
  );
  const repository =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
      store,
    );
  const storedByJobId = repository.readJobEvidenceBatch
    ? await repository.readJobEvidenceBatch(
        present.map((slot) => slot.jobId),
      )
    : new Map<string, NaverNewsCanonicalJobStoredEvidence>(
        (
          await Promise.all(
            present.map(async (slot) => {
              const stored =
                await repository.readJobEvidence(slot.jobId);
              return stored
                ? ([slot.jobId, stored] as const)
                : null;
            }),
          )
        ).filter(
          (
            entry,
          ): entry is readonly [
            string,
            NaverNewsCanonicalJobStoredEvidence,
          ] => entry !== null,
        ),
      );

  let reproducedSnapshotCount = 0;
  for (const slot of present) {
    const stored = storedByJobId.get(slot.jobId);
    if (!stored) continue;
    if (
      await validateStoredSnapshot(
        binding.canonicalArtistId,
        slot,
        stored,
      )
    ) {
      reproducedSnapshotCount += 1;
    }
  }

  const missing = expected.filter(
    (slot) => !storedByJobId.has(slot.jobId),
  );
  const latestStored = storedByJobId.get(latest.jobId);
  const latestStagedJobValidated =
    latestStored !== undefined
    && await validateStoredSnapshot(
      binding.canonicalArtistId,
      latest,
      latestStored,
    );
  const available =
    latestStagedJobValidated
    && reproducedSnapshotCount === expected.length
    && missing.length === 0;

  return Object.freeze({
    contractVersion:
      NAVER_NEWS_BLOB_CURRENT_EVIDENCE_COVERAGE_VERSION,
    lifecycle: 'shadow' as const,
    canonicalArtistId: binding.canonicalArtistId,
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    exactOfficialProtocol: true as const,
    evidenceSource: 'immutable-blob-staged-job' as const,
    schedulerCompletionClaimed: false as const,
    schedulerManifestRequiredForCoverage: false as const,
    protocolStart: epoch.protocolStart,
    throughSlotStart: latest.slotStart,
    latestStagedJobId: latest.jobId,
    latestStagedCollectionKey: latest.collectionKey,
    latestStagedJobValidated,
    seriesStatus: available
      ? 'available' as const
      : 'unavailable' as const,
    expectedSlotCount: expected.length,
    reproducedSnapshotCount,
    missingSlotCount: expected.length - reproducedSnapshotCount,
    firstMissingSlotStart: missing[0]?.slotStart ?? null,
    firstMissingJobId: missing[0]?.jobId ?? null,
    currentStoredEvidenceReproducedForReadiness: available,
    databaseReads: 0 as const,
    databaseWrites: 0 as const,
    blobWrites: 0 as const,
  });
}

export function projectNaverBlobCoverageToMomentumCurrentEvidence(
  coverage: NaverNewsBlobCurrentEvidenceCoverage,
): MomentumCurrentDualSourceEvaluationEvidence[
  'latestNaverStoredEvidence'
] | null {
  if (
    coverage.throughSlotStart === null
    || coverage.latestStagedJobId === null
    || coverage.latestStagedCollectionKey === null
  ) {
    return null;
  }

  return Object.freeze({
    throughSlotStart: coverage.throughSlotStart,
    jobId: coverage.latestStagedJobId,
    collectionKey: coverage.latestStagedCollectionKey,
    exactOfficialProtocol: coverage.exactOfficialProtocol,
    seriesStatus: coverage.seriesStatus,
    expectedSlotCount: coverage.expectedSlotCount,
    reproducedSnapshotCount: coverage.reproducedSnapshotCount,
  });
}
