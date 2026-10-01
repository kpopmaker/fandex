import { pathToFileURL } from 'node:url';

import {
  runNaverNewsBlobOnlyCollectionStage,
  type NaverNewsBlobOnlyCollectionStageSummary,
} from '../../lib/server/ingestion/naverNewsBlobOnlyCollectionStage';
import {
  createProductionNaverNewsBlobEvidenceStore,
} from '../../lib/server/ingestion/naverNewsBlobMirrorRuntime';
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
  now?: () => Date;
}>;

export type NaverNewsBlobOnlyDirectSummary = Readonly<{
  mode: 'github-actions-direct-blob-only';
  contractVersion: NaverNewsBlobOnlyCollectionStageSummary['contractVersion'];
  schedulerVersion: NaverNewsBlobOnlyCollectionStageSummary['schedulerVersion'];
  slotStart: string;
  collectionKey: string;
  jobId: string;
  resultSha256: string;
  stagedObjectStatus: NaverNewsBlobOnlyCollectionStageSummary['stagedObjectStatus'];
  counts: NaverNewsBlobOnlyCollectionStageSummary['counts'];
  databaseWrites: 0;
  schedulerManifestFinalized: false;
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

  const store = createStore(environment);
  const result = await runStage(
    {
      query: config.query,
      display: config.display,
      environment,
    },
    {
      store,
      ...(dependencies.now ? { now: dependencies.now } : {}),
    },
  );

  return Object.freeze({
    mode: 'github-actions-direct-blob-only' as const,
    contractVersion: result.contractVersion,
    schedulerVersion: result.schedulerVersion,
    slotStart: result.slotStart,
    collectionKey: result.collectionKey,
    jobId: result.jobId,
    resultSha256: result.resultSha256,
    stagedObjectStatus: result.stagedObjectStatus,
    counts: result.counts,
    databaseWrites: result.safety.databaseWrites,
    schedulerManifestFinalized:
      result.safety.schedulerManifestFinalized,
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
