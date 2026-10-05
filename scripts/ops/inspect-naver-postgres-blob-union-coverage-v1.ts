import { get, list } from '@vercel/blob';
import { Pool } from 'pg';

import { bindCanonicalArtistToNaverNews } from '../../lib/server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
} from '../../lib/server/ingestion/naverNewsContracts';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  NAVER_NEWS_MIRROR_JOB_PREFIX,
  NAVER_NEWS_MIRROR_MANIFEST_PREFIX,
} from '../../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../../lib/server/ingestion/naverNewsScheduler';
import { getOfficialNaverNewsShadowEpoch } from '../../lib/server/ingestion/naverNewsShadowEpoch';
import {
  createVercelBlobTextReadStore,
  resolveVercelBlobPrivateStoreConfig,
} from '../../lib/server/storage/vercelBlobImmutableTextObjectStore';

function slotFromCollectionKey(collectionKey:string): string | null {
  const match = /^sched-v125-naver-news-(\d{8}t\d{6}z)-[0-9a-f]{12}$/.exec(collectionKey);
  if (!match) return null;
  const s=match[1];
  const iso=`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}.000Z`;
  const t=Date.parse(iso);
  return Number.isFinite(t) && new Date(t).toISOString()===iso ? iso : null;
}

async function main() {
  const dbUrl=process.env.FANDEX_RUNTIME_DATABASE_URL?.trim();
  const blobToken=process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!dbUrl || !blobToken) throw new Error('required_read_credentials_missing');

  const blobStore=createVercelBlobTextReadStore(
    { get, list },
    resolveVercelBlobPrivateStoreConfig({ BLOB_READ_WRITE_TOKEN: blobToken }),
  );

  const manifestPaths=await blobStore.listPathnames(NAVER_NEWS_MIRROR_MANIFEST_PREFIX);
  const jobPaths=await blobStore.listPathnames(NAVER_NEWS_MIRROR_JOB_PREFIX);

  const binding=bindCanonicalArtistToNaverNews('iu');
  const epoch=getOfficialNaverNewsShadowEpoch('iu');

  let latestSlot:string|null=null;
  for (const pathname of manifestPaths) {
    const relative=pathname.slice(NAVER_NEWS_MIRROR_MANIFEST_PREFIX.length);
    const collectionKey=relative.split('/')[0] ?? '';
    const slot=slotFromCollectionKey(collectionKey);
    if (!slot) continue;
    const plan=buildNaverNewsSchedulerPlan({
      query:binding.query,
      at:slot,
      display:NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
    });
    if (plan.collectionKey!==collectionKey) continue;
    if (latestSlot===null || Date.parse(slot)>Date.parse(latestSlot)) latestSlot=slot;
  }
  if (!latestSlot) throw new Error('blob_latest_official_manifest_not_found');

  const start=Date.parse(epoch.protocolStart);
  const through=Date.parse(latestSlot);
  const expected:Array<{slotStart:string;jobId:string;collectionKey:string;request:unknown}>=[];
  for(let t=start;t<=through;t+=60*60*1000){
    const slotStart=new Date(t).toISOString();
    const plan=buildNaverNewsSchedulerPlan({
      query:binding.query,
      at:slotStart,
      display:NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
    });
    const identity=buildNaverNewsJobIdentity(plan.command);
    expected.push({
      slotStart,
      jobId:identity.jobId,
      collectionKey:identity.request.collectionKey,
      request:identity.request,
    });
  }

  const listedBlobIds=jobPaths.flatMap((pathname)=>{
    const relative=pathname.slice(NAVER_NEWS_MIRROR_JOB_PREFIX.length);
    const match=/^([0-9a-f]{64})\.json$/.exec(relative);
    return match ? [match[1]] : [];
  });
  const expectedIdSet=new Set(expected.map((x)=>x.jobId));
  const listedExpectedBlobIds=[...new Set(listedBlobIds)].filter((id)=>expectedIdSet.has(id));
  const blobRepo=createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(blobStore);
  const validatedBlob=await blobRepo.readJobEvidenceBatch!(listedExpectedBlobIds);
  const blobIds=new Set(validatedBlob.keys());

  const pool=new Pool({
    connectionString:dbUrl,
    max:1,
    connectionTimeoutMillis:5000,
    query_timeout:15000,
    statement_timeout:15000,
    idleTimeoutMillis:5000,
    allowExitOnIdle:true,
    ssl:{rejectUnauthorized:true},
  });

  const dbIds=new Set<string>();
  try {
    const client=await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const jobs=await client.query<{
        job_id:string; collection_key:string; request_contract:unknown; status:string;
        normalized_record_count:number|string; result_sha256:string|null;
      }>(
        `SELECT job_id, collection_key, request_contract, status,
                normalized_record_count, result_sha256
         FROM fandex.source_ingestion_jobs
         WHERE provider=$1 AND job_id=ANY($2::text[])`,
        ['naver-news', expected.map((x)=>x.jobId)],
      );
      const normalized=await client.query<{job_id:string;count:string}>(
        `SELECT raw.job_id, COUNT(*)::text AS count
         FROM fandex.source_ingestion_raw_evidence raw
         JOIN fandex.source_ingestion_normalized_records nr
           ON nr.record_id=raw.normalized_record_id
         WHERE raw.job_id=ANY($1::text[])
           AND raw.normalization_outcome='normalized'
         GROUP BY raw.job_id`,
        [expected.map((x)=>x.jobId)],
      );
      const received=await client.query<{job_id:string;count:string}>(
        `SELECT job_id, COUNT(*)::text AS count
         FROM fandex.source_ingestion_audit_events
         WHERE job_id=ANY($1::text[]) AND event_type='collection_received'
         GROUP BY job_id`,
        [expected.map((x)=>x.jobId)],
      );
      await client.query('ROLLBACK');

      const expectedById=new Map(expected.map((x)=>[x.jobId,x] as const));
      const normById=new Map(normalized.rows.map((r)=>[r.job_id.trim(),Number(r.count)]));
      const recvById=new Map(received.rows.map((r)=>[r.job_id.trim(),Number(r.count)]));
      for(const row of jobs.rows){
        const id=row.job_id.trim();
        const exp=expectedById.get(id);
        if(!exp) continue;
        const exact=
          row.collection_key===exp.collectionKey
          && canonicalJson(row.request_contract)===canonicalJson(exp.request);
        const n=Number(row.normalized_record_count);
        if(
          row.status==='succeeded'
          && exact
          && typeof row.result_sha256==='string'
          && /^[0-9a-f]{64}$/.test(row.result_sha256)
          && Number.isSafeInteger(n)
          && n===(normById.get(id)??0)
          && (recvById.get(id)??0)===1
        ) dbIds.add(id);
      }
    } catch(error){
      try{await client.query('ROLLBACK');}catch{}
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  const unionIds=new Set([...dbIds,...blobIds]);
  const missing=expected.filter((x)=>!unionIds.has(x.jobId));
  const dbOnly=expected.filter((x)=>dbIds.has(x.jobId)&&!blobIds.has(x.jobId));
  const blobOnly=expected.filter((x)=>blobIds.has(x.jobId)&&!dbIds.has(x.jobId));
  const overlap=expected.filter((x)=>blobIds.has(x.jobId)&&dbIds.has(x.jobId));

  let contiguousFromStart=0;
  for(const row of expected){
    if(!unionIds.has(row.jobId)) break;
    contiguousFromStart+=1;
  }
  let contiguousTail=0;
  for(let i=expected.length-1;i>=0;i-=1){
    if(!unionIds.has(expected[i].jobId)) break;
    contiguousTail+=1;
  }

  console.log('FANDEX_UNION_PROTOCOL_START='+epoch.protocolStart);
  console.log('FANDEX_UNION_THROUGH='+latestSlot);
  console.log('FANDEX_UNION_EXPECTED='+expected.length);
  console.log('FANDEX_UNION_POSTGRES_CANONICAL='+dbIds.size);
  console.log('FANDEX_UNION_BLOB_VALIDATED='+blobIds.size);
  console.log('FANDEX_UNION_OVERLAP='+overlap.length);
  console.log('FANDEX_UNION_DB_ONLY='+dbOnly.length);
  console.log('FANDEX_UNION_BLOB_ONLY='+blobOnly.length);
  console.log('FANDEX_UNION_PRESENT='+unionIds.size);
  console.log('FANDEX_UNION_MISSING='+missing.length);
  console.log('FANDEX_UNION_FIRST_MISSING_SLOT='+(missing[0]?.slotStart??'none'));
  console.log('FANDEX_UNION_CONTIGUOUS_FROM_START='+contiguousFromStart);
  console.log('FANDEX_UNION_CONTIGUOUS_TAIL='+contiguousTail);
  console.log('FANDEX_UNION_PROVIDER_EXECUTIONS=0');
  console.log('FANDEX_UNION_DATABASE_WRITES=0');
  console.log('FANDEX_UNION_BLOB_WRITES=0');
  console.log('FANDEX_UNION_RAW_PAYLOAD_LOGGED=false');
  console.log('FANDEX_UNION_CREDENTIALS_LOGGED=false');
}

void main().catch((error)=>{
  console.error('FANDEX_UNION_INSPECTOR_FAILED='+(error instanceof Error?error.message:'unknown'));
  process.exitCode=1;
});
