import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowUrl = new URL(
  '../.github/workflows/execute-brand-fit-youtube-observation-v1.yml',
  import.meta.url,
);

test('Brand Fit execution workflow is manual and main-only', async () => {
  const source = await readFile(workflowUrl, 'utf8');

  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(source, /schedule:/);
  assert.doesNotMatch(source, /pull_request:/);
  assert.doesNotMatch(source, /push:/);
});

test('execution requires exact main SHA, explicit confirmation, and injected credential', async () => {
  const source = await readFile(workflowUrl, 'utf8');

  assert.match(source, /expected_main_sha:/);
  assert.match(source, /EXPECTED_MAIN_SHA/);
  assert.match(source, /test "\$EXPECTED_MAIN_SHA" = "\$GITHUB_SHA"/);
  assert.match(
    source,
    /test "\$EXECUTION_CONFIRM" = "execute-brand-fit-youtube-observation-v1"/,
  );
  assert.match(
    source,
    /secrets\.FANDEX_BRAND_FIT_YOUTUBE_API_KEY/,
  );
  assert.doesNotMatch(
    source,
    /FANDEX_BRAND_FIT_YOUTUBE_API_KEY:\s*['"]?[A-Za-z0-9_-]{8,}/,
  );
});

test('workflow calls only the bounded one-shot command and no storage or activation command', async () => {
  const source = await readFile(workflowUrl, 'utf8');

  assert.match(
    source,
    /brandFitYoutubeObservationV1\.mts --execute/,
  );
  assert.doesNotMatch(source, /prisma|psql|neon|INSERT INTO|UPDATE |DELETE FROM/);
  assert.doesNotMatch(source, /activate|cutover|publish/i);
});

test('only sanitized receipt is uploaded with one-day retention', async () => {
  const source = await readFile(workflowUrl, 'utf8');

  assert.match(
    source,
    /brand-fit-observation-receipt\.json/,
  );
  assert.match(
    source,
    /name: brand-fit-youtube-observation-receipt-v1/,
  );
  assert.match(source, /retention-days: 1/);
  assert.doesNotMatch(source, /raw.*payload/i);
});

test('workflow keeps reviewed YouTube compliance approvals explicit', async () => {
  const source = await readFile(workflowUrl, 'utf8');

  assert.match(
    source,
    /approved-brand-fit-youtube-metadata-policy-v1/,
  );
  assert.match(
    source,
    /approved-brand-fit-youtube-disclosure-v1/,
  );
});
