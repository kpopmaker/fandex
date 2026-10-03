import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  ARTIST_UNIVERSE_V4_BASELINE_COUNT,
  artistUniverseV4,
} from '../app/data/v4/artistUniverse';

const root = resolve(import.meta.dirname, '..');

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function readCsvIds(path: string) {
  const lines = readFileSync(resolve(root, path), 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  const header = lines[0].split(',');
  const idIndex = header.indexOf('canonicalArtistId');
  assert.ok(idIndex >= 0);
  return lines.slice(1).map((line) => line.split(',')[idIndex].trim());
}

test('canonical artist universe is 355 with a preserved 100-artist baseline', () => {
  assert.equal(ARTIST_UNIVERSE_V4_BASELINE_COUNT, 100);
  assert.equal(artistUniverseV4.length, 355);
  const ids = artistUniverseV4.map((artist) => artist.id);
  assert.equal(new Set(ids).size, 355);
});

test('active Music 21 and Last.fm 19 bindings are canonical-universe subsets', () => {
  const universe = new Set(artistUniverseV4.map((artist) => artist.id));
  const music = readJson(
    'data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json',
  ).artists.map((row: { canonicalArtistId: string }) => row.canonicalArtistId);
  const lastfm = readCsvIds('scripts/lastfm-cloud/lastfm_artist_seed_v1.csv');

  assert.equal(music.length, 21);
  assert.equal(new Set(music).size, 21);
  assert.equal(lastfm.length, 19);
  assert.equal(new Set(lastfm).size, 19);
  assert.ok(music.every((id: string) => universe.has(id)));
  assert.ok(lastfm.every((id: string) => universe.has(id)));
  assert.ok(lastfm.every((id: string) => music.includes(id)));
});

test('source compatibility partitions the 355-artist universe fail-closed', () => {
  const compatibility = readJson(
    'data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json',
  );
  assert.equal(compatibility.canonicalUniverseCount, 355);

  for (const sourceName of ['naver_news', 'music_chart', 'lastfm']) {
    const source = compatibility.sources[sourceName];
    const supported = new Set<string>(source.supportedCanonicalArtistIds);
    const unresolved = new Set<string>(source.unresolvedCanonicalArtistIds);
    const unsupported = new Set<string>(source.unsupportedCanonicalArtistIds);

    for (const id of supported) {
      assert.ok(!unresolved.has(id));
      assert.ok(!unsupported.has(id));
    }
    for (const id of unresolved) assert.ok(!unsupported.has(id));

    const union = new Set([...supported, ...unresolved, ...unsupported]);
    assert.equal(union.size, 355);
  }

  assert.equal(
    compatibility.sources.music_chart.supportedCanonicalArtistIds.length,
    21,
  );
  assert.equal(
    compatibility.sources.lastfm.supportedCanonicalArtistIds.length,
    19,
  );
  assert.deepEqual(
    [...compatibility.sources.lastfm.unsupportedCanonicalArtistIds].sort(),
    ['lisa', 'v'],
  );
});
