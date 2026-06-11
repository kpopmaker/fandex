export type ArtistCategory = 'group' | 'solo' | 'unit' | 'project';

export type ArtistGender =
  | 'girl_group'
  | 'boy_group'
  | 'solo_male'
  | 'solo_female'
  | 'mixed'
  | 'unit';

export type ArtistGeneration =
  | 'gen2'
  | 'gen3'
  | 'gen4'
  | 'gen5'
  | 'rookie';

export type ArtistStatus =
  | 'active'
  | 'hiatus'
  | 'military'
  | 'disbanded'
  | 'predebut'
  | 'project_end';

export type TrackingTier =
  | 'realtime'
  | 'hot'
  | 'standard'
  | 'archive';

export type CountryCode =
  | 'KR'
  | 'JP'
  | 'US'
  | 'CN'
  | 'SEA'
  | 'GLOBAL';

export type SourceAccounts = {
  youtubeChannelId: string;
  youtubeUploadsPlaylistId: string;
  instagramUsername: string;
  xUsername: string;
  tiktokUsername: string;
  spotifyArtistId: string;
  appleMusicArtistId: string;
  melonArtistId: string;
  weverseArtistId: string;
  bubbleArtistId: string;
  officialWebsite: string;
};

export type Artist = {
  id: string;
  ticker: string;
  nameKo: string;
  nameEn: string;
  agency: string;
  agencyTicker: string;
  category: ArtistCategory;
  gender: ArtistGender;
  generation: ArtistGeneration;
  debutDate: string;
  status: ArtistStatus;
  trackingTier: TrackingTier;
  basePrice: number;
  aliases: string[];
  members: string[];
  fandomName: string;
  countryFocus: CountryCode[];
  sourceAccounts: SourceAccounts;
  keywords: string[];
  excludedKeywords: string[];
  notes: string;
};

const emptySourceAccounts: SourceAccounts = {
  youtubeChannelId: '',
  youtubeUploadsPlaylistId: '',
  instagramUsername: '',
  xUsername: '',
  tiktokUsername: '',
  spotifyArtistId: '',
  appleMusicArtistId: '',
  melonArtistId: '',
  weverseArtistId: '',
  bubbleArtistId: '',
  officialWebsite: '',
};

export const artists: Artist[] = [
  {
    id: 'aespa',
    ticker: 'AESPA',
    nameKo: '에스파',
    nameEn: 'aespa',
    agency: 'SM Entertainment',
    agencyTicker: 'SM',
    category: 'group',
    gender: 'girl_group',
    generation: 'gen4',
    debutDate: '2020-11-17',
    status: 'active',
    trackingTier: 'realtime',
    basePrice: 100,
    aliases: ['aespa', '에스파', 'æspa', '카리나', '윈터', '지젤', '닝닝', 'MY'],
    members: ['카리나', '윈터', '지젤', '닝닝'],
    fandomName: 'MY',
    countryFocus: ['KR', 'JP', 'US', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'aespa_official',
      xUsername: 'aespa_official',
      tiktokUsername: 'aespa_official',
    },
    keywords: ['aespa', '에스파', 'aespa comeback', '에스파 컴백', 'aespa MV'],
    excludedKeywords: [],
    notes: '초기 realtime 추적 대상',
  },
  {
    id: 'ive',
    ticker: 'IVE',
    nameKo: '아이브',
    nameEn: 'IVE',
    agency: 'STARSHIP Entertainment',
    agencyTicker: 'STARSHIP',
    category: 'group',
    gender: 'girl_group',
    generation: 'gen4',
    debutDate: '2021-12-01',
    status: 'active',
    trackingTier: 'realtime',
    basePrice: 100,
    aliases: ['IVE', '아이브', '안유진', '장원영', '가을', '리즈', '레이', '이서', 'DIVE'],
    members: ['안유진', '장원영', '가을', '리즈', '레이', '이서'],
    fandomName: 'DIVE',
    countryFocus: ['KR', 'JP', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'ivestarship',
      xUsername: 'ivestarship',
      tiktokUsername: 'ive.official',
    },
    keywords: ['IVE', '아이브', 'IVE comeback', '아이브 컴백', 'IVE MV'],
    excludedKeywords: ['ive 뜻', 'I have'],
    notes: '대중형 걸그룹 핵심 추적 대상',
  },
  {
    id: 'riize',
    ticker: 'RIIZE',
    nameKo: '라이즈',
    nameEn: 'RIIZE',
    agency: 'SM Entertainment',
    agencyTicker: 'SM',
    category: 'group',
    gender: 'boy_group',
    generation: 'gen5',
    debutDate: '2023-09-04',
    status: 'active',
    trackingTier: 'realtime',
    basePrice: 100,
    aliases: ['RIIZE', '라이즈', '브리즈', 'BRIIZE'],
    members: ['쇼타로', '은석', '성찬', '원빈', '소희', '앤톤'],
    fandomName: 'BRIIZE',
    countryFocus: ['KR', 'JP', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'riize_official',
      xUsername: 'riize_official',
      tiktokUsername: 'riize_official',
    },
    keywords: ['RIIZE', '라이즈', 'RIIZE comeback', '라이즈 컴백', 'RIIZE MV'],
    excludedKeywords: ['rise', '라이즈 뜻'],
    notes: '5세대 보이그룹 핵심 추적 대상',
  },
  {
    id: 'illit',
    ticker: 'ILLIT',
    nameKo: '아일릿',
    nameEn: 'ILLIT',
    agency: 'BELIFT LAB',
    agencyTicker: 'HYBE',
    category: 'group',
    gender: 'girl_group',
    generation: 'rookie',
    debutDate: '2024-03-25',
    status: 'active',
    trackingTier: 'realtime',
    basePrice: 100,
    aliases: ['ILLIT', '아일릿', '윤아', '민주', '모카', '원희', '이로하'],
    members: ['윤아', '민주', '모카', '원희', '이로하'],
    fandomName: '',
    countryFocus: ['KR', 'JP', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'illit_official',
      xUsername: 'ILLIT_official',
      tiktokUsername: 'illit_official',
    },
    keywords: ['ILLIT', '아일릿', 'ILLIT comeback', '아일릿 컴백', 'ILLIT MV'],
    excludedKeywords: [],
    notes: '신인 모멘텀 추적 대상',
  },
  {
    id: 'tws',
    ticker: 'TWS',
    nameKo: '투어스',
    nameEn: 'TWS',
    agency: 'PLEDIS Entertainment',
    agencyTicker: 'HYBE',
    category: 'group',
    gender: 'boy_group',
    generation: 'rookie',
    debutDate: '2024-01-22',
    status: 'active',
    trackingTier: 'hot',
    basePrice: 100,
    aliases: ['TWS', '투어스', '42'],
    members: ['신유', '도훈', '영재', '한진', '지훈', '경민'],
    fandomName: '42',
    countryFocus: ['KR', 'JP', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'tws_pledis',
      xUsername: 'TWS_PLEDIS',
      tiktokUsername: 'tws_pledis',
    },
    keywords: ['TWS', '투어스', 'TWS comeback', '투어스 컴백', 'TWS MV'],
    excludedKeywords: ['tws 이어폰', '무선이어폰'],
    notes: '신인 보이그룹 hot 추적 대상',
  },
  {
    id: 'lesserafim',
    ticker: 'LSF',
    nameKo: '르세라핌',
    nameEn: 'LE SSERAFIM',
    agency: 'SOURCE MUSIC',
    agencyTicker: 'HYBE',
    category: 'group',
    gender: 'girl_group',
    generation: 'gen4',
    debutDate: '2022-05-02',
    status: 'active',
    trackingTier: 'hot',
    basePrice: 100,
    aliases: ['LE SSERAFIM', '르세라핌', '르세라핌', '피어나', 'FEARNOT'],
    members: ['사쿠라', '김채원', '허윤진', '카즈하', '홍은채'],
    fandomName: 'FEARNOT',
    countryFocus: ['KR', 'JP', 'US', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'le_sserafim',
      xUsername: 'le_sserafim',
      tiktokUsername: 'le_sserafim',
    },
    keywords: ['LE SSERAFIM', '르세라핌', '르세라핌 컴백', 'LE SSERAFIM MV'],
    excludedKeywords: [],
    notes: '글로벌 반응 추적 대상',
  },
  {
    id: 'newjeans',
    ticker: 'NJZ',
    nameKo: '뉴진스',
    nameEn: 'NewJeans',
    agency: 'ADOR',
    agencyTicker: 'HYBE',
    category: 'group',
    gender: 'girl_group',
    generation: 'gen4',
    debutDate: '2022-07-22',
    status: 'active',
    trackingTier: 'hot',
    basePrice: 100,
    aliases: ['NewJeans', '뉴진스', 'NJZ', '버니즈', 'Bunnies'],
    members: ['민지', '하니', '다니엘', '해린', '혜인'],
    fandomName: 'Bunnies',
    countryFocus: ['KR', 'JP', 'US', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'newjeans_official',
      xUsername: 'NewJeans_ADOR',
      tiktokUsername: 'newjeans_official',
    },
    keywords: ['NewJeans', '뉴진스', '뉴진스 컴백', 'NewJeans MV', 'NJZ'],
    excludedKeywords: ['jeans', 'new jeans fashion', '청바지', '데님'],
    notes: '동명이인·일반명사 충돌 관리 필요',
  },
  {
    id: 'nmixx',
    ticker: 'NMIXX',
    nameKo: '엔믹스',
    nameEn: 'NMIXX',
    agency: 'JYP Entertainment',
    agencyTicker: 'JYP',
    category: 'group',
    gender: 'girl_group',
    generation: 'gen4',
    debutDate: '2022-02-22',
    status: 'active',
    trackingTier: 'hot',
    basePrice: 100,
    aliases: ['NMIXX', '엔믹스', 'NSWER'],
    members: ['릴리', '해원', '설윤', '배이', '지우', '규진'],
    fandomName: 'NSWER',
    countryFocus: ['KR', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'nmixx_official',
      xUsername: 'NMIXX_official',
      tiktokUsername: 'nmixx_official',
    },
    keywords: ['NMIXX', '엔믹스', 'NMIXX comeback', '엔믹스 컴백', 'NMIXX MV'],
    excludedKeywords: [],
    notes: '퍼포먼스형 걸그룹 hot 추적 대상',
  },
  {
    id: 'babymonster',
    ticker: 'BABYMON',
    nameKo: '베이비몬스터',
    nameEn: 'BABYMONSTER',
    agency: 'YG Entertainment',
    agencyTicker: 'YG',
    category: 'group',
    gender: 'girl_group',
    generation: 'gen5',
    debutDate: '2024-04-01',
    status: 'active',
    trackingTier: 'hot',
    basePrice: 100,
    aliases: ['BABYMONSTER', '베이비몬스터', '베몬'],
    members: ['루카', '파리타', '아사', '아현', '라미', '로라', '치키타'],
    fandomName: '',
    countryFocus: ['KR', 'JP', 'SEA', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'babymonster_ygofficial',
      xUsername: 'YGBABYMONSTER_',
      tiktokUsername: 'babymonster_yg_tiktok',
    },
    keywords: ['BABYMONSTER', '베이비몬스터', '베몬', 'BABYMONSTER MV'],
    excludedKeywords: ['baby monster toy', 'monster baby'],
    notes: '글로벌 유튜브 반응 추적 대상',
  },
  {
    id: 'boynextdoor',
    ticker: 'BND',
    nameKo: '보이넥스트도어',
    nameEn: 'BOYNEXTDOOR',
    agency: 'KOZ Entertainment',
    agencyTicker: 'HYBE',
    category: 'group',
    gender: 'boy_group',
    generation: 'gen5',
    debutDate: '2023-05-30',
    status: 'active',
    trackingTier: 'standard',
    basePrice: 100,
    aliases: ['BOYNEXTDOOR', '보이넥스트도어', '보넥도', 'ONEDOOR'],
    members: ['성호', '리우', '명재현', '태산', '이한', '운학'],
    fandomName: 'ONEDOOR',
    countryFocus: ['KR', 'JP', 'GLOBAL'],
    sourceAccounts: {
      ...emptySourceAccounts,
      instagramUsername: 'boynextdoor_official',
      xUsername: 'BOYNEXTDOOR_KOZ',
      tiktokUsername: 'boynextdoor_official',
    },
    keywords: ['BOYNEXTDOOR', '보이넥스트도어', '보넥도', 'BOYNEXTDOOR comeback'],
    excludedKeywords: ['boy next door movie'],
    notes: '5세대 보이그룹 standard 추적 대상',
  },
];

export const realtimeArtists = artists.filter(
  (artist) => artist.trackingTier === 'realtime'
);

export const hotArtists = artists.filter(
  (artist) => artist.trackingTier === 'hot'
);

export const standardArtists = artists.filter(
  (artist) => artist.trackingTier === 'standard'
);

export const girlGroupArtists = artists.filter(
  (artist) => artist.gender === 'girl_group'
);

export const boyGroupArtists = artists.filter(
  (artist) => artist.gender === 'boy_group'
);

export const rookieArtists = artists.filter(
  (artist) => artist.generation === 'rookie'
);

export function getArtistById(id: string) {
  return artists.find((artist) => artist.id === id);
}

export function getArtistByTicker(ticker: string) {
  return artists.find(
    (artist) => artist.ticker.toLowerCase() === ticker.toLowerCase()
  );
}