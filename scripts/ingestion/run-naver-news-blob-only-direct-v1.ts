import { pathToFileURL } from 'node:url';

import {
  runNaverNewsBlobOnlyCollectionStage,
  type NaverNewsBlobOnlyCollectionStageSummary,
} from '../../lib/server/ingestion/naverNewsBlobOnlyCollectionStage';
import {
  createProductionNaverNewsBlobEvidenceStore,
} from '../../lib/server/ingestion/naverNewsBlobMirrorRuntime';
import {
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
  finalizeNaverNewsStoredEvidenceMirrorByJobId,
} from '../../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import {
  buildNaverNewsSchedulerPlan,
} from '../../lib/server/ingestion/naverNewsScheduler';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
} from '../../lib/server/ingestion/naverNewsContracts';
import type {
  NaverNewsSucceededSchedulerJob,
} from '../../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  readNaverNewsRecurringConfig,
} from '../../lib/server/ingestion/naverNewsRecurringSchedulerContracts';
import {
  readNaverNewsShadowRecurringProtocol,
} from '../../lib/server/ingestion/naverNewsShadowRecurringScheduler';

export const NAVER_NEWS_BLOB_ONLY_DIRECT_APPROVAL_ENV =
  'FANDEX_NAVER_BLOB_ONLY_DIRECT_EXECUTION_APPROVAL' as const;
export const NAVER_NEWS_BLOB_ONLY_DIRECT_APPROVAL_VALUE =
  'approved-github-actions-blob-only-direct-v1' as const;

export type NaverNewsBlobOnlyDirectDependencies = Readonly<{
  createStore?: typeof createProductionNaverNewsBlobEvidenceStore;
  runStage?: typeof runNaverNewsBlobOnlyCollectionStage;
  finalizeManifest?: typeof finalizeNaverNewsStoredEvidenceMirrorByJobId;
  readSucceededSchedulerJobs?: (
    store: ReturnType<typeof createProductionNaverNewsBlobEvidenceStore>,
  ) => Promise<readonly NaverNewsSucceededSchedulerJob[]>;
  now?: () => Date;
}>;

export type NaverNewsBlobOnlyDirectSummary = Readonly<{
  mode: 'github-actions-direct-blob-only';
  runStatus: 'collected-and-finalized' | 'already-finalized';
  contractVersion: NaverNewsBlobOnlyCollectionStageSummary['contractVersion'];
  schedulerVersion: NaverNewsBlobOnlyCollectionStageSummary['schedulerVersion'];
  slotStart: string;
  collectionKey: string;
  jobId: string;
  resultSha256: string | null;
  stagedObjectStatus:
    | NaverNewsBlobOnlyCollectionStageSummary['stagedObjectStatus']
    | null;
  counts: NaverNewsBlobOnlyCollectionStageSummary['counts'] | null;
  providerCalls: 0 | 1;
  databaseWrites: 0;
  schedulerManifestFinalized: true;
}>;

export async function runNaverNewsBlobOnlyDirect(
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsBlobOnlyDirectDependencies = {},
): Promise<NaverNewsBlobOnlyDirectSummary> {
  if (
    environment[NAVER_NEWS_BLOB_ONLY_DIRECT_APPROVAL_ENV]
      !== NAVER_NEWS_BLOB_ONLY_DIRECT_APPROVAL_VALUE
  ) {
    throw new Error('naver_news_blob_only_direct_approval_required');
  }

  const config = readNaverNewsRecurringConfig(environment);
  const protocol = readNaverNewsShadowRecurringProtocol(environment);
  if (
    protocol.query !== config.query
    || protocol.display !== config.display
  ) {
    throw new Error('naver_news_blob_only_direct_protocol_rejected');
  }

  const createStore =
    dependencies.createStore ?? createProductionNaverNewsBlobEvidenceStore;
  const runStage =
    dependencies.runStage ?? runNaverNewsBlobOnlyCollectionStage;
  const now = dependencies.now ?? (() => new Date());
  const instant = now();
  const schedulerPlan = buildNaverNewsSchedulerPlan({
    query: config.query,
    display: config.display,
    at: instant,
  });
  const expectedIdentity = buildNaverNewsJobIdentity(schedulerPlan.command);

  const store = createStore(environment);
  const readSucceededSchedulerJobs =
    dependencies.readSucceededSchedulerJobs
    ?? ((candidateStore) =>
      createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
        candidateStore,
      ).readSucceededSchedulerJobs());
  const succeededJobs = await readSucceededSchedulerJobs(store);
  const currentOfficialJob = succeededJobs.find((job) =>
    job.collectionKey === schedulerPlan.collectionKey
  );
  if (currentOfficialJob) {
    if (
      currentOfficialJob.jobId !== expectedIdentity.jobId
      || canonicalJson(currentOfficialJob.requestContract)
        !== canonicalJson(expectedIdentity.request)
    ) {
      throw new Error('naver_news_blob_only_direct_preflight_conflict');
    }
    return Object.freeze({
      mode: 'github-actions-direct-blob-only' as const,
      runStatus: 'already-finalized' as const,
      contractVersion: 'naver-news-blob-only-collection-stage-v1' as const,
      schedulerVersion: schedulerPlan.schedulerVersion,
      slotStart: schedulerPlan.slotStart,
      collectionKey: schedulerPlan.collectionKey,
      jobId: currentOfficialJob.jobId,
      resultSha256: null,
      stagedObjectStatus: null,
      counts: null,
      providerCalls: 0 as const,
      databaseWrites: 0 as const,
      schedulerManifestFinalized: true as const,
    });
  }

  const result = await runStage(
    {
      query: config.query,
      display: config.display,
      environment,
    },
    {
      store,
      now: () => instant,
    },
  );

  const finalizeManifest = dependencies.finalizeManifest
    ?? finalizeNaverNewsStoredEvidenceMirrorByJobId;
  const finalized = await finalizeManifest(
    result.jobId,
    result.resultSha256,
    store,
  );
  if (finalized.schedulerManifest === null) {
    throw new Error('naver_news_blob_only_direct_manifest_required');
  }

  return Object.freeze({
    mode: 'github-actions-direct-blob-only' as const,
    runStatus: 'collected-and-finalized' as const,
    contractVersion: result.contractVersion,
    schedulerVersion: result.schedulerVersion,
    slotStart: result.slotStart,
    collectionKey: result.collectionKey,
    jobId: result.jobId,
    resultSha256: result.resultSha256,
    stagedObjectStatus: result.stagedObjectStatus,
    counts: result.counts,
    providerCalls: 1 as const,
    databaseWrites: result.safety.databaseWrites,
    schedulerManifestFinalized: true as const,
  });
}

export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const summary = await runNaverNewsBlobOnlyDirect(environment);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error(
      'NAVER News direct Blob-only run failed closed. No credential, database detail, endpoint detail, or raw provider payload was logged.',
    );
    process.exitCode = 1;
  });
}
