import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3,
  SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END,
  SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START,
  SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT,
  SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF,
} from '../lib/intelligence/snsFandomPointYoutubeWindowRebaselineFutureCutoverV3';

function baseInput() {
  return {
    currentMeasurementWindowStart:
      SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START,
    currentMeasurementWindowEnd:
      SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END,
    nextGenerationRoot: SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT,
    correctionEvidenceRef:
      SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF,
    canonicalRebaselineAuthorized: false,
    newGenerationProviderExecutionAuthorized: false,
    schedulerCutoverAuthorized: false,
    newGenerationRuntimeBound: false,
    newGenerationEvidenceStoreBound: false,
    firstSuccessfulNewGenerationSlotStart: null,
    firstSuccessfulNewGenerationReceiptRef: null,
    canonicalMutationPerformed: false,
  };
}

test('checked-in cutover v3 waits for explicit authorization and preserves null future boundary', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-window-rebaseline-future-cutover-v3.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    state: string;
    nextGeneration: {
      root: string;
      measurementWindowStart: string | null;
      measurementWindowEnd: string | null;
    };
    authorization: {
      canonicalRebaselineAuthorized: boolean;
      newGenerationProviderExecutionAuthorized: boolean;
      schedulerCutoverAuthorized: boolean;
      newGenerationRuntimeBound: boolean;
      newGenerationEvidenceStoreBound: boolean;
      firstSuccessfulNewGenerationSlotStart: string | null;
      firstSuccessfulNewGenerationReceiptRef: string | null;
      canonicalMutationPerformed: boolean;
    };
    continuity: {
      currentV1SchedulerRemainsActiveUntilCutover: boolean;
      historicalV1ReceiptsReinterpreted: boolean;
      syntheticBackfillAllowed: boolean;
      retrospectiveReceiptSynthesisAllowed: boolean;
      retrospectiveProviderObservationAllowed: boolean;
    };
  };

  const result = evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3({
    ...baseInput(),
    nextGenerationRoot: raw.nextGeneration.root,
    ...raw.authorization,
  });

  assert.equal(raw.state, 'prepared-awaiting-owner-authorization');
  assert.equal(result.state, 'prepared-awaiting-owner-authorization');
  assert.deepEqual(result.blockers, []);
  assert.equal(result.measurementWindowStart, null);
  assert.equal(result.measurementWindowEnd, null);
  assert.equal(raw.nextGeneration.measurementWindowStart, null);
  assert.equal(raw.nextGeneration.measurementWindowEnd, null);
  assert.equal(
    raw.continuity.currentV1SchedulerRemainsActiveUntilCutover,
    true,
  );
  assert.equal(raw.continuity.historicalV1ReceiptsReinterpreted, false);
  assert.equal(raw.continuity.syntheticBackfillAllowed, false);
  assert.equal(raw.continuity.retrospectiveReceiptSynthesisAllowed, false);
  assert.equal(raw.continuity.retrospectiveProviderObservationAllowed, false);
});

test('authorization alone still cannot invent a future canonical boundary', () => {
  const result = evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3({
    ...baseInput(),
    canonicalRebaselineAuthorized: true,
    newGenerationProviderExecutionAuthorized: true,
    schedulerCutoverAuthorized: true,
    newGenerationRuntimeBound: true,
    newGenerationEvidenceStoreBound: true,
  });

  assert.equal(
    result.state,
    'authorized-awaiting-first-successful-new-generation-slot',
  );
  assert.deepEqual(result.blockers, []);
  assert.equal(result.measurementWindowStart, null);
  assert.equal(result.measurementWindowEnd, null);
});

test('only a real successful new-generation receipt may materialize the boundary candidate', () => {
  const result = evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3({
    ...baseInput(),
    canonicalRebaselineAuthorized: true,
    newGenerationProviderExecutionAuthorized: true,
    schedulerCutoverAuthorized: true,
    newGenerationRuntimeBound: true,
    newGenerationEvidenceStoreBound: true,
    firstSuccessfulNewGenerationSlotStart: '2026-10-07T01:00:00.000Z',
    firstSuccessfulNewGenerationReceiptRef:
      'blob://sns-fandom/youtube-audit/recurring/v2/receipts/20261007T010000Z.json',
  });

  assert.equal(result.state, 'cutover-materialization-ready');
  assert.deepEqual(result.blockers, []);
  assert.equal(
    result.measurementWindowStart,
    '2026-10-07T01:00:00.000Z',
  );
  assert.equal(
    result.measurementWindowEnd,
    '2027-10-08T01:00:00.000Z',
  );
  assert.equal(result.historicalV1ReceiptsReinterpreted, false);
  assert.equal(result.syntheticBackfillAllowed, false);
});

test('partial authority and canonical mutation before materialization fail closed', () => {
  const partial = evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3({
    ...baseInput(),
    canonicalRebaselineAuthorized: true,
  });
  assert.equal(partial.state, 'blocked');
  assert.ok(
    partial.blockers.includes(
      'youtube-window-cutover-new-generation-provider-execution-not-authorized',
    ),
  );
  assert.ok(
    partial.blockers.includes(
      'youtube-window-cutover-scheduler-cutover-not-authorized',
    ),
  );

  const mutation = evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3({
    ...baseInput(),
    canonicalMutationPerformed: true,
  });
  assert.equal(mutation.state, 'blocked');
  assert.ok(
    mutation.blockers.includes(
      'youtube-window-cutover-mutation-without-rebaseline-authorization',
    ),
  );
});

test('past v1 receipt references are rejected as new-generation boundary evidence', () => {
  const result = evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3({
    ...baseInput(),
    canonicalRebaselineAuthorized: true,
    newGenerationProviderExecutionAuthorized: true,
    schedulerCutoverAuthorized: true,
    newGenerationRuntimeBound: true,
    newGenerationEvidenceStoreBound: true,
    firstSuccessfulNewGenerationSlotStart: '2026-10-06T15:00:00.000Z',
    firstSuccessfulNewGenerationReceiptRef:
      'blob://sns-fandom/youtube-audit/recurring/v1/receipts/20261006T150000Z.json',
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-window-cutover-first-successful-receipt-invalid',
    ),
  );
});
