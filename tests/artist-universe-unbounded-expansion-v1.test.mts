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
    'lun8',
    'zoonizini',
    'chaeunwoo',
    'astro',
    'wekimeki',
    'moonbinsanha',
    'jinjinrocky',
    'lun8wave',
    'flareu',
    'modyssey',
    'lightsum',
    'slay',
    'pentagon',
    'ejel',
    'limsanghyun',
    'vvon',
    'jungjaehyung',
    'lucidfall',
    'peppertones',
    'leesangsoon',
    'leehyori',
    'parksaebyul',
    'kyuhyun',
    'dragonpony',
    'toy',
    'afterschool',
    'orangecaramel',
    'bumzu',
    'nuest',
    'oddyouth',
    'mcnd',
    'teentop',
    'up10tion',
    '100percent',
    'kara',
    'b1a4',
    'solar',
    'moonbyul',
    'kard',
    'csr',
    'ahnyeeun',
    'youngposse',
    'xlov',
    'secret',
  ]) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist, `missing expanded artist: ${artistId}`);
    const binding = bindCanonicalArtistToNaverNews(artistId);
    assert.equal(binding.canonicalArtistId, artistId);
    assert.equal(binding.provider, 'naver-news');
    assert.ok(binding.query.trim());
  }

  for (const artistId of ['kara', 'csr', 'ahnyeeun', 'secret']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.agency, '');
    assert.equal(artist.agencyStatus, 'unresolved');
    assert.equal(artist.lifecycleStatus, 'active');
  }

  const b1a4 = getArtistV4ById('b1a4');
  assert.ok(b1a4);
  assert.equal(b1a4.entityType, 'group');
  assert.equal(b1a4.agency, 'Hieutpieup Co., Ltd.');
  assert.deepEqual(b1a4.members, ['CNU', 'SANDEUL', 'GONGCHAN']);

  for (const artistId of ['solar', 'moonbyul']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.entityType, 'solo');
    assert.equal(artist.agency, 'RBW');
    assert.equal(artist.lifecycleStatus, 'active');
  }

  const kard = getArtistV4ById('kard');
  assert.ok(kard);
  assert.equal(kard.entityType, 'group');
  assert.equal(kard.agency, 'DSP Media');
  assert.deepEqual(kard.members, ['BM', 'J.SEPH', 'SOMIN', 'JIWOO']);

  const youngPosse = getArtistV4ById('youngposse');
  assert.ok(youngPosse);
  assert.equal(youngPosse.agency, 'DSP Media / BEATS Entertainment');
  assert.equal(youngPosse.lifecycleStatus, 'active');

  const xlov = getArtistV4ById('xlov');
  assert.ok(xlov);
  assert.equal(xlov.agency, 'StrangeLab');
  assert.deepEqual(xlov.members, ['RUI', 'HARU', 'WUMUTI', 'HYUN']);

  const secret = getArtistV4ById('secret');
  assert.ok(secret);
  assert.deepEqual(secret.members, ['JUN HYO SEONG', 'ZINGER', 'YEBIN']);

  const oddYouth = getArtistV4ById('oddyouth');
  assert.ok(oddYouth);
  assert.equal(oddYouth.entityType, 'group');
  assert.equal(oddYouth.agency, 'TOP Media');
  assert.equal(oddYouth.debutDate, '2024-11-01');
  assert.equal(oddYouth.members.length, 5);

  const mcnd = getArtistV4ById('mcnd');
  assert.ok(mcnd);
  assert.equal(mcnd.entityType, 'group');
  assert.equal(mcnd.agency, 'TOP Media');
  assert.equal(mcnd.debutDate, '2020-02-27');
  assert.equal(mcnd.members.length, 5);

  const teenTop = getArtistV4ById('teentop');
  assert.ok(teenTop);
  assert.equal(teenTop.lifecycleStatus, 'active');
  assert.equal(teenTop.agency, '');
  assert.equal(teenTop.agencyStatus, 'unresolved');
  assert.deepEqual(teenTop.members, ['CHUNJI', 'NIEL', 'RICKY', 'CHANGJO']);

  const up10tion = getArtistV4ById('up10tion');
  assert.ok(up10tion);
  assert.equal(up10tion.lifecycleStatus, 'hiatus');
  assert.equal(up10tion.agency, '');
  assert.equal(up10tion.agencyStatus, 'unresolved');
  assert.equal(up10tion.members.length, 7);

  const hundredPercent = getArtistV4ById('100percent');
  assert.ok(hundredPercent);
  assert.equal(hundredPercent.lifecycleStatus, 'inactive');
  assert.equal(hundredPercent.agency, 'TOP Media');
  assert.equal(hundredPercent.agencyStatus, 'historical');
  assert.equal(hundredPercent.collection.tier, 'archive');

  for (const artistId of ['afterschool', 'orangecaramel', 'nuest']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.lifecycleStatus, 'inactive');
    assert.equal(artist.agencyStatus, 'historical');
    assert.equal(artist.agency, 'PLEDIS Entertainment');
    assert.equal(artist.collection.tier, 'archive');
  }

  const orangeCaramel = getArtistV4ById('orangecaramel');
  assert.ok(orangeCaramel);
  assert.equal(orangeCaramel.entityType, 'unit');
  assert.deepEqual(orangeCaramel.members, ['RAINA', 'NANA', 'LIZZY']);

  const nuest = getArtistV4ById('nuest');
  assert.ok(nuest);
  assert.equal(nuest.entityType, 'group');
  assert.equal(nuest.debutDate, '2012-03-15');
  assert.equal(nuest.members.length, 5);

  const bumzu = getArtistV4ById('bumzu');
  assert.ok(bumzu);
  assert.equal(bumzu.entityType, 'solo');
  assert.equal(bumzu.lifecycleStatus, 'active');
  assert.equal(bumzu.agency, 'PLEDIS Entertainment');

  for (const artistId of ['jungjaehyung', 'lucidfall', 'leesangsoon', 'leehyori', 'parksaebyul', 'kyuhyun']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.entityType, 'solo');
    assert.equal(artist.agency, 'Antenna');
    assert.equal(artist.lifecycleStatus, 'active');
  }

  const peppertones = getArtistV4ById('peppertones');
  assert.ok(peppertones);
  assert.equal(peppertones.entityType, 'group');
  assert.equal(peppertones.agency, 'Antenna');
  assert.deepEqual(peppertones.members, ['신재평', '이장원']);

  const toy = getArtistV4ById('toy');
  assert.ok(toy);
  assert.equal(toy.entityType, 'project');
  assert.equal(toy.agency, 'Antenna');
  assert.equal(toy.lifecycleStatus, 'active');
  assert.ok(toy.profile.englishAliases.includes('You Hee Yul'));
  assert.ok(toy.profile.koreanAliases.includes('유희열'));

  const dragonPony = getArtistV4ById('dragonpony');
  assert.ok(dragonPony);
  assert.equal(dragonPony.entityType, 'group');
  assert.equal(dragonPony.agency, 'Antenna');
  assert.equal(dragonPony.debutDate, '2024-09-26');
  assert.deepEqual(dragonPony.members, ['안태규', '권세혁', '고강훈']);

  const ejel = getArtistV4ById('ejel');
  assert.ok(ejel);
  assert.equal(ejel.entityType, 'solo');
  assert.equal(ejel.agency, 'MNH Entertainment');
  assert.equal(ejel.lifecycleStatus, 'active');

  const limSangHyun = getArtistV4ById('limsanghyun');
  assert.ok(limSangHyun);
  assert.equal(limSangHyun.entityType, 'solo');
  assert.equal(limSangHyun.agency, 'MNH Entertainment');
  assert.equal(limSangHyun.debutDate, '2021-07-25');
  assert.equal(limSangHyun.lifecycleStatus, 'military');

  const vvon = getArtistV4ById('vvon');
  assert.ok(vvon);
  assert.equal(vvon.entityType, 'solo');
  assert.equal(vvon.agency, 'MNH Entertainment');
  assert.equal(vvon.lifecycleStatus, 'active');

  const pentagon = getArtistV4ById('pentagon');
  assert.ok(pentagon);
  assert.equal(pentagon.entityType, 'group');
  assert.equal(pentagon.lifecycleStatus, 'active');
  assert.equal(pentagon.agency, '');
  assert.equal(pentagon.agencyStatus, 'unresolved');
  assert.equal(pentagon.members.length, 7);
  assert.deepEqual(pentagon.members, ['JINHO', 'HUI', 'HONGSEOK', 'SHINWON', 'YEOWON', 'KINO', 'WOOSEOK']);

  const nowz = getArtistV4ById('nowadays');
  assert.ok(nowz);
  assert.equal(nowz.nameEn, 'NOWZ');
  assert.ok(nowz.profile.englishAliases.includes('NOWADAYS'));
  assert.ok(nowz.profile.englishAliases.includes('NOWZ'));
  assert.ok(nowz.profile.koreanAliases.includes('나우어데이즈'));
  assert.ok(nowz.profile.koreanAliases.includes('나우즈'));

  const lightsum = getArtistV4ById('lightsum');
  assert.ok(lightsum);
  assert.equal(lightsum.entityType, 'group');
  assert.equal(lightsum.agency, 'Cube Entertainment');
  assert.equal(lightsum.members.length, 6);

  const slay = getArtistV4ById('slay');
  assert.ok(slay);
  assert.equal(slay.entityType, 'solo');
  assert.equal(slay.agency, 'Cube Entertainment');

  const flareu = getArtistV4ById('flareu');
  assert.ok(flareu);
  assert.equal(flareu.entityType, 'group');
  assert.equal(flareu.agency, 'FNC Entertainment');
  assert.equal(flareu.debutDate, '2026-05-13');
  assert.deepEqual(flareu.members, ['CHUEI LI YU', 'KANG WOO JIN']);

  const modyssey = getArtistV4ById('modyssey');
  assert.ok(modyssey);
  assert.equal(modyssey.entityType, 'group');
  assert.equal(modyssey.agency, 'ONECEAD');
  assert.equal(modyssey.debutDate, '2026-04-13');
  assert.equal(modyssey.members.length, 7);
  assert.ok(modyssey.members.includes('YICHEN'));

  const lun8wave = getArtistV4ById('lun8wave');
  assert.ok(lun8wave);
  assert.equal(lun8wave.entityType, 'unit');
  assert.equal(lun8wave.lifecycleStatus, 'active');
  assert.deepEqual(lun8wave.members, ['TAKUMA', 'JUNWOO', 'DOHYUN']);
  assert.equal(lun8wave.agency, 'Fantagio');

  for (const artistId of ['wekimeki', 'moonbinsanha', 'jinjinrocky']) {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.equal(artist.lifecycleStatus, 'inactive');
    assert.equal(artist.agencyStatus, 'historical');
    assert.equal(artist.collection.tier, 'archive');
    assert.equal(artist.agency, 'Fantagio');
  }

  const lun8 = getArtistV4ById('lun8');
  assert.ok(lun8);
  assert.equal(lun8.entityType, 'group');
  assert.equal(lun8.agency, 'Fantagio');

  const zoonizini = getArtistV4ById('zoonizini');
  assert.ok(zoonizini);
  assert.equal(zoonizini.entityType, 'unit');
  assert.deepEqual(zoonizini.members, ['MJ', 'JINJIN']);

  const chaEunWoo = getArtistV4ById('chaeunwoo');
  assert.ok(chaEunWoo);
  assert.equal(chaEunWoo.entityType, 'solo');
  assert.equal(chaEunWoo.lifecycleStatus, 'military');

  const astro = getArtistV4ById('astro');
  assert.ok(astro);
  assert.equal(astro.entityType, 'group');
  assert.equal(astro.agency, 'Fantagio');
  assert.equal(astro.members.length, 4);

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

  const evan = getArtistV4ById('evan');
  assert.ok(evan);
  assert.equal(evan.entityType, 'solo');
  assert.equal(evan.agency, 'BELIFT LAB');
  assert.equal(evan.debutDate, '2026-06-22');
  assert.equal(evan.lifecycleStatus, 'active');
  assert.ok(evan.profile.koreanAliases.includes('에반'));
  assert.ok(!evan.profile.englishAliases.includes('HEESEUNG'));

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

test('historical agency is allowed only for inactive archive-style identities', () => {
  const historicalAgency = {
    ...seed('expansion-historical-agency', 'EXPHIST'),
    agency: 'Historical Label',
    agencyStatus: 'historical' as const,
    lifecycleStatus: 'inactive' as const,
    tier: 'archive' as const,
  };

  const expanded = buildExpandedArtistUniverseV4(
    artistUniverseV4,
    [historicalAgency],
  );
  assert.equal(expanded.at(-1)?.agency, 'Historical Label');
  assert.equal(expanded.at(-1)?.agencyStatus, 'historical');
  assert.equal(expanded.at(-1)?.lifecycleStatus, 'inactive');
});

test('historical agency cannot be attached to an active identity', () => {
  const bad = {
    ...seed('expansion-active-historical-agency', 'EXPACTHIST'),
    agencyStatus: 'historical' as const,
  };

  assert.throws(
    () => buildExpandedArtistUniverseV4(artistUniverseV4, [bad]),
    /artist_universe_expansion_historical_agency_requires_inactive:expansion-active-historical-agency/,
  );
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
