import assert from 'node:assert/strict';
import test from 'node:test';

import {
  verifySnsFandomV2FirstDayContinuityFromStore,
} from '../lib/intelligence/snsFandomYoutubeV2FirstDayContinuityV1';

const SHA = '27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688';
const REF = 'github-issue://kpopmaker/fandex/issues/509#issuecomment-6049459425';
const START = '2026-10-08T01:00:00.000Z';
const END = new Date(Date.parse(START) + 366 * 24 * 3600_000).toISOString();
const ROOT = 'sns-fandom/youtube-audit/recurring/v2';
const WINDOW_PATH = ROOT + '/canonical-window.json';
const INPUT = Object.freeze({
  expectedAuthorizedRevisionSha: SHA,
  expectedApprovalEvidenceRef: REF,
  expectedFirstSlotStart: START,
});

function slotAt(index: number): string {
  return new Date(Date.parse(START) + index * 3600_000).toISOString();
}

function receiptPath(index: number): string {
  return ROOT + '/receipts/'
    + slotAt(index).replace(/[-:]/g, '').replace('.000Z', 'Z')
    + '.json';
}

function canonical(): Record<string, unknown> {
  return {
    version: 'sns-fandom-youtube-recurring-canonical-window-v2',
    state: 'active',
    priorGeneration: 'v1',
    measurementWindowStart: START,
    measurementWindowEnd: END,
    firstSuccessfulSlotStart: START,
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
  const zero = index < 3;
  return {
    version: 'sns-fandom-youtube-recurring-receipt-v2',
    state: 'completed',
    slotStart: slotAt(index),
    observationTime: new Date(Date.parse(slotAt(index)) + 7 * 60_000).toISOString(),
    collectedAt: new Date(Date.parse(slotAt(index)) + 8 * 60_000).toISOString(),
    sourceMainSha: SHA,
    measurementWindowStart: START,
    measurementWindowEnd: END,
    observedThrough: new Date(Date.parse(slotAt(index)) + 7 * 60_000).toISOString(),
    videoCountPerReactionRun: zero ? 0 : 1,
    trueZeroVideoCountObserved: zero,
    providerCallsObserved: {
      channelsList: 5,
      playlistItemsList: 115,
      videosList: zero ? 0 : 1,
      total: zero ? 120 : 121,
    },
    quotaUnitsObserved: zero ? 120 : 121,
    rawVideoIdentifiersStored: false,
    rawStatisticsStored: false,
    secretMaterialStored: false,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
  };
}

class ReadOnlyMemoryStore {
  readonly rows = new Map<string, string>();
  reads = 0;
  lists = 0;
  writes = 0;

  async readText(pathname: string): Promise<string | null> {
    this.reads += 1;
    return this.rows.get(pathname) ?? null;
  }

  async listPathnames(prefix: string): Promise<readonly string[]> {
    this.lists += 1;
    return [...this.rows.keys()].filter((path) => path.startsWith(prefix)).sort();
  }

  async putTextIfAbsent(): Promise<never> {
    this.writes += 1;
    throw new Error('verification_must_never_write');
  }
}

function fixture(count: number): ReadOnlyMemoryStore {
  const store = new ReadOnlyMemoryStore();
  store.rows.set(WINDOW_PATH, JSON.stringify(canonical()));
  for (let i = 0; i < count; i += 1) {
    store.rows.set(receiptPath(i), JSON.stringify(receipt(i)));
  }
  return store;
}

test('12 genuine hours stay awaiting without inventing the other 12 receipts', async () => {
  const store = fixture(12);
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'awaiting-natural-slots');
  assert.equal(result.completedSlotCount, 12);
  assert.equal(result.missingSlotStarts.length, 12);
  assert.equal(result.missingSlotStarts[0], slotAt(12));
  assert.equal(result.totalProviderCallsObserved, 12 * 120 + 9);
  assert.equal(result.totalQuotaUnitsObserved, 12 * 120 + 9);
  assert.equal(result.trueZeroReceiptCount, 3);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.blobWrites, 0);
  assert.equal(result.providerCallsPerformed, false);
  assert.equal(store.writes, 0);
});

test('24 continuous real receipts qualify the first day but not Product', async () => {
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(
    fixture(24),
    INPUT,
  );
  assert.equal(result.state, 'first-day-complete');
  assert.equal(result.completedSlotCount, 24);
  assert.equal(result.lastVerifiedSlotStart, slotAt(23));
  assert.deepEqual(result.missingSlotStarts, []);
  assert.equal(result.totalProviderCallsObserved, 24 * 120 + 21);
  assert.equal(result.trueZeroReceiptCount, 3);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('a missing earlier hour remains a real gap even if later hours exist', async () => {
  const store = fixture(24);
  store.rows.delete(receiptPath(4));
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('sns-fandom-v2-first-day-noncontiguous-gap'));
  assert.deepEqual(result.missingSlotStarts, [slotAt(4)]);
});

test('tampered receipt revision cannot count as a verified slot', async () => {
  const store = fixture(24);
  store.rows.set(receiptPath(9), JSON.stringify({
    ...receipt(9), sourceMainSha: 'f'.repeat(40),
  }));
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('sns-fandom-v2-first-day-receipt-contract-mismatch'));
});

test('canonical must bind exactly the approved revision and issue evidence', async () => {
  const store = fixture(24);
  store.rows.set(WINDOW_PATH, JSON.stringify({
    ...canonical(), cutoverApprovalEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/509#issuecomment-1',
  }));
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('sns-fandom-v2-first-day-canonical-contract-mismatch'));
});

test('missing canonical never becomes a synthetic first-day completion', async () => {
  const store = fixture(24);
  store.rows.delete(WINDOW_PATH);
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('sns-fandom-v2-first-day-canonical-missing'));
});

test('observed zero must be consistent with the actual video count', async () => {
  const store = fixture(24);
  store.rows.set(receiptPath(0), JSON.stringify({
    ...receipt(0), trueZeroVideoCountObserved: false,
  }));
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('sns-fandom-v2-first-day-receipt-contract-mismatch'));
});

test('mismatched provider totals, quota and unsafe raw-data flags block', async () => {
  const store = fixture(24);
  store.rows.set(receiptPath(8), JSON.stringify({
    ...receipt(8), quotaUnitsObserved: 0, rawStatisticsStored: true,
  }));
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
});

test('out-of-slot observation timestamp cannot be backfilled', async () => {
  const store = fixture(24);
  store.rows.set(receiptPath(3), JSON.stringify({
    ...receipt(3), observationTime: START,
  }));
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
});

test('additional later natural receipts do not alter first-day qualification', async () => {
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(
    fixture(25),
    INPUT,
  );
  assert.equal(result.state, 'first-day-complete');
  assert.equal(result.completedSlotCount, 24);
  assert.equal(result.lastVerifiedSlotStart, slotAt(23));
});

test('malformed receipt content fails closed without a provider retry', async () => {
  const store = fixture(24);
  store.rows.set(receiptPath(15), '{');
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(store, INPUT);
  assert.equal(result.state, 'blocked');
  assert.equal(store.writes, 0);
  assert.ok(result.blockers.includes('sns-fandom-v2-first-day-receipt-json-invalid'));
});
