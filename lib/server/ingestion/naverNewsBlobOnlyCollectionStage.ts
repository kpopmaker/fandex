import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
} from './naverNewsContracts';
import {
  createNaverNewsExternalCollector,
} from './naverNewsExternalCollector';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_VERSION,
} from './naverNewsScheduler';
import {
  stageNaverNewsStoredEvidenceMirror,
} from './naverNewsStoredEvidenceMirror';
import type { NaverNewsCollector } from './naverNewsWorker';
import type { ImmutableTextObjectStore } from '../storage/immutableTextObjectStore';

export const NAVER_NEWS_BLOB_ONLY_COLLECTION_STAGE_VERSION =
  'naver-news-blob-only-collection-stage-v1' as const;

export type NaverNewsBlobOnlyCollectionStageDependencies = Readonly<{
  store: ImmutableTextObjectStore;
  collector?: NaverNewsCollector;
  now?: () => Date;
}>;

export type NaverNewsBlobOnlyCollectionStageSummary = Readonly<{
  contractVersion: typeof NAVER_NEWS_BLOB_ONLY_COLLECTION_STAGE_VERSION;
  mode: 'blob-only-collection-stage';
  schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
  slotStart: string;
  collectionKey: string;
  jobId: string;
  requestSha256: string;
  resultSha256: string;
  planSha256: string;
  stagedObjectStatus: 'created' | 'idempotent-existing';
  counts: Readonly<{
    received: number;
    rawEvidence: number;
    normalizedRecords: number;
    duplicateRecords: number;
    rejectedItems: number;
  }>;
  safety: Readonly<{
    databaseConnections: 0;
    databaseQueries: 0;
    databaseWrites: 0;
    databaseCompletionPerformed: false;
    schedulerManifestFinalized: false;
    schedulesActivated: 0;
    environmentMutations: 0;
    productActivations: 0;
    publicRouteCutovers: 0;
  }>;
}>;

function currentInstant(now: () => Date): Date {
  let current: Date;
  try {
    current = now();
  } catch {
    throw new Error('naver_news_blob_only_clock_invalid');
  }
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error('naver_news_blob_only_clock_invalid');
  }
  return current;
}

export async function runNaverNewsBlobOnlyCollectionStage(
  input: Readonly<{
    query: string;
    display?: number;
    environment: Readonly<Record<string, string | undefined>>;
  }>,
  dependencies: NaverNewsBlobOnlyCollectionStageDependencies,
): Promise<NaverNewsBlobOnlyCollectionStageSummary> {
  const now = dependencies.now ?? (() => new Date());
  const schedulerPlan = buildNaverNewsSchedulerPlan({
    query: input.query,
    at: currentInstant(now),
    ...(input.display === undefined ? {} : { display: input.display }),
  });

  const collector = dependencies.collector ?? createNaverNewsExternalCollector({
    environment: input.environment,
  });
  const identity = buildNaverNewsJobIdentity(schedulerPlan.command);
  const collection = await collector.collect(identity.request);
  const writePlan = buildNaverNewsIngestionWritePlan(identity, collection);
  const staged = await stageNaverNewsStoredEvidenceMirror(
    writePlan,
    dependencies.store,
  );

  if (staged.job.status === 'conflict') {
    throw new Error('naver_news_blob_only_stage_conflict');
  }

  return Object.freeze({
    contractVersion: NAVER_NEWS_BLOB_ONLY_COLLECTION_STAGE_VERSION,
    mode: 'blob-only-collection-stage' as const,
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    slotStart: schedulerPlan.slotStart,
    collectionKey: schedulerPlan.collectionKey,
    jobId: identity.jobId,
    requestSha256: identity.requestSha256,
    resultSha256: writePlan.resultSha256,
    planSha256: writePlan.planSha256,
    stagedObjectStatus: staged.job.status,
    counts: Object.freeze({ ...writePlan.counts }),
    safety: Object.freeze({
      databaseConnections: 0 as const,
      databaseQueries: 0 as const,
      databaseWrites: 0 as const,
      databaseCompletionPerformed: false as const,
      schedulerManifestFinalized: false as const,
      schedulesActivated: 0 as const,
      environmentMutations: 0 as const,
      productActivations: 0 as const,
      publicRouteCutovers: 0 as const,
    }),
  });
}
