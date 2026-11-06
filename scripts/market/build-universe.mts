// 활동 중인 그룹 명단(data/market/universe.json)을 만든다.
// 원본: app/data/v4/artistUniverse.ts (355팀) 중 entityType=group, lifecycleStatus=active.
// 실행: npx tsx scripts/market/build-universe.mts

import { writeFileSync, mkdirSync } from 'node:fs';
import { artistUniverseV4 } from '../../app/data/v4/artistUniverse';

type GroupType = 'boy_group' | 'girl_group' | 'mixed' | 'unknown';

// 성별 구분. 확실하지 않은 팀은 넣지 않는다(unknown → 랭킹 '전체'에만 표시).
const GIRL = new Set([
  'aespa', 'ive', 'illit', 'lesserafim', 'newjeans', 'nmixx', 'babymonster', 'blackpink', 'twice',
  'gidle', 'itzy', 'kissoflife', 'meovv', 'izna', 'redvelvet', 'mamamoo', 'qwer', 'girlsgeneration',
  '2ne1', 'niziu', 'katseye', 'stayc', 'triples', 'dreamcatcher', 'billlie', 'apink', 'ohmygirl',
  'viviz', 'fromis9', 'hearts2hearts', 'kep1er', 'artms', 'unis', 'rescene', 'wjsn', 'kiiikiii',
  'seeya', 'davichi', 'gyeongseoyeji', 'ioi', 'girlset', 'babydontcry', 'purplekiss', 'lightsum',
  'kara', 'csr', 'youngposse', 'secret', 'candyshop', 'badvillain', 'h1key', 'saymyname',
  'fiftyfifty', 'ichillin', 'madein', 'classy', 'vvup',
]);
const MIXED = new Set(['kard', 'alldayproject', 'balmingtiger']);
const BOY = new Set([
  'riize', 'tws', 'boynextdoor', 'straykids', 'seventeen', 'bts', 'enhypen', 'txt', 'ateez',
  'zerobaseone', 'nctdream', 'nct127', 'nctwish', 'treasure', 'theboyz', 'monstax', 'exo', 'day6',
  'shinee', 'superjunior', 'tvxq', 'wayv', 'bigbang', 'winner', 'xdinaryheroes', 'andteam',
  'p1harmony', 'xikers', 'cravity', 'oneus', 'btob', 'nexz', 'onf', 'kickflip', 'nowadays',
  'allhours', 'thenewsix', 'epex', 'tempest', '8turn', 'younite', 'cortis', 'buzz', 'jannabi',
  'nflying', 'epikhigh', 'melomance', 'nerdconnection', 'standingegg', 'thenuts', 'idid', 'ikon',
  '82major', 'highlight', 'ahof', 'ampersandone', 'plave', 'touched', 'lucy', 'nssign', 'hori7on',
  '2pm', 'boystory', 'ftisland', 'cnblue', 'sf9', 'hifiunicorn', 'axmxp', 'goldenchild', 'drippin',
  'onewe', 'alphadriveone', 'lun8', 'astro', 'pentagon', 'peppertones', 'dragonpony', 'oddyouth',
  'mcnd', 'teentop', 'b1a4', 'xlov', 'dkb', 'tunexx', 'newbeat', 'asc2nt', 'evnne', 'vixx',
  'verivery', 'idntt', 'onepact', 'waker', 'dxmon', 'fantasyboys', 'pow', 'whib', 'aimers',
  'trendz', 'tiot', 'blitzers', 'justb', 'ghost9', 'wei', 'ntx', 'ninei', 'omegax', 'ab6ix',
  'silicagel', 'idiotape',
]);

function groupType(id: string): GroupType {
  if (GIRL.has(id)) return 'girl_group';
  if (BOY.has(id)) return 'boy_group';
  if (MIXED.has(id)) return 'mixed';
  return 'unknown';
}

const groups = artistUniverseV4.filter(
  (artist) => artist.entityType === 'group' && artist.lifecycleStatus === 'active',
);

const universe = groups.map((artist) => {
  const koreanName = artist.profile.koreanAliases[0] ?? artist.nameKo;
  const englishName = artist.profile.englishAliases[0] ?? artist.nameEn;
  const matchNames = Array.from(
    new Set(
      [koreanName, englishName, ...artist.profile.koreanAliases, ...artist.profile.englishAliases]
        .map((name) => name.trim())
        .filter((name) => name.length >= 2)
        // '아이들'은 일반 명사(children)라 매칭에 쓰지 않는다
        .filter((name) => !(artist.id === 'gidle' && name === '아이들')),
    ),
  );
  return {
    id: artist.id,
    koreanName,
    englishName,
    ticker: artist.ticker,
    groupType: groupType(artist.id),
    agency: artist.agency || null,
    debutDate: artist.debutDate ?? null,
    naverQuery: artist.profile.naverNewsQuery ?? `${koreanName} ${englishName}`,
    matchNames,
    excludeKeywords: artist.profile.excludeKeywords,
    lastfmName: englishName,
  };
});

mkdirSync('data/market', { recursive: true });
writeFileSync(
  'data/market/universe.json',
  `${JSON.stringify({ version: 'market-universe-v1', source: 'app/data/v4/artistUniverse.ts', count: universe.length, groups: universe }, null, 1)}\n`,
);

const unknown = universe.filter((group) => group.groupType === 'unknown').map((group) => group.id);
console.log(`groups: ${universe.length}, gender unknown: ${unknown.length} (${unknown.join(', ')})`);
