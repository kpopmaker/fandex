import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNaverNewsJobIdentity,
  type NaverNewsIngestionWritePlan,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  runNaverNewsIngestionWorker,
  type NaverNewsAppliedEvidenceMirror,
  type NaverNewsCollector,
} from '../lib/server/ingestion/naverNewsWorker';
import type {
  NaverNewsIngestionRepository,
} from '../lib/server/ingestion/naverNewsRepository';

const command={
  provider:'naver-news' as const,
  collectionKey:'sched-v125-naver-news-20260929t000000z-123456789abc',
  query:'아이유 IU',display:1,start:1,sort:'date' as const,
};
const identity=buildNaverNewsJobIdentity(command);
const collection={
  fetchedAt:'2026-09-29T00:05:00.000Z',
  response:{
    lastBuildDate:'2026-09-29T00:04:00.000Z',
    total:1,start:1,display:1,
    items:[{
      title:'IU',originallink:'https://news.example.test/iu',
      description:'IU',pubDate:'2026-09-28T23:55:00.000Z',
    }],
  },
};
const collector:NaverNewsCollector={
  mode:'external',
  async collect(){ return collection; },
};

test('mirror stages before DB completion and finalizes after applied completion',async()=>{
  const order:string[]=[];
  const repository:NaverNewsIngestionRepository={
    async ensureJob(){order.push('ensure');return {status:'created'};},
    async claimJob(){order.push('claim');return {status:'claimed',claimToken:'a'.repeat(64),attempt:1,leaseExpiresAt:'2026-09-29T00:10:00.000Z'};},
    async completeJob(_i,_w,_c,plan){order.push('complete');return {status:'applied',resultSha256:plan.resultSha256};},
    async failJob(){order.push('fail');return {status:'retryable_failed'};},
  };
  const mirror:NaverNewsAppliedEvidenceMirror={
    async stage(_plan:NaverNewsIngestionWritePlan){order.push('stage');},
    async finalize(){order.push('finalize');},
  };
  const result=await runNaverNewsIngestionWorker({
    command,workerId:'worker',collector,repository,evidenceMirror:mirror,
    now:()=> '2026-09-29T00:00:00.000Z',
  });
  assert.equal(result.status,'applied');
  assert.deepEqual(order,['ensure','claim','stage','complete','finalize']);
});

test('stage failure uses existing retryable DB failure path and never completes',async(t)=>{
  const logs:unknown[][]=[];
  t.mock.method(console,'warn',(...args:unknown[])=>logs.push(args));
  const order:string[]=[];
  const repository:NaverNewsIngestionRepository={
    async ensureJob(){order.push('ensure');return {status:'created'};},
    async claimJob(){order.push('claim');return {status:'claimed',claimToken:'a'.repeat(64),attempt:1,leaseExpiresAt:'2026-09-29T00:10:00.000Z'};},
    async completeJob(){order.push('complete');throw new Error('should_not_complete');},
    async failJob(_i,_w,_c,code){order.push('fail:'+code);return {status:'retryable_failed'};},
  };
  const mirror:NaverNewsAppliedEvidenceMirror={
    async stage(){order.push('stage');throw new Error('blob');},
    async finalize(){order.push('finalize');},
  };
  const result=await runNaverNewsIngestionWorker({
    command,workerId:'worker',collector,repository,evidenceMirror:mirror,
    now:()=> '2026-09-29T00:00:00.000Z',
  });
  assert.equal(result.status,'retryable_failed');
  assert.deepEqual(order,['ensure','claim','stage','fail:naver_news_evidence_mirror_stage_failed']);
  assert.deepEqual(logs,[['FANDEX_NAVER_DISPATCH_FAILED_STAGE=blob_stage']]);
});

test('idempotent replay repairs missing finalization without recollection',async()=>{
  const order:string[]=[];
  const repository:NaverNewsIngestionRepository={
    async ensureJob(){order.push('ensure');return {status:'idempotent_succeeded',resultSha256:'b'.repeat(64)};},
    async claimJob(){throw new Error('should_not_claim');},
    async completeJob(){throw new Error('should_not_complete');},
    async failJob(){throw new Error('should_not_fail');},
  };
  const mirror:NaverNewsAppliedEvidenceMirror={
    async stage(){order.push('stage');},
    async finalize(i,result){order.push('finalize:'+i.jobId+':'+result);},
  };
  const result=await runNaverNewsIngestionWorker({
    command,workerId:'worker',
    collector:{mode:'external',async collect(){throw new Error('should_not_collect');}},
    repository,evidenceMirror:mirror,
    now:()=> '2026-09-29T00:00:00.000Z',
  });
  assert.equal(result.status,'idempotent_succeeded');
  assert.equal(order[0],'ensure');
  assert.match(order[1]??'',new RegExp('^finalize:'+identity.jobId+':b{64}$'));
});
