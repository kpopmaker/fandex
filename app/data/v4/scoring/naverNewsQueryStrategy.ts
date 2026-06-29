export type NaverNewsQueryBucket =
  | 'core_identity'
  | 'comeback_release'
  | 'chart_performance'
  | 'brand_ads'
  | 'tour_event'
  | 'contract_agency'
  | 'controversy_risk'
  | 'fandom_community';

export type NaverNewsQueryPriority = 'primary' | 'secondary' | 'watch';

export type NaverNewsQuerySortIntent = 'relevance' | 'latest';

export type ArtistNewsQueryIdentity = {
  artistName: string;
  aliases?: string[];
  agency?: string;
  disambiguationKeywords?: string[];
  excludeKeywords?: string[];
};

export type NaverNewsQueryDraft = {
  query: string;
  bucket: NaverNewsQueryBucket;
  priority: NaverNewsQueryPriority;
  sortIntent: NaverNewsQuerySortIntent;
  tokens: string[];
  artistName: string;
  aliasUsed?: string;
  agencyUsed?: string;
  disambiguationKeywords: string[];
  excludeKeywords: string[];
};

export type NaverNewsQueryStrategyOptions = {
  enabledBuckets?: Array<NaverNewsQueryBucket | string>;
  maxQueriesPerBucket?: number;
  includeRiskQueries?: boolean;
  includeAliasQueries?: boolean;
  maxQueryLength?: number;
};

export type NaverNewsQueryStrategyWarning = {
  severity: 'info' | 'warning' | 'error';
  code:
    | 'empty_artist_name'
    | 'empty_query_set'
    | 'duplicate_alias'
    | 'invalid_max_queries_per_bucket'
    | 'unknown_bucket'
    | 'risk_queries_disabled';
  message: string;
  value?: string;
};

export type NaverNewsQueryStrategyResult = {
  artistName: string;
  draftsByBucket: Record<NaverNewsQueryBucket, NaverNewsQueryDraft[]>;
  queryDrafts: NaverNewsQueryDraft[];
  warnings: NaverNewsQueryStrategyWarning[];
  bucketCount: number;
  queryCount: number;
  hasBlockingErrors: boolean;
};

export type NaverNewsQueryStrategyShapeCheckResult = {
  artistCount: number;
  queryCount: number;
  bucketCount: number;
  warningCount: number;
  buckets: NaverNewsQueryBucket[];
  sampleQueries: string[];
  hasBlockingErrors: boolean;
};

const DEFAULT_MAX_QUERIES_PER_BUCKET = 4;
const DEFAULT_MAX_QUERY_LENGTH = 80;

const naverNewsQueryBuckets: NaverNewsQueryBucket[] = [
  'core_identity',
  'comeback_release',
  'chart_performance',
  'brand_ads',
  'tour_event',
  'contract_agency',
  'controversy_risk',
  'fandom_community',
];

const bucketKeywords: Record<NaverNewsQueryBucket, string[]> = {
  core_identity: ['K팝'],
  comeback_release: ['컴백', '앨범', '신곡', '티저', '뮤직비디오', '선공개', '발매'],
  chart_performance: [
    '차트',
    '멜론',
    '스포티파이',
    '빌보드',
    '써클차트',
    '음원',
    '음반',
    '초동',
  ],
  brand_ads: ['브랜드', '광고', '앰버서더', '화보', '협업', '캠페인'],
  tour_event: ['콘서트', '투어', '팬미팅', '페스티벌', '공연'],
  contract_agency: ['계약', '재계약', '전속계약', '소속사', '이적', '정산'],
  controversy_risk: ['논란', '사과', '해명', '법적', '분쟁', '루머', '활동중단'],
  fandom_community: [
    '팬덤',
    '팬클럽',
    '커뮤니티',
    '챌린지',
    '바이럴',
    '생일카페',
    '응원',
  ],
};

export function normalizeQueryToken(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function joinQueryTokens(
  tokens: Array<string | undefined>,
  maxQueryLength = DEFAULT_MAX_QUERY_LENGTH,
): string {
  const normalizedTokens = tokens
    .map((token) => normalizeQueryToken(token))
    .filter((token) => token.length > 0);
  const query = normalizedTokens.join(' ');

  if (query.length <= maxQueryLength) {
    return query;
  }

  return query.slice(0, Math.max(maxQueryLength, 0)).trim();
}

export function dedupeQueryDrafts(
  drafts: NaverNewsQueryDraft[],
): NaverNewsQueryDraft[] {
  const seen = new Set<string>();

  return drafts.filter((draft) => {
    const dedupeKey = draft.query.toLocaleLowerCase('ko-KR');

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

export function createNaverNewsQueryDraft({
  artistName,
  bucket,
  keyword,
  aliasUsed,
  agencyUsed,
  disambiguationKeywords = [],
  excludeKeywords = [],
  maxQueryLength = DEFAULT_MAX_QUERY_LENGTH,
}: {
  artistName: string;
  bucket: NaverNewsQueryBucket;
  keyword?: string;
  aliasUsed?: string;
  agencyUsed?: string;
  disambiguationKeywords?: string[];
  excludeKeywords?: string[];
  maxQueryLength?: number;
}): NaverNewsQueryDraft | null {
  const normalizedArtistName = normalizeQueryToken(aliasUsed ?? artistName);
  const normalizedAgency = normalizeQueryToken(agencyUsed);
  const normalizedKeyword = normalizeQueryToken(keyword);
  const normalizedDisambiguationKeywords = disambiguationKeywords
    .map((token) => normalizeQueryToken(token))
    .filter((token) => token.length > 0);
  const normalizedExcludeKeywords = excludeKeywords
    .map((token) => normalizeQueryToken(token))
    .filter((token) => token.length > 0);
  const baseTokens =
    bucket === 'core_identity' && normalizedKeyword.length === 0
      ? [normalizedArtistName, normalizedAgency]
      : [normalizedArtistName, normalizedKeyword];
  const tokens = [...baseTokens, ...normalizedDisambiguationKeywords].filter(
    (token) => token.length > 0,
  );
  const query = joinQueryTokens(tokens, maxQueryLength);

  if (query.length === 0) {
    return null;
  }

  return {
    query,
    bucket,
    priority: getPriorityForBucket(bucket),
    sortIntent: getSortIntentForBucket(bucket),
    tokens,
    artistName: normalizeQueryToken(artistName),
    aliasUsed: aliasUsed === undefined ? undefined : normalizeQueryToken(aliasUsed),
    agencyUsed:
      agencyUsed === undefined ? undefined : normalizeQueryToken(agencyUsed),
    disambiguationKeywords: normalizedDisambiguationKeywords,
    excludeKeywords: normalizedExcludeKeywords,
  };
}

export function createNaverNewsQueryStrategy(
  identity: ArtistNewsQueryIdentity,
  options: NaverNewsQueryStrategyOptions = {},
): NaverNewsQueryStrategyResult {
  const warnings: NaverNewsQueryStrategyWarning[] = [];
  const artistName = normalizeQueryToken(identity.artistName);
  const agency = normalizeQueryToken(identity.agency);
  const includeRiskQueries = options.includeRiskQueries ?? true;
  const includeAliasQueries = options.includeAliasQueries ?? true;
  const maxQueryLength = options.maxQueryLength ?? DEFAULT_MAX_QUERY_LENGTH;
  const maxQueriesPerBucket =
    options.maxQueriesPerBucket ?? DEFAULT_MAX_QUERIES_PER_BUCKET;
  const enabledBuckets = resolveEnabledBuckets(options.enabledBuckets, warnings);

  if (artistName.length === 0) {
    warnings.push({
      severity: 'error',
      code: 'empty_artist_name',
      message: 'artistName is required before Naver News query drafts can be built.',
    });
  }

  if (maxQueriesPerBucket <= 0) {
    warnings.push({
      severity: 'error',
      code: 'invalid_max_queries_per_bucket',
      message: 'maxQueriesPerBucket must be greater than 0.',
      value: String(maxQueriesPerBucket),
    });
  }

  if (!includeRiskQueries && enabledBuckets.includes('controversy_risk')) {
    warnings.push({
      severity: 'info',
      code: 'risk_queries_disabled',
      message: 'controversy_risk bucket was skipped because risk queries are disabled.',
    });
  }

  const aliases = (identity.aliases ?? [])
    .map((alias) => normalizeQueryToken(alias))
    .filter((alias) => alias.length > 0);
  const uniqueAliases = aliases.filter((alias, index) => {
    const isDuplicateArtist = alias.toLocaleLowerCase('ko-KR') ===
      artistName.toLocaleLowerCase('ko-KR');
    const isDuplicateAlias =
      aliases.findIndex(
        (candidate) =>
          candidate.toLocaleLowerCase('ko-KR') === alias.toLocaleLowerCase('ko-KR'),
      ) !== index;

    if (isDuplicateArtist || isDuplicateAlias) {
      warnings.push({
        severity: 'warning',
        code: 'duplicate_alias',
        message: 'Alias duplicates artistName or another alias and was skipped.',
        value: alias,
      });
      return false;
    }

    return true;
  });
  const draftIdentities = [
    { name: artistName, aliasUsed: undefined },
    ...(includeAliasQueries
      ? uniqueAliases.map((alias) => ({ name: alias, aliasUsed: alias }))
      : []),
  ].filter((draftIdentity) => draftIdentity.name.length > 0);
  const draftsByBucket = createEmptyDraftBuckets();

  if (artistName.length > 0 && maxQueriesPerBucket > 0) {
    for (const bucket of enabledBuckets) {
      if (bucket === 'controversy_risk' && !includeRiskQueries) {
        continue;
      }

      const bucketDrafts = buildBucketDrafts({
        artistName,
        agency,
        bucket,
        draftIdentities,
        disambiguationKeywords: identity.disambiguationKeywords ?? [],
        excludeKeywords: identity.excludeKeywords ?? [],
        maxQueryLength,
      });

      draftsByBucket[bucket] = dedupeQueryDrafts(bucketDrafts).slice(
        0,
        maxQueriesPerBucket,
      );
    }
  }

  const queryDrafts = dedupeQueryDrafts(
    naverNewsQueryBuckets.flatMap((bucket) => draftsByBucket[bucket]),
  );

  if (queryDrafts.length === 0) {
    warnings.push({
      severity: 'error',
      code: 'empty_query_set',
      message: 'No Naver News query drafts were produced.',
    });
  }

  return {
    artistName,
    draftsByBucket,
    queryDrafts,
    warnings,
    bucketCount: naverNewsQueryBuckets.filter(
      (bucket) => draftsByBucket[bucket].length > 0,
    ).length,
    queryCount: queryDrafts.length,
    hasBlockingErrors: warnings.some((warning) => warning.severity === 'error'),
  };
}

export function runNaverNewsQueryStrategyShapeCheck(): NaverNewsQueryStrategyShapeCheckResult {
  const sampleIdentities: ArtistNewsQueryIdentity[] = [
    { artistName: 'IVE', agency: 'Starship', aliases: ['아이브'] },
    { artistName: 'RIIZE', agency: 'SM', aliases: ['라이즈'] },
    { artistName: 'QWER', aliases: ['큐더블유이알'] },
    { artistName: 'NEON PULSE', agency: 'SAMPLE LABEL', aliases: ['NEON'] },
  ];
  const results = sampleIdentities.map((identity) =>
    createNaverNewsQueryStrategy(identity),
  );
  const queryDrafts = results.flatMap((result) => result.queryDrafts);
  const buckets = Array.from(new Set(queryDrafts.map((draft) => draft.bucket)));

  return {
    artistCount: sampleIdentities.length,
    queryCount: queryDrafts.length,
    bucketCount: buckets.length,
    warningCount: results.reduce(
      (sum, result) => sum + result.warnings.length,
      0,
    ),
    buckets,
    sampleQueries: queryDrafts.map((draft) => draft.query).slice(0, 12),
    hasBlockingErrors: results.some((result) => result.hasBlockingErrors),
  };
}

function resolveEnabledBuckets(
  enabledBuckets: Array<NaverNewsQueryBucket | string> | undefined,
  warnings: NaverNewsQueryStrategyWarning[],
): NaverNewsQueryBucket[] {
  if (enabledBuckets === undefined) {
    return naverNewsQueryBuckets;
  }

  const bucketSet = new Set<NaverNewsQueryBucket>();

  for (const bucket of enabledBuckets) {
    if (isNaverNewsQueryBucket(bucket)) {
      bucketSet.add(bucket);
    } else {
      warnings.push({
        severity: 'warning',
        code: 'unknown_bucket',
        message: 'Unknown Naver News query bucket was skipped.',
        value: bucket,
      });
    }
  }

  return [...bucketSet];
}

function isNaverNewsQueryBucket(value: string): value is NaverNewsQueryBucket {
  return naverNewsQueryBuckets.includes(value as NaverNewsQueryBucket);
}

function createEmptyDraftBuckets(): Record<
  NaverNewsQueryBucket,
  NaverNewsQueryDraft[]
> {
  return {
    core_identity: [],
    comeback_release: [],
    chart_performance: [],
    brand_ads: [],
    tour_event: [],
    contract_agency: [],
    controversy_risk: [],
    fandom_community: [],
  };
}

function buildBucketDrafts({
  artistName,
  agency,
  bucket,
  draftIdentities,
  disambiguationKeywords,
  excludeKeywords,
  maxQueryLength,
}: {
  artistName: string;
  agency: string;
  bucket: NaverNewsQueryBucket;
  draftIdentities: Array<{ name: string; aliasUsed?: string }>;
  disambiguationKeywords: string[];
  excludeKeywords: string[];
  maxQueryLength: number;
}): NaverNewsQueryDraft[] {
  if (bucket === 'core_identity') {
    return [
      createNaverNewsQueryDraft({
        artistName,
        bucket,
        maxQueryLength,
      }),
      createNaverNewsQueryDraft({
        artistName,
        bucket,
        agencyUsed: agency,
        maxQueryLength,
      }),
      createNaverNewsQueryDraft({
        artistName,
        bucket,
        keyword: 'K팝',
        maxQueryLength,
      }),
      ...draftIdentities
        .filter((identity) => identity.aliasUsed !== undefined)
        .map((identity) =>
          createNaverNewsQueryDraft({
            artistName,
            bucket,
            aliasUsed: identity.aliasUsed,
            maxQueryLength,
          }),
        ),
    ].filter((draft): draft is NaverNewsQueryDraft => draft !== null);
  }

  const identityNames =
    bucket === 'controversy_risk'
      ? draftIdentities.slice(0, 1)
      : draftIdentities;

  return identityNames.flatMap((identity) =>
    bucketKeywords[bucket].map((keyword) =>
      createNaverNewsQueryDraft({
        artistName,
        bucket,
        keyword,
        aliasUsed: identity.aliasUsed,
        agencyUsed: bucket === 'contract_agency' ? agency : undefined,
        disambiguationKeywords,
        excludeKeywords,
        maxQueryLength,
      }),
    ),
  ).filter((draft): draft is NaverNewsQueryDraft => draft !== null);
}

function getPriorityForBucket(
  bucket: NaverNewsQueryBucket,
): NaverNewsQueryPriority {
  if (bucket === 'controversy_risk') {
    return 'watch';
  }

  if (
    bucket === 'core_identity' ||
    bucket === 'comeback_release' ||
    bucket === 'chart_performance'
  ) {
    return 'primary';
  }

  return 'secondary';
}

function getSortIntentForBucket(
  bucket: NaverNewsQueryBucket,
): NaverNewsQuerySortIntent {
  return bucket === 'core_identity' ? 'relevance' : 'latest';
}
