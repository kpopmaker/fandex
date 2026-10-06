import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Render scheduler binding candidate is prepared but not activated', async () => {
  const binding = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-render-scheduler-binding-candidate-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

  const workflow = await readFile(
    new URL(
      '../.github/workflows/execute-sns-fandom-youtube-render-trigger-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.equal(binding.state, 'prepared-not-activated');
  assert.equal(binding.candidateSchedule, '7 * * * *');
  assert.equal(binding.renderCronCreationAuthorized, false);
  assert.equal(binding.renderEnvironmentMutationAuthorized, false);
  assert.equal(binding.canonicalWindowRebaselineAuthorized, false);
  assert.equal(binding.providerExecutionsPerUtcHourlySlotMax, 1);
  assert.equal(binding.syntheticBackfillAllowed, false);
  assert.equal(binding.retrospectiveProviderObservationAllowed, false);
  assert.equal(binding.retrospectiveReceiptSynthesisAllowed, false);

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
  assert.match(
    workflow,
    /approved-render-sns-fandom-recurring-v1/,
  );
  assert.match(
    workflow,
    /group: fandex-sns-fandom-youtube-recurring-measurement-v1/,
  );
  assert.match(
    workflow,
    /ref: f030eaf54be5a08d517a7712dafb1596cb541ba6/,
  );
  assert.match(
    workflow,
    /FANDEX_SNS_FANDOM_YOUTUBE_API_KEY/,
  );
  assert.match(
    workflow,
    /FANDEX_NAVER_EVIDENCE_BLOB_READ_WRITE_TOKEN/,
  );
  assert.match(
    workflow,
    /providerSubmissionAuthorized=false/,
  );
  assert.match(
    workflow,
    /productionCollectionAuthorized=false/,
  );
  assert.match(
    workflow,
    /productActivationAuthorized=false/,
  );
});
