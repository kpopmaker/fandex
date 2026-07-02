export type ArtistType =
  | 'Girl group'
  | 'Boy group'
  | 'Co-ed group'
  | 'Solo'
  | 'Unit'
  | 'Project';

export type ArtistStatus =
  | 'Active'
  | 'On break'
  | 'Military hiatus'
  | 'Disbanded'
  | 'Pre-debut'
  | 'Project ended';

export type ArtistGeneration =
  | '1st gen'
  | '2nd gen'
  | '3rd gen'
  | '4th gen'
  | '5th gen'
  | 'Rookie';

export type CollectionPriority = 'Real time' | 'High' | 'Normal' | 'Low';

export type SourceStatus =
  | 'Verified'
  | 'Partially verified'
  | 'Mock needs verification';

export type CountryFocus =
  | 'Korea'
  | 'Japan'
  | 'United States'
  | 'Southeast Asia'
  | 'China'
  | 'Europe'
  | 'Global';

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

export type AlbumRelease = {
  title: string;
  releasedAt: string;
  sourceStatus?: SourceStatus;
};

export type ArtistLifecycleMetadata = {
  albumReleaseDates?: AlbumRelease[];
  latestComebackDate?: string;
  comebackPeriodStart?: string;
  comebackPeriodEnd?: string;
  activityPeriodStart?: string;
  activityPeriodEnd?: string;
  hiatusPeriodStart?: string;
  hiatusPeriodEnd?: string;
  comebackReactionStrength?: number;
  activityEffect?: number;
  hiatusRetention?: number;
  sourceStatus?: SourceStatus;
};

export type RepresentativeSong = {
  title: string;
  releasedAt?: string;
  sourceStatus?: SourceStatus;
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
  officialSnsChannels?: OfficialChannels;
  representativeSongs?: RepresentativeSong[];
  mainMarkets?: CountryFocus[];
  lifecycle?: ArtistLifecycleMetadata;
  sourceStatus?: SourceStatus;
  dataNotes?: string;
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
  absoluteMetrics?: Partial<Record<FactorKey, number>>;
  lifecycleAdjustment?: {
    albumReleaseCycle?: number;
    comebackPeriod?: number;
    activityPeriod?: number;
    hiatusRetention?: number;
  };
  sourceStatus?: SourceStatus;
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
  | 'Comeback'
  | 'Music video'
  | 'Music'
  | 'Album'
  | 'Broadcast'
  | 'Concert'
  | 'SNS'
  | 'Global reaction'
  | 'Fandom'
  | 'Issue';

export type IssueImpact =
  | 'Market index up'
  | 'Market index down'
  | 'Artist index up'
  | 'Artist index down'
  | 'Attention increased'
  | 'Limited impact';

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
  sourceType?: NewsSourceType;
  relatedNewsIds?: string[];
  confidence?: number;
  sourceData?: string[];
  graphImpact?: number;
  estimatedPriceImpact?: number;
};

export type NewsSourceType =
  | 'News'
  | 'Official'
  | 'YouTube'
  | 'Instagram'
  | 'X'
  | 'TikTok'
  | 'Global news'
  | 'Other';

export type ArtistNewsItem = {
  id: string;
  artistId: string;
  title: string;
  summary: string;
  detail: string;
  source?: string;
  sourceName: string;
  sourceType: NewsSourceType;
  url?: string;
  publishedAt: string;
  relatedArtists?: string[];
  relatedKeywords: string[];
  impactScore?: number;
  estimatedPriceImpact?: number;
  sourceStatus?: SourceStatus;
  importanceScore: number;
};

export type CustomIndexPreset =
  | 'Balanced'
  | 'Music focused'
  | 'Video focused'
  | 'SNS focused'
  | 'Global reaction'
  | 'Fandom focused'
  | 'Company scale'
  | '종합 포인트'
  | '화제성 중심'
  | '팬덤 확장 중심'
  | '콘텐츠 반응 중심'
  | '해외 반응 중심'
  | '사업성 중심'
  | '대중 확산 중심'
  | '직접 선택';

export type CustomIndexConfig = {
  preset: CustomIndexPreset;
  weights: FactorWeights;
  enabledFactors: FactorKey[];
};

export type CustomIndexViewId =
  | 'all'
  | 'buzz'
  | 'fandomExpansion'
  | 'contentReaction'
  | 'globalReaction'
  | 'businessImpact'
  | 'organicPublic'
  | 'custom';

export type CustomIndexView = {
  id: CustomIndexViewId;
  label: string;
  shortLabel: string;
  description: string;
  question: string;
  enabledFactors: FactorKey[];
  interpretation: string;
};

export type ContentFormat =
  | 'Instagram carousel'
  | 'Reels or Shorts script'
  | 'X short post'
  | 'Thread'
  | 'Blog draft'
  | 'Newsletter';

export type ContentStatus =
  | 'Idea'
  | 'Draft generated'
  | 'In review'
  | 'Needs revision'
  | 'Ready to publish'
  | 'Published';

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

export type ThemeMode = 'Day mode' | 'Night mode';

export type ApiDataSource =
  | 'Naver News Search API'
  | 'Naver DataLab'
  | 'YouTube Data API'
  | 'GDELT'
  | 'OpenDART'
  | 'OpenAI'
  | 'Supabase'
  | 'Official announcement'
  | 'Agency press release'
  | 'Manual input'
  | 'Mock';

export type CollectionLog = {
  id: string;
  source: ApiDataSource;
  status: 'Success' | 'Failed' | 'Pending';
  message: string;
  collectedAt: string;
};
