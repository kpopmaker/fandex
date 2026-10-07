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

test('checked-in v2 evidence is preserved but superseded before authorization', async () => {
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
    supersededBy: string;
    safetyCorrectionEvidenceRef: string;
    renderBackedContinuity: {
      observationsRemainBoundToCurrentWindow: boolean;
      observedConsecutiveSlotCount: number;
      latestReceiptPath: string;
    };
    supersedingWindowCandidate: {
      promotionAllowed: boolean;
      canonicalWindowRebaselineAuthorized: boolean;
      canonicalMutationPerformed: boolean;
      syntheticBackfillAllowed: boolean;
      retrospectiveReceiptSynthesisAllowed: boolean;
      retrospectiveProviderObservationAllowed: boolean;
    };
    latestVerifiedCoverage: {
      receiptCount: number;
      totalProviderCallsObserved: number;
      totalQuotaUnitsObserved: number;
    };
  };

  assert.equal(raw.state, 'superseded-before-authorization');
  assert.equal(
    raw.supersededBy,
    'sns_fandom_youtube_window_rebaseline_future_cutover_v3',
  );
  assert.equal(
    raw.safetyCorrectionEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/509#issuecomment-6027895747',
  );
  assert.equal(
    raw.renderBackedContinuity.observationsRemainBoundToCurrentWindow,
    true,
  );
  assert.equal(raw.renderBackedContinuity.observedConsecutiveSlotCount, 10);
  assert.equal(
    raw.renderBackedContinuity.latestReceiptPath,
    'sns-fandom/youtube-audit/recurring/v1/receipts/20261007T000000Z.json',
  );
  assert.equal(raw.supersedingWindowCandidate.promotionAllowed, false);
  assert.equal(
    raw.supersedingWindowCandidate.canonicalWindowRebaselineAuthorized,
    false,
  );
  assert.equal(
    raw.supersedingWindowCandidate.canonicalMutationPerformed,
    false,
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
  assert.equal(raw.latestVerifiedCoverage.receiptCount, 14);
  assert.equal(raw.latestVerifiedCoverage.totalProviderCallsObserved, 1734);
  assert.equal(raw.latestVerifiedCoverage.totalQuotaUnitsObserved, 1734);
});

test('historical v2 evaluator still derives consecutive slot count instead of inventing a threshold', () => {
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

test('historical v2 evaluator fails closed on canonical mutation without authorization', () => {
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

test('historical v2 evaluator authorization never grants adjacent authorities', () => {
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
