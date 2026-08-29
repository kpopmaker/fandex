import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  type NaverNewsCollection,
  type NaverNewsIngestionCommand,
  type NaverNewsRequestContract,
} from './naverNewsContracts';
import type { NaverNewsIngestionRepository } from './naverNewsRepository';

export type NaverNewsCollector = Readonly<{
  mode: 'fixture' | 'external';
  collect(request: NaverNewsRequestContract): Promise<NaverNewsCollection>;
}>;

export type NaverNewsWorkerInput = Readonly<{
  command: NaverNewsIngestionCommand;
  workerId: string;
  collector: NaverNewsCollector;
  repository: NaverNewsIngestionRepository;
  now(): string;
}>;

export type NaverNewsWorkerResult = Readonly<{
  status:
    | 'applied'
    | 'idempotent_succeeded'
    | 'busy'
    | 'retryable_failed'
    | 'dead_letter'
    | 'conflict'
    | 'claim_lost';
  jobId: string;
  idempotencyKey: string;
  requestSha256: string;
  resultSha256: string | null;
  attempt: number | null;
  counts: Readonly<{
    rawEvidence: number;
    normalizedRecords: number;
    duplicateRecords: number;
    rejectedItems: number;
  }> | null;
}>;

function terminalResult(
  status: NaverNewsWorkerResult['status'],
  identity: ReturnType<typeof buildNaverNewsJobIdentity>,
  options?: {
    resultSha256?: string | null;
    attempt?: number | null;
    counts?: NaverNewsWorkerResult['counts'];
  },
): NaverNewsWorkerResult {
  return Object.freeze({
    status,
    jobId: identity.jobId,
    idempotencyKey: identity.idempotencyKey,
    requestSha256: identity.requestSha256,
    resultSha256: options?.resultSha256 ?? null,
    attempt: options?.attempt ?? null,
    counts: options?.counts ?? null,
  });
}

function workerFailureCode(error: unknown): string {
  if (error instanceof Error && /^naver_news_(?:collection|response|raw|normalized|provider|fetched|total|published)/.test(error.message)) {
    return 'naver_news_response_invalid';
  }
  return 'naver_news_collection_failed';
}

export async function runNaverNewsIngestionWorker(
  input: NaverNewsWorkerInput,
): Promise<NaverNewsWorkerResult> {
  const identity = buildNaverNewsJobIdentity(input.command);
  const ensured = await input.repository.ensureJob(identity, input.now());
  if (ensured.status === 'idempotent_succeeded') {
    return terminalResult('idempotent_succeeded', identity, { resultSha256: ensured.resultSha256 });
  }
  if (ensured.status === 'conflict' || ensured.status === 'dead_letter') {
    return terminalResult(ensured.status, identity);
  }

  const claimed = await input.repository.claimJob(identity, input.workerId, input.now());
  if (claimed.status === 'idempotent_succeeded') {
    return terminalResult('idempotent_succeeded', identity, { resultSha256: claimed.resultSha256 });
  }
  if (claimed.status !== 'claimed') return terminalResult(claimed.status, identity);

  let collection: NaverNewsCollection;
  try {
    collection = await input.collector.collect(identity.request);
  } catch (error) {
    const failed = await input.repository.failJob(
      identity,
      input.workerId,
      claimed.claimToken,
      workerFailureCode(error),
      input.now(),
    );
    return terminalResult(failed.status, identity, { attempt: claimed.attempt });
  }

  let plan: ReturnType<typeof buildNaverNewsIngestionWritePlan>;
  try {
    plan = buildNaverNewsIngestionWritePlan(identity, collection);
  } catch (error) {
    const failed = await input.repository.failJob(
      identity,
      input.workerId,
      claimed.claimToken,
      workerFailureCode(error),
      input.now(),
    );
    return terminalResult(failed.status, identity, { attempt: claimed.attempt });
  }

  const completed = await input.repository.completeJob(
    identity,
    input.workerId,
    claimed.claimToken,
    plan,
    input.now(),
  );
  if (!('resultSha256' in completed)) {
    return terminalResult(completed.status, identity, { attempt: claimed.attempt });
  }
  return terminalResult(completed.status, identity, {
    resultSha256: completed.resultSha256,
    attempt: claimed.attempt,
    counts: Object.freeze({
      rawEvidence: plan.counts.rawEvidence,
      normalizedRecords: plan.counts.normalizedRecords,
      duplicateRecords: plan.counts.duplicateRecords,
      rejectedItems: plan.counts.rejectedItems,
    }),
  });
}

export type NaverNewsDryRunReport = Readonly<{
  mode: 'dry-run';
  contractVersion: typeof NAVER_NEWS_INGESTION_CONTRACT_VERSION;
  jobId: string;
  idempotencyKey: string;
  requestSha256: string;
  planSha256: string;
  resultSha256: string;
  wouldWrite: Readonly<{
    jobs: 1;
    rawEvidence: number;
    normalizedRecords: number;
    auditEvents: number;
  }>;
  classification: Readonly<{
    duplicateRecords: number;
    rejectedItems: number;
  }>;
  effects: Readonly<{
    apiCalls: 0;
    databaseConnections: 0;
    databaseQueries: 0;
    databaseWrites: 0;
    migrationsApplied: 0;
    schedulesActivated: 0;
    environmentMutations: 0;
  }>;
  secretsRead: 0;
}>;

export async function planNaverNewsIngestionDryRun(
  command: NaverNewsIngestionCommand,
  collector: NaverNewsCollector,
): Promise<NaverNewsDryRunReport> {
  if (collector.mode !== 'fixture') throw new Error('naver_news_dry_run_requires_fixture_collector');
  const identity = buildNaverNewsJobIdentity(command);
  const collection = await collector.collect(identity.request);
  const plan = buildNaverNewsIngestionWritePlan(identity, collection);
  return Object.freeze({
    mode: 'dry-run',
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    jobId: identity.jobId,
    idempotencyKey: identity.idempotencyKey,
    requestSha256: identity.requestSha256,
    planSha256: plan.planSha256,
    resultSha256: plan.resultSha256,
    wouldWrite: Object.freeze({
      jobs: 1,
      rawEvidence: plan.counts.rawEvidence,
      normalizedRecords: plan.counts.normalizedRecords,
      auditEvents: plan.audit.length + 2,
    }),
    classification: Object.freeze({
      duplicateRecords: plan.counts.duplicateRecords,
      rejectedItems: plan.counts.rejectedItems,
    }),
    effects: Object.freeze({
      apiCalls: 0,
      databaseConnections: 0,
      databaseQueries: 0,
      databaseWrites: 0,
      migrationsApplied: 0,
      schedulesActivated: 0,
      environmentMutations: 0,
    }),
    secretsRead: 0,
  });
}
