import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeWindowSupersessionHandoff,
  SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END,
  SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START,
  SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS,
  type SnsFandomYoutubeWindowSupersessionHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeWindowSupersessionHandoff';

const CURRENT_REVISION = '1111111111111111111111111111111111111111';
const POLICY_APPROVAL =
  'github-issue://kpopmaker/fandex/issues/495#issuecomment-5995024898';
const CADENCE_EVIDENCE =
  'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631';
const ACTIVATION_EVIDENCE =
  'github-issue://kpopmaker/fandex/issues/489#issuecomment-7000000000';

function baseInput(
  overrides: Partial<SnsFandomYoutubeWindowSupersessionHandoffInput> = {},
): SnsFandomYoutubeWindowSupersessionHandoffInput {
  return {
    currentRevisionSha: CURRENT_REVISION,
    historicalMeasurementWindowStart:
      SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START,
    historicalMeasurementWindowEnd:
      SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END,
    reactionSnapshotRunsPerDay: 24,
    cadenceEvidenceRef: CADENCE_EVIDENCE,
    policyApprovalEvidenceRef: POLICY_APPROVAL,
    activation: {
      enabled: false,
      recurringExecutionAuthorized: false,
      schedulerMutationAuthorized: false,
      activationEvidenceRef: null,
      authorizedRevisionSha: null,
      activationBoundary: null,
      runtimeBound: false,
      evidenceStoreBound: false,
    },
    ...overrides,
  };
}

test('checked-in owner input preserves historical window and waits for real recurring activation', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-window-supersession-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    state: string;
    historicalWindow: {
      measurementWindowStart: string;
      measurementWindowEnd: string;
      reactionSnapshotRunsPerDay: number;
      cadenceEvidenceRef: string;
    };
    supersessionPolicy: {
      approvalEvidenceRef: string;
    };
    futureActivationBinding:
      SnsFandomYoutubeWindowSupersessionHandoffInput['activation'];
    supersedingWindowCandidate: unknown;
  };

  const result = evaluateSnsFandomYoutubeWindowSupersessionHandoff({
    currentRevisionSha: CURRENT_REVISION,
    historicalMeasurementWindowStart:
      raw.historicalWindow.measurementWindowStart,
    historicalMeasurementWindowEnd:
      raw.historicalWindow.measurementWindowEnd,
    reactionSnapshotRunsPerDay:
      raw.historicalWindow.reactionSnapshotRunsPerDay,
    cadenceEvidenceRef: raw.historicalWindow.cadenceEvidenceRef,
    policyApprovalEvidenceRef:
      raw.supersessionPolicy.approvalEvidenceRef,
    activation: raw.futureActivationBinding,
  });

  assert.equal(raw.state, 'policy-approved-awaiting-recurring-activation');
  assert.equal(raw.supersedingWindowCandidate, null);
  assert.equal(
    result.state,
    'policy-approved-awaiting-recurring-activation',
  );
  assert.deepEqual(result.blockers, []);
  assert.equal(result.supersessionPolicyApproved, true);
  assert.equal(
    result.historicalWindow.measurementWindowStart,
    '2026-10-03T15:00:00.000Z',
  );
  assert.equal(
    result.historicalWindow.measurementWindowEnd,
    '2027-10-04T15:00:00.000Z',
  );
  assert.equal(result.historicalWindow.state, 'historical-owner-intent-only');
  assert.equal(result.candidate, null);
  assert.equal(result.syntheticBackfillAllowed, false);
  assert.equal(result.retrospectiveProviderObservationAllowed, false);
  assert.equal(result.recurringProviderExecutionAuthorizedBySupersession, false);
  assert.equal(result.productionCollectionAuthorizedBySupersession, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('real separately authorized hourly activation produces an exact 366-day supersession candidate', () => {
  const activationBoundary = '2026-10-05T14:00:00.000Z';
  const result = evaluateSnsFandomYoutubeWindowSupersessionHandoff(
    baseInput({
      activation: {
        enabled: true,
        recurringExecutionAuthorized: true,
        schedulerMutationAuthorized: true,
        activationEvidenceRef: ACTIVATION_EVIDENCE,
        authorizedRevisionSha: CURRENT_REVISION,
        activationBoundary,
        runtimeBound: true,
        evidenceStoreBound: true,
      },
    }),
  );

  assert.equal(result.state, 'supersession-candidate-ready');
  assert.deepEqual(result.blockers, []);
  assert.ok(result.candidate);
  assert.equal(result.candidate?.measurementWindowStart, activationBoundary);
  assert.equal(
    result.candidate?.measurementWindowEnd,
    '2027-10-06T14:00:00.000Z',
  );
  assert.equal(
    result.candidate?.durationDays,
    SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS,
  );
  assert.equal(result.candidate?.reactionSnapshotRunsPerDay, 24);
  assert.equal(result.candidate?.policyApprovalEvidenceRef, POLICY_APPROVAL);
  assert.equal(
    result.candidate?.recurringActivationEvidenceRef,
    ACTIVATION_EVIDENCE,
  );
  assert.equal(result.candidate?.authorizedRevisionSha, CURRENT_REVISION);
  assert.equal(result.candidate?.syntheticBackfillAllowed, false);
  assert.equal(result.candidate?.retrospectiveReceiptSynthesisAllowed, false);
  assert.equal(result.schedulerMutationAuthorizedBySupersession, false);
  assert.equal(result.recurringProviderExecutionAuthorizedBySupersession, false);
});

test('partial activation cannot materialize a new canonical window', () => {
  const result = evaluateSnsFandomYoutubeWindowSupersessionHandoff(
    baseInput({
      activation: {
        enabled: true,
        recurringExecutionAuthorized: true,
        schedulerMutationAuthorized: false,
        activationEvidenceRef: ACTIVATION_EVIDENCE,
        authorizedRevisionSha: CURRENT_REVISION,
        activationBoundary: '2026-10-05T14:00:00.000Z',
        runtimeBound: true,
        evidenceStoreBound: false,
      },
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.equal(result.candidate, null);
  assert.ok(
    result.blockers.includes(
      'youtube-window-supersession-scheduler-mutation-not-authorized',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-window-supersession-evidence-store-not-bound',
    ),
  );
});

test('activation boundary must be an exact UTC hourly slot and bind the exact authorized revision', () => {
  const invalidBoundary = evaluateSnsFandomYoutubeWindowSupersessionHandoff(
    baseInput({
      activation: {
        enabled: true,
        recurringExecutionAuthorized: true,
        schedulerMutationAuthorized: true,
        activationEvidenceRef: ACTIVATION_EVIDENCE,
        authorizedRevisionSha: CURRENT_REVISION,
        activationBoundary: '2026-10-05T14:15:00.000Z',
        runtimeBound: true,
        evidenceStoreBound: true,
      },
    }),
  );

  assert.equal(invalidBoundary.state, 'blocked');
  assert.ok(
    invalidBoundary.blockers.includes(
      'youtube-window-supersession-activation-boundary-invalid',
    ),
  );

  const staleRevision = evaluateSnsFandomYoutubeWindowSupersessionHandoff(
    baseInput({
      activation: {
        enabled: true,
        recurringExecutionAuthorized: true,
        schedulerMutationAuthorized: true,
        activationEvidenceRef: ACTIVATION_EVIDENCE,
        authorizedRevisionSha: '2222222222222222222222222222222222222222',
        activationBoundary: '2026-10-05T14:00:00.000Z',
        runtimeBound: true,
        evidenceStoreBound: true,
      },
    }),
  );

  assert.equal(staleRevision.state, 'blocked');
  assert.ok(
    staleRevision.blockers.includes(
      'youtube-window-supersession-authorized-revision-stale',
    ),
  );
});

test('historical plan drift or non-durable policy approval fails closed', () => {
  const drift = evaluateSnsFandomYoutubeWindowSupersessionHandoff(
    baseInput({
      historicalMeasurementWindowStart: '2026-10-04T15:00:00.000Z',
      policyApprovalEvidenceRef: 'temporary-local-note',
    }),
  );

  assert.equal(drift.state, 'blocked');
  assert.equal(drift.supersessionPolicyApproved, false);
  assert.equal(drift.candidate, null);
  assert.ok(
    drift.blockers.includes(
      'youtube-window-supersession-historical-window-drift',
    ),
  );
  assert.ok(
    drift.blockers.includes(
      'youtube-window-supersession-policy-approval-invalid',
    ),
  );
});
