import {
  buildNaverNewsJobIdentity,
  canonicalJson,
  isSha256,
  NAVER_NEWS_PROVIDER,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  sha256Canonical,
  validateNaverNewsIngestionWritePlan,
  type NaverNewsIngestionWritePlan,
  type NaverNewsJobIdentity,
  type NaverNewsNormalizedRecord,
  type NaverNewsRequestContract,
} from './naverNewsContracts';
import type {
  NaverNewsCanonicalJobEvidenceReadRepository,
  NaverNewsCanonicalJobStoredEvidence,
} from './naverNewsCanonicalJobEvidence';
import type {
  NaverNewsLatestOfficialShadowSlotReadRepository,
  NaverNewsSucceededSchedulerJob,
} from './naverNewsLatestOfficialShadowSlot';
import type {
  ImmutableTextObjectStore,
  ImmutableTextObjectPutResult,
} from '../storage/immutableTextObjectStore';

export const NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION =
  'naver-news-stored-evidence-mirror-v1' as const;

const ROOT = 'fandex/naver-news/stored-evidence-mirror/v1';
const JOB_PREFIX = `${ROOT}/jobs/`;
const SCHEDULER_MANIFEST_PREFIX = `${ROOT}/scheduler-manifests/`;
export {
  JOB_PREFIX as NAVER_NEWS_MIRROR_JOB_PREFIX,
  SCHEDULER_MANIFEST_PREFIX as NAVER_NEWS_MIRROR_MANIFEST_PREFIX,
};
const SCHEDULER_COLLECTION_KEY_PATTERN =
  /^sched-v125-naver-news-\d{8}t\d{6}z-[0-9a-f]{12}$/;

export const MAX_CONCURRENT_MIRROR_EVIDENCE_READS = 8 as const;

// Keep up to eight Blob reads in flight without head-of-line blocking at
// batch boundaries. Retain every successful entry in its original order.
// On any read or validation failure, stop scheduling new work, wait for
// in-flight reads to settle, then fail closed with the original rejection.
export async function mapMirroredEvidenceBatched<T, U>(
  values: readonly T[],
  read: (value: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(values.length);
  let nextIndex = 0;
  let failed = false;
  let firstFailure: unknown;

  async function readNext(): Promise<void> {
    while (!failed && nextIndex < values.length) {
      const index = nextIndex++;
      try {
        results[index] = await read(values[index]!);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstFailure = error;
        }
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_MIRROR_EVIDENCE_READS, values.length) },
      () => readNext(),
    ),
  );

  if (failed) throw firstFailure;
  return results;
}

type MirrorJobPayload = Readonly<{
  contractVersion: typeof NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION;
  kind: 'canonical-job-evidence';
  canonicalArtistId: 'iu';
  jobId: string;
  collectionKey: string;
  requestContract: NaverNewsRequestContract;
  resultSha256: string;
  planSha256: string;
  storedEvidence: NaverNewsCanonicalJobStoredEvidence;
}>;

type MirrorJobEnvelope = MirrorJobPayload & Readonly<{
  payloadDigest: string;
}>;

type SchedulerManifestPayload = Readonly<{
  contractVersion: typeof NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION;
  kind: 'official-scheduler-manifest';
  canonicalArtistId: 'iu';
  jobId: string;
  collectionKey: string;
  requestContract: NaverNewsRequestContract;
  jobObjectPath: string;
  jobPayloadDigest: string;
}>;

type SchedulerManifestEnvelope = SchedulerManifestPayload & Readonly<{
  payloadDigest: string;
}>;

export type NaverNewsStoredEvidenceMirrorWriteResult = Readonly<{
  job: ImmutableTextObjectPutResult;
  schedulerManifest: ImmutableTextObjectPutResult | null;
  jobPayloadDigest: string;
  schedulerManifestPayloadDigest: string | null;
}>;

function objectPathForJob(jobId: string): string {
  if (!isSha256(jobId)) throw new Error('naver_news_mirror_job_id_invalid');
  return `${JOB_PREFIX}${jobId}.json`;
}

function objectPathForManifest(collectionKey: string, jobId: string): string {
  if (!SCHEDULER_COLLECTION_KEY_PATTERN.test(collectionKey) || !isSha256(jobId)) {
    throw new Error('naver_news_mirror_manifest_identity_invalid');
  }
  return `${SCHEDULER_MANIFEST_PREFIX}${collectionKey}/${jobId}.json`;
}

function freezeStoredEvidence(
  plan: NaverNewsIngestionWritePlan,
): NaverNewsCanonicalJobStoredEvidence {
  const received = plan.audit.filter(
    (event) => event.eventType === 'collection_received',
  );
  if (received.length !== 1) {
    throw new Error('naver_news_mirror_collection_audit_invalid');
  }

  return Object.freeze({
    job: Object.freeze({
      jobId: plan.identity.jobId,
      idempotencyKey: plan.identity.idempotencyKey,
      requestSha256: plan.identity.requestSha256,
      request: plan.identity.request,
      provider: NAVER_NEWS_PROVIDER,
      status: 'succeeded',
      normalizedRecordCount: plan.normalizedRecords.length,
    }),
    completenessEvidence: Object.freeze({
      jobId: plan.identity.jobId,
      provider: NAVER_NEWS_PROVIDER,
      requestContract: plan.identity.request,
      rawEvidenceCount: plan.rawEvidence.length,
      collectionReceived: Object.freeze({
        jobId: plan.identity.jobId,
        boundedPayload: received[0].boundedPayload,
      }),
    }),
    normalizedRecords: Object.freeze([...plan.normalizedRecords]),
  });
}

function validateNormalizedRecord(record: unknown): NaverNewsNormalizedRecord {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('naver_news_mirror_job_payload_invalid');
  }
  const row = record as NaverNewsNormalizedRecord;
  if (
    !isSha256(row.recordId)
    || !isSha256(row.rawEvidenceId)
    || row.provider !== NAVER_NEWS_PROVIDER
    || row.sourceType !== 'news_article'
    || typeof row.sourceUrl !== 'string'
    || (row.naverUrl !== null && typeof row.naverUrl !== 'string')
    || typeof row.sourceHost !== 'string'
    || typeof row.title !== 'string'
    || typeof row.summary !== 'string'
    || typeof row.publishedAt !== 'string'
    || typeof row.collectedAt !== 'string'
    || !Number.isFinite(Date.parse(row.publishedAt))
    || !Number.isFinite(Date.parse(row.collectedAt))
    || !isSha256(row.contentSha256)
    || !isSha256(row.recordSha256)
    || !row.normalizedPayload
    || typeof row.normalizedPayload !== 'object'
  ) {
    throw new Error('naver_news_mirror_job_payload_invalid');
  }

  const expectedPayload: NaverNewsNormalizedRecord['normalizedPayload'] = {
    provider: NAVER_NEWS_PROVIDER,
    sourceType: 'news_article',
    sourceUrl: row.sourceUrl,
    naverUrl: row.naverUrl,
    sourceHost: row.sourceHost,
    title: row.title,
    summary: row.summary,
    publishedAt: new Date(Date.parse(row.publishedAt)).toISOString(),
  };
  const expectedContentSha = sha256Canonical({
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    naverUrl: row.naverUrl,
    publishedAt: expectedPayload.publishedAt,
  });
  const expectedRecordSha = sha256Canonical(expectedPayload);
  const expectedRecordId = sha256Canonical({
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    provider: NAVER_NEWS_PROVIDER,
    recordSha256: expectedRecordSha,
  });

  if (
    canonicalJson(row.normalizedPayload) !== canonicalJson(expectedPayload)
    || row.contentSha256 !== expectedContentSha
    || row.recordSha256 !== expectedRecordSha
    || row.recordId !== expectedRecordId
  ) {
    throw new Error('naver_news_mirror_job_payload_invalid');
  }

  return Object.freeze({
    ...row,
    publishedAt: expectedPayload.publishedAt,
    collectedAt: new Date(Date.parse(row.collectedAt)).toISOString(),
    normalizedPayload: Object.freeze(expectedPayload),
  });
}

function validateStoredEvidence(
  value: unknown,
  request: NaverNewsRequestContract,
): NaverNewsCanonicalJobStoredEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('naver_news_mirror_job_payload_invalid');
  }
  const stored = value as NaverNewsCanonicalJobStoredEvidence;
  const identity = buildNaverNewsJobIdentity(request);
  const rawEvidenceCount = stored.completenessEvidence?.rawEvidenceCount;

  if (
    !stored.job
    || stored.job.jobId !== identity.jobId
    || stored.job.idempotencyKey !== identity.idempotencyKey
    || stored.job.requestSha256 !== identity.requestSha256
    || canonicalJson(stored.job.request) !== canonicalJson(identity.request)
    || stored.job.provider !== NAVER_NEWS_PROVIDER
    || stored.job.status !== 'succeeded'
    || !Number.isInteger(stored.job.normalizedRecordCount)
    || stored.job.normalizedRecordCount < 0
    || !stored.completenessEvidence
    || stored.completenessEvidence.jobId !== identity.jobId
    || stored.completenessEvidence.provider !== NAVER_NEWS_PROVIDER
    || canonicalJson(stored.completenessEvidence.requestContract)
      !== canonicalJson(identity.request)
    || typeof rawEvidenceCount !== 'number'
    || !Number.isSafeInteger(rawEvidenceCount)
    || rawEvidenceCount < 0
    || !stored.completenessEvidence.collectionReceived
    || stored.completenessEvidence.collectionReceived.jobId !== identity.jobId
    || !Array.isArray(stored.normalizedRecords)
    || stored.job.normalizedRecordCount !== stored.normalizedRecords.length
  ) {
    throw new Error('naver_news_mirror_job_payload_invalid');
  }

  return Object.freeze({
    job: Object.freeze({ ...stored.job, request: identity.request }),
    completenessEvidence: Object.freeze({
      ...stored.completenessEvidence,
      requestContract: identity.request,
      collectionReceived: Object.freeze({
        ...stored.completenessEvidence.collectionReceived,
      }),
    }),
    normalizedRecords: Object.freeze(
      stored.normalizedRecords.map(validateNormalizedRecord),
    ),
  });
}

function parseJson(body: string, errorCode: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(errorCode);
  }
}

export function decodeJobEnvelope(body: string): MirrorJobEnvelope {
  const parsed = parseJson(body, 'naver_news_mirror_job_payload_invalid');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('naver_news_mirror_job_payload_invalid');
  }
  const row = parsed as Partial<MirrorJobEnvelope>;
  const request = row.requestContract as NaverNewsRequestContract;
  const identity = buildNaverNewsJobIdentity(request);
  const storedEvidence = validateStoredEvidence(row.storedEvidence, request);

  const payload: MirrorJobPayload = Object.freeze({
    contractVersion: NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION,
    kind: 'canonical-job-evidence',
    canonicalArtistId: 'iu',
    jobId: identity.jobId,
    collectionKey: identity.request.collectionKey,
    requestContract: identity.request,
    resultSha256: String(row.resultSha256 ?? ''),
    planSha256: String(row.planSha256 ?? ''),
    storedEvidence,
  });

  if (
    row.contractVersion !== NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION
    || row.kind !== 'canonical-job-evidence'
    || row.canonicalArtistId !== 'iu'
    || row.jobId !== identity.jobId
    || row.collectionKey !== identity.request.collectionKey
    || !isSha256(payload.resultSha256)
    || !isSha256(payload.planSha256)
    || !isSha256(row.payloadDigest)
    || row.payloadDigest !== sha256Canonical(payload)
  ) {
    throw new Error('naver_news_mirror_job_payload_invalid');
  }

  return Object.freeze({
    ...payload,
    payloadDigest: row.payloadDigest,
  });
}

export function decodeManifestEnvelope(body: string): SchedulerManifestEnvelope {
  const parsed = parseJson(body, 'naver_news_latest_official_slot_stored_job_invalid');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('naver_news_latest_official_slot_stored_job_invalid');
  }
  const row = parsed as Partial<SchedulerManifestEnvelope>;
  const request = row.requestContract as NaverNewsRequestContract;
  const identity = buildNaverNewsJobIdentity(request);
  const expectedPath = objectPathForJob(identity.jobId);

  const payload: SchedulerManifestPayload = Object.freeze({
    contractVersion: NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION,
    kind: 'official-scheduler-manifest',
    canonicalArtistId: 'iu',
    jobId: identity.jobId,
    collectionKey: identity.request.collectionKey,
    requestContract: identity.request,
    jobObjectPath: expectedPath,
    jobPayloadDigest: String(row.jobPayloadDigest ?? ''),
  });

  if (
    row.contractVersion !== NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION
    || row.kind !== 'official-scheduler-manifest'
    || row.canonicalArtistId !== 'iu'
    || row.jobId !== identity.jobId
    || row.collectionKey !== identity.request.collectionKey
    || !SCHEDULER_COLLECTION_KEY_PATTERN.test(payload.collectionKey)
    || row.jobObjectPath !== expectedPath
    || !isSha256(payload.jobPayloadDigest)
    || !isSha256(row.payloadDigest)
    || row.payloadDigest !== sha256Canonical(payload)
  ) {
    throw new Error('naver_news_latest_official_slot_stored_job_invalid');
  }

  return Object.freeze({
    ...payload,
    payloadDigest: row.payloadDigest,
  });
}

export function buildNaverNewsStoredEvidenceMirrorObjects(
  plan: NaverNewsIngestionWritePlan,
): Readonly<{
  jobPathname: string;
  jobBody: string;
  jobPayloadDigest: string;
  schedulerManifestPathname: string | null;
  schedulerManifestBody: string | null;
  schedulerManifestPayloadDigest: string | null;
}> {
  validateNaverNewsIngestionWritePlan(plan);

  const jobPayload: MirrorJobPayload = Object.freeze({
    contractVersion: NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION,
    kind: 'canonical-job-evidence',
    canonicalArtistId: 'iu',
    jobId: plan.identity.jobId,
    collectionKey: plan.identity.request.collectionKey,
    requestContract: plan.identity.request,
    resultSha256: plan.resultSha256,
    planSha256: plan.planSha256,
    storedEvidence: freezeStoredEvidence(plan),
  });
  const jobPayloadDigest = sha256Canonical(jobPayload);
  const jobEnvelope: MirrorJobEnvelope = Object.freeze({
    ...jobPayload,
    payloadDigest: jobPayloadDigest,
  });

  if (!SCHEDULER_COLLECTION_KEY_PATTERN.test(plan.identity.request.collectionKey)) {
    return Object.freeze({
      jobPathname: objectPathForJob(plan.identity.jobId),
      jobBody: canonicalJson(jobEnvelope),
      jobPayloadDigest,
      schedulerManifestPathname: null,
      schedulerManifestBody: null,
      schedulerManifestPayloadDigest: null,
    });
  }

  const manifestPayload: SchedulerManifestPayload = Object.freeze({
    contractVersion: NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION,
    kind: 'official-scheduler-manifest',
    canonicalArtistId: 'iu',
    jobId: plan.identity.jobId,
    collectionKey: plan.identity.request.collectionKey,
    requestContract: plan.identity.request,
    jobObjectPath: objectPathForJob(plan.identity.jobId),
    jobPayloadDigest,
  });
  const schedulerManifestPayloadDigest = sha256Canonical(manifestPayload);
  const manifestEnvelope: SchedulerManifestEnvelope = Object.freeze({
    ...manifestPayload,
    payloadDigest: schedulerManifestPayloadDigest,
  });

  return Object.freeze({
    jobPathname: objectPathForJob(plan.identity.jobId),
    jobBody: canonicalJson(jobEnvelope),
    jobPayloadDigest,
    schedulerManifestPathname: objectPathForManifest(
      plan.identity.request.collectionKey,
      plan.identity.jobId,
    ),
    schedulerManifestBody: canonicalJson(manifestEnvelope),
    schedulerManifestPayloadDigest,
  });
}

export async function stageNaverNewsStoredEvidenceMirror(
  plan: NaverNewsIngestionWritePlan,
  store: ImmutableTextObjectStore,
): Promise<Readonly<{
  job: ImmutableTextObjectPutResult;
  jobPayloadDigest: string;
}>> {
  const objects = buildNaverNewsStoredEvidenceMirrorObjects(plan);
  const job = await store.putTextIfAbsent(
    objects.jobPathname,
    objects.jobBody,
  );
  if (job.status === 'conflict') {
    throw new Error('naver_news_stored_evidence_mirror_conflict');
  }
  return Object.freeze({
    job,
    jobPayloadDigest: objects.jobPayloadDigest,
  });
}

export async function finalizeNaverNewsStoredEvidenceMirror(
  identity: NaverNewsJobIdentity,
  resultSha256: string,
  store: ImmutableTextObjectStore,
): Promise<Readonly<{
  schedulerManifest: ImmutableTextObjectPutResult | null;
  schedulerManifestPayloadDigest: string | null;
}>> {
  if (!isSha256(resultSha256)) {
    throw new Error('naver_news_stored_evidence_mirror_finalize_invalid');
  }
  const body = await store.readText(objectPathForJob(identity.jobId));
  if (body === null) {
    throw new Error('naver_news_stored_evidence_mirror_stage_missing');
  }
  const job = decodeJobEnvelope(body);
  if (
    job.jobId !== identity.jobId
    || job.resultSha256 !== resultSha256
    || canonicalJson(job.requestContract) !== canonicalJson(identity.request)
  ) {
    throw new Error('naver_news_stored_evidence_mirror_finalize_invalid');
  }

  if (!SCHEDULER_COLLECTION_KEY_PATTERN.test(identity.request.collectionKey)) {
    return Object.freeze({
      schedulerManifest: null,
      schedulerManifestPayloadDigest: null,
    });
  }

  const manifestPayload: SchedulerManifestPayload = Object.freeze({
    contractVersion: NAVER_NEWS_STORED_EVIDENCE_MIRROR_VERSION,
    kind: 'official-scheduler-manifest',
    canonicalArtistId: 'iu',
    jobId: identity.jobId,
    collectionKey: identity.request.collectionKey,
    requestContract: identity.request,
    jobObjectPath: objectPathForJob(identity.jobId),
    jobPayloadDigest: job.payloadDigest,
  });
  const schedulerManifestPayloadDigest = sha256Canonical(manifestPayload);
  const manifestEnvelope: SchedulerManifestEnvelope = Object.freeze({
    ...manifestPayload,
    payloadDigest: schedulerManifestPayloadDigest,
  });
  const pathname = objectPathForManifest(
    identity.request.collectionKey,
    identity.jobId,
  );
  const schedulerManifest = await store.putTextIfAbsent(
    pathname,
    canonicalJson(manifestEnvelope),
  );
  if (schedulerManifest.status === 'conflict') {
    throw new Error('naver_news_stored_evidence_mirror_conflict');
  }
  return Object.freeze({
    schedulerManifest,
    schedulerManifestPayloadDigest,
  });
}

export async function finalizeNaverNewsStoredEvidenceMirrorByJobId(
  jobId: string,
  resultSha256: string,
  store: ImmutableTextObjectStore,
): Promise<Readonly<{
  schedulerManifest: ImmutableTextObjectPutResult | null;
  schedulerManifestPayloadDigest: string | null;
}>> {
  if (!isSha256(jobId) || !isSha256(resultSha256)) {
    throw new Error('naver_news_stored_evidence_mirror_finalize_invalid');
  }
  const body = await store.readText(objectPathForJob(jobId));
  if (body === null) {
    throw new Error('naver_news_stored_evidence_mirror_stage_missing');
  }
  const job = decodeJobEnvelope(body);
  const identity = buildNaverNewsJobIdentity(job.requestContract);
  if (identity.jobId !== jobId || job.resultSha256 !== resultSha256) {
    throw new Error('naver_news_stored_evidence_mirror_finalize_invalid');
  }
  return finalizeNaverNewsStoredEvidenceMirror(
    identity,
    resultSha256,
    store,
  );
}

export async function mirrorNaverNewsStoredEvidence(
  plan: NaverNewsIngestionWritePlan,
  store: ImmutableTextObjectStore,
): Promise<NaverNewsStoredEvidenceMirrorWriteResult> {
  const staged = await stageNaverNewsStoredEvidenceMirror(plan, store);
  const finalized = await finalizeNaverNewsStoredEvidenceMirror(
    plan.identity,
    plan.resultSha256,
    store,
  );
  return Object.freeze({
    job: staged.job,
    schedulerManifest: finalized.schedulerManifest,
    jobPayloadDigest: staged.jobPayloadDigest,
    schedulerManifestPayloadDigest:
      finalized.schedulerManifestPayloadDigest,
  });
}

export type NaverNewsMirrorCanonicalReadPhaseStats = Readonly<{
  contractVersion: 'naver-news-mirror-canonical-read-phase-v1';
  outcome: 'fulfilled' | 'rejected';
  objectsRequested: number;
  objectsFound: number;
  objectsMissing: number;
  remoteReadSumMs: number;
  remoteReadMaxMs: number;
  decodeSumMs: number;
  decodeMaxMs: number;
  batchWallMs: number;
}>;

export function createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
  store: Pick<ImmutableTextObjectStore, 'readText'>,
  options: Readonly<{
    onBatchReadPhaseStats?: (record: NaverNewsMirrorCanonicalReadPhaseStats) => void;
  }> = {},
): NaverNewsCanonicalJobEvidenceReadRepository {
  async function readOne(
    jobId: string,
  ): Promise<NaverNewsCanonicalJobStoredEvidence | null> {
    const body = await store.readText(objectPathForJob(jobId));
    if (body === null) return null;
    return decodeJobEnvelope(body).storedEvidence;
  }

  return Object.freeze({
    readJobEvidence: readOne,
    async readJobEvidenceBatch(jobIds: readonly string[]) {
      if (jobIds.some((jobId) => !isSha256(jobId))) {
        throw new Error('naver_news_canonical_job_id_invalid');
      }
      const uniqueJobIds = [...new Set(jobIds)];
      const observer = options.onBatchReadPhaseStats;
      const started = observer ? performance.now() : 0;
      let objectsFound = 0;
      let objectsMissing = 0;
      let remoteReadSumMs = 0;
      let remoteReadMaxMs = 0;
      let decodeSumMs = 0;
      let decodeMaxMs = 0;
      let outcome: NaverNewsMirrorCanonicalReadPhaseStats['outcome'] =
        'rejected';

      function elapsed(start: number): number {
        return Math.max(0, Math.round(performance.now() - start));
      }

      try {
        const entries = await mapMirroredEvidenceBatched(
          uniqueJobIds,
          async (jobId) => {
            if (!observer) {
              const stored = await readOne(jobId);
              return stored ? [jobId, stored] as const : null;
            }

            // Aggregate metrics only. Never log paths, job IDs, evidence,
            // access tokens, or error messages.
            const remoteStarted = performance.now();
            let body: string | null;
            try {
              body = await store.readText(objectPathForJob(jobId));
            } finally {
              const ms = elapsed(remoteStarted);
              remoteReadSumMs += ms;
              remoteReadMaxMs = Math.max(remoteReadMaxMs, ms);
            }
            if (body === null) {
              objectsMissing += 1;
              return null;
            }

            const decodeStarted = performance.now();
            try {
              const stored = decodeJobEnvelope(body).storedEvidence;
              objectsFound += 1;
              return [jobId, stored] as const;
            } finally {
              const ms = elapsed(decodeStarted);
              decodeSumMs += ms;
              decodeMaxMs = Math.max(decodeMaxMs, ms);
            }
          },
        );
        outcome = 'fulfilled';
        return new Map(entries.filter(
          (entry): entry is readonly [string, NaverNewsCanonicalJobStoredEvidence] =>
            entry !== null,
        ));
      } finally {
        if (observer) {
          try {
            observer(Object.freeze({
              contractVersion: 'naver-news-mirror-canonical-read-phase-v1',
              outcome,
              objectsRequested: uniqueJobIds.length,
              objectsFound,
              objectsMissing,
              remoteReadSumMs,
              remoteReadMaxMs,
              decodeSumMs,
              decodeMaxMs,
              batchWallMs: elapsed(started),
            }));
          } catch {
            // Diagnostics must never override evidence values or failures.
          }
        }
      }
    },
  });
}

export function createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
  store: Pick<ImmutableTextObjectStore, 'readText' | 'listPathnames'>,
): NaverNewsLatestOfficialShadowSlotReadRepository {
  return Object.freeze({
    async readSucceededSchedulerJobs(): Promise<
      readonly NaverNewsSucceededSchedulerJob[]
    > {
      const pathnames = await store.listPathnames(SCHEDULER_MANIFEST_PREFIX);
      const manifests = await mapMirroredEvidenceBatched(
        pathnames,
        async (pathname) => {
          const body = await store.readText(pathname);
          if (body === null) {
            throw new Error(
              'naver_news_latest_official_slot_stored_job_invalid',
            );
          }
          return decodeManifestEnvelope(body);
        },
      );
      return Object.freeze(
        manifests.map((manifest) => Object.freeze({
          jobId: manifest.jobId,
          collectionKey: manifest.collectionKey,
          requestContract: manifest.requestContract,
        })),
      );
    },
  });
}
