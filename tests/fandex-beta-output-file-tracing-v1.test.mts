import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('FANDEX Beta route explicitly traces repository-backed runtime evidence', async () => {
  const source = await readFile(
    new URL('../next.config.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /outputFileTracingIncludes/);
  assert.match(source, /\/artists\/\*\/fandex-beta/);

  for (const pathname of [
    './data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json',
    './data/fandex-cloud-v10/state/music_chart_check_history_v1_latest.json',
    './data/fandex-cloud-v10/state/music_chart_artist_candidates_v2_raw_latest.json',
    './data/fandex-cloud-v10/state/music_chart_bugs_all_targets_v1_latest.json',
    './data/fandex-cloud-v10/state/music_chart_check_history_v1.csv',
    './data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl',
  ]) {
    assert.equal(source.includes(pathname), true, pathname);
  }
});
