import type {
  ArtistCollectionTier,
  ArtistMarketCode,
  ArtistV4,
  RealDataSource,
} from './types';

const defaultSources: RealDataSource[] = ['naver_news', 'youtube', 'official'];

type ArtistSeedInput = {
  id: string;
  ticker: string;
  name: string;
  agency: string;
  entityType?: ArtistV4['entityType'];
  debutDate?: string;
  lifecycleStatus?: ArtistV4['lifecycleStatus'];
  members?: string[];
  fandomName?: string;
  generation?: string;
  aliases?: string[];
  naverNewsQuery?: string;
  koreanAliases?: string[];
  englishAliases?: string[];
  keywords?: string[];
  disambiguationKeywords?: string[];
  excludeKeywords?: string[];
  markets?: ArtistMarketCode[];
  tier?: ArtistCollectionTier;
  priorityScore?: number;
  shortIntro?: string;
};

function createArtist(input: ArtistSeedInput): ArtistV4 {
  const aliases = Array.from(
    new Set([
      input.name,
      input.ticker,
      ...(input.aliases ?? []),
      ...(input.koreanAliases ?? []),
      ...(input.englishAliases ?? []),
    ]),
  );
  const includeKeywords = Array.from(
    new Set([
      input.name,
      input.agency,
      ...(input.keywords ?? []),
      ...(input.disambiguationKeywords ?? []),
      ...(input.fandomName ? [input.fandomName] : []),
    ]),
  );

  return {
    id: input.id,
    ticker: input.ticker,
    nameKo: input.name,
    nameEn: input.name,
    entityType: input.entityType ?? 'group',
    agency: input.agency,
    debutDate: input.debutDate,
    lifecycleStatus: input.lifecycleStatus ?? 'active',
    members: input.members ?? [],
    fandomName: input.fandomName,
    generation: input.generation,
    profile: {
      primaryQuery: input.name,
      naverNewsQuery: input.naverNewsQuery,
      aliases,
      koreanAliases: input.koreanAliases ?? [],
      englishAliases: input.englishAliases ?? [],
      includeKeywords,
      disambiguationKeywords: input.disambiguationKeywords ?? [],
      excludeKeywords: input.excludeKeywords ?? [],
      markets: input.markets ?? ['KR', 'GLOBAL'],
    },
    collection: {
      tier: input.tier ?? 'standard',
      priorityScore: input.priorityScore ?? 50,
      targetSources: defaultSources,
      verificationStatus: 'needs_verification',
      notes: 'Seed profile for v4 real-data collection. Verify factual fields before production use.',
    },
    officialChannels: {},
    shortIntro:
      input.shortIntro ??
      `${input.name} seed profile for FANDEX v4 real-data collection and ranking expansion.`,
  };
}

export const artistUniverseV4: ArtistV4[] = [
  createArtist({
    id: 'aespa',
    ticker: 'AESPA',
    name: 'aespa',
    agency: 'SM Entertainment',
    debutDate: '2020-11-17',
    members: ['Karina', 'Giselle', 'Winter', 'Ningning'],
    fandomName: 'MY',
    generation: '4th gen',
    aliases: ['Aespa'],
    keywords: ['Karina', 'Winter', 'SM'],
    markets: ['KR', 'JP', 'US', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 96,
    shortIntro: 'Concept-driven 4th generation girl group with strong global fan and content signals.',
  }),
  createArtist({
    id: 'ive',
    ticker: 'IVE',
    name: 'IVE',
    agency: 'Starship Entertainment',
    debutDate: '2021-12-01',
    members: ['Yujin', 'Gaeul', 'Rei', 'Wonyoung', 'Liz', 'Leeseo'],
    fandomName: 'DIVE',
    generation: '4th gen',
    keywords: ['Wonyoung', 'Yujin', 'Starship'],
    markets: ['KR', 'JP', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 95,
  }),
  createArtist({
    id: 'riize',
    ticker: 'RIIZE',
    name: 'RIIZE',
    agency: 'SM Entertainment',
    debutDate: '2023-09-04',
    members: ['Shotaro', 'Eunseok', 'Sungchan', 'Wonbin', 'Sohee', 'Anton'],
    fandomName: 'BRIIZE',
    generation: '5th gen',
    keywords: ['Wonbin', 'Anton', 'Sungchan', 'SM'],
    markets: ['KR', 'JP', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 92,
  }),
  createArtist({
    id: 'illit',
    ticker: 'ILLIT',
    name: 'ILLIT',
    agency: 'Belift Lab',
    debutDate: '2024-03-25',
    members: ['Yunah', 'Minju', 'Moka', 'Wonhee', 'Iroha'],
    generation: '5th gen',
    keywords: ['Wonhee', 'Moka', 'HYBE', 'Belift Lab'],
    markets: ['KR', 'JP', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 90,
  }),
  createArtist({
    id: 'tws',
    ticker: 'TWS',
    name: 'TWS',
    agency: 'Pledis Entertainment',
    debutDate: '2024-01-22',
    members: ['Shinyu', 'Dohoon', 'Youngjae', 'Hanjin', 'Jihoon', 'Kyungmin'],
    generation: '5th gen',
    keywords: ['Shinyu', 'Dohoon', 'Pledis', 'HYBE'],
    markets: ['KR', 'JP', 'GLOBAL'],
    tier: 'high',
    priorityScore: 86,
  }),
  createArtist({
    id: 'lesserafim',
    ticker: 'LSF',
    name: 'LE SSERAFIM',
    agency: 'Source Music',
    debutDate: '2022-05-02',
    members: ['Kim Chaewon', 'Sakura', 'Huh Yunjin', 'Kazuha', 'Hong Eunchae'],
    fandomName: 'FEARNOT',
    generation: '4th gen',
    keywords: ['Chaewon', 'Sakura', 'Yunjin', 'HYBE'],
    markets: ['KR', 'JP', 'US', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 94,
  }),
  createArtist({
    id: 'newjeans',
    ticker: 'NWJNS',
    name: 'NewJeans',
    agency: 'ADOR',
    debutDate: '2022-07-22',
    members: ['Minji', 'Hanni', 'Danielle', 'Haerin', 'Hyein'],
    fandomName: 'Bunnies',
    generation: '4th gen',
    keywords: ['Minji', 'Hanni', 'Haerin', 'ADOR'],
    markets: ['KR', 'JP', 'US', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 94,
  }),
  createArtist({
    id: 'nmixx',
    ticker: 'NMIXX',
    name: 'NMIXX',
    agency: 'JYP Entertainment',
    debutDate: '2022-02-22',
    members: ['Lily', 'Haewon', 'Sullyoon', 'Bae', 'Jiwoo', 'Kyujin'],
    fandomName: 'NSWER',
    generation: '4th gen',
    keywords: ['Haewon', 'Sullyoon', 'Lily', 'JYP'],
    tier: 'high',
    priorityScore: 82,
  }),
  createArtist({
    id: 'babymonster',
    ticker: 'BMON',
    name: 'BABYMONSTER',
    agency: 'YG Entertainment',
    debutDate: '2024-04-01',
    members: ['Ruka', 'Pharita', 'Asa', 'Ahyeon', 'Rami', 'Rora', 'Chiquita'],
    generation: '5th gen',
    keywords: ['Ahyeon', 'Chiquita', 'YG'],
    markets: ['KR', 'JP', 'SEA', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 88,
  }),
  createArtist({
    id: 'boynextdoor',
    ticker: 'BND',
    name: 'BOYNEXTDOOR',
    agency: 'KOZ Entertainment',
    debutDate: '2023-05-30',
    members: ['Sungho', 'Riwoo', 'Jaehyun', 'Taesan', 'Leehan', 'Woonhak'],
    generation: '5th gen',
    keywords: ['Jaehyun', 'Taesan', 'KOZ', 'HYBE'],
    tier: 'high',
    priorityScore: 80,
  }),
  createArtist({
    id: 'straykids',
    ticker: 'SKZ',
    name: 'Stray Kids',
    agency: 'JYP Entertainment',
    debutDate: '2018-03-25',
    members: ['Bang Chan', 'Lee Know', 'Changbin', 'Hyunjin', 'Han', 'Felix', 'Seungmin', 'I.N'],
    fandomName: 'STAY',
    generation: '4th gen',
    aliases: ['SKZ'],
    keywords: ['Hyunjin', 'Felix', 'JYP'],
    markets: ['KR', 'JP', 'US', 'EU', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 97,
  }),
  createArtist({
    id: 'seventeen',
    ticker: 'SVT',
    name: 'SEVENTEEN',
    agency: 'Pledis Entertainment',
    debutDate: '2015-05-26',
    members: ['S.Coups', 'Jeonghan', 'Joshua', 'Jun', 'Hoshi', 'Wonwoo', 'Woozi', 'DK', 'Mingyu', 'The8', 'Seungkwan', 'Vernon', 'Dino'],
    fandomName: 'CARAT',
    generation: '3rd gen',
    aliases: ['SVT'],
    keywords: ['Hoshi', 'Mingyu', 'DK', 'HYBE'],
    markets: ['KR', 'JP', 'US', 'GLOBAL'],
    tier: 'realtime',
    priorityScore: 97,
  }),
  createArtist({ id: 'bts', ticker: 'BTS', name: 'BTS', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', fandomName: 'ARMY', generation: '3rd gen', aliases: ['Bangtan Boys'], keywords: ['BIGHIT', 'HYBE', 'ARMY'], markets: ['KR', 'JP', 'US', 'EU', 'GLOBAL'], tier: 'realtime', priorityScore: 100 }),
  createArtist({ id: 'blackpink', ticker: 'BLKPNK', name: 'BLACKPINK', agency: 'YG Entertainment', debutDate: '2016-08-08', fandomName: 'BLINK', generation: '3rd gen', keywords: ['Jisoo', 'Jennie', 'Rose', 'Lisa', 'YG'], markets: ['KR', 'JP', 'US', 'SEA', 'GLOBAL'], tier: 'realtime', priorityScore: 99 }),
  createArtist({ id: 'twice', ticker: 'TWICE', name: 'TWICE', agency: 'JYP Entertainment', debutDate: '2015-10-20', fandomName: 'ONCE', generation: '3rd gen', keywords: ['Nayeon', 'Jihyo', 'JYP'], markets: ['KR', 'JP', 'US', 'GLOBAL'], tier: 'realtime', priorityScore: 96 }),
  createArtist({ id: 'enhypen', ticker: 'ENHYP', name: 'ENHYPEN', agency: 'Belift Lab', debutDate: '2020-11-30', fandomName: 'ENGENE', generation: '4th gen', keywords: ['Jungwon', 'Sunghoon', 'Ni-ki', 'HYBE'], markets: ['KR', 'JP', 'US', 'GLOBAL'], tier: 'realtime', priorityScore: 94 }),
  createArtist({ id: 'txt', ticker: 'TXT', name: 'TOMORROW X TOGETHER', agency: 'BIGHIT MUSIC', debutDate: '2019-03-04', fandomName: 'MOA', generation: '4th gen', aliases: ['TXT'], naverNewsQuery: 'TXT 투모로우바이투게더', koreanAliases: ['투모로우바이투게더'], englishAliases: ['Tomorrow X Together', 'TXT'], keywords: ['Yeonjun', 'Soobin', 'HYBE'], disambiguationKeywords: ['BIGHIT MUSIC', 'HYBE'], markets: ['KR', 'JP', 'US', 'GLOBAL'], tier: 'realtime', priorityScore: 93 }),
  createArtist({ id: 'ateez', ticker: 'ATEEZ', name: 'ATEEZ', agency: 'KQ Entertainment', debutDate: '2018-10-24', fandomName: 'ATINY', generation: '4th gen', keywords: ['Hongjoong', 'San', 'KQ'], markets: ['KR', 'JP', 'US', 'EU', 'GLOBAL'], tier: 'realtime', priorityScore: 91 }),
  createArtist({ id: 'zerobaseone', ticker: 'ZB1', name: 'ZEROBASEONE', agency: 'WakeOne', debutDate: '2023-07-10', fandomName: 'ZEROSE', generation: '5th gen', aliases: ['ZB1'], keywords: ['Sung Hanbin', 'Zhang Hao', 'WakeOne'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'realtime', priorityScore: 89 }),
  createArtist({ id: 'gidle', ticker: 'GIDLE', name: '(G)I-DLE', agency: 'Cube Entertainment', debutDate: '2018-05-02', fandomName: 'Neverland', generation: '4th gen', aliases: ['GIDLE', 'I-DLE'], naverNewsQuery: '여자아이들 (G)I-DLE', koreanAliases: ['여자아이들', '아이들'], englishAliases: ['(G)I-DLE', 'GIDLE', 'I-DLE'], keywords: ['Soyeon', 'Miyeon', 'Yuqi', 'Cube'], disambiguationKeywords: ['Cube Entertainment'], markets: ['KR', 'CN', 'GLOBAL'], tier: 'realtime', priorityScore: 90 }),
  createArtist({ id: 'itzy', ticker: 'ITZY', name: 'ITZY', agency: 'JYP Entertainment', debutDate: '2019-02-12', fandomName: 'MIDZY', generation: '4th gen', keywords: ['Yeji', 'Ryujin', 'Yuna', 'JYP'], tier: 'high', priorityScore: 84 }),
  createArtist({ id: 'kissoflife', ticker: 'KIOF', name: 'KISS OF LIFE', agency: 'S2 Entertainment', debutDate: '2023-07-05', fandomName: 'KISSY', generation: '5th gen', aliases: ['KIOF'], naverNewsQuery: '키스오브라이프 KISS OF LIFE', koreanAliases: ['키스오브라이프'], englishAliases: ['KISS OF LIFE', 'KIOF'], keywords: ['Natty', 'Belle', 'Julie'], disambiguationKeywords: ['S2 Entertainment'], tier: 'high', priorityScore: 83 }),
  createArtist({ id: 'meovv', ticker: 'MEOVV', name: 'MEOVV', agency: 'THEBLACKLABEL', debutDate: '2024-09-06', generation: '5th gen', keywords: ['THEBLACKLABEL'], tier: 'high', priorityScore: 78 }),
  createArtist({ id: 'izna', ticker: 'IZNA', name: 'izna', agency: 'WakeOne', debutDate: '2024-11-25', generation: '5th gen', keywords: ['WakeOne', 'I-LAND 2'], tier: 'high', priorityScore: 74 }),
  createArtist({ id: 'nctdream', ticker: 'NCTDRM', name: 'NCT DREAM', agency: 'SM Entertainment', debutDate: '2016-08-25', fandomName: 'NCTzen', generation: '3rd gen', naverNewsQuery: 'NCT DREAM 엔시티 드림', koreanAliases: ['엔시티 드림'], englishAliases: ['NCT DREAM', 'NCT드림'], keywords: ['Mark', 'Jeno', 'Jaemin', 'SM'], disambiguationKeywords: ['SM Entertainment', 'NCT'], tier: 'realtime', priorityScore: 90 }),
  createArtist({ id: 'nct127', ticker: 'NCT127', name: 'NCT 127', agency: 'SM Entertainment', debutDate: '2016-07-07', fandomName: 'NCTzen', generation: '3rd gen', naverNewsQuery: 'NCT 127 엔시티 127', koreanAliases: ['엔시티 127', '엔시티127'], englishAliases: ['NCT 127', 'NCT127'], keywords: ['Taeyong', 'Doyoung', 'Mark', 'SM'], disambiguationKeywords: ['SM Entertainment', 'NCT'], tier: 'high', priorityScore: 86 }),
  createArtist({ id: 'nctwish', ticker: 'NCTW', name: 'NCT WISH', agency: 'SM Entertainment', debutDate: '2024-02-21', fandomName: 'NCTzen', generation: '5th gen', naverNewsQuery: 'NCT WISH 엔시티 위시', koreanAliases: ['엔시티 위시'], englishAliases: ['NCT WISH'], keywords: ['Sion', 'Yushi', 'SM'], disambiguationKeywords: ['SM Entertainment', 'NCT'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'high', priorityScore: 76 }),
  createArtist({ id: 'treasure', ticker: 'TRSR', name: 'TREASURE', agency: 'YG Entertainment', debutDate: '2020-08-07', fandomName: 'TEUME', generation: '4th gen', keywords: ['YG', 'Hyunsuk', 'Yoshi'], markets: ['KR', 'JP', 'SEA', 'GLOBAL'], tier: 'high', priorityScore: 82 }),
  createArtist({ id: 'theboyz', ticker: 'TBZ', name: 'THE BOYZ', agency: 'One Hundred', debutDate: '2017-12-06', fandomName: 'THE B', generation: '3rd gen', aliases: ['TBZ'], naverNewsQuery: '더보이즈 THE BOYZ', koreanAliases: ['더보이즈'], englishAliases: ['THE BOYZ', 'The Boyz', 'TBZ'], keywords: ['Sunwoo', 'Younghoon'], disambiguationKeywords: ['One Hundred'], tier: 'standard', priorityScore: 72 }),
  createArtist({ id: 'monstax', ticker: 'MX', name: 'MONSTA X', agency: 'Starship Entertainment', debutDate: '2015-05-14', fandomName: 'MONBEBE', generation: '3rd gen', keywords: ['Shownu', 'Kihyun', 'I.M'], tier: 'standard', priorityScore: 70 }),
  createArtist({ id: 'exo', ticker: 'EXO', name: 'EXO', agency: 'SM Entertainment', debutDate: '2012-04-08', fandomName: 'EXO-L', generation: '3rd gen', keywords: ['Baekhyun', 'Kai', 'D.O.', 'SM'], tier: 'high', priorityScore: 84 }),
  createArtist({ id: 'redvelvet', ticker: 'RV', name: 'Red Velvet', agency: 'SM Entertainment', debutDate: '2014-08-01', fandomName: 'ReVeluv', generation: '3rd gen', naverNewsQuery: '레드벨벳 Red Velvet', koreanAliases: ['레드벨벳'], englishAliases: ['Red Velvet'], keywords: ['Irene', 'Seulgi', 'Wendy', 'SM'], disambiguationKeywords: ['SM Entertainment'], tier: 'high', priorityScore: 82 }),
  createArtist({ id: 'mamamoo', ticker: 'MMM', name: 'MAMAMOO', agency: 'RBW', debutDate: '2014-06-18', fandomName: 'MooMoo', generation: '3rd gen', keywords: ['Solar', 'Moonbyul', 'Hwasa'], tier: 'standard', priorityScore: 69 }),
  createArtist({ id: 'akmu', ticker: 'AKMU', name: 'AKMU', agency: 'YG Entertainment', debutDate: '2014-04-07', entityType: 'unit', keywords: ['Akdong Musician', 'Chanhyuk', 'Suhyun'], tier: 'standard', priorityScore: 68 }),
  createArtist({ id: 'iu', ticker: 'IU', name: 'IU', agency: 'EDAM Entertainment', debutDate: '2008-09-18', entityType: 'solo', fandomName: 'UAENA', generation: '2nd gen', naverNewsQuery: '아이유 IU', koreanAliases: ['아이유', '이지은'], englishAliases: ['IU', 'Lee Jieun'], keywords: ['Lee Jieun', 'EDAM'], disambiguationKeywords: ['EDAM Entertainment', '가수'], tier: 'realtime', priorityScore: 95 }),
  createArtist({ id: 'taeyeon', ticker: 'TAEYEON', name: 'TAEYEON', agency: 'SM Entertainment', debutDate: '2007-08-05', entityType: 'solo', fandomName: 'SONE', generation: '2nd gen', keywords: ['Girls Generation', 'SM'], tier: 'high', priorityScore: 82 }),
  createArtist({ id: 'jungkook', ticker: 'JK', name: 'Jung Kook', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', entityType: 'solo', fandomName: 'ARMY', generation: '3rd gen', aliases: ['Jungkook'], naverNewsQuery: '정국 BTS', koreanAliases: ['정국', '전정국'], englishAliases: ['Jung Kook', 'Jungkook'], keywords: ['BTS', 'HYBE'], disambiguationKeywords: ['BIGHIT MUSIC', '방탄소년단'], markets: ['KR', 'JP', 'US', 'EU', 'GLOBAL'], tier: 'realtime', priorityScore: 98 }),
  createArtist({ id: 'jimin', ticker: 'JIMIN', name: 'Jimin', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', entityType: 'solo', fandomName: 'ARMY', generation: '3rd gen', keywords: ['BTS', 'HYBE'], markets: ['KR', 'JP', 'US', 'EU', 'GLOBAL'], tier: 'realtime', priorityScore: 97 }),
  createArtist({ id: 'v', ticker: 'V', name: 'V', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', entityType: 'solo', fandomName: 'ARMY', generation: '3rd gen', aliases: ['Kim Taehyung'], naverNewsQuery: '뷔 BTS', koreanAliases: ['뷔', '김태형'], englishAliases: ['V', 'Kim Taehyung'], keywords: ['BTS', 'HYBE'], disambiguationKeywords: ['BIGHIT MUSIC', '방탄소년단'], markets: ['KR', 'JP', 'US', 'EU', 'GLOBAL'], tier: 'realtime', priorityScore: 97 }),
  createArtist({ id: 'jin', ticker: 'JIN', name: 'Jin', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', entityType: 'solo', fandomName: 'ARMY', generation: '3rd gen', naverNewsQuery: '진 BTS', koreanAliases: ['진', '김석진'], englishAliases: ['Jin', 'Kim Seokjin'], keywords: ['BTS', 'HYBE'], disambiguationKeywords: ['BIGHIT MUSIC', '방탄소년단'], tier: 'realtime', priorityScore: 94 }),
  createArtist({ id: 'suga', ticker: 'SUGA', name: 'SUGA', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', entityType: 'solo', fandomName: 'ARMY', generation: '3rd gen', aliases: ['Agust D'], keywords: ['BTS', 'HYBE'], tier: 'high', priorityScore: 91 }),
  createArtist({ id: 'rm', ticker: 'RM', name: 'RM', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', entityType: 'solo', fandomName: 'ARMY', generation: '3rd gen', naverNewsQuery: 'RM BTS', koreanAliases: ['알엠', '김남준'], englishAliases: ['RM', 'Kim Namjoon'], keywords: ['BTS', 'HYBE'], disambiguationKeywords: ['BIGHIT MUSIC', '방탄소년단'], tier: 'high', priorityScore: 90 }),
  createArtist({ id: 'jhope', ticker: 'JHOPE', name: 'j-hope', agency: 'BIGHIT MUSIC', debutDate: '2013-06-13', entityType: 'solo', fandomName: 'ARMY', generation: '3rd gen', aliases: ['J-Hope'], naverNewsQuery: '제이홉 BTS', koreanAliases: ['제이홉', '정호석'], englishAliases: ['j-hope', 'J-Hope'], keywords: ['BTS', 'HYBE'], disambiguationKeywords: ['BIGHIT MUSIC', '방탄소년단'], tier: 'high', priorityScore: 90 }),
  createArtist({ id: 'baekhyun', ticker: 'BAEK', name: 'Baekhyun', agency: 'INB100', debutDate: '2012-04-08', entityType: 'solo', fandomName: 'EXO-L', generation: '3rd gen', keywords: ['EXO', 'INB100'], tier: 'high', priorityScore: 80 }),
  createArtist({ id: 'kai', ticker: 'KAI', name: 'Kai', agency: 'SM Entertainment', debutDate: '2012-04-08', entityType: 'solo', fandomName: 'EXO-L', generation: '3rd gen', naverNewsQuery: '카이 EXO', koreanAliases: ['카이', '김종인'], englishAliases: ['Kai'], keywords: ['EXO', 'SM'], disambiguationKeywords: ['SM Entertainment', '엑소'], tier: 'standard', priorityScore: 70 }),
  createArtist({ id: 'zico', ticker: 'ZICO', name: 'ZICO', agency: 'KOZ Entertainment', debutDate: '2011-04-15', entityType: 'solo', keywords: ['KOZ', 'HYBE'], tier: 'standard', priorityScore: 68 }),
  createArtist({ id: 'bibi', ticker: 'BIBI', name: 'BIBI', agency: 'Feel Ghood Music', debutDate: '2019-05-15', entityType: 'solo', keywords: ['Feel Ghood Music'], tier: 'standard', priorityScore: 67 }),
  createArtist({ id: 'lee-youngji', ticker: 'LYJ', name: 'Lee Young Ji', agency: 'Mainstream', debutDate: '2019-11-02', entityType: 'solo', aliases: ['Youngji'], naverNewsQuery: '이영지 래퍼', koreanAliases: ['이영지'], englishAliases: ['Lee Young Ji', 'Youngji'], keywords: ['rapper', 'Nothing Much Prepared'], disambiguationKeywords: ['래퍼', '차린건 쥐뿔도 없지만'], tier: 'standard', priorityScore: 66 }),
  createArtist({ id: 'day6', ticker: 'DAY6', name: 'DAY6', agency: 'JYP Entertainment', debutDate: '2015-09-07', fandomName: 'My Day', generation: '3rd gen', keywords: ['Sungjin', 'Young K', 'Wonpil', 'Dowoon'], tier: 'high', priorityScore: 81 }),
  createArtist({ id: 'qwer', ticker: 'QWER', name: 'QWER', agency: '3Y Corporation', debutDate: '2023-10-18', keywords: ['Chodan', 'Magenta', 'Hina', 'Siyeon'], tier: 'high', priorityScore: 78 }),
  createArtist({ id: 'girlsgeneration', ticker: 'SNSD', name: "Girls' Generation", agency: 'SM Entertainment', debutDate: '2007-08-05', fandomName: 'SONE', generation: '2nd gen', aliases: ['SNSD'], naverNewsQuery: '소녀시대 Girls Generation', koreanAliases: ['소녀시대'], englishAliases: ["Girls' Generation", 'SNSD'], keywords: ['Taeyeon', 'Yoona', 'SM'], disambiguationKeywords: ['SM Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'high', priorityScore: 84 }),
  createArtist({ id: 'shinee', ticker: 'SHINee', name: 'SHINee', agency: 'SM Entertainment', debutDate: '2008-05-25', fandomName: 'Shawol', generation: '2nd gen', naverNewsQuery: '샤이니 SHINee', koreanAliases: ['샤이니'], englishAliases: ['SHINee'], keywords: ['Onew', 'Key', 'Minho', 'Taemin', 'SM'], disambiguationKeywords: ['SM Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'high', priorityScore: 83 }),
  createArtist({ id: 'superjunior', ticker: 'SJ', name: 'Super Junior', agency: 'SM Entertainment', debutDate: '2005-11-06', fandomName: 'E.L.F.', generation: '2nd gen', aliases: ['SJ'], naverNewsQuery: '슈퍼주니어 Super Junior', koreanAliases: ['슈퍼주니어'], englishAliases: ['Super Junior', 'SJ'], keywords: ['Leeteuk', 'Heechul', 'Kyuhyun', 'SM'], disambiguationKeywords: ['SM Entertainment'], markets: ['KR', 'JP', 'SEA', 'GLOBAL'], tier: 'standard', priorityScore: 74 }),
  createArtist({ id: 'tvxq', ticker: 'TVXQ', name: 'TVXQ', agency: 'SM Entertainment', debutDate: '2003-12-26', fandomName: 'Cassiopeia', generation: '2nd gen', aliases: ['DBSK'], naverNewsQuery: '동방신기 TVXQ', koreanAliases: ['동방신기'], englishAliases: ['TVXQ', 'DBSK'], keywords: ['U-Know Yunho', 'Max Changmin', 'SM'], disambiguationKeywords: ['SM Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 73 }),
  createArtist({ id: 'wayv', ticker: 'WAYV', name: 'WayV', agency: 'SM Entertainment', debutDate: '2019-01-17', fandomName: 'WayZenNi', generation: '4th gen', naverNewsQuery: 'WayV 웨이션브이', koreanAliases: ['웨이션브이'], englishAliases: ['WayV'], keywords: ['Kun', 'Ten', 'Xiaojun', 'SM'], disambiguationKeywords: ['SM Entertainment', 'NCT'], markets: ['KR', 'CN', 'GLOBAL'], tier: 'standard', priorityScore: 72 }),
  createArtist({ id: 'bigbang', ticker: 'BIGBANG', name: 'BIGBANG', agency: 'YG Entertainment', debutDate: '2006-08-19', fandomName: 'VIP', generation: '2nd gen', naverNewsQuery: '빅뱅 BIGBANG', koreanAliases: ['빅뱅'], englishAliases: ['BIGBANG'], keywords: ['G-DRAGON', 'Taeyang', 'Daesung', 'YG'], disambiguationKeywords: ['YG Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'high', priorityScore: 82 }),
  createArtist({ id: '2ne1', ticker: '2NE1', name: '2NE1', agency: 'YG Entertainment', debutDate: '2009-05-06', fandomName: 'Blackjack', generation: '2nd gen', naverNewsQuery: '투애니원 2NE1', koreanAliases: ['투애니원'], englishAliases: ['2NE1'], keywords: ['CL', 'Sandara Park', 'Bom', 'Minzy', 'YG'], disambiguationKeywords: ['YG Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 75 }),
  createArtist({ id: 'winner', ticker: 'WINNER', name: 'WINNER', agency: 'YG Entertainment', debutDate: '2014-08-17', fandomName: 'Inner Circle', generation: '3rd gen', naverNewsQuery: '위너 WINNER', koreanAliases: ['위너'], englishAliases: ['WINNER'], keywords: ['Kang Seungyoon', 'Mino', 'YG'], disambiguationKeywords: ['YG Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 71 }),
  createArtist({ id: 'niziu', ticker: 'NIZIU', name: 'NiziU', agency: 'JYP Entertainment', debutDate: '2020-12-02', fandomName: 'WithU', generation: '4th gen', naverNewsQuery: 'NiziU 니쥬', koreanAliases: ['니쥬'], englishAliases: ['NiziU'], keywords: ['Mako', 'Riku', 'Miihi', 'JYP'], disambiguationKeywords: ['JYP Entertainment'], markets: ['JP', 'KR', 'GLOBAL'], tier: 'high', priorityScore: 80 }),
  createArtist({ id: 'xdinaryheroes', ticker: 'XH', name: 'Xdinary Heroes', agency: 'JYP Entertainment', debutDate: '2021-12-06', fandomName: 'Villains', generation: '4th gen', aliases: ['XH'], naverNewsQuery: '엑스디너리 히어로즈 Xdinary Heroes', koreanAliases: ['엑스디너리 히어로즈'], englishAliases: ['Xdinary Heroes', 'XH'], keywords: ['band', 'Gunil', 'Jooyeon', 'JYP'], disambiguationKeywords: ['JYP Entertainment', 'band'], markets: ['KR', 'GLOBAL'], tier: 'standard', priorityScore: 72 }),
  createArtist({ id: 'andteam', ticker: 'ANDTEAM', name: '&TEAM', agency: 'HYBE Labels Japan', debutDate: '2022-12-07', fandomName: 'LUNÉ', generation: '4th gen', aliases: ['andTEAM'], naverNewsQuery: '&TEAM 앤팀', koreanAliases: ['앤팀'], englishAliases: ['&TEAM', 'andTEAM'], keywords: ['K', 'Nicholas', 'HYBE'], disambiguationKeywords: ['HYBE Labels Japan'], markets: ['JP', 'KR', 'GLOBAL'], tier: 'high', priorityScore: 79 }),
  createArtist({ id: 'katseye', ticker: 'KATSEYE', name: 'KATSEYE', agency: 'HYBE x Geffen', debutDate: '2024-06-28', fandomName: 'EYEKONS', generation: '5th gen', naverNewsQuery: 'KATSEYE 캣츠아이', koreanAliases: ['캣츠아이'], englishAliases: ['KATSEYE'], keywords: ['Sophia', 'Lara', 'Manon', 'HYBE', 'Geffen'], disambiguationKeywords: ['HYBE', 'Geffen'], markets: ['US', 'KR', 'GLOBAL'], tier: 'high', priorityScore: 82 }),
  createArtist({ id: 'stayc', ticker: 'STAYC', name: 'STAYC', agency: 'High Up Entertainment', debutDate: '2020-11-12', fandomName: 'SWITH', generation: '4th gen', naverNewsQuery: '스테이씨 STAYC', koreanAliases: ['스테이씨'], englishAliases: ['STAYC'], keywords: ['Sieun', 'Seeun', 'Yoon', 'High Up'], disambiguationKeywords: ['High Up Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'high', priorityScore: 81 }),
  createArtist({ id: 'triples', ticker: 'TRIPLES', name: 'tripleS', agency: 'MODHAUS', debutDate: '2023-02-13', fandomName: 'WAV', generation: '5th gen', aliases: ['TripleS'], naverNewsQuery: '트리플에스 tripleS', koreanAliases: ['트리플에스'], englishAliases: ['tripleS', 'TripleS'], keywords: ['MODHAUS', 'WAV'], disambiguationKeywords: ['MODHAUS'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'high', priorityScore: 80 }),
  createArtist({ id: 'dreamcatcher', ticker: 'DREAMC', name: 'Dreamcatcher', agency: 'Dreamcatcher Company', debutDate: '2017-01-13', fandomName: 'InSomnia', generation: '3rd gen', naverNewsQuery: '드림캐쳐 Dreamcatcher', koreanAliases: ['드림캐쳐'], englishAliases: ['Dreamcatcher'], keywords: ['JiU', 'SuA', 'Siyeon', 'rock'], disambiguationKeywords: ['Dreamcatcher Company'], markets: ['KR', 'EU', 'US', 'GLOBAL'], tier: 'standard', priorityScore: 73 }),
  createArtist({ id: 'billlie', ticker: 'BLLLIE', name: 'Billlie', agency: 'Mystic Story', debutDate: '2021-11-10', fandomName: 'Belllieve', generation: '4th gen', naverNewsQuery: '빌리 Billlie', koreanAliases: ['빌리'], englishAliases: ['Billlie'], keywords: ['Tsuki', 'Moon Sua', 'Mystic Story'], disambiguationKeywords: ['Mystic Story'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 70 }),
  createArtist({ id: 'p1harmony', ticker: 'P1H', name: 'P1Harmony', agency: 'FNC Entertainment', debutDate: '2020-10-28', fandomName: 'P1ece', generation: '4th gen', aliases: ['P1H'], naverNewsQuery: '피원하모니 P1Harmony', koreanAliases: ['피원하모니'], englishAliases: ['P1Harmony', 'P1H'], keywords: ['Keeho', 'Theo', 'FNC'], disambiguationKeywords: ['FNC Entertainment'], markets: ['KR', 'US', 'GLOBAL'], tier: 'high', priorityScore: 79 }),
  createArtist({ id: 'xikers', ticker: 'XIKERS', name: 'xikers', agency: 'KQ Entertainment', debutDate: '2023-03-30', fandomName: 'road𝓨', generation: '5th gen', naverNewsQuery: '싸이커스 xikers', koreanAliases: ['싸이커스'], englishAliases: ['xikers'], keywords: ['Minjae', 'Hunter', 'KQ'], disambiguationKeywords: ['KQ Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'high', priorityScore: 76 }),
  createArtist({ id: 'cravity', ticker: 'CRVT', name: 'CRAVITY', agency: 'Starship Entertainment', debutDate: '2020-04-14', fandomName: 'LUVITY', generation: '4th gen', naverNewsQuery: '크래비티 CRAVITY', koreanAliases: ['크래비티'], englishAliases: ['CRAVITY'], keywords: ['Serim', 'Hyeongjun', 'Starship'], disambiguationKeywords: ['Starship Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 71 }),
  createArtist({ id: 'oneus', ticker: 'ONEUS', name: 'ONEUS', agency: 'RBW', debutDate: '2019-01-09', fandomName: 'To Moon', generation: '4th gen', naverNewsQuery: '원어스 ONEUS', koreanAliases: ['원어스'], englishAliases: ['ONEUS'], keywords: ['Seoho', 'Hwanwoong', 'RBW'], disambiguationKeywords: ['RBW'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 70 }),
  createArtist({ id: 'btob', ticker: 'BTOB', name: 'BTOB', agency: 'BTOB Company', debutDate: '2012-03-21', fandomName: 'Melody', generation: '3rd gen', naverNewsQuery: '비투비 BTOB', koreanAliases: ['비투비'], englishAliases: ['BTOB'], keywords: ['Eunkwang', 'Minhyuk', 'Changsub', 'Melody'], disambiguationKeywords: ['BTOB Company'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 72 }),
  createArtist({ id: 'apink', ticker: 'APINK', name: 'Apink', agency: 'Choi Creative Lab', debutDate: '2011-04-19', fandomName: 'Pink Panda', generation: '2nd gen', naverNewsQuery: '에이핑크 Apink', koreanAliases: ['에이핑크'], englishAliases: ['Apink'], keywords: ['Chorong', 'Bomi', 'Eunji'], disambiguationKeywords: ['Choi Creative Lab'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 70 }),
  createArtist({ id: 'ohmygirl', ticker: 'OMG', name: 'OH MY GIRL', agency: 'WM Entertainment', debutDate: '2015-04-20', fandomName: 'Miracle', generation: '3rd gen', naverNewsQuery: '오마이걸 OH MY GIRL', koreanAliases: ['오마이걸'], englishAliases: ['OH MY GIRL', 'OMG'], keywords: ['Hyojung', 'Mimi', 'YooA', 'WM'], disambiguationKeywords: ['WM Entertainment'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'standard', priorityScore: 71 }),
  createArtist({ id: 'viviz', ticker: 'VIVIZ', name: 'VIVIZ', agency: 'BPM Entertainment', debutDate: '2022-02-09', fandomName: 'Na.V', generation: '4th gen', naverNewsQuery: '비비지 VIVIZ', koreanAliases: ['비비지'], englishAliases: ['VIVIZ'], keywords: ['Eunha', 'SinB', 'Umji', 'GFRIEND'], disambiguationKeywords: ['BPM Entertainment'], markets: ['KR', 'GLOBAL'], tier: 'standard', priorityScore: 70 }),
  createArtist({ id: 'gdragon', ticker: 'GD', name: 'G-DRAGON', agency: 'Galaxy Corporation', debutDate: '2006-08-19', entityType: 'solo', generation: '2nd gen', aliases: ['G Dragon', 'GD'], naverNewsQuery: '지드래곤 G-DRAGON', koreanAliases: ['지드래곤', '권지용'], englishAliases: ['G-DRAGON', 'G Dragon', 'GD'], keywords: ['BIGBANG', 'Galaxy Corporation', 'PEACEMINUSONE'], disambiguationKeywords: ['BIGBANG', 'Galaxy Corporation'], markets: ['KR', 'JP', 'GLOBAL'], tier: 'realtime', priorityScore: 94 }),
];

export const ARTIST_UNIVERSE_V4_TARGET_COUNT = 100;

export function getArtistUniverseV4Summary() {
  return {
    total: artistUniverseV4.length,
    realtime: artistUniverseV4.filter((artist) => artist.collection.tier === 'realtime').length,
    high: artistUniverseV4.filter((artist) => artist.collection.tier === 'high').length,
    standard: artistUniverseV4.filter((artist) => artist.collection.tier === 'standard').length,
    verified: artistUniverseV4.filter((artist) => artist.collection.verificationStatus === 'verified').length,
  };
}

export function getArtistV4ById(artistId: string) {
  return artistUniverseV4.find((artist) => artist.id === artistId);
}
