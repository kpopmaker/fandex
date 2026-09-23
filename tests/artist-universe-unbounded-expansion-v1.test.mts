import assert from 'node:assert/strict';
import test from 'node:test';

import {
  artistUniverseV4,
  buildExpandedArtistUniverseV4,
  ARTIST_UNIVERSE_V4_BASELINE_COUNT,
} from '../app/data/v4/artistUniverse';

const seed = (id: string, ticker: string) => ({
  id,
  ticker,
  name: `Artist ${id}`,
  agency: 'Expansion Test Agency',
  entityType: 'group' as const,
  naverNewsQuery: `테스트 ${id}`,
  koreanAliases: [`테스트${id}`],
  englishAliases: [`Artist ${id}`],
  keywords: ['expansion-test'],
  tier: 'standard' as const,
  priorityScore: 50,
});

test('baseline remains 100 while expansion is unbounded', () => {
  assert.equal(ARTIST_UNIVERSE_V4_BASELINE_COUNT, 100);
  assert.equal(artistUniverseV4.length, 100);

  const expanded = buildExpandedArtistUniverseV4(
    artistUniverseV4,
    [seed('expansion-101', 'EXP101'), seed('expansion-102', 'EXP102')],
  );

  assert.equal(expanded.length, 102);
  assert.equal(expanded.at(-2)?.id, 'expansion-101');
  assert.equal(expanded.at(-1)?.id, 'expansion-102');
});

test('duplicate canonical id is rejected', () => {
  assert.throws(
    () => buildExpandedArtistUniverseV4(
      artistUniverseV4,
      [seed('iu', 'EXP-IU')],
    ),
    /artist_universe_expansion_duplicate_id:iu/,
  );
});

test('duplicate ticker is rejected case-insensitively', () => {
  assert.throws(
    () => buildExpandedArtistUniverseV4(
      artistUniverseV4,
      [seed('expansion-duplicate-ticker', 'iu')],
    ),
    /artist_universe_expansion_duplicate_ticker:iu/,
  );
});

test('missing Korean identity evidence is rejected', () => {
  const bad = {
    ...seed('expansion-missing-ko', 'EXPKO'),
    koreanAliases: [],
  };

  assert.throws(
    () => buildExpandedArtistUniverseV4(artistUniverseV4, [bad]),
    /artist_universe_expansion_missing_korean_alias:expansion-missing-ko/,
  );
});

test('missing NAVER query is rejected', () => {
  const bad = {
    ...seed('expansion-missing-query', 'EXPQ'),
    naverNewsQuery: '',
  };

  assert.throws(
    () => buildExpandedArtistUniverseV4(artistUniverseV4, [bad]),
    /artist_universe_expansion_missing_naver_query:expansion-missing-query/,
  );
});
