import assert from 'node:assert/strict';
import test from 'node:test';

import {
  artistUniverseV4,
  buildExpandedArtistUniverseV4,
  getArtistV4ById,
  ARTIST_UNIVERSE_V4_BASELINE_COUNT,
} from '../app/data/v4/artistUniverse';
import { bindCanonicalArtistToNaverNews } from '../lib/server/ingestion/naverNewsArtistBinding';
import expansionPayload from '../data/artist-universe-expansion-v1.json';

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

test('baseline remains 100 while active universe expands beyond it', () => {
  assert.equal(ARTIST_UNIVERSE_V4_BASELINE_COUNT, 100);
  assert.equal(
    artistUniverseV4.length,
    ARTIST_UNIVERSE_V4_BASELINE_COUNT + expansionPayload.artists.length,
  );

  for (const artistId of [
    'kiiikiii',
    'alldayproject',
    'cortis',
    'psy',
    'ailee',
    'younha',
    'buzz',
    'seeya',
    'limyoungwoong',
    '10cm',
    'davichi',
    'leechangsub',
    'hanroro',
    'sungsikyung',
    'choiyuree',
    'carthegarden',
    'hwanggaram',
    'crush',
    'parkjaejung',
    'jannabi',
    'paulkim',
    'bol4',
    'woodz',
    'leechanhyuk',
    'jungseunghwan',
    'kimnayoung',
    'chojungseok',
    'kyoungseo',
    'gyeongseoyeji',
    'kimfeel',
    'limjaehyun',
    'limhanbyul',
    'huhgak',
    'dohkyungsoo',
    'yena',
    'nflying',
    'bignaughty',
    'woody',
    'soyeon',
    'epikhigh',
    'melomance',
    'kimminseok',
    'nerdconnection',
    'gaho',
    'leellamarz',
    'shaun',
    'dkdecember',
    'standingegg',
    'ioi',
    'maktub',
    'noahjooda',
    'thenuts',
    'kwill',
    'brothersu',
    'idid',
    'aen',
    'eunjiwon',
    'kangseungyoon',
    'hoony',
    'jinu',
    'mino',
    'leesuhyun',
    'bobby',
    '82major',
    'highlight',
    'kimjaejoong',
    'hwangminhyun',
    'yoonsanha',
    'ahof',
    'ampersandone',
    'plave',
    'rain',
    'touched',
    'and2ble',
    'hahyunsang',
    'kwonjinnah',
    'lucy',
    'wendy',
    'nssign',
    'sechskies',
    'leesungkyung',
    'hori7on',
    'jypark',
    '2pm',
    'boystory',
    'yaochen',
    'girlset',
    'kangta',
    'naevis',
    'xnghan',
    'anshinae',
    'danieljikal',
    'babydontcry',
    'babylon',
    'eden',
    'maddox',
    'ftisland',
    'cnblue',
    'sf9',
    'hifiunicorn',
    'axmxp',
    'goldenchild',
    'drippin',
    'unchild',
    'mamamooplus',
    'onewe',
    'purplekiss',
    'alphadriveone',
    'joyuri',
    'kimjaehwan',
    'leedaehwi',
  ]) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist, `missing expanded artist: ${artistId}`);
    const binding = bindCanonicalArtistToNaverNews(artistId);
    assert.equal(binding.canonicalArtistId, artistId);
    assert.equal(binding.provider, 'naver-news');
    assert.ok(binding.query.trim());
  }

  const alphaDriveOne = getArtistV4ById('alphadriveone');
  assert.ok(alphaDriveOne);
  assert.equal(alphaDriveOne.entityType, 'group');
  assert.equal(alphaDriveOne.agency, 'WAKEONE');
  assert.equal(alphaDriveOne.members.length, 8);

  for (const artistId of ['joyuri', 'kimjaehwan', 'leedaehwi']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.entityType, 'solo');
    assert.equal(artist.agency, 'WAKEONE');
    assert.ok(artist.profile.markets.includes('KR'));
  }

  const mamamooPlus = getArtistV4ById('mamamooplus');
  assert.ok(mamamooPlus);
  assert.equal(mamamooPlus.entityType, 'unit');
  assert.equal(mamamooPlus.agency, 'RBW');
  assert.equal(mamamooPlus.members.length, 2);
  assert.ok(mamamooPlus.profile.englishAliases.includes('MAMAMOO+'));

  for (const artistId of ['onewe', 'purplekiss']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.entityType, 'group');
    assert.equal(artist.agency, 'RBW');
    assert.ok(artist.profile.markets.includes('KR'));
  }

  const unchild = getArtistV4ById('unchild');
  assert.ok(unchild);
  assert.equal(unchild.entityType, 'group');
  assert.equal(unchild.agency, 'High Up Entertainment');
  assert.equal(unchild.debutDate, '2026-04-21');
  assert.equal(unchild.members.length, 6);
  assert.ok(unchild.profile.markets.includes('KR'));

  for (const artistId of ['goldenchild', 'drippin']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.entityType, 'group');
    assert.equal(artist.agency, 'Woollim Entertainment');
    assert.ok(artist.profile.markets.includes('KR'));
    assert.equal(artist.lifecycleStatus, 'active');
  }

  for (const artistId of ['ftisland', 'cnblue', 'sf9', 'hifiunicorn', 'axmxp']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.entityType, 'group');
    assert.equal(artist.agency, 'FNC Entertainment');
    assert.ok(artist.profile.markets.includes('KR'));
  }

  for (const artistId of ['babylon', 'eden', 'maddox']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.entityType, 'solo');
    assert.equal(artist.agency, 'KQ Entertainment');
    assert.ok(artist.profile.markets.includes('KR'));
  }

  const anShinae = getArtistV4ById('anshinae');
  assert.ok(anShinae);
  assert.equal(anShinae.entityType, 'solo');

  const danielJikal = getArtistV4ById('danieljikal');
  assert.ok(danielJikal);
  assert.equal(danielJikal.entityType, 'solo');
  assert.equal(danielJikal.debutDate, '2024-03-05');

  const babyDontCry = getArtistV4ById('babydontcry');
  assert.ok(babyDontCry);
  assert.equal(babyDontCry.entityType, 'group');
  assert.equal(babyDontCry.debutDate, '2025-06-23');
  assert.equal(babyDontCry.members.length, 4);

  const kangta = getArtistV4ById('kangta');
  assert.ok(kangta);
  assert.equal(kangta.entityType, 'solo');
  assert.ok(kangta.profile.markets.includes('KR'));

  const naevis = getArtistV4ById('naevis');
  assert.ok(naevis);
  assert.equal(naevis.entityType, 'solo');
  assert.equal(naevis.debutDate, '2024-09-10');

  const xnghan = getArtistV4ById('xnghan');
  assert.ok(xnghan);
  assert.equal(xnghan.entityType, 'solo');
  assert.ok(xnghan.profile.englishAliases.includes('XngHan&Xoul'));
  assert.ok(xnghan.profile.koreanAliases.includes('승한앤소울'));

  for (const artistId of ['boystory', 'yaochen', 'girlset']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.ok(artist.profile.markets.includes('KR'));
    assert.equal(artist.lifecycleStatus, 'active');
  }

  const jyPark = getArtistV4ById('jypark');
  assert.ok(jyPark);
  assert.equal(jyPark.entityType, 'solo');
  assert.equal(jyPark.lifecycleStatus, 'active');
  assert.equal(jyPark.agency, 'JYP Entertainment');

  const twoPm = getArtistV4ById('2pm');
  assert.ok(twoPm);
  assert.equal(twoPm.entityType, 'group');
  assert.equal(twoPm.lifecycleStatus, 'active');
  assert.equal(twoPm.agency, 'JYP Entertainment');

  const hori7on = getArtistV4ById('hori7on');
  assert.ok(hori7on);
  assert.equal(hori7on.entityType, 'group');
  assert.equal(hori7on.lifecycleStatus, 'active');
  assert.equal(hori7on.agency, '');
  assert.equal(hori7on.agencyStatus, 'unresolved');
  assert.equal(hori7on.collection.tier, 'standard');

  const leeSungKyung = getArtistV4ById('leesungkyung');
  assert.ok(leeSungKyung);
  assert.equal(leeSungKyung.entityType, 'solo');
  assert.equal(leeSungKyung.lifecycleStatus, 'active');
  assert.equal(leeSungKyung.collection.tier, 'standard');
  assert.match(leeSungKyung.profile.naverNewsQuery ?? '', /가수/);

  const sechskies = getArtistV4ById('sechskies');
  assert.ok(sechskies);
  assert.equal(sechskies.lifecycleStatus, 'inactive');
  assert.equal(sechskies.collection.tier, 'archive');

  const expanded = buildExpandedArtistUniverseV4(
    artistUniverseV4,
    [seed('expansion-104', 'EXP104'), seed('expansion-105', 'EXP105')],
  );

  assert.equal(expanded.length, artistUniverseV4.length + 2);
  assert.equal(expanded.at(-2)?.id, 'expansion-104');
  assert.equal(expanded.at(-1)?.id, 'expansion-105');
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

test('unresolved agency may be explicit without inventing a management company', () => {
  const unresolvedAgency = {
    ...seed('expansion-unresolved-agency', 'EXPUNRES'),
    agency: '',
    agencyStatus: 'unresolved' as const,
  };

  const expanded = buildExpandedArtistUniverseV4(
    artistUniverseV4,
    [unresolvedAgency],
  );
  assert.equal(expanded.at(-1)?.agency, '');
  assert.equal(expanded.at(-1)?.agencyStatus, 'unresolved');
});

test('blank agency still fails unless unresolved status is explicit', () => {
  const bad = {
    ...seed('expansion-blank-agency', 'EXPBLANK'),
    agency: '',
  };

  assert.throws(
    () => buildExpandedArtistUniverseV4(artistUniverseV4, [bad]),
    /artist_universe_expansion_missing_agency:expansion-blank-agency/,
  );
});

test('unresolved agency status rejects a non-empty agency guess', () => {
  const bad = {
    ...seed('expansion-conflicting-agency', 'EXPCONFLICT'),
    agencyStatus: 'unresolved' as const,
  };

  assert.throws(
    () => buildExpandedArtistUniverseV4(artistUniverseV4, [bad]),
    /artist_universe_expansion_conflicting_agency_status:expansion-conflicting-agency/,
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
