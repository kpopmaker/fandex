import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('analytics evidence route consumes checked-in evidence through the presentation contract', async () => {
  const source = await readFile(
    new URL('../app/youtube-analytics-evidence/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /sns-fandom-youtube-audit-evidence-refs-v1\.json/,
  );
  assert.match(
    source,
    /evaluateSnsFandomYoutubeAnalyticsReportingSurface/,
  );
  assert.match(
    source,
    /SnsFandomYoutubeAnalyticsReportingSurfaceView/,
  );
  assert.match(source, /실제 YouTube Analytics/);
  assert.match(source, /366일 측정 창은 진행 중/);

  assert.doesNotMatch(source, /app\/data\/v4\/charts/);
  assert.doesNotMatch(source, /sample-report/);
  assert.doesNotMatch(source, /Math\.random/);
});

test('reporting view labels real provider evidence, true zero and incomplete-window boundary', async () => {
  const source = await readFile(
    new URL(
      '../app/components/SnsFandomYoutubeAnalyticsReportingSurface.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /Real provider evidence/);
  assert.match(source, /not fixture, mock, editorial seed, or preview data/);
  assert.match(source, /Observed true zero/);
  assert.match(source, /completed full-window aggregate/);
  assert.match(source, /Evidence lineage/);
  assert.match(source, /Raw video identifiers stored: false/);
  assert.match(source, /Raw statistics stored: false/);
  assert.match(source, /Secret material stored: false/);
});

test('surface route remains unlinked from the global navigation until deployment is separately authorized', async () => {
  const navbar = await readFile(
    new URL('../app/components/Navbar.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(navbar, /youtube-analytics-evidence/);
});
