import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vercel automatic Git deployments are main-only', async () => {
  const raw = await readFile(
    new URL('../vercel.json', import.meta.url),
    'utf8',
  );
  const config = JSON.parse(raw);

  assert.deepEqual(config.git?.deploymentEnabled, {
    '*': false,
    main: true,
  });

  assert.deepEqual(
    config.functions?.[
      'app/api/internal/naver-news/shadow-scheduler/route.ts'
    ]?.regions,
    ['sin1'],
  );
});
