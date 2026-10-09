import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomV2IncrementalCoverageCandidateV1,
} from '../lib/intelligence/snsFandomYoutubeV2IncrementalCoverageCandidateV1';

const SHA = '27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688';
const REF = 'github-issue://kpopmaker/fandex/issues/509#issuecomment-6049459425';
const START = '2026-10-08T01:00:00.000Z';
const END = new Date(Date.parse(START) + 366 * 24 * 3600000).toISOString();
function slot(n: number): string {
  return new Date(Date.parse(START) + n * 3600000).toISOString();
}
function canonical() {
  return {
    version: 'sns-fandom-youtube-recurring-canonical-window-v2',
    state: 'active',
    priorGeneration: 'v1',
    measurementWindowStart: START,
    firstSuccessfulSlotStart: START,
    measurementWindowEnd: END,
    durationDays: 366,
    reactionSnapshotRunsPerDay: 24,
    authorizedRevisionSha: SHA,
    cutoverApprovalEvidenceRef: REF,
    historicalV1ReceiptsReinterpreted: false,
    syntheticBackfillAllowed: false,
    retrospectiveReceiptSynthesisAllowed: false,
    retrospectiveProviderObservationAllowed: false,
  };
}
function receipt(n: number, videoCount = 1) {
  return {
    version: 'sns-fandom-youtube-recurring-receipt-v2',
    state: 'completed',
    slotStart: slot(n),
    observationTime: new Date(Date.parse(slot(n)) + 7 * 60000).toISOString(),
    collectedAt: new Date(Date.parse(slot(n)) + 8 * 60000).toISOString(),
    sourceMainSha: SHA,
    measurementWindowStart: START,
    measurementWindowEnd: END,
    observedThrough: new Date(Date.parse(slot(n)) + 7 * 60000).toISOString(),
    measurementWindowComplete: false,
    uploadManifestPageCountPerReactionRun: 115,
    videoCountPerReactionRun: videoCount,
    trueZeroVideoCountObserved: videoCount === 0,
    providerCallsObserved: {
      channelsList: 5,
      playlistItemsList: 115,
      videosList: videoCount,
      total: 120 + videoCount,
    },
    quotaUnitsObserved: 120 + videoCount,
    rawVideoIdentifiersStored: false,
    rawStatisticsStored: false,
    secretMaterialStored: false,
    schedulerMutationAuthorized: true,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
  };
}
function inp(
  n: number,
  previousCheckpointText: string | null = null,
  videoCount = 1,
) {
  return {
    canonicalText: JSON.stringify(canonical()),
    receiptText: JSON.stringify(receipt(n, videoCount)),
    previousCheckpointText,
    expectedAuthorizedRevisionSha: SHA,
    expectedOwnerEvidenceRef: REF,
  };
}
function checkpoint(body: string | null) {
  assert.ok(body !== null);
  return JSON.parse(body);
}
function advance(
  n: number,
  previousCheckpointText: string | null,
  videoCount = 1,
) {
  return evaluateSnsFandomV2IncrementalCoverageCandidateV1(
    inp(n, previousCheckpointText, videoCount),
  );
}

test('genesis checks a real first-hour v2 receipt and proposes one checkpoint without writes', () => {
  const result = advance(0, null, 0);
  assert.equal(result.state, 'candidate-ready');
  const c = checkpoint(result.checkpointBody);
  assert.equal(c.completedSlotCount, 1);
  assert.equal(c.lastSlotStart, START);
  assert.equal(c.previousChainSha256, null);
  assert.equal(c.totalProviderCallsObserved, 120);
  assert.equal(c.totalQuotaUnitsObserved, 120);
  assert.equal(c.trueZeroReceiptCount, 1);
  assert.match(c.lastReceiptSha256, /^[a-f0-9]{64}$/);
  assert.match(c.chainSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.receiptBodiesRequiredForNextStep, 1);
  assert.equal(result.previousCheckpointBodiesRequiredForNextStep, 1);
  assert.equal(result.canonicalBodiesRequiredForNextStep, 1);
  assert.equal(result.blobWrites, 0);
  assert.equal(result.providerCallsPerformed, false);
  assert.equal(result.historicalBackfillPerformed, false);
});

test('two genuine contiguous receipts form an incrementally linked chain', () => {
  const a = advance(0, null, 0);
  const b = advance(1, a.checkpointBody, 2);
  assert.equal(b.state, 'candidate-ready');
  const previous = checkpoint(a.checkpointBody), current = checkpoint(b.checkpointBody);
  assert.equal(current.previousChainSha256, previous.chainSha256);
  assert.equal(current.completedSlotCount, 2);
  assert.equal(current.totalProviderCallsObserved, 242);
  assert.equal(current.totalQuotaUnitsObserved, 242);
  assert.equal(current.trueZeroReceiptCount, 1);
  assert.ok(b.checkpointPath?.endsWith('20261008T020000Z.json'));
});

test('a gap cannot be promoted by skipping over missing slot', () => {
  const a = advance(0, null);
  const r = advance(2, a.checkpointBody);
  assert.equal(r.state, 'blocked');
  assert.ok(r.blockers.includes('incremental-v2-receipt-invalid-or-noncontiguous'));
  assert.equal(r.checkpointBody, null);
});

test('duplicate receipt does not advance a checkpoint or imply another natural hour', () => {
  const a = advance(0, null);
  const r = advance(0, a.checkpointBody);
  assert.equal(r.state, 'blocked');
  assert.equal(r.checkpointBody, null);
});

test('exact immutable next checkpoint replay classifies idempotently, not as another write', () => {
  const a = advance(0, null);
  const r = evaluateSnsFandomV2IncrementalCoverageCandidateV1({
    ...inp(0),
    existingNextCheckpointText: a.checkpointBody,
  });
  assert.equal(r.state, 'idempotent-existing');
  assert.equal(r.checkpointBody, a.checkpointBody);
  assert.equal(r.blobWrites, 0);
});

test('existing immutable checkpoint with conflicting bytes fails closed', () => {
  const r = evaluateSnsFandomV2IncrementalCoverageCandidateV1({
    ...inp(0),
    existingNextCheckpointText: '{"other":"receipt"}',
  });
  assert.equal(r.state, 'blocked');
  assert.ok(r.blockers.includes('incremental-v2-immutable-checkpoint-conflict'));
});

test('tampered prior totals fail previous checkpoint digest validation', () => {
  const a = advance(0, null);
  const old = checkpoint(a.checkpointBody);
  const r = advance(1, JSON.stringify({...old,totalQuotaUnitsObserved:100}));
  assert.equal(r.state, 'blocked');
  assert.ok(r.blockers.includes('incremental-v2-previous-checkpoint-digest-mismatch'));
});

test('tampered prior chain hash is rejected', () => {
  const a = advance(0, null);
  const old = checkpoint(a.checkpointBody);
  const r = advance(1, JSON.stringify({...old,chainSha256:'f'.repeat(64)}));
  assert.equal(r.state, 'blocked');
});

test('canonical must bind first real slot, approved immutable revision and owner evidence', () => {
  for (const change of [
    {authorizedRevisionSha:'f'.repeat(40)},
    {firstSuccessfulSlotStart:slot(1)},
    {syntheticBackfillAllowed:true},
    {cutoverApprovalEvidenceRef:'github-issue://kpopmaker/fandex/issues/509#issuecomment-1'},
  ]) {
    const r = evaluateSnsFandomV2IncrementalCoverageCandidateV1({
      ...inp(0),
      canonicalText: JSON.stringify({...canonical(), ...change}),
    });
    assert.equal(r.state, 'blocked');
    assert.ok(r.blockers.includes('incremental-v2-canonical-contract-mismatch'));
  }
});

test('invalid receipt revision, observation time, and raw statistics fail closed', () => {
  for (const change of [
    {sourceMainSha:'f'.repeat(40)},
    {observationTime:slot(1)},
    {rawStatisticsStored:true},
    {providerSubmissionAuthorized:true},
    {productActivationAuthorized:true},
    {trueZeroVideoCountObserved:true},
  ]) {
    const r = evaluateSnsFandomV2IncrementalCoverageCandidateV1({
      ...inp(0),
      receiptText: JSON.stringify({...receipt(0),...change}),
    });
    assert.equal(r.state,'blocked');
  }
});

test('quota / actual provider call arithmetic cannot be forged independently', () => {
  const altered = [
    {...receipt(0),quotaUnitsObserved:0},
    {...receipt(0),providerCallsObserved:{
      channelsList:5,playlistItemsList:115,videosList:1,total:200}},
  ];
  for(const record of altered){
    const r=evaluateSnsFandomV2IncrementalCoverageCandidateV1({
      ...inp(0),receiptText:JSON.stringify(record),
    });
    assert.equal(r.state,'blocked');
  }
});

test('malformed canonical, receipt or previous checkpoint JSON fail closed', () => {
  const a=advance(0,null);
  assert.equal(evaluateSnsFandomV2IncrementalCoverageCandidateV1({
    ...inp(0),canonicalText:'{',
  }).state,'blocked');
  assert.equal(evaluateSnsFandomV2IncrementalCoverageCandidateV1({
    ...inp(0),receiptText:'{',
  }).state,'blocked');
  assert.equal(advance(1,'{').state,'blocked');
  assert.ok(a.checkpointBody);
});

test('24 contiguous real receipts can be staged offline as 24 immutable linked checkpoints', () => {
  let previous: string|null=null;
  for(let i=0;i<24;i++){
    const next=advance(i,previous,i<3?0:1);
    assert.equal(next.state,'candidate-ready');
    previous=next.checkpointBody;
  }
  const result=checkpoint(previous);
  assert.equal(result.completedSlotCount,24);
  assert.equal(result.lastSlotStart,slot(23));
  assert.equal(result.totalProviderCallsObserved, 24*120+21);
  assert.equal(result.totalQuotaUnitsObserved, 24*120+21);
  assert.equal(result.trueZeroReceiptCount,3);
  assert.equal(result.providerSubmissionAuthorized,false);
  assert.equal(result.productActivationAuthorized,false);
});

test('prior checkpoint with forged slot count or window is rejected', () => {
  const a=advance(0,null);
  const original=checkpoint(a.checkpointBody);
  for(const changed of [
    {...original,completedSlotCount:0},
    {...original,completedSlotCount:8784},
    {...original,lastSlotStart:slot(2)},
    {...original,windowEnd:slot(24)},
  ]) {
    const result=advance(1,JSON.stringify(changed));
    assert.equal(result.state,'blocked');
  }
});

test('bad approval input never authorizes provider or product operation', () => {
  const result=evaluateSnsFandomV2IncrementalCoverageCandidateV1({
    ...inp(0),expectedAuthorizedRevisionSha:'HEAD',
    expectedOwnerEvidenceRef:'https://github.com/someone/none',
  });
  assert.equal(result.state,'blocked');
  assert.equal(result.providerCallsPerformed,false);
  assert.equal(result.blobWrites,0);
  assert.equal(result.productActivationAuthorized,false);
  assert.equal(result.schedulerMutationPerformed,false);
});
