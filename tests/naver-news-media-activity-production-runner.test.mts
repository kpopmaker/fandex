import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL(
  '../app/api/internal/naver-news/media-activity-method-research/route.ts',
  import.meta.url,
);
const workflowUrl = new URL(
  '../.github/workflows/naver-media-activity-production-research-once.yml',
  import.meta.url,
);

test('temporary production research route is guarded, fixed-scope, and research-only', async () => {
  const source = await readFile(routeUrl, 'utf8');

  assert.match(source, /readNaverNewsRecurringConfig/);
  assert.match(source, /isNaverNewsRecurringAuthorizationValid/);
  assert.match(source, /runNaverNewsMediaActivityMethodResearch/);
  assert.match(source, /'iu'/);
  assert.match(source, /2026-09-16T06:00:00\.000Z/);
  assert.match(source, /'1,2,4,8,12'/);
  assert.match(source, /research_only_non_normative/);
  assert.match(source, /media-activity-method-research/);
  assert.match(source, /status: 403/);

  assert.doesNotMatch(source, /naverNewsExternalCollector/);
  assert.doesNotMatch(source, /naverNewsSchedulerDispatch/);
  assert.doesNotMatch(source, /metricScoringPipeline/);
  assert.doesNotMatch(source, /issueScoreEngine/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
});

test('one-shot workflow is main-push gated and reuses only the existing scheduler secret', async () => {
  const source = await readFile(workflowUrl, 'utf8');

  assert.match(source, /branches:\s*\n\s*- main/);
  assert.match(source, /\[media-activity-runtime-research\]/);
  assert.match(source, /FANDEX_NAVER_NEWS_SCHEDULER_SECRET/);
  assert.match(source, /\/api\/internal\/naver-news\/media-activity-method-research/);
  assert.match(source, /Authorization: Bearer/);
  assert.match(source, /research_only_non_normative/);
  assert.match(source, /directProductContributionEligible === false/);
  assert.match(source, /productScorePublished === false/);
  assert.match(source, /2026-09-16T06:00:00\.000Z/);
  assert.match(source, /\[1, 2, 4, 8, 12\]/);

  assert.doesNotMatch(source, /FANDEX_RUNTIME_DATABASE_URL/);
  assert.doesNotMatch(source, /schedule:/);
});
