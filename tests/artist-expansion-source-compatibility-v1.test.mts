import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { artistUniverseV4 } from '../app/data/v4/artistUniverse';

type CompatibilitySource = {
  bindingAuthority: string;
  basis: string;
  supportedCanonicalArtistIds: string[];
  unresolvedCanonicalArtistIds: string[];
  unsupportedCanonicalArtistIds: string[];
};

type CompatibilityRegistry = {
  version: string;
  canonicalUniverseVersion: string;
  canonicalUniverseCount: number;
  statusSemantics: Record<'supported' | 'unresolved' | 'unsupported', string>;
  scopedSources: string[];
  sources: Record<string, CompatibilitySource>;
};

const ROOT = new URL('../', import.meta.url);

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(new URL(relativePath, ROOT), 'utf8'),
  ) as T;
}

function sorted(values: Iterable<string>): string[] {
  return Array.from(values).sort();
}

function assertPartition(
  label: string,
  source: CompatibilitySource,
  canonicalIds: Set<string>,
): void {
  const supported = new Set(source.supportedCanonicalArtistIds);
  const unresolved = new Set(source.unresolvedCanonicalArtistIds);
  const unsupported = new Set(source.unsupportedCanonicalArtistIds);

  assert.equal(
    supported.size,
    source.supportedCanonicalArtistIds.length,
    `${label}: duplicate supported canonical ID`,
  );
  assert.equal(
    unresolved.size,
    source.unresolvedCanonicalArtistIds.length,
    `${label}: duplicate unresolved canonical ID`,
  );
  assert.equal(
    unsupported.size,
    source.unsupportedCanonicalArtistIds.length,
    `${label}: duplicate unsupported canonical ID`,
  );

  for (const id of supported) {
    assert.ok(!unresolved.has(id), `${label}: supported/unresolved overlap: ${id}`);
    assert.ok(!unsupported.has(id), `${label}: supported/unsupported overlap: ${id}`);
  }
  for (const id of unresolved) {
    assert.ok(!unsupported.has(id), `${label}: unresolved/unsupported overlap: ${id}`);
  }

  const union = new Set([...supported, ...unresolved, ...unsupported]);
  assert.deepEqual(
    sorted(union),
    sorted(canonicalIds),
    `${label}: status partition must exactly cover canonical universe`,
  );

  for (const id of union) {
    assert.ok(canonicalIds.has(id), `${label}: unknown canonical ID: ${id}`);
  }
}

const registry = readJson<CompatibilityRegistry>(
  'data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json',
);
const musicConfig = readJson<{
  artists: Array<{ canonicalArtistId: string }>;
}>(
  'data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json',
);
const lastfmSeed = readFileSync(
  new URL('scripts/lastfm-cloud/lastfm_artist_seed_v1.csv', ROOT),
  'utf8',
)
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split(',')[0]?.trim())
  .filter((value): value is string => Boolean(value));

const canonicalIds = new Set(artistUniverseV4.map((artist) => artist.id));

test('source compatibility registry is exhaustive and disjoint for all 355 artists', () => {
  assert.equal(registry.version, 'artist_source_compatibility_v1');
  assert.equal(registry.canonicalUniverseVersion, 'artist_universe_v4');
  assert.equal(registry.canonicalUniverseCount, 355);
  assert.equal(canonicalIds.size, 355);
  assert.deepEqual(
    new Set(registry.scopedSources),
    new Set(['naver_news', 'music_chart', 'lastfm']),
  );

  for (const sourceName of registry.scopedSources) {
    const source = registry.sources[sourceName];
    assert.ok(source, `missing compatibility source: ${sourceName}`);
    assertPartition(sourceName, source, canonicalIds);
  }
});

test('NAVER is explicitly supported for the full validated canonical universe', () => {
  const source = registry.sources.naver_news;
  assert.equal(source.supportedCanonicalArtistIds.length, 355);
  assert.equal(source.unresolvedCanonicalArtistIds.length, 0);
  assert.equal(source.unsupportedCanonicalArtistIds.length, 0);
  assert.deepEqual(
    sorted(source.supportedCanonicalArtistIds),
    sorted(canonicalIds),
  );
});

test('Music supported compatibility exactly matches reviewed target bindings', () => {
  const source = registry.sources.music_chart;
  const configured = new Set(
    musicConfig.artists.map((artist) => artist.canonicalArtistId),
  );

  assert.equal(configured.size, 10);
  assert.equal(source.supportedCanonicalArtistIds.length, 10);
  assert.equal(source.unresolvedCanonicalArtistIds.length, 345);
  assert.equal(source.unsupportedCanonicalArtistIds.length, 0);
  assert.deepEqual(
    sorted(source.supportedCanonicalArtistIds),
    sorted(configured),
  );
});

test('Last.fm supported compatibility exactly matches reviewed seed bindings', () => {
  const source = registry.sources.lastfm;
  const configured = new Set(lastfmSeed);

  assert.equal(configured.size, 10);
  assert.equal(source.supportedCanonicalArtistIds.length, 10);
  assert.equal(source.unresolvedCanonicalArtistIds.length, 345);
  assert.equal(source.unsupportedCanonicalArtistIds.length, 0);
  assert.deepEqual(
    sorted(source.supportedCanonicalArtistIds),
    sorted(configured),
  );
});

test('unresolved remains distinct from unsupported and missing', () => {
  for (const sourceName of ['music_chart', 'lastfm'] as const) {
    const source = registry.sources[sourceName];
    assert.equal(source.unsupportedCanonicalArtistIds.length, 0);
    assert.equal(source.unresolvedCanonicalArtistIds.length, 345);
    assert.ok(
      registry.statusSemantics.unresolved.includes('not Missing'),
      'unresolved semantics must explicitly reject Missing equivalence',
    );
    assert.ok(
      registry.statusSemantics.unresolved.includes('not Unsupported'),
      'unresolved semantics must explicitly reject Unsupported equivalence',
    );
  }
});
