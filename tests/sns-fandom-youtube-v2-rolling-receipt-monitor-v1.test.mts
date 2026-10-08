import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomV2RollingReceiptMonitor,
} from '../lib/intelligence/snsFandomYoutubeV2RollingReceiptMonitorV1';

const SHA = '27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688';
const REF = 'github-issue://kpopmaker/fandex/issues/509#issuecomment-6049459425';
const FIRST = '2026-10-08T01:00:00.000Z';
const END = new Date(Date.parse(FIRST) + 366 * 24 * 3_600_000).toISOString();
const ROOT = 'sns-fandom/youtube-audit/recurring/v2';

function slot(index: number): string {
  return new Date(Date.parse(FIRST) + index * 3_600_000).toISOString();
}
function pathname(index: number): string {
  return ROOT + '/receipts/'
    + slot(index).replace(/[-:]/g, '').replace('.000Z', 'Z') + '.json';
}
function canonical(): Record<string, unknown> {
  return {
    version: 'sns-fandom-youtube-recurring-canonical-window-v2',
    state: 'active',
    priorGeneration: 'v1',
    measurementWindowStart: FIRST,
    measurementWindowEnd: END,
    firstSuccessfulSlotStart: FIRST,
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
function receipt(index: number): Record<string, unknown> {
  const videos = index < 3 ? 0 : 1;
  return {
    version: 'sns-fandom-youtube-recurring-receipt-v2',
    state: 'completed',
    slotStart: slot(index),
    observationTime: new Date(Date.parse(slot(index)) + 7 * 60_000).toISOString(),
    collectedAt: new Date(Date.parse(slot(index)) + 8 * 60_000).toISOString(),
    sourceMainSha: SHA,
    measurementWindowStart: FIRST,
    measurementWindowEnd: END,
    videoCountPerReactionRun: videos,
    trueZeroVideoCountObserved: videos === 0,
    providerCallsObserved: {
      channelsList: 5,
      playlistItemsList: 115,
      videosList: videos,
      total: 120 + videos,
    },
    quotaUnitsObserved: 120 + videos,
    rawVideoIdentifiersStored: false,
    rawStatisticsStored: false,
    secretMaterialStored: false,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
  };
}
class ReadOnlyStore {
  readonly rows = new Map<string, string>();
  readCount = 0;
  listCount = 0;
  writeCount = 0;
  async readText(path: string): Promise<string | null> {
    this.readCount++;
    return this.rows.get(path) ?? null;
  }
  async listPathnames(prefix: string): Promise<readonly string[]> {
    this.listCount++;
    return [...this.rows.keys()].filter(path => path.startsWith(prefix));
  }
  async putTextIfAbsent(): Promise<never> {
    this.writeCount++;
    throw new Error('read_only_monitor_cannot_write');
  }
}
function fixture(count: number): ReadOnlyStore {
  const store = new ReadOnlyStore();
  store.rows.set(ROOT + '/canonical-window.json', JSON.stringify(canonical()));
  for (let i=0; i<count; i++) store.rows.set(pathname(i), JSON.stringify(receipt(i)));
  return store;
}
function inputs(throughIndex: number) {
  return {
    authorizedRevisionSha: SHA,
    ownerEvidenceRef: REF,
    firstSuccessfulSlotStart: FIRST,
    throughObservedSlotStart: slot(throughIndex),
  };
}

test('twelve actual slots verify continuously through an externally checked horizon', async () => {
  const store=fixture(12);
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'continuous-to-operator-horizon');
  assert.equal(r.expectedSlots,12);
  assert.equal(r.verifiedReceipts,12);
  assert.equal(r.observedProviderCalls,12*120+9);
  assert.equal(r.observedQuotaUnits,12*120+9);
  assert.equal(r.trueZeroReceipts,3);
  assert.equal(r.lastVerifiedSlotStart,slot(11));
  assert.deepEqual(r.missingSlotStarts,[]);
  assert.equal(r.blobWrites,0);
  assert.equal(r.providerCallsPerformed,false);
  assert.equal(store.writeCount,0);
});

test('future or unobserved final slot is unconfirmed, never a fabricated zero', async () => {
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(fixture(12),inputs(12));
  assert.equal(r.state,'trailing-evidence-unconfirmed');
  assert.deepEqual(r.missingSlotStarts,[slot(12)]);
  assert.equal(r.verifiedReceipts,12);
});

test('a gap between real receipts is confirmed rather than filled', async () => {
  const store=fixture(12);
  store.rows.delete(pathname(4));
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'confirmed-internal-gap');
  assert.deepEqual(r.missingSlotStarts,[slot(4)]);
  assert.equal(r.verifiedReceipts,11);
});

test('canonical revision mismatch blocks and cannot be rebaselined by monitor', async () => {
  const store=fixture(12);
  store.rows.set(ROOT+'/canonical-window.json',JSON.stringify({
    ...canonical(),authorizedRevisionSha:'f'.repeat(40),
  }));
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'blocked');
  assert.ok(r.blockers.includes('sns-fandom-rolling-v2-canonical-contract-mismatch'));
  assert.equal(store.writeCount,0);
});

test('tampered receipt source SHA is blocked', async () => {
  const store=fixture(12);
  store.rows.set(pathname(5),JSON.stringify({...receipt(5),sourceMainSha:'f'.repeat(40)}));
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'blocked');
  assert.ok(r.blockers.includes('sns-fandom-rolling-v2-receipt-contract-mismatch'));
});

test('provider calls and quota mismatch block qualification', async () => {
  const store=fixture(12);
  store.rows.set(pathname(7),JSON.stringify({...receipt(7),quotaUnitsObserved:0}));
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'blocked');
});

test('false zero is not equivalent to a provider-observed true zero', async () => {
  const store=fixture(12);
  store.rows.set(pathname(0),JSON.stringify({...receipt(0),trueZeroVideoCountObserved:false}));
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'blocked');
});

test('raw statistics or Product authority leakage is rejected', async () => {
  const store=fixture(12);
  store.rows.set(pathname(3),JSON.stringify({
    ...receipt(3),rawStatisticsStored:true,productActivationAuthorized:true,
  }));
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'blocked');
});

test('non-slot observation time blocks retrospective synthesis', async () => {
  const store=fixture(12);
  store.rows.set(pathname(8),JSON.stringify({...receipt(8),observationTime:FIRST}));
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(r.state,'blocked');
});

test('malformed receipt and missing canonical fail closed without writes', async () => {
  const store=fixture(12);
  store.rows.set(pathname(5),'{');
  const bad=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(bad.state,'blocked');
  assert.ok(bad.blockers.includes('sns-fandom-rolling-v2-receipt-json-invalid'));
  store.rows.delete(ROOT+'/canonical-window.json');
  const missing=await evaluateSnsFandomV2RollingReceiptMonitor(store,inputs(11));
  assert.equal(missing.state,'blocked');
  assert.equal(store.writeCount,0);
});

test('explicit observation horizon outside 366-day canonical window is rejected', async () => {
  const bad={...inputs(11),throughObservedSlotStart:slot(366*24)};
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(fixture(12),bad);
  assert.equal(r.state,'blocked');
  assert.ok(r.blockers.includes('sns-fandom-rolling-v2-horizon-outside-canonical'));
});

test('later receipts never count toward a shorter operator horizon', async () => {
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(fixture(25),inputs(11));
  assert.equal(r.state,'continuous-to-operator-horizon');
  assert.equal(r.verifiedReceipts,12);
});

test('invalid approval evidence and invalid hour are fail-closed', async () => {
  const bad={...inputs(11),ownerEvidenceRef:'https://example.test/false',
    throughObservedSlotStart:'2026-10-08T12:07:00.000Z'};
  const r=await evaluateSnsFandomV2RollingReceiptMonitor(fixture(12),bad);
  assert.equal(r.state,'blocked');
  assert.ok(r.blockers.length>=2);
});
