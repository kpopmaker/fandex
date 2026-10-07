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
  runSnsFandomYoutubeRecurringActivatedRuntimeV2,
} from '../scripts/operations/snsFandomYoutubeRecurringMeasurementRuntimeV2';

const SHA = '1111111111111111111111111111111111111111';
const ACTIVATION_REF =
  'github-issue://kpopmaker/fandex/issues/509#issuecomment-6028039071';

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

function measurement(
  observationTime: string,
  windowStart: string,
  windowEnd: string,
  videoCountPerReactionRun = 0,
): SnsFandomYoutubeBoundedMeasurementResult {
  return Object.freeze({
    contractVersion: 'sns-fandom-youtube-bounded-measurement-v1',
    state: 'bounded-measurement-completed',
    providerId: 'youtube-data-api',
    artistBindingManifestId: 'sns-fandom-youtube-audit-cohort-v1',
    artistChannelCount: 5,
    measurementWindowStart: windowStart,
    measurementWindowEnd: windowEnd,
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
    uploadManifestPageCountPerReactionRun: 7,
    videoCountPerReactionRun,
    providerCallsObserved: Object.freeze({
      channelsList: 5,
      playlistItemsList: 7,
      videosList: videoCountPerReactionRun,
      total: 12 + videoCountPerReactionRun,
    }),
    quotaUnitsObserved: 12 + videoCountPerReactionRun,
    rawVideoIdentifiersStored: false,
    rawStatisticsStored: false,
    secretMaterialStored: false,
    automaticProviderCallAllowed: false,
    productionCollectionAuthorized: false,
    providerSubmissionAuthorized: false,
    schedulerMutationAuthorized: false,
  });
}

function deps(store: MemoryStore) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    value: {
      store,
      executeMeasurement: async (
        observationTime: string,
        window: {
          measurementWindowStart: string;
          measurementWindowEnd: string;
        },
      ) => {
        calls += 1;
        return measurement(
          observationTime,
          window.measurementWindowStart,
          window.measurementWindowEnd,
        );
      },
      collectedAt: () => '2026-10-05T13:17:30.000Z',
    },
  };
}

test('first successful activated slot materializes exact 366-day canonical window', async () => {
  const store = new MemoryStore();
  const dependencies = deps(store);

  const result = await runSnsFandomYoutubeRecurringActivatedRuntimeV2(
    {
      authorizedRevisionSha: SHA,
      activationEvidenceRef: ACTIVATION_REF,
      now: '2026-10-05T13:17:00.000Z',
    },
    dependencies.value,
  );

  assert.equal(result.state, 'completed');
  assert.equal(result.providerCallsPerformed, true);
  assert.equal(dependencies.calls, 1);
  assert.equal(result.slotStart, '2026-10-05T13:00:00.000Z');
  assert.equal(
    result.measurementWindowStart,
    '2026-10-05T13:00:00.000Z',
  );
  assert.equal(
    result.measurementWindowEnd,
    '2027-10-06T13:00:00.000Z',
  );
  assert.equal(result.coverage?.receiptCount, 1);

  const windowText = store.rows.get(
    'sns-fandom/youtube-audit/recurring/v2/canonical-window.json',
  );
  assert.ok(windowText);
  const window = JSON.parse(windowText);
  assert.equal(window.firstSuccessfulSlotStart, '2026-10-05T13:00:00.000Z');
  assert.equal(window.syntheticBackfillAllowed, false);
  assert.equal(window.retrospectiveReceiptSynthesisAllowed, false);
  assert.equal(window.authorizedRevisionSha, SHA);
});

test('same activated hourly slot is idempotent and performs no second provider call', async () => {
  const store = new MemoryStore();
  const dependencies = deps(store);

  const first = await runSnsFandomYoutubeRecurringActivatedRuntimeV2(
    {
      authorizedRevisionSha: SHA,
      activationEvidenceRef: ACTIVATION_REF,
      now: '2026-10-05T13:17:00.000Z',
    },
    dependencies.value,
  );
  const second = await runSnsFandomYoutubeRecurringActivatedRuntimeV2(
    {
      authorizedRevisionSha: SHA,
      activationEvidenceRef: ACTIVATION_REF,
      now: '2026-10-05T13:59:59.000Z',
    },
    dependencies.value,
  );

  assert.equal(first.state, 'completed');
  assert.equal(second.state, 'already-recorded');
  assert.equal(second.providerCallsPerformed, false);
  assert.equal(dependencies.calls, 1);
  assert.equal(second.coverage?.receiptCount, 1);
});

test('failed first provider attempt does not materialize a canonical window', async () => {
  const store = new MemoryStore();

  await assert.rejects(
    runSnsFandomYoutubeRecurringActivatedRuntimeV2(
      {
        authorizedRevisionSha: SHA,
        activationEvidenceRef: ACTIVATION_REF,
        now: '2026-10-05T13:17:00.000Z',
      },
      {
        store,
        executeMeasurement: async () => {
          throw new Error('provider-failure');
        },
      },
    ),
    /provider-failure/,
  );

  assert.equal(
    store.rows.has(
      'sns-fandom/youtube-audit/recurring/v2/canonical-window.json',
    ),
    false,
  );
  assert.equal(
    store.rows.has(
      'sns-fandom/youtube-audit/recurring/v2/claims/20261005T130000Z.json',
    ),
    true,
  );
});

test('after a failed first slot, a later successful hour becomes the replacement window start', async () => {
  const store = new MemoryStore();

  await assert.rejects(
    runSnsFandomYoutubeRecurringActivatedRuntimeV2(
      {
        authorizedRevisionSha: SHA,
        activationEvidenceRef: ACTIVATION_REF,
        now: '2026-10-05T13:17:00.000Z',
      },
      {
        store,
        executeMeasurement: async () => {
          throw new Error('provider-failure');
        },
      },
    ),
  );

  const dependencies = deps(store);
  const recovered = await runSnsFandomYoutubeRecurringActivatedRuntimeV2(
    {
      authorizedRevisionSha: SHA,
      activationEvidenceRef: ACTIVATION_REF,
      now: '2026-10-05T14:04:00.000Z',
    },
    dependencies.value,
  );

  assert.equal(recovered.state, 'completed');
  assert.equal(
    recovered.measurementWindowStart,
    '2026-10-05T14:00:00.000Z',
  );
  assert.equal(
    recovered.measurementWindowEnd,
    '2027-10-06T14:00:00.000Z',
  );
  assert.equal(dependencies.calls, 1);
});

test('invalid activation evidence or revision fails before provider execution', async () => {
  const store = new MemoryStore();
  let calls = 0;

  await assert.rejects(
    runSnsFandomYoutubeRecurringActivatedRuntimeV2(
      {
        authorizedRevisionSha: 'not-a-sha',
        activationEvidenceRef: 'temporary-note',
        now: '2026-10-05T13:17:00.000Z',
      },
      {
        store,
        executeMeasurement: async () => {
          calls += 1;
          throw new Error('should-not-run');
        },
      },
    ),
    /sns_fandom_recurring_v2_authorized_revision_invalid/,
  );

  assert.equal(calls, 0);
});


test('v2 generation never reads or overwrites existing v1 canonical and receipts', async () => {
  const store = new MemoryStore();
  const v1WindowPath =
    'sns-fandom/youtube-audit/recurring/v1/canonical-window.json';
  const v1ReceiptPath =
    'sns-fandom/youtube-audit/recurring/v1/receipts/20261007T000000Z.json';
  const v1WindowBody = JSON.stringify({
    version: 'sns-fandom-youtube-recurring-canonical-window-v1',
    state: 'active',
    measurementWindowStart: '2026-10-05T22:00:00.000Z',
    measurementWindowEnd: '2027-10-06T22:00:00.000Z',
  });
  const v1ReceiptBody = JSON.stringify({
    version: 'sns-fandom-youtube-recurring-receipt-v1',
    state: 'completed',
    slotStart: '2026-10-07T00:00:00.000Z',
  });
  store.rows.set(v1WindowPath, v1WindowBody);
  store.rows.set(v1ReceiptPath, v1ReceiptBody);

  const dependencies = deps(store);
  const result = await runSnsFandomYoutubeRecurringActivatedRuntimeV2(
    {
      authorizedRevisionSha: SHA,
      activationEvidenceRef: ACTIVATION_REF,
      now: '2026-10-07T01:07:00.000Z',
    },
    dependencies.value,
  );

  assert.equal(result.state, 'completed');
  assert.equal(result.measurementWindowStart, '2026-10-07T01:00:00.000Z');
  assert.equal(
    store.rows.get(v1WindowPath),
    v1WindowBody,
  );
  assert.equal(
    store.rows.get(v1ReceiptPath),
    v1ReceiptBody,
  );
  assert.ok(
    store.rows.has(
      'sns-fandom/youtube-audit/recurring/v2/canonical-window.json',
    ),
  );
  assert.ok(
    store.rows.has(
      'sns-fandom/youtube-audit/recurring/v2/receipts/20261007T010000Z.json',
    ),
  );
});


test('first v2 cutover slot fails closed if v1 already recorded the same UTC hour', async () => {
  const store = new MemoryStore();
  const v1ReceiptPath =
    'sns-fandom/youtube-audit/recurring/v1/receipts/20261007T010000Z.json';
  store.rows.set(
    v1ReceiptPath,
    JSON.stringify({
      version: 'sns-fandom-youtube-recurring-receipt-v1',
      state: 'completed',
      slotStart: '2026-10-07T01:00:00.000Z',
    }),
  );
  const dependencies = deps(store);

  await assert.rejects(
    runSnsFandomYoutubeRecurringActivatedRuntimeV2(
      {
        authorizedRevisionSha: SHA,
        activationEvidenceRef: ACTIVATION_REF,
        now: '2026-10-07T01:07:00.000Z',
      },
      dependencies.value,
    ),
    /sns_fandom_recurring_v2_cutover_slot_already_recorded_by_v1/,
  );

  assert.equal(dependencies.calls, 0);
  assert.equal(
    store.rows.has(
      'sns-fandom/youtube-audit/recurring/v2/canonical-window.json',
    ),
    false,
  );
  assert.equal(
    store.rows.has(
      'sns-fandom/youtube-audit/recurring/v2/claims/20261007T010000Z.json',
    ),
    false,
  );
});
