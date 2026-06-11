export type ArtistType =
  | '걸그룹'
  | '보이그룹'
  | '혼성그룹'
  | '솔로'
  | '유닛'
  | '프로젝트';

export type ArtistStatus =
  | '활동중'
  | '휴식기'
  | '군백기'
  | '해체'
  | '데뷔전'
  | '프로젝트종료';

export type ArtistGeneration =
  | '1세대'
  | '2세대'
  | '3세대'
  | '4세대'
  | '5세대'
  | '신인';

export type CollectionPriority =
  | '실시간'
  | '높음'
  | '보통'
  | '낮음';

export type CountryFocus =
  | '한국'
  | '일본'
  | '미국'
  | '동남아'
  | '중국'
  | '유럽'
  | '글로벌';

export type OfficialChannels = {
  youtube?: string;
  instagram?: string;
  x?: string;
  tiktok?: string;
  website?: string;
  spotify?: string;
  appleMusic?: string;
  melon?: string;
};

export type ArtistV3 = {
  id: string;
  ticker: string;
  nameKo: string;
  nameEn: string;
  agency: string;
  debutDate: string;
  type: ArtistType;
  generation: ArtistGeneration;
  status: ArtistStatus;
  members: string[];
  fandomName?: string;
  keywords: string[];
  excludedKeywords: string[];
  countryFocus: CountryFocus[];
  collectionPriority: CollectionPriority;
  officialChannels: OfficialChannels;
  shortIntro: string;
  profileImage?: string;
};

export type ChartPoint = {
  time: string;
  value: number;
};

export type FactorKey =
  | 'music'
  | 'album'
  | 'youtube'
  | 'sns'
  | 'search'
  | 'news'
  | 'global'
  | 'fandom'
  | 'company';

export type FactorDefinitionV3 = {
  key: FactorKey;
  label: string;
  easyLabel: string;
  description: string;
  defaultWeight: number;
  helpText: string;
};

export type FactorScores = Record<FactorKey, number>;

export type FactorWeights = Record<FactorKey, number>;

export type ArtistPricePoint = {
  artistId: string;
  time: string;
  price: number;
  changeRate: number;
  volume: number;
  fanSizeValue: number;
  scores: FactorScores;
};

export type MarketIndexPoint = {
  time: string;
  indexValue: number;
  changeRate: number;
  totalVolume: number;
  risingArtistCount: number;
  fallingArtistCount: number;
};

export type IssueCategory =
  | '컴백'
  | '뮤직비디오'
  | '음원'
  | '앨범'
  | '방송'
  | '콘서트'
  | 'SNS'
  | '해외반응'
  | '팬덤'
  | '이슈';

export type IssueImpact =
  | '종합지수 상승'
  | '종합지수 하락'
  | '개별 아티스트 상승'
  | '개별 아티스트 하락'
  | '관심도 증가'
  | '영향 적음';

export type KpopIssue = {
  id: string;
  rank: number;
  headline: string;
  summary: string;
  category: IssueCategory;
  relatedArtistIds: string[];
  relatedKeywords: string[];
  issueScore: number;
  newsCount: number;
  searchGrowthRate: number;
  impact: IssueImpact;
  updatedAt: string;
  sourceNames: string[];
};

export type NewsSourceType =
  | '네이버뉴스'
  | '공식공지'
  | '유튜브'
  | '인스타그램'
  | 'X'
  | '틱톡'
  | '해외뉴스'
  | '기타';

export type ArtistNewsItem = {
  id: string;
  artistId: string;
  title: string;
  summary: string;
  detail: string;
  sourceName: string;
  sourceType: NewsSourceType;
  url?: string;
  publishedAt: string;
  relatedKeywords: string[];
  importanceScore: number;
};

export type CustomIndexPreset =
  | '종합형'
  | '음원중심'
  | '영상중심'
  | 'SNS중심'
  | '해외반응'
  | '팬덤중심'
  | '회사체급';

export type CustomIndexConfig = {
  preset: CustomIndexPreset;
  weights: FactorWeights;
  enabledFactors: FactorKey[];
};

export type ContentFormat =
  | '인스타 카드뉴스'
  | '릴스/쇼츠 대본'
  | 'X 짧은 글'
  | '스레드'
  | '블로그 초안'
  | '뉴스레터';

export type ContentStatus =
  | '아이디어'
  | '초안생성'
  | '검수중'
  | '수정필요'
  | '발행준비'
  | '발행완료';

export type ContentBrief = {
  id: string;
  title: string;
  format: ContentFormat;
  relatedIssueId?: string;
  relatedArtistIds: string[];
  hook: string;
  keyPoints: string[];
  dataEvidence: string[];
  targetAudience: string;
  status: ContentStatus;
  createdAt: string;
};

export type ContentDraft = {
  id: string;
  briefId: string;
  title: string;
  body: string;
  caption: string;
  hashtags: string[];
  thumbnailText: string;
  checklist: string[];
  status: ContentStatus;
  updatedAt: string;
};

export type ThemeMode = '데이모드' | '나이트모드';

export type ApiDataSource =
  | '네이버뉴스검색'
  | '네이버데이터랩'
  | '유튜브데이터API'
  | 'GDELT'
  | 'OpenDART'
  | 'OpenAI'
  | '수동입력'
  | 'Mock';

export type CollectionLog = {
  id: string;
  source: ApiDataSource;
  status: '성공' | '실패' | '대기';
  message: string;
  collectedAt: string;
};
