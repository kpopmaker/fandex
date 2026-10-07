import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeWindowRebaselineCandidateV2,
  SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_END,
  SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_START,
  SNS_FANDOM_YOUTUBE_RENDER_CONTINUITY_OBSERVED_THROUGH,
  SNS_FANDOM_YOUTUBE_RENDER_RELIABLE_BOUNDARY,
  SNS_FANDOM_YOUTUBE_RENDER_SCHEDULE,
  SNS_FANDOM_YOUTUBE_RENDER_SERVICE_ID,
  SNS_FANDOM_YOUTUBE_AUTHORIZED_PROVIDER_RUNTIME_SHA,
  SNS_FANDOM_YOUTUBE_REBASELINE_EVIDENCE_REF,
} from '../lib/intelligence/snsFandomPointYoutubeWindowRebaselineCandidateV2';

function baseInput() {
  return {
    currentMaterializedWindowStart:
      SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_START,
    currentMaterializedWindowEnd:
      SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_END,
    renderServiceId: SNS_FANDOM_YOUTUBE_RENDER_SERVICE_ID,
    renderSchedule: SNS_FANDOM_YOUTUBE_RENDER_SCHEDULE,
    authorizedProviderRuntimeSha:
      SNS_FANDOM_YOUTUBE_AUTHORIZED_PROVIDER_RUNTIME_SHA,
    continuityEvidenceRef: SNS_FANDOM_YOUTUBE_REBASELINE_EVIDENCE_REF,
    observedFirstSlotStart: SNS_FANDOM_YOUTUBE_RENDER_RELIABLE_BOUNDARY,
    observedLastSlotStart:
      SNS_FANDOM_YOUTUBE_RENDER_CONTINUITY_OBSERVED_THROUGH,
    observedConsecutiveSlotCount: 9,
    rebaselineAuthorized: false,
    canonicalMutationPerformed: false,
  };
}

test('checked-in v2 evidence produces a candidate but requires separate owner approval', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-window-rebaseline-candidate-v2.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    state: string;
    currentMaterializedWindow: {
      measurementWindowStart: string;
      measurementWindowEnd: string;
    };
    renderBackedContinuity: {
      renderServiceId: string;
      renderSchedule: string;
      authorizedProviderRuntimeSha: string;
      continuityEvidenceRef: string;
      observedFirstSlotStart: string;
      observedLastSlotStart: string;
      observedConsecutiveSlotCount: number;
      fallbackIdempotencyEvidence: {
        verified: boolean;
        fallbackProviderCallsPerformed: boolean;
        providerExecutionsPerUtcHourlySlotMax: number;
      };
    };
    supersedingWindowCandidate: {
      measurementWindowStart: string;
      measurementWindowEnd: string;
      durationDays: number;
      reactionSnapshotRunsPerDay: number;
      canonicalWindowRebaselineAuthorized: boolean;
      canonicalMutationPerformed: boolean;
      syntheticBackfillAllowed: boolean;
      retrospectiveReceiptSynthesisAllowed: boolean;
      retrospectiveProviderObservationAllowed: boolean;
    };
    authorityBoundary: {
      schedulerMutationAuthorizedByCandidate: boolean;
      recurringProviderExecutionAuthorizedByCandidate: boolean;
      providerSubmissionAuthorized: boolean;
      productionCollectionAuthorized: boolean;
      productActivationAuthorized: boolean;
    };
  };

  const result = evaluateSnsFandomYoutubeWindowRebaselineCandidateV2({
    currentMaterializedWindowStart:
      raw.currentMaterializedWindow.measurementWindowStart,
    currentMaterializedWindowEnd:
      raw.currentMaterializedWindow.measurementWindowEnd,
    renderServiceId: raw.renderBackedContinuity.renderServiceId,
    renderSchedule: raw.renderBackedContinuity.renderSchedule,
    authorizedProviderRuntimeSha:
      raw.renderBackedContinuity.authorizedProviderRuntimeSha,
    continuityEvidenceRef:
      raw.renderBackedContinuity.continuityEvidenceRef,
    observedFirstSlotStart:
      raw.renderBackedContinuity.observedFirstSlotStart,
    observedLastSlotStart:
      raw.renderBackedContinuity.observedLastSlotStart,
    observedConsecutiveSlotCount:
      raw.renderBackedContinuity.observedConsecutiveSlotCount,
    rebaselineAuthorized:
      raw.supersedingWindowCandidate.canonicalWindowRebaselineAuthorized,
    canonicalMutationPerformed:
      raw.supersedingWindowCandidate.canonicalMutationPerformed,
  });

  assert.equal(raw.state, 'candidate-ready-owner-approval-required');
  assert.equal(result.state, 'candidate-ready-owner-approval-required');
  assert.deepEqual(result.blockers, []);
  assert.ok(result.candidate);
  assert.equal(
    result.candidate?.measurementWindowStart,
    '2026-10-06T15:00:00.000Z',
  );
  assert.equal(
    result.candidate?.measurementWindowEnd,
    '2027-10-07T15:00:00.000Z',
  );
  assert.equal(result.candidate?.durationDays, 366);
  assert.equal(result.candidate?.reactionSnapshotRunsPerDay, 24);
  assert.equal(result.candidate?.observedConsecutiveSlotCount, 9);
  assert.equal(
    raw.renderBackedContinuity.fallbackIdempotencyEvidence.verified,
    true,
  );
  assert.equal(
    raw.renderBackedContinuity.fallbackIdempotencyEvidence
      .fallbackProviderCallsPerformed,
    false,
  );
  assert.equal(
    raw.renderBackedContinuity.fallbackIdempotencyEvidence
      .providerExecutionsPerUtcHourlySlotMax,
    1,
  );
  assert.equal(
    raw.supersedingWindowCandidate.syntheticBackfillAllowed,
    false,
  );
  assert.equal(
    raw.supersedingWindowCandidate.retrospectiveReceiptSynthesisAllowed,
    false,
  );
  assert.equal(
    raw.supersedingWindowCandidate.retrospectiveProviderObservationAllowed,
    false,
  );
  assert.equal(result.rebaselineAuthorized, false);
  assert.equal(result.canonicalMutationPerformed, false);
  assert.equal(
    raw.authorityBoundary.schedulerMutationAuthorizedByCandidate,
    false,
  );
  assert.equal(
    raw.authorityBoundary.recurringProviderExecutionAuthorizedByCandidate,
    false,
  );
  assert.equal(raw.authorityBoundary.providerSubmissionAuthorized, false);
  assert.equal(raw.authorityBoundary.productionCollectionAuthorized, false);
  assert.equal(raw.authorityBoundary.productActivationAuthorized, false);
});

test('consecutive slot count is derived from the observed UTC-hour span, not an arbitrary threshold', () => {
  const result = evaluateSnsFandomYoutubeWindowRebaselineCandidateV2({
    ...baseInput(),
    observedConsecutiveSlotCount: 8,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.candidate, null);
  assert.ok(
    result.blockers.includes(
      'youtube-window-rebaseline-consecutive-count-drift',
    ),
  );
});

test('canonical mutation fails closed without explicit rebaseline authorization', () => {
  const result = evaluateSnsFandomYoutubeWindowRebaselineCandidateV2({
    ...baseInput(),
    canonicalMutationPerformed: true,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.candidate, null);
  assert.ok(
    result.blockers.includes(
      'youtube-window-rebaseline-mutation-without-authorization',
    ),
  );
});

test('owner authorization can only move the candidate state and does not grant adjacent authorities', () => {
  const result = evaluateSnsFandomYoutubeWindowRebaselineCandidateV2({
    ...baseInput(),
    rebaselineAuthorized: true,
  });

  assert.equal(result.state, 'authorized-candidate-ready');
  assert.deepEqual(result.blockers, []);
  assert.ok(result.candidate);
  assert.equal(result.canonicalMutationPerformed, false);
  assert.equal(result.schedulerMutationAuthorizedByCandidate, false);
  assert.equal(result.recurringProviderExecutionAuthorizedByCandidate, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
});
