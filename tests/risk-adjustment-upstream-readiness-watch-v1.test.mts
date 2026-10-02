import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  RISK_ADJUSTMENT_CURRENT_MAIN_READINESS_WATCH_PATHS,
  RISK_ADJUSTMENT_FUTURE_MERGE_TARGET_WATCH_PATHS,
  RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH,
  RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH_PATHS,
} from '../lib/intelligence/riskAdjustmentUpstreamReadinessWatch';
import {
  RISK_ADJUSTMENT_UPSTREAM_CANDIDATES,
} from '../lib/intelligence/riskAdjustmentPointConstruct';

const workflow = readFileSync(
  '.github/workflows/validate-risk-adjustment-contract-v1.yml',
  'utf8',
);

test('readiness watch covers every Risk upstream candidate exactly once', () => {
  assert.deepEqual(
    RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.map(
      (entry) => entry.variableId,
    ),
    RISK_ADJUSTMENT_UPSTREAM_CANDIDATES,
  );

  assert.equal(
    new Set(
      RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.map(
        (entry) => entry.variableId,
      ),
    ).size,
    RISK_ADJUSTMENT_UPSTREAM_CANDIDATES.length,
  );
});

test('every readiness watch entry has non-empty unique source paths', () => {
  for (const entry of RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH) {
    assert.ok(entry.watchedPaths.length > 0, entry.variableId);
    assert.equal(
      new Set(entry.watchedPaths.map((watched) => watched.path)).size,
      entry.watchedPaths.length,
      entry.variableId,
    );
    assert.equal(
      entry.watchedPaths.every(
        (watched) =>
          watched.path.trim().length > 0
          && (
            watched.mode === 'current-main'
            || watched.mode === 'future-merge-target'
          ),
      ),
      true,
      entry.variableId,
    );
  }
});

test('every current-main readiness watch path exists in the checked-out repository', () => {
  for (const path of RISK_ADJUSTMENT_CURRENT_MAIN_READINESS_WATCH_PATHS) {
    assert.equal(
      existsSync(path),
      true,
      'missing current-main readiness source ' + path,
    );
  }
});

test('future merge-target watches are explicit and limited to currently external branches', () => {
  assert.deepEqual(
    RISK_ADJUSTMENT_FUTURE_MERGE_TARGET_WATCH_PATHS,
    [
      'lib/alternative-evidence/albumProductionReadinessResearch.ts',
      'lib/alternative-evidence/albumProviderAuthorizationResearch.ts',
      'lib/alternative-evidence/iuLuminateProductionReviewGateResearch.ts',
      'lib/intelligence/fandexMomentumCurrentEvaluationPipeline.ts',
    ],
  );
});

test('Risk workflow trigger contains every declared upstream readiness source path', () => {
  for (const path of RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH_PATHS) {
    assert.ok(
      workflow.includes(`- '${path}'`),
      'missing Risk workflow trigger for ' + path,
    );
  }
});

test('Risk workflow trigger watches readiness manifest and its parity regression', () => {
  assert.ok(
    workflow.includes(
      "- 'lib/intelligence/riskAdjustmentUpstreamReadinessWatch.ts'",
    ),
  );
  assert.ok(
    workflow.includes(
      "- 'tests/risk-adjustment-upstream-readiness-watch-v1.test.mts'",
    ),
  );
});

test('Risk workflow executes readiness watch parity regression', () => {
  assert.match(
    workflow,
    /npx tsx --test[^\n]*tests\/risk-adjustment-upstream-readiness-watch-v1\.test\.mts/,
  );
});

test('excluded upstream readiness sources are all watched', () => {
  const watched = new Map(
    RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.map(
      (entry) => [entry.variableId, entry.watchedPaths],
    ),
  );

  for (const variableId of [
    'growthMomentumPoint',
    'musicAlbumPoint',
    'snsFandomPoint',
    'brandFitPoint',
  ] as const) {
    assert.ok((watched.get(variableId)?.length ?? 0) > 0, variableId);
  }
});

test('current quality-sufficiency owner issues are explicit for consumed inputs', () => {
  const byVariable = new Map(
    RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.map(
      (entry) => [entry.variableId, entry.issueNumber],
    ),
  );

  assert.equal(byVariable.get('newsIssuePoint'), 410);
  assert.equal(byVariable.get('comebackActivityPoint'), 411);
});

test('upstream readiness owner issues are explicit for excluded inputs', () => {
  const byVariable = new Map(
    RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.map(
      (entry) => [entry.variableId, entry.issueNumber],
    ),
  );

  assert.equal(byVariable.get('growthMomentumPoint'), 413);
  assert.equal(byVariable.get('musicAlbumPoint'), 174);
  assert.equal(byVariable.get('snsFandomPoint'), 391);
  assert.equal(byVariable.get('brandFitPoint'), 367);
});


test('merged snsFandom quota owner handoff paths are current-main watches', () => {
  assert.ok(
    RISK_ADJUSTMENT_CURRENT_MAIN_READINESS_WATCH_PATHS.includes(
      'lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff.ts',
    ),
  );
  assert.ok(
    RISK_ADJUSTMENT_CURRENT_MAIN_READINESS_WATCH_PATHS.includes(
      'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
    ),
  );
  assert.equal(
    RISK_ADJUSTMENT_FUTURE_MERGE_TARGET_WATCH_PATHS.includes(
      'lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff.ts',
    ),
    false,
  );
});
