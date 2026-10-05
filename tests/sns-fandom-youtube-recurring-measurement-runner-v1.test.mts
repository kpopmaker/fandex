import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';
import type {
  SnsFandomYoutubeBoundedMeasurementResult,
} from '../lib/intelligence/snsFandomPointYoutubeBoundedMeasurement';
import {
  evaluateSnsFandomYoutubeRecurringMeasurementPlan,
} from '../lib/intelligence/snsFandomPointYoutubeRecurringMeasurement';
import {
  runSnsFandomYoutubeRecurringMeasurementSlot,
} from '../scripts/operations/snsFandomYoutubeRecurringMeasurementRunnerV1';

const SHA = '1111111111111111111111111111111111111111';
const START = '2026-10-03T15:00:00.000Z';
const END = '2027-10-04T15:00:00.000Z';

function activation(enabled = false) {
  return {
    enabled,
    recurringExecutionAuthorized: enabled,
    schedulerMutationAuthorized: enabled,
    activationEvidenceRef: enabled
      ? 'github-issue://kpopmaker/fandex/issues/489#issuecomment-123'
      : null,
    authorizedRevisionSha: enabled ? SHA : null,
  };
}

function input(now = '2026-10-05T12:34:56.000Z', enabled = false) {
  return {
    currentRevisionSha: SHA,
    now,
    measurementWindowStart: START,
    measurementWindowEnd: END,
    reactionSnapshotRunsPerDay: 24,
    activation: activation(enabled),
  };
}

function measurement(
  observationTime: string,
  videoCountPerReactionRun = 0,
): SnsFandomYoutubeBoundedMeasurementResult {
  return Object.freeze({
    contractVersion: 'sns-fandom-youtube-bounded-measurement-v1',
    state: 'bounded-measurement-completed',
    providerId: 'youtube-data-api',
    artistBindingManifestId: 'sns-fandom-youtube-audit-cohort-v1',
    artistChannelCount: 5,
    measurementWindowStart: START,
    measurementWindowEnd: END,
    measurementStartedAt: observationTime,
    observedThrough: observationTime,
    measurementWindowComplete: false,
    reactionSnapshotRunsPerDay: 24,
    requestBatchingStrategy:
      'singleton-only-until-provider-batch-limit-evidence',
    requestedEndpoints: Object.freeze([
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ] as const),
    artists: Object.freeze([]),
    uploadManifestPageCountPerReactionRun: 115,
    videoCountPerReactionRun,
    providerCallsObserved: Object.freeze({
      channelsList: 5,
      playlistItemsList: 115,
      videosList: videoCountPerReactionRun,
      total: 120 + videoCountPerReactionRun,
    }),
    quotaUnitsObserved: 120 + videoCountPerReactionRun,
    rawVideoIdentifiersStored: false,
    rawStatisticsStored: false,
    secretMaterialStored: false,
    automaticProviderCallAllowed: false,
    productionCollectionAuthorized: false,
    providerSubmissionAuthorized: false,
    schedulerMutationAuthorized: false,
  });
}

class MemoryStore implements ImmutableTextObjectStore {
  readonly rows = new Map<string, string>();

  async readText(pathname: string): Promise<string | null> {
    return this.rows.get(pathname) ?? null;
  }

  async listPathnames(prefix: string): Promise<readonly string[]> {
    return [...this.rows.keys()]
      .filter((pathname) => pathname.startsWith(prefix))
      .sort();
  }

  async putTextIfAbsent(
    pathname: string,
    body: string,
  ): Promise<ImmutableTextObjectPutResult> {
    const existing = this.rows.get(pathname);
    if (existing !== undefined) {
      return {
        status: existing === body
          ? 'idempotent-existing'
          : 'conflict',
        pathname,
      };
    }
    this.rows.set(pathname, body);
    return { status: 'created', pathname };
  }
}

test('current preparation stays disabled and cannot call provider', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const result = await runSnsFandomYoutubeRecurringMeasurementSlot(
    input(),
    {
      store,
      executeMeasurement: async (observationTime) => {
        calls += 1;
        return measurement(observationTime);
      },
    },
  );

  assert.equal(result.state, 'disabled');
  assert.equal(result.providerCallsPerformed, false);
  assert.equal(calls, 0);
  assert.deepEqual(result.blockers, [
    'sns-fandom-recurring-explicit-activation-required',
  ]);
});

test('activated plan maps 24/day to exactly one UTC hourly slot', () => {
  const result = evaluateSnsFandomYoutubeRecurringMeasurementPlan(
    input('2026-10-05T12:34:56.000Z', true),
  );

  assert.equal(result.state, 'slot-ready');
  assert.equal(result.slotStart, '2026-10-05T12:00:00.000Z');
  assert.equal(result.reactionSnapshotRunsPerDay, 24);
  assert.equal(result.channelIdsPerCall, 1);
  assert.equal(result.videoIdsPerCall, 1);
  assert.equal(result.commentEndpointsAllowed, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('window boundaries fail closed before start and at end', () => {
  assert.equal(
    evaluateSnsFandomYoutubeRecurringMeasurementPlan(
      input('2026-10-03T14:59:59.999Z', true),
    ).state,
    'before-window',
  );
  assert.equal(
    evaluateSnsFandomYoutubeRecurringMeasurementPlan(
      input(END, true),
    ).state,
    'window-complete',
  );
});

test('stale activation revision is rejected', () => {
  const candidate = input('2026-10-05T12:00:00.000Z', true);
  const result = evaluateSnsFandomYoutubeRecurringMeasurementPlan({
    ...candidate,
    activation: {
      ...candidate.activation,
      authorizedRevisionSha:
        '2222222222222222222222222222222222222222',
    },
  });

  assert.equal(result.state, 'invalid');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-recurring-authorized-revision-stale',
    ),
  );
});

test('one activated slot writes sanitized immutable receipt and preserves true zero', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const result = await runSnsFandomYoutubeRecurringMeasurementSlot(
    input('2026-10-05T12:34:56.000Z', true),
    {
      store,
      executeMeasurement: async (observationTime) => {
        calls += 1;
        return measurement(observationTime, 0);
      },
      collectedAt: () => '2026-10-05T12:35:10.000Z',
    },
  );

  assert.equal(result.state, 'completed');
  assert.equal(result.providerCallsPerformed, true);
  assert.equal(calls, 1);
  assert.equal(result.coverage?.receiptCount, 1);
  assert.equal(result.coverage?.trueZeroReceiptCount, 1);
  assert.equal(result.coverage?.totalProviderCallsObserved, 120);
  assert.equal(result.coverage?.totalQuotaUnitsObserved, 120);

  const receiptText = store.rows.get(result.receiptPath ?? '');
  assert.ok(receiptText);
  const receipt = JSON.parse(receiptText);
  assert.equal(receipt.observationTime, '2026-10-05T12:34:56.000Z');
  assert.equal(receipt.collectedAt, '2026-10-05T12:35:10.000Z');
  assert.equal(receipt.videoCountPerReactionRun, 0);
  assert.equal(receipt.trueZeroVideoCountObserved, true);
  assert.equal(receipt.rawVideoIdentifiersStored, false);
  assert.equal(receipt.rawStatisticsStored, false);
  assert.equal(receipt.secretMaterialStored, false);
  assert.equal(receipt.productionCollectionAuthorized, false);
  assert.equal(receipt.providerSubmissionAuthorized, false);
});

test('same slot is idempotent and never performs a second provider measurement', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const deps = {
    store,
    executeMeasurement: async (observationTime: string) => {
      calls += 1;
      return measurement(observationTime, 0);
    },
    collectedAt: () => '2026-10-05T12:35:10.000Z',
  };

  const first = await runSnsFandomYoutubeRecurringMeasurementSlot(
    input('2026-10-05T12:34:56.000Z', true),
    deps,
  );
  const second = await runSnsFandomYoutubeRecurringMeasurementSlot(
    input('2026-10-05T12:59:59.000Z', true),
    deps,
  );

  assert.equal(first.state, 'completed');
  assert.equal(second.state, 'already-recorded');
  assert.equal(second.providerCallsPerformed, false);
  assert.equal(calls, 1);
  assert.equal(second.coverage?.receiptCount, 1);
});

test('pre-existing claim without receipt fails closed and does not retry provider call', async () => {
  const store = new MemoryStore();
  store.rows.set(
    'sns-fandom/youtube-audit/recurring/v1/claims/20261005T120000Z.json',
    JSON.stringify({
      version: 'sns-fandom-youtube-recurring-slot-claim-v1',
      slotStart: '2026-10-05T12:00:00.000Z',
      sourceMainSha: SHA,
    }),
  );
  let calls = 0;

  const result = await runSnsFandomYoutubeRecurringMeasurementSlot(
    input('2026-10-05T12:34:56.000Z', true),
    {
      store,
      executeMeasurement: async (observationTime) => {
        calls += 1;
        return measurement(observationTime);
      },
    },
  );

  assert.equal(result.state, 'slot-claimed');
  assert.equal(result.providerCallsPerformed, false);
  assert.equal(calls, 0);
  assert.ok(
    result.blockers.includes(
      'sns-fandom-recurring-slot-already-claimed',
    ),
  );
});
