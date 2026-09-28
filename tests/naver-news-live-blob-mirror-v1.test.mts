import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  createProductionNaverNewsBlobEvidenceMirror,
  NAVER_NEWS_BLOB_MIRROR_MODE_ENV,
  NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE,
} from '../lib/server/ingestion/naverNewsBlobMirrorRuntime';
import {
  finalizeNaverNewsStoredEvidenceMirror,
  stageNaverNewsStoredEvidenceMirror,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

class MemoryStore implements ImmutableTextObjectStore {
  readonly values = new Map<string,string>();
  async readText(pathname:string){ return this.values.get(pathname) ?? null; }
  async listPathnames(prefix:string){
    return [...this.values.keys()].filter(x=>x.startsWith(prefix)).sort();
  }
  async putTextIfAbsent(pathname:string, body:string):Promise<ImmutableTextObjectPutResult>{
    const existing=this.values.get(pathname);
    if(existing===undefined){this.values.set(pathname,body);return {status:'created',pathname};}
    return {status:existing===body?'idempotent-existing':'conflict',pathname};
  }
}

function plan() {
  const identity=buildNaverNewsJobIdentity({
    provider:'naver-news',
    collectionKey:'sched-v125-naver-news-20260929t000000z-123456789abc',
    query:'아이유 IU',
    display:100,
    start:1,
    sort:'date',
  });
  return buildNaverNewsIngestionWritePlan(identity,{
    fetchedAt:'2026-09-29T00:05:00.000Z',
    response:{
      lastBuildDate:'2026-09-29T00:04:00.000Z',
      total:1,start:1,display:1,
      items:[{
        title:'IU evidence',
        originallink:'https://news.example.test/iu',
        description:'IU evidence summary',
        pubDate:'2026-09-28T23:55:00.000Z',
      }],
    },
  });
}

test('stage writes canonical job object without exposing scheduler manifest', async()=>{
  const store=new MemoryStore();
  const p=plan();
  const staged=await stageNaverNewsStoredEvidenceMirror(p,store);
  assert.equal(staged.job.status,'created');
  assert.equal(
    [...store.values.keys()].some(x=>x.includes('/scheduler-manifests/')),
    false,
  );
});

test('finalize publishes scheduler manifest only after exact staged result exists', async()=>{
  const store=new MemoryStore();
  const p=plan();
  await stageNaverNewsStoredEvidenceMirror(p,store);
  const result=await finalizeNaverNewsStoredEvidenceMirror(
    p.identity,p.resultSha256,store,
  );
  assert.equal(result.schedulerManifest?.status,'created');
  assert.equal(
    [...store.values.keys()].filter(x=>x.includes('/scheduler-manifests/')).length,
    1,
  );
});

test('finalize fails closed when stage is absent or result digest mismatches', async()=>{
  const store=new MemoryStore();
  const p=plan();
  await assert.rejects(
    ()=>finalizeNaverNewsStoredEvidenceMirror(p.identity,p.resultSha256,store),
    /stage_missing/,
  );
  await stageNaverNewsStoredEvidenceMirror(p,store);
  await assert.rejects(
    ()=>finalizeNaverNewsStoredEvidenceMirror(p.identity,'f'.repeat(64),store),
    /finalize_invalid/,
  );
});

test('Production Blob mirror remains disabled without explicit mode',()=>{
  assert.equal(createProductionNaverNewsBlobEvidenceMirror({}),null);
});

test('invalid mirror mode fails closed before SDK use',()=>{
  assert.throws(
    ()=>createProductionNaverNewsBlobEvidenceMirror({
      [NAVER_NEWS_BLOB_MIRROR_MODE_ENV]:'unexpected',
    }),
    /naver_news_blob_mirror_mode_invalid/,
  );
});

test('shadow-write mode requires Blob binding credentials',()=>{
  assert.throws(
    ()=>createProductionNaverNewsBlobEvidenceMirror({
      [NAVER_NEWS_BLOB_MIRROR_MODE_ENV]:
        NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE,
    }),
    /naver_evidence_blob_credentials_missing/,
  );
});
