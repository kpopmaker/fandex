import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateFandexMomentumRecoveryContinuityGate,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
} from '../lib/intelligence/fandexMomentumRecoveryContinuityGate';

function hourly(start: string, count: number): string[] {
  const base = Date.parse(start);
  return Array.from({ length: count }, (_, index) =>
    new Date(base + index * 60 * 60 * 1_000).toISOString());
}

test('derives the recovery requirement from the frozen replicated-cycle baseline', () => {
  assert.equal(FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT, 48);
  assert.equal(FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT, 49);
});

test('does not bridge the observed 00Z to 07Z outage with synthetic slots', () => {
  const value = evaluateFandexMomentumRecoveryContinuityGate([
    '2026-10-01T00:00:00.000Z',
    '2026-10-01T07:00:00.000Z',
  ]);

  assert.equal(value.state, 'continuity-building');
  assert.equal(value.candidateProtocolStart, '2026-10-01T07:00:00.000Z');
  assert.equal(value.contiguousSuccessfulSlotCount, 1);
  assert.equal(value.missingSlotsSynthesized, false);
  assert.equal(value.backfillAuthorized, false);
  assert.equal(value.activationAllowed, false);
});

test('qualifies only after one bootstrap plus 48 contiguous analysis slots', () => {
  const slots = hourly(
    '2026-10-01T07:00:00.000Z',
    FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
  );
  const value = evaluateFandexMomentumRecoveryContinuityGate(slots);

  assert.equal(value.state, 'continuity-qualified-candidate');
  assert.equal(value.candidateProtocolStart, '2026-10-01T07:00:00.000Z');
  assert.equal(
    value.latestSuccessfulSlotStart,
    '2026-10-03T07:00:00.000Z',
  );
  assert.equal(value.contiguousSuccessfulSlotCount, 49);
  assert.equal(value.activationAllowed, false);
  assert.equal(value.productionOperationsApprovalRequired, true);
});

test('a later gap resets the candidate start to the latest contiguous suffix', () => {
  const slots = [
    ...hourly('2026-10-01T07:00:00.000Z', 10),
    ...hourly('2026-10-02T00:00:00.000Z', 5),
  ];
  const value = evaluateFandexMomentumRecoveryContinuityGate(slots);

  assert.equal(value.state, 'continuity-building');
  assert.equal(value.candidateProtocolStart, '2026-10-02T00:00:00.000Z');
  assert.equal(value.contiguousSuccessfulSlotCount, 5);
});

test('rejects duplicate slot evidence rather than counting it twice', () => {
  assert.throws(
    () => evaluateFandexMomentumRecoveryContinuityGate([
      '2026-10-01T07:00:00.000Z',
      '2026-10-01T07:00:00.000Z',
    ]),
    /momentum_recovery_continuity_duplicate_slot/,
  );
});
