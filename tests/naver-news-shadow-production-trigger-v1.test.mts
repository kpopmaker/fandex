import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowPath = '.github/workflows/naver-shadow-production-trigger.yml';

async function workflow(): Promise<string> {
  return readFile(workflowPath, 'utf8');
}

test('shadow production trigger is gated off by default and has no push activation', async () => {
  const source = await workflow();

  assert.match(source, /vars\.FANDEX_SHADOW_COLLECTION_ENABLED == 'true'/);
  assert.match(source, /inputs\.confirm == 'ACTIVATE'/);
  assert.doesNotMatch(source, /^\s*push:/m);
});

test('scheduled trigger retries within each hour without relying on the top of the hour', async () => {
  const source = await workflow();

  assert.match(source, /cron: '7,22,37,52 \* \* \* \*'/);
  assert.doesNotMatch(source, /cron: '0 \* \* \* \*'/);
  assert.match(source, /cancel-in-progress: false/);
});

test('trigger targets only the guarded production shadow scheduler endpoint', async () => {
  const source = await workflow();

  assert.match(
    source,
    /SHADOW_ENDPOINT: https:\/\/fandex-eta\.vercel\.app\/api\/internal\/naver-news\/shadow-scheduler/,
  );
  assert.match(source, /--request POST/);
  assert.match(source, /Authorization: Bearer \$\{SCHEDULER_SECRET\}/);
  assert.doesNotMatch(source, /api\/internal\/naver-news\/scheduler(?:\s|$)/);
});

test('scheduler secret is repository-secret backed and fails closed when missing', async () => {
  const source = await workflow();

  assert.match(source, /SCHEDULER_SECRET: \$\{\{ secrets\.FANDEX_NAVER_NEWS_SCHEDULER_SECRET \}\}/);
  assert.match(source, /if \[\[ -z "\$\{SCHEDULER_SECRET\}" \]\]; then/);
  assert.match(source, /exit 1/);
});

test('successful HTTP response must satisfy the pinned IU shadow protocol', async () => {
  const source = await workflow();

  assert.match(source, /body\?\.canonicalArtistId === 'iu'/);
  assert.match(source, /body\?\.query === '아이유 IU'/);
  assert.match(source, /body\?\.display === 100/);
  assert.match(source, /new Set\(\['applied', 'idempotent_succeeded'\]\)/);
  assert.match(source, /body\?\.mode === 'shadow-recurring-scheduler'/);
});

test('HTTP rejection does not print the response body or secret', async () => {
  const source = await workflow();

  assert.match(source, /Shadow scheduler rejected or failed with HTTP \$\{http_status\}\./);
  assert.doesNotMatch(source, /cat response\.json/);
  assert.doesNotMatch(source, /echo .*SCHEDULER_SECRET/);
});
