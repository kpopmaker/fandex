import assert from 'node:assert/strict';
import test from 'node:test';
import { verifySnsFandomV2BootstrapReadbackCandidate } from
  '../lib/intelligence/snsFandomYoutubeV2BootstrapReadbackCandidateV1';
import { evaluateSnsFandomV2IncrementalCoverageCandidateV1 } from
  '../lib/intelligence/snsFandomYoutubeV2IncrementalCoverageCandidateV1';

const START='2026-10-08T01:00:00.000Z';
const END=new Date(Date.parse(START)+366*24*3600000).toISOString();
const SHA='27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688';
const OWNER='github-issue://kpopmaker/fandex/issues/509#issuecomment-6049459425';
const ROOT='sns-fandom/youtube-audit/recurring/v2/';
const WINDOW=ROOT+'canonical-window.json';
const RECEIPTS=ROOT+'receipts/';
const CHECKPOINTS=ROOT+'coverage-candidate/v1/checkpoints/';
const slot=(n:number)=>new Date(Date.parse(START)+n*3600000).toISOString();
const path=(n:number,prefix:string)=>
  prefix+slot(n).replace(/[-:]/g,'').replace('.000Z','Z')+'.json';

function canonical() {
  return {
    version:'sns-fandom-youtube-recurring-canonical-window-v2',state:'active',
    priorGeneration:'v1',measurementWindowStart:START,
    firstSuccessfulSlotStart:START,measurementWindowEnd:END,
    durationDays:366,reactionSnapshotRunsPerDay:24,
    authorizedRevisionSha:SHA,cutoverApprovalEvidenceRef:OWNER,
    historicalV1ReceiptsReinterpreted:false,syntheticBackfillAllowed:false,
    retrospectiveReceiptSynthesisAllowed:false,
    retrospectiveProviderObservationAllowed:false,
  };
}
function receipt(i:number) {
  const zero=i<3;
  return {
    version:'sns-fandom-youtube-recurring-receipt-v2',state:'completed',
    slotStart:slot(i),observationTime:new Date(Date.parse(slot(i))+7*60000).toISOString(),
    collectedAt:new Date(Date.parse(slot(i))+8*60000).toISOString(),
    sourceMainSha:SHA,measurementWindowStart:START,measurementWindowEnd:END,
    observedThrough:new Date(Date.parse(slot(i))+7*60000).toISOString(),
    videoCountPerReactionRun:zero?0:1,trueZeroVideoCountObserved:zero,
    providerCallsObserved:{channelsList:5,playlistItemsList:115,videosList:zero?0:1,
      total:zero?120:121},
    quotaUnitsObserved:zero?120:121,
    rawVideoIdentifiersStored:false,rawStatisticsStored:false,secretMaterialStored:false,
    providerSubmissionAuthorized:false,productionCollectionAuthorized:false,
    productActivationAuthorized:false,
  };
}
class Store {
  rows=new Map<string,string>();
  reads=0;
  lists=0;
  writes=0;
  async readText(pathname:string):Promise<string|null> {
    this.reads++;
    return this.rows.get(pathname)??null;
  }
  async listPathnames(prefix:string):Promise<readonly string[]> {
    this.lists++;
    return [...this.rows.keys()].filter(x=>x.startsWith(prefix)).sort();
  }
  async putTextIfAbsent():Promise<never> {
    this.writes++;
    throw new Error('bootstrap_must_not_write');
  }
}
function fixture(count:number) {
  const store=new Store();
  store.rows.set(WINDOW,JSON.stringify(canonical()));
  for(let i=0;i<count;i++)store.rows.set(path(i,RECEIPTS),JSON.stringify(receipt(i)));
  return store;
}
async function audit(store:Store, n:number){
  return verifySnsFandomV2BootstrapReadbackCandidate(
    store,{throughObservedSlotStart:slot(n-1)}
  );
}
function addExpectedCheckpoints(store:Store,count:number) {
  let previousCheckpointText:string|null=null;
  const canonicalText=store.rows.get(WINDOW)!;
  for(let i=0;i<count;i++){
    const receiptText=store.rows.get(path(i,RECEIPTS))!;
    const c=evaluateSnsFandomV2IncrementalCoverageCandidateV1({
      canonicalText,receiptText,previousCheckpointText,
      expectedAuthorizedRevisionSha:SHA,expectedOwnerEvidenceRef:OWNER,
    });
    assert.equal(c.state,'candidate-ready');
    assert.ok(c.checkpointBody&&c.checkpointPath);
    store.rows.set(c.checkpointPath,c.checkpointBody);
    previousCheckpointText=c.checkpointBody;
  }
}
test('full 24 real canonical receipts replay with no mutations',async()=>{
  const s=fixture(24),r=await audit(s,24);
  assert.equal(r.state,'bootstrap-candidate-complete');
  assert.equal(r.expectedSlots,24);
  assert.equal(r.validatedReceiptBodies,24);
  assert.equal(r.validatedExistingCheckpointBodies,0);
  assert.equal(r.totalProviderCallsObserved,24*120+21);
  assert.equal(r.totalQuotaUnitsObserved,24*120+21);
  assert.equal(r.trueZeroReceiptCount,3);
  assert.equal(r.lastVerifiedSlotStart,slot(23));
  assert.equal(r.proposedCheckpointCount,24);
  assert.match(r.lastProposedCheckpointChainSha256??'',/^[0-9a-f]{64}$/);
  assert.equal(s.reads,25); // canonical + one receipt per hour
  assert.equal(s.lists,2);
  assert.equal(s.writes,0);
  assert.equal(r.blobWrites,0);
  assert.equal(r.checkpointBodiesPersisted,0);
  assert.equal(r.providerCallsPerformed,false);
});
test('36-hour replay uses linear read work, not cumulative quadratic rereads',async()=>{
  const s=fixture(36),r=await audit(s,36);
  assert.equal(r.state,'bootstrap-candidate-complete');
  assert.equal(r.validatedReceiptBodies,36);
  assert.equal(r.totalProviderCallsObserved,36*120+33);
  assert.equal(s.reads,37);
});
test('all existing exact candidate checkpoints are independently replayed byte-for-byte',async()=>{
  const s=fixture(3);
  addExpectedCheckpoints(s,3);
  const r=await audit(s,3);
  assert.equal(r.state,'bootstrap-candidate-complete');
  assert.equal(r.validatedExistingCheckpointBodies,3);
  assert.equal(s.reads,7);
  assert.equal(s.writes,0);
});
test('partially stored checkpoint prefix can safely resume without storing anything',async()=>{
  const s=fixture(4);
  addExpectedCheckpoints(s,2);
  const r=await audit(s,4);
  assert.equal(r.state,'bootstrap-candidate-complete');
  assert.equal(r.validatedExistingCheckpointBodies,2);
  assert.equal(r.validatedReceiptBodies,4);
  assert.equal(s.writes,0);
});
test('missing natural middle hour blocks replay and does not reinterpret as zero',async()=>{
  const s=fixture(5);
  s.rows.delete(path(2,RECEIPTS));
  const r=await audit(s,5);
  assert.equal(r.state,'blocked');
  assert.deepEqual(r.missingReceiptSlotStarts,[slot(2)]);
  assert.equal(r.validatedReceiptBodies,2);
  assert.equal(r.totalProviderCallsObserved,240);
});
test('trailing missing hour never becomes a completed bootstrap',async()=>{
  const s=fixture(3);
  const r=await audit(s,4);
  assert.equal(r.state,'blocked');
  assert.deepEqual(r.missingReceiptSlotStarts,[slot(3)]);
});
test('indexed missing receipt body fails closed',async()=>{
  const s=fixture(2);
  const read=s.readText.bind(s);
  s.readText=async pathname=>pathname===path(1,RECEIPTS)?null:read(pathname);
  const r=await audit(s,2);
  assert.equal(r.state,'blocked');
  assert.ok(r.blockers.includes('bootstrap-v2-indexed-receipt-unreadable'));
});
test('tampered actual receipt fails with no synthetic successor',async()=>{
  const s=fixture(3);
  s.rows.set(path(1,RECEIPTS),JSON.stringify({...receipt(1),sourceMainSha:'f'.repeat(40)}));
  const r=await audit(s,3);
  assert.equal(r.state,'blocked');
  assert.equal(r.validatedReceiptBodies,1);
  assert.ok(r.blockers.includes('bootstrap-v2-incremental-candidate-blocked'));
});
test('wrong approved canonical and missing canonical are blockers',async()=>{
  const s=fixture(1);
  s.rows.set(WINDOW,JSON.stringify({...canonical(),durationDays:365}));
  assert.equal((await audit(s,1)).state,'blocked');
  s.rows.delete(WINDOW);
  assert.ok((await audit(s,1)).blockers.includes('bootstrap-v2-canonical-missing'));
});
test('existing checkpoint tamper is rejected even when receipt is intact',async()=>{
  const s=fixture(3);
  addExpectedCheckpoints(s,3);
  const altered=JSON.parse(s.rows.get(path(1,CHECKPOINTS))!);
  s.rows.set(path(1,CHECKPOINTS),JSON.stringify({...altered,totalQuotaUnitsObserved:1}));
  const r=await audit(s,3);
  assert.equal(r.state,'blocked');
  assert.ok(r.blockers.includes('incremental-v2-immutable-checkpoint-conflict'));
  assert.equal(r.validatedExistingCheckpointBodies,1);
});
test('orphan existing checkpoint after missing slot blocks without reusing stale tip',async()=>{
  const s=fixture(3);
  addExpectedCheckpoints(s,3);
  s.rows.delete(path(1,RECEIPTS));
  const r=await audit(s,3);
  assert.equal(r.state,'blocked');
  assert.ok(r.blockers.includes('bootstrap-v2-existing-checkpoint-past-verified-tip'));
  assert.equal(r.validatedReceiptBodies,1);
});
test('malformed receipt index paths fail closed even with otherwise valid bytes',async()=>{
  const s=fixture(1);
  s.rows.set(RECEIPTS+'bad.json','{}');
  const r=await audit(s,1);
  assert.ok(r.blockers.includes('bootstrap-v2-unexpected-receipt-path'));
  assert.equal(r.validatedReceiptBodies,0);
});
test('checkpoint path outside canonical or malformed is not trusted',async()=>{
  const s=fixture(1);
  s.rows.set(CHECKPOINTS+'20260101T000000Z.json','{}');
  assert.ok((await audit(s,1)).blockers.includes('bootstrap-v2-orphan-checkpoint-path'));
  s.rows.delete(CHECKPOINTS+'20260101T000000Z.json');
  s.rows.set(CHECKPOINTS+'not-a-slot.json','{}');
  assert.ok((await audit(s,1)).blockers.includes('bootstrap-v2-unexpected-checkpoint-path'));
});
test('invalid operator horizon cannot establish scheduler proof',async()=>{
  const s=fixture(1);
  for(const horizon of ['bad','2026-10-08T00:00:00.000Z',END,
    '2026-10-08T01:07:00.000Z']){
    const r=await verifySnsFandomV2BootstrapReadbackCandidate(
      s,{throughObservedSlotStart:horizon});
    assert.equal(r.state,'blocked');
    assert.equal(s.writes,0);
  }
});
test('privacy and authority fields stay disabled for read-only replay',async()=>{
  const s=fixture(1);
  s.rows.set(path(0,RECEIPTS),JSON.stringify({
    ...receipt(0),providerSubmissionAuthorized:true,
  }));
  const r=await audit(s,1);
  assert.equal(r.state,'blocked');
  assert.equal(r.providerSubmissionAuthorized,false);
  assert.equal(r.productionCollectionAuthorized,false);
  assert.equal(r.productActivationAuthorized,false);
  assert.equal(r.historicalBackfillPerformed,false);
  assert.equal(r.providerCallsPerformed,false);
  assert.equal(r.blobWrites,0);
});
test('future valid receipts are not falsely attested by an earlier horizon',async()=>{
  const s=fixture(5);
  const r=await audit(s,2);
  assert.equal(r.state,'bootstrap-candidate-complete');
  assert.equal(r.validatedReceiptBodies,2);
  assert.equal(r.lastVerifiedSlotStart,slot(1));
});
