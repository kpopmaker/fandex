export type ArtistEntityType =
  | 'group'
  | 'solo'
  | 'unit'
  | 'project';

export type ArtistMarketCode =
  | 'KR'
  | 'JP'
  | 'US'
  | 'SEA'
  | 'CN'
  | 'EU'
  | 'GLOBAL';

export type ArtistCollectionTier =
  | 'realtime'
  | 'high'
  | 'standard'
  | 'archive';

export type ArtistVerificationStatus =
  | 'seed'
  | 'needs_verification'
  | 'partially_verified'
  | 'verified';

export type ArtistLifecycleStatus =
  | 'active'
  | 'hiatus'
  | 'military'
  | 'inactive'
  | 'predebut';

export type ArtistOfficialChannelsV4 = {
  website?: string;
  youtubeChannelId?: string;
  youtubeHandle?: string;
  instagram?: string;
  x?: string;
  tiktok?: string;
  spotifyArtistId?: string;
  appleMusicArtistId?: string;
  melonArtistId?: string;
};

export type ArtistSearchProfile = {
  primaryQuery: string;
  naverNewsQuery?: string;
  aliases: string[];
  koreanAliases: string[];
  englishAliases: string[];
  includeKeywords: string[];
  disambiguationKeywords: string[];
  excludeKeywords: string[];
  markets: ArtistMarketCode[];
};

export type ArtistCollectionProfile = {
  tier: ArtistCollectionTier;
  priorityScore: number;
  targetSources: RealDataSource[];
  verificationStatus: ArtistVerificationStatus;
  notes: string;
};

export type RealDataSource =
  | 'naver_news'
  | 'youtube'
  | 'official'
  | 'manual_seed';

export type ArtistV4 = {
  id: string;
  ticker: string;
  nameKo: string;
  nameEn: string;
  entityType: ArtistEntityType;
  agency: string;
  debutDate?: string;
  lifecycleStatus: ArtistLifecycleStatus;
  members: string[];
  fandomName?: string;
  generation?: string;
  profile: ArtistSearchProfile;
  collection: ArtistCollectionProfile;
  officialChannels: ArtistOfficialChannelsV4;
  shortIntro: string;
};

export type ArtistUniverseSummary = {
  total: number;
  realtime: number;
  high: number;
  standard: number;
  verified: number;
};
