import assert from 'node:assert/strict';
import test from 'node:test';

import {
  artistMetadata,
  type ArtistMetadata,
} from '../app/data/v4/charts/artistMetadata';
import type { ArtistMonthlyMetricPoint } from '../app/data/v4/metrics/fandexMetricTypes';
import {
  getProductDashboard,
  type ProductDashboardRuntime,
} from '../lib/product/queries/getProductDashboard';

function artist(artistId: string): ArtistMetadata {
  return {
    artistId,
    displayName: artistId.toUpperCase(),
    koreanName: `${artistId}-ko`,
    ticker: artistId.toUpperCase(),
    groupType: 'solo',
    aliases: [],
  };
}

function point(
  artistId: string,
  fandexPoint: number,
  month = '2026-07',
  label = '26.07',
): ArtistMonthlyMetricPoint {
  return {
    artistId,
    month,
    label,
    fandexPoint,
    variables: {},
    sourceType: 'manual_seed',
    quality: 'tracked',
  };
}

function runtime(
  artists: readonly ArtistMetadata[],
  pointsByArtist: Readonly<Record<string, readonly ArtistMonthlyMetricPoint[]>>,
): ProductDashboardRuntime {
  return {
    getArtists: () => artists,
    getArtistMonthlyMetrics: (artistId) => pointsByArtist[artistId] ?? [],
  };
}

test('default Dashboard exposes stable artist identities and source-native monthly facts', () => {
  const model = getProductDashboard();
  const ids = model.entries.map((entry) => entry.identity.artistId);

  assert.equal(model.entries.length, artistMetadata.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(model.issues.length, 0);
  assert.deepEqual(model.dataBasis, [
    { sourceMonth: '2026-07', sourceTimeLabel: '26.07' },
  ]);
  assert.equal(model.rankedArtistCount, model.entries.length);

  for (const entry of model.entries) {
    assert.equal(entry.status, 'ok');
    assert.equal(entry.dataOrigin, 'synthetic');
    assert.equal(entry.presentation, 'preview');
    assert.equal(entry.source?.sourceMonth, '2026-07');
    assert.equal(entry.source?.sourceTimeLabel, '26.07');
    assert.deepEqual(entry.source?.observationTime, { kind: 'unknown' });
    if (entry.status === 'ok') {
      assert.equal(entry.currentFandex.availability, 'available');
      if (entry.currentFandex.availability === 'available') {
        assert.equal(Number.isFinite(entry.currentFandex.value), true);
      }
    }
  }

  const serialized = JSON.stringify(model);
  for (const unsupportedKey of [
    'change',
    'direction',
    'movement',
    'window',
    'contribution',
  ]) {
    assert.equal(serialized.includes(`\"${unsupportedKey}\"`), false);
  }
});

test('finite values are deterministically ranked while zero remains an observed zero', () => {
  const model = getProductDashboard(
    runtime(
      [artist('zeta'), artist('alpha'), artist('zero')],
      {
        zeta: [point('zeta', 10)],
        alpha: [point('alpha', 10)],
        zero: [point('zero', 0)],
      },
    ),
  );

  assert.deepEqual(
    model.entries.map((entry) => [entry.identity.artistId, entry.rank]),
    [
      ['alpha', 1],
      ['zeta', 2],
      ['zero', 3],
    ],
  );
  const zero = model.entries.find(
    (entry) => entry.identity.artistId === 'zero',
  );
  assert.ok(zero && zero.status === 'ok');
  assert.deepEqual(zero.currentFandex, { availability: 'available', value: 0 });
});

test('missing and invalid values never become numeric zero or ranked entries', () => {
  const model = getProductDashboard(
    runtime(
      [artist('valid'), artist('missing'), artist('invalid')],
      {
        valid: [point('valid', 4)],
        missing: [],
        invalid: [point('invalid', Number.POSITIVE_INFINITY)],
      },
    ),
  );

  const valid = model.entries.find(
    (entry) => entry.identity.artistId === 'valid',
  );
  const missing = model.entries.find(
    (entry) => entry.identity.artistId === 'missing',
  );
  const invalid = model.entries.find(
    (entry) => entry.identity.artistId === 'invalid',
  );

  assert.ok(valid && valid.status === 'ok');
  assert.equal(valid.rank, 1);
  assert.ok(missing && missing.status === 'ok');
  assert.deepEqual(missing.currentFandex, {
    availability: 'missing',
    value: null,
  });
  assert.equal(missing.rank, null);
  assert.ok(invalid && invalid.status === 'data-issue');
  assert.equal(invalid.currentFandex, null);
  assert.equal(invalid.rank, null);
  assert.deepEqual(invalid.issues, [{ code: 'invalid-current-fandex' }]);
  assert.equal(model.rankedArtistCount, 1);
});

test('latest source month selection is deterministic and preserves its native label', () => {
  const model = getProductDashboard(
    runtime([artist('alpha')], {
      alpha: [
        point('alpha', 20, '2026-07', '26.07'),
        point('alpha', 999, '2026-05', '26.05'),
        point('alpha', 10, '2026-06', '26.06'),
      ],
    }),
  );
  const entry = model.entries[0];

  assert.ok(entry && entry.status === 'ok');
  assert.deepEqual(entry.currentFandex, {
    availability: 'available',
    value: 20,
  });
  assert.equal(entry.source?.sourceMonth, '2026-07');
  assert.equal(entry.source?.sourceTimeLabel, '26.07');
  assert.deepEqual(entry.source?.observationTime, { kind: 'unknown' });
  assert.deepEqual(model.dataBasis, [
    { sourceMonth: '2026-07', sourceTimeLabel: '26.07' },
  ]);
});

test('source identity conflicts and malformed time fail safely without polluting data basis', () => {
  const model = getProductDashboard(
    runtime(
      [artist('duplicate'), artist('mismatch'), artist('bad-time')],
      {
        duplicate: [
          point('duplicate', 3, '2026-07', '26.07-a'),
          point('duplicate', 4, '2026-07', '26.07-b'),
        ],
        mismatch: [point('another-artist', 5)],
        'bad-time': [point('bad-time', 6, '', '')],
      },
    ),
  );

  assert.equal(model.rankedArtistCount, 0);
  assert.deepEqual(model.dataBasis, []);
  assert.deepEqual(
    model.entries.map((entry) =>
      entry.status === 'data-issue' ? entry.issues[0]?.code : entry.status,
    ),
    ['invalid-source-time', 'source-state-conflict', 'source-state-conflict'],
  );
});

test('invalid and duplicate metadata identities are isolated from healthy artists', () => {
  const model = getProductDashboard(
    runtime([artist('valid'), artist(' '), artist('valid')], {
      valid: [point('valid', 7)],
    }),
  );

  assert.equal(model.entries.length, 1);
  assert.equal(model.entries[0]?.identity.artistId, 'valid');
  assert.deepEqual(model.issues, [
    { code: 'invalid-artist-identity', rawArtistId: ' ' },
    { code: 'duplicate-artist-identity', artistId: 'valid' },
  ]);
});

test('one artist source-read failure does not crash or remove healthy entries', () => {
  const model = getProductDashboard({
    getArtists: () => [artist('healthy'), artist('broken')],
    getArtistMonthlyMetrics: (artistId) => {
      if (artistId === 'broken') throw new Error('source unavailable');
      return [point(artistId, 8)];
    },
  });
  const healthy = model.entries.find(
    (entry) => entry.identity.artistId === 'healthy',
  );
  const broken = model.entries.find(
    (entry) => entry.identity.artistId === 'broken',
  );

  assert.ok(healthy && healthy.status === 'ok');
  assert.equal(healthy.rank, 1);
  assert.ok(broken && broken.status === 'data-issue');
  assert.deepEqual(broken.issues, [{ code: 'source-read-failed' }]);
});
