import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeRecurringActivationBinding,
} from '../lib/intelligence/snsFandomPointYoutubeRecurringActivationBinding';

const SHA = '1111111111111111111111111111111111111111';

test('historical v1 recurring state is preserved while final v2 cutover suppresses current schedule triggers', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-recurring-measurement-activation-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

  const workflow = await readFile(
    new URL(
      '../.github/workflows/execute-sns-fandom-youtube-recurring-measurement-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  const intendedCron = raw.intendedCron as string;
  const fallbackCron = raw.redundantFallbackCronCandidate as string;
  assert.equal(intendedCron, '17 * * * *');
  assert.equal(fallbackCron, '47 * * * *');
  assert.equal(raw.schedulerTriggerOpportunitiesPerHourCandidate, 2);
  assert.equal(raw.providerExecutionsPerUtcHourlySlotMax, 1);
  // The historical activation record remains immutable evidence of the v1
  // scheduler design, while the final v2 activation revision suppresses the
  // current GitHub scheduled fallback and retains manual dispatch only.
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\nschedule:/);
  assert.doesNotMatch(workflow, /cron:\s*['"]17 \* \* \* \*['"]/);
  assert.doesNotMatch(workflow, /cron:\s*['"]47 \* \* \* \*['"]/);
  assert.doesNotMatch(workflow, /cron:\s*['"]0 \* \* \* \*['"]/);

  const authorizedRevisionSha = raw.authorizedRevisionSha as string;
  assert.match(authorizedRevisionSha, /^[0-9a-f]{40}$/);

  const result = evaluateSnsFandomYoutubeRecurringActivationBinding({
    currentRevisionSha: authorizedRevisionSha,
    now: '2026-10-05T14:17:00.000Z',
    enabled: raw.enabled === true,
    recurringExecutionAuthorized:
      raw.recurringExecutionAuthorized === true,
    schedulerMutationAuthorized:
      raw.schedulerMutationAuthorized === true,
    activationAuthorizationEvidenceRef:
      raw.activationEvidenceRef as string | null,
    authorizedRevisionSha,
    runtimeBound: raw.runtimeBound === true,
    evidenceStoreBound: raw.evidenceStoreBound === true,
    evidenceStoreCredentialLocatorRef:
      raw.evidenceStoreCredentialLocatorRef as string | null,
  });

  assert.equal(
    raw.state,
    'active-canonical-window-materialized-continuity-gap-observed',
  );
  assert.equal(raw.measurementWindowStart, '2026-10-05T22:00:00.000Z');
  assert.equal(raw.measurementWindowEnd, '2027-10-06T22:00:00.000Z');
  assert.equal(raw.continuityGapObserved, true);
  assert.deepEqual(raw.observedMissingSlotStarts, [
    '2026-10-05T23:00:00.000Z',
    '2026-10-06T00:00:00.000Z',
  ]);
  assert.equal(result.state, 'activation-candidate-ready');
  assert.equal(result.activationBoundary, '2026-10-05T14:00:00.000Z');
  assert.equal(result.measurementWindowStart, '2026-10-05T14:00:00.000Z');
  assert.equal(result.measurementWindowEnd, '2027-10-06T14:00:00.000Z');
  assert.equal(result.schedulerActivationCandidate, true);
  assert.equal(result.recurringProviderExecutionCandidate, true);
  assert.equal(result.retrospectiveBackfillAllowed, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('complete exact bindings derive the current UTC hourly activation boundary and 366-day window', () => {
  const result = evaluateSnsFandomYoutubeRecurringActivationBinding({
    currentRevisionSha: SHA,
    now: '2026-10-05T14:17:45.000Z',
    enabled: true,
    recurringExecutionAuthorized: true,
    schedulerMutationAuthorized: true,
    activationAuthorizationEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/498#issuecomment-5995396425',
    authorizedRevisionSha: SHA,
    runtimeBound: true,
    evidenceStoreBound: true,
    evidenceStoreCredentialLocatorRef:
      'github-actions-secret://FANDEX_SNS_FANDOM_EVIDENCE_BLOB_READ_WRITE_TOKEN',
  });

  assert.equal(result.state, 'activation-candidate-ready');
  assert.equal(result.activationBoundary, '2026-10-05T14:00:00.000Z');
  assert.equal(
    result.measurementWindowStart,
    '2026-10-05T14:00:00.000Z',
  );
  assert.equal(
    result.measurementWindowEnd,
    '2027-10-06T14:00:00.000Z',
  );
  assert.equal(result.durationDays, 366);
  assert.equal(result.reactionSnapshotRunsPerDay, 24);
  assert.equal(result.schedulerActivationCandidate, true);
  assert.equal(result.recurringProviderExecutionCandidate, true);
  assert.equal(result.retrospectiveBackfillAllowed, false);
});

test('stale revision fails closed', () => {
  const result = evaluateSnsFandomYoutubeRecurringActivationBinding({
    currentRevisionSha: SHA,
    now: '2026-10-05T14:17:45.000Z',
    enabled: true,
    recurringExecutionAuthorized: true,
    schedulerMutationAuthorized: true,
    activationAuthorizationEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/498#issuecomment-5995396425',
    authorizedRevisionSha:
      '2222222222222222222222222222222222222222',
    runtimeBound: true,
    evidenceStoreBound: true,
    evidenceStoreCredentialLocatorRef:
      'github-actions-secret://FANDEX_SNS_FANDOM_EVIDENCE_BLOB_READ_WRITE_TOKEN',
  });

  assert.equal(result.state, 'activation-invalid');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-recurring-authorized-revision-stale',
    ),
  );
  assert.equal(result.schedulerActivationCandidate, false);
  assert.equal(result.recurringProviderExecutionCandidate, false);
});

test('raw secret-like store values are rejected', () => {
  const result = evaluateSnsFandomYoutubeRecurringActivationBinding({
    currentRevisionSha: SHA,
    now: '2026-10-05T14:17:45.000Z',
    enabled: true,
    recurringExecutionAuthorized: true,
    schedulerMutationAuthorized: true,
    activationAuthorizationEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/498#issuecomment-5995396425',
    authorizedRevisionSha: SHA,
    runtimeBound: true,
    evidenceStoreBound: true,
    evidenceStoreCredentialLocatorRef:
      'access_token=not-a-locator',
  });

  assert.equal(result.state, 'activation-invalid');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-recurring-evidence-store-locator-invalid',
    ),
  );
});

test('authorization evidence must come from the real activation tracker', () => {
  const result = evaluateSnsFandomYoutubeRecurringActivationBinding({
    currentRevisionSha: SHA,
    now: '2026-10-05T14:17:45.000Z',
    enabled: false,
    recurringExecutionAuthorized: true,
    schedulerMutationAuthorized: true,
    activationAuthorizationEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/489#issuecomment-5995396425',
    authorizedRevisionSha: null,
    runtimeBound: false,
    evidenceStoreBound: false,
    evidenceStoreCredentialLocatorRef: null,
  });

  assert.equal(result.state, 'activation-invalid');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-recurring-activation-authorization-evidence-invalid',
    ),
  );
});
