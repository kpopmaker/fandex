import assert from 'node:assert/strict';
import test from 'node:test';

import {
  modelSnsFandomV2ReceiptScanWorkV1,
  SNS_FANDOM_V2_TOTAL_PLANNED_SLOTS,
} from '../lib/intelligence/snsFandomYoutubeV2ReceiptScanWorkModelV1';

test('zero receipts create no modeled reads and no derived amplification', () => {
  const r = modelSnsFandomV2ReceiptScanWorkV1(0);
  assert.equal(r.expectedReceiptBodiesReadOnFinalCompletedSlot, 0);
  assert.equal(r.cumulativeReceiptBodiesReadThroughCompletedSlots, 0);
  assert.equal(r.amplificationRelativeToOneReadPerSlot, null);
});

test('first successful slot scans its own receipt once', () => {
  const r = modelSnsFandomV2ReceiptScanWorkV1(1);
  assert.equal(r.expectedReceiptBodiesReadOnFinalCompletedSlot, 1);
  assert.equal(r.cumulativeReceiptBodiesReadThroughCompletedSlots, 1);
  assert.equal(r.amplificationRelativeToOneReadPerSlot, 1);
});

test('first-day exact count is lower bound, not billed usage', () => {
  const r = modelSnsFandomV2ReceiptScanWorkV1(24);
  assert.equal(r.expectedReceiptBodiesReadOnFinalCompletedSlot, 24);
  assert.equal(r.cumulativeReceiptBodiesReadThroughCompletedSlots, 300);
  assert.equal(r.productionVercelOperationsMeasured, false);
  assert.equal(r.youtubeApiCallsCounted, false);
  assert.equal(r.providerQuotaUnitsCounted, false);
});

test('37 real slots show only theoretical work, not an incident', () => {
  const r = modelSnsFandomV2ReceiptScanWorkV1(37);
  assert.equal(r.expectedReceiptBodiesReadOnFinalCompletedSlot, 37);
  assert.equal(r.cumulativeReceiptBodiesReadThroughCompletedSlots, 703);
  assert.equal(r.linearOneReadPerSuccessfulSlotReference, 37);
  assert.equal(r.amplificationRelativeToOneReadPerSlot, 19);
});

test('all 366 days have 8784 planned slots and quadratic cumulative reads', () => {
  assert.equal(SNS_FANDOM_V2_TOTAL_PLANNED_SLOTS, 8784);
  const r = modelSnsFandomV2ReceiptScanWorkV1(
    SNS_FANDOM_V2_TOTAL_PLANNED_SLOTS,
  );
  assert.equal(r.expectedReceiptBodiesReadOnFinalCompletedSlot, 8784);
  assert.equal(r.cumulativeReceiptBodiesReadThroughCompletedSlots, 38583720);
  assert.equal(r.amplificationRelativeToOneReadPerSlot, 4392.5);
  assert.equal(r.blobWritesPerformed, false);
  assert.equal(r.providerCallsPerformed, false);
  assert.equal(r.authorizedRuntimeChanged, false);
});

test('modeled work increments by exactly the new slot count', () => {
  for (const n of [1, 2, 24, 37, 500, 8784]) {
    const cur = modelSnsFandomV2ReceiptScanWorkV1(n);
    const prior = modelSnsFandomV2ReceiptScanWorkV1(n - 1);
    assert.equal(
      cur.cumulativeReceiptBodiesReadThroughCompletedSlots
      - prior.cumulativeReceiptBodiesReadThroughCompletedSlots,
      n,
    );
  }
});

test('negative, fractional, non-finite, and beyond-window counts fail closed', () => {
  for (const n of [-1, 0.5, Number.NaN, Infinity, 8785]) {
    assert.throws(
      () => modelSnsFandomV2ReceiptScanWorkV1(n),
      /sns_fandom_v2_receipt_scan_slot_count_outside_canonical/,
    );
  }
});
