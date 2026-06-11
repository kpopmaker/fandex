git log --oneline -3import type {
    ArtistNewsItem,
    ArtistPricePoint,
    ChartPoint,
    CustomIndexConfig,
    FactorDefinitionV3,
    FactorKey,
    FactorWeights,
    KpopIssue,
    MarketIndexPoint,
  } from './types';
  
  export const factorDefinitionsV3: FactorDefinitionV3[] = [
    {
      key: 'music',
      label: '음원',
      easyLabel: '노래 성적',
      description: '음원 차트, 스트리밍, 다운로드 반응을 반영합니다.',
      defaultWeight: 18,
      helpText: '노래가 얼마나 많이 듣고 있는지를 보는 요소입니다.',
    },
    {
      key: 'album',
      label: '음반',
      easyLabel: '앨범 판매',
      description: '초동, 누적 판매량, 앨범 구매력을 반영합니다.',
      defaultWeight: 14,
      helpText: '팬덤의 구매력이 강한지 보는 요소입니다.',
    },
    {
      key: 'youtube',
      label: '유튜브',
      easyLabel: '영상 반응',
      description: '뮤직비디오, 티저, 자체 콘텐츠의 조회수와 반응을 반영합니다.',
      defaultWeight: 16,
      helpText: '영상이 얼마나 많이 보고 반응받는지 보는 요소입니다.',
    },
    {
      key: 'sns',
      label: 'SNS',
      easyLabel: 'SNS 반응',
      description: '인스타그램, X, 틱톡 등 공식 채널 반응을 반영합니다.',
      defaultWeight: 12,
      helpText: 'SNS에서 얼마나 많이 좋아요, 공유, 댓글이 생기는지 보는 요소입니다.',
    },
    {
      key: 'search',
      label: '검색량',
      easyLabel: '검색 관심도',
      description: '포털 검색량과 검색 증가율을 반영합니다.',
      defaultWeight: 10,
      helpText: '사람들이 얼마나 많이 검색하는지 보는 요소입니다.',
    },
    {
      key: 'news',
      label: '뉴스',
      easyLabel: '이슈성',
      description: '뉴스 기사 수, 보도량, 이슈 확산 정도를 반영합니다.',
      defaultWeight: 8,
      helpText: '언론과 커뮤니티에서 얼마나 화제가 되는지 보는 요소입니다.',
    },
    {
      key: 'global',
      label: '해외',
      easyLabel: '해외 반응',
      description: '해외 뉴스, 글로벌 팬 반응, 해외 플랫폼 반응을 반영합니다.',
      defaultWeight: 10,
      helpText: '한국 밖에서 얼마나 반응이 좋은지 보는 요소입니다.',
    },
    {
      key: 'fandom',
      label: '팬덤',
      easyLabel: '팬덤 힘',
      description: '팬덤 활동량, 팬채널, 커뮤니티 반응을 반영합니다.',
      defaultWeight: 8,
      helpText: '팬들이 얼마나 적극적으로 움직이는지 보는 요소입니다.',
    },
    {
      key: 'company',
      label: '소속사',
      easyLabel: '회사 체급',
      description: '소속사의 규모, 안정성, 마케팅 역량을 반영합니다.',
      defaultWeight: 4,
      helpText: '소속사가 얼마나 큰 지원을 할 수 있는지 보는 요소입니다.',
    },
  ];
  
  export const defaultFactorWeightsV3: FactorWeights = {
    music: 18,
    album: 14,
    youtube: 16,
    sns: 12,
    search: 10,
    news: 8,
    global: 10,
    fandom: 8,
    company: 4,
  };
  
  export const defaultCustomIndexConfig: CustomIndexConfig = {
    preset: '종합형',
    weights: defaultFactorWeightsV3,
    enabledFactors: [
      'music',
      'album',
      'youtube',
      'sns',
      'search',
      'news',
      'global',
      'fandom',
      'company',
    ],
  };
  
  export const marketIndexHistory: MarketIndexPoint[] = [
    {
      time: '09:00',
      indexValue: 982.4,
      changeRate: -0.4,
      totalVolume: 182300,
      risingArtistCount: 38,
      fallingArtistCount: 62,
    },
    {
      time: '10:00',
      indexValue: 991.8,
      changeRate: 0.52,
      totalVolume: 221500,
      risingArtistCount: 47,
      fallingArtistCount: 53,
    },
    {
      time: '11:00',
      indexValue: 1004.2,
      changeRate: 1.77,
      totalVolume: 264200,
      risingArtistCount: 58,
      fallingArtistCount: 42,
    },
    {
      time: '12:00',
      indexValue: 998.6,
      changeRate: 1.2,
      totalVolume: 238100,
      risingArtistCount: 51,
      fallingArtistCount: 49,
    },
    {
      time: '13:00',
      indexValue: 1011.9,
      changeRate: 2.55,
      totalVolume: 312900,
      risingArtistCount: 66,
      fallingArtistCount: 34,
    },
    {
      time: '14:00',
      indexValue: 1026.7,
      changeRate: 4.05,
      totalVolume: 386400,
      risingArtistCount: 72,
      fallingArtistCount: 28,
    },
    {
      time: '15:00',
      indexValue: 1019.3,
      changeRate: 3.3,
      totalVolume: 341700,
      risingArtistCount: 63,
      fallingArtistCount: 37,
    },
    {
      time: '16:00',
      indexValue: 1038.5,
      changeRate: 5.25,
      totalVolume: 421800,
      risingArtistCount: 76,
      fallingArtistCount: 24,
    },
  ];
  
  export const marketChartPoints: ChartPoint[] = marketIndexHistory.map(
    (point) => ({
      time: point.time,
      value: point.indexValue,
    })
  );
  
  const baseArtistIds = [
    'aespa',
    'ive',
    'riize',
    'illit',
    'tws',
    'lesserafim',
    'newjeans',
    'nmixx',
    'babymonster',
    'boynextdoor',
  ];
  
  function createScores(seed: number) {
    const clamp = (value: number) => Math.min(Math.max(value, 35), 98);
  
    return {
      music: clamp(62 + seed * 2),
      album: clamp(58 + seed * 1.5),
      youtube: clamp(64 + seed * 2.2),
      sns: clamp(60 + seed * 1.8),
      search: clamp(55 + seed * 2.5),
      news: clamp(52 + seed * 1.6),
      global: clamp(59 + seed * 2),
      fandom: clamp(61 + seed * 1.7),
      company: clamp(57 + seed * 1.2),
    };
  }
  
  export function getArtistPriceHistory(artistId: string): ArtistPricePoint[] {
    const artistIndex = Math.max(baseArtistIds.indexOf(artistId), 0);
    const basePrice = 92 + artistIndex * 4;
  
    return marketIndexHistory.map((point, index) => {
      const wave = Math.sin(index + artistIndex) * 4;
      const price = Number((basePrice + index * 2.1 + wave).toFixed(2));
      const previousPrice =
        index === 0 ? basePrice : basePrice + (index - 1) * 2.1;
  
      return {
        artistId,
        time: point.time,
        price,
        changeRate: Number((((price - previousPrice) / previousPrice) * 100).toFixed(2)),
        volume: Math.round(12000 + artistIndex * 1800 + index * 2500),
        fanSizeValue: Math.round(price * (900000 + artistIndex * 90000)),
        scores: createScores(artistIndex + index),
      };
    });
  }
  
  export function getArtistChartPoints(artistId: string): ChartPoint[] {
    return getArtistPriceHistory(artistId).map((point) => ({
      time: point.time,
      value: point.price,
    }));
  }
  
  export const trendingIssues: KpopIssue[] = [
    {
      id: 'issue-001',
      rank: 1,
      headline: '대형 걸그룹 컴백 티저 공개 후 검색량 급등',
      summary:
        '컴백 티저 공개 이후 검색량과 유튜브 반응이 동시에 증가하며 K-pop 종합지수를 끌어올렸습니다.',
      category: '컴백',
      relatedArtistIds: ['aespa', 'ive'],
      relatedKeywords: ['컴백', '티저', '뮤직비디오'],
      issueScore: 94.2,
      newsCount: 38,
      searchGrowthRate: 128.4,
      impact: '종합지수 상승',
      updatedAt: '16:00',
      sourceNames: ['네이버뉴스', '유튜브', 'SNS'],
    },
    {
      id: 'issue-002',
      rank: 2,
      headline: '신인 보이그룹 자체 콘텐츠 반응 상승',
      summary:
        '자체 웹예능 클립이 팬 커뮤니티와 숏폼에서 확산되며 거래량 지표가 상승했습니다.',
      category: 'SNS',
      relatedArtistIds: ['riize', 'tws', 'boynextdoor'],
      relatedKeywords: ['자체콘텐츠', '웹예능', '팬반응'],
      issueScore: 88.7,
      newsCount: 21,
      searchGrowthRate: 72.1,
      impact: '관심도 증가',
      updatedAt: '15:50',
      sourceNames: ['유튜브', 'X', '틱톡'],
    },
    {
      id: 'issue-003',
      rank: 3,
      headline: '해외 팬덤 중심으로 뮤직비디오 재확산',
      summary:
        '해외 팬 계정과 리액션 채널을 중심으로 뮤직비디오 조회 흐름이 다시 강해졌습니다.',
      category: '해외반응',
      relatedArtistIds: ['babymonster', 'lesserafim'],
      relatedKeywords: ['해외반응', '리액션', '뮤직비디오'],
      issueScore: 84.9,
      newsCount: 17,
      searchGrowthRate: 61.8,
      impact: '개별 아티스트 상승',
      updatedAt: '15:40',
      sourceNames: ['해외뉴스', '유튜브'],
    },
    {
      id: 'issue-004',
      rank: 4,
      headline: '음악방송 무대 클립 반응 상승',
      summary:
        '최근 음악방송 무대 클립이 SNS에서 재공유되며 영상 반응 지표가 올랐습니다.',
      category: '방송',
      relatedArtistIds: ['illit', 'nmixx'],
      relatedKeywords: ['음악방송', '무대', '직캠'],
      issueScore: 81.3,
      newsCount: 12,
      searchGrowthRate: 49.7,
      impact: '관심도 증가',
      updatedAt: '15:30',
      sourceNames: ['유튜브', 'SNS'],
    },
    {
      id: 'issue-005',
      rank: 5,
      headline: '팬덤 커뮤니티에서 새 콘셉트 해석 확산',
      summary:
        '콘셉트 포토와 세계관 해석 글이 커뮤니티에서 확산되며 팬덤 반응 지표가 상승했습니다.',
      category: '팬덤',
      relatedArtistIds: ['aespa', 'newjeans'],
      relatedKeywords: ['콘셉트', '세계관', '팬덤'],
      issueScore: 78.5,
      newsCount: 9,
      searchGrowthRate: 42.5,
      impact: '관심도 증가',
      updatedAt: '15:20',
      sourceNames: ['커뮤니티', 'SNS'],
    },
    {
      id: 'issue-006',
      rank: 6,
      headline: '앨범 예약 판매 관련 언급량 증가',
      summary:
        '예약 판매 시작 이후 팬덤 구매 반응과 앨범 관련 검색량이 함께 증가했습니다.',
      category: '앨범',
      relatedArtistIds: ['ive', 'riize'],
      relatedKeywords: ['예약판매', '앨범', '초동'],
      issueScore: 75.8,
      newsCount: 11,
      searchGrowthRate: 36.2,
      impact: '개별 아티스트 상승',
      updatedAt: '15:10',
      sourceNames: ['네이버뉴스', '팬커뮤니티'],
    },
    {
      id: 'issue-007',
      rank: 7,
      headline: '멤버 개인 영상 클립이 숏폼에서 확산',
      summary:
        '멤버 개인 클립이 숏폼 플랫폼에서 확산되며 아티스트 검색량에 영향을 주고 있습니다.',
      category: 'SNS',
      relatedArtistIds: ['ive', 'aespa', 'illit'],
      relatedKeywords: ['숏폼', '멤버', '바이럴'],
      issueScore: 72.4,
      newsCount: 8,
      searchGrowthRate: 31.9,
      impact: '관심도 증가',
      updatedAt: '15:00',
      sourceNames: ['틱톡', '인스타그램'],
    },
    {
      id: 'issue-008',
      rank: 8,
      headline: '글로벌 차트 진입 소식으로 해외 반응 상승',
      summary:
        '글로벌 차트 진입 관련 언급이 늘어나며 해외 반응 지표가 상승했습니다.',
      category: '음원',
      relatedArtistIds: ['lesserafim', 'babymonster'],
      relatedKeywords: ['글로벌차트', '해외팬', '음원'],
      issueScore: 70.6,
      newsCount: 14,
      searchGrowthRate: 29.2,
      impact: '개별 아티스트 상승',
      updatedAt: '14:50',
      sourceNames: ['해외뉴스', '음원플랫폼'],
    },
    {
      id: 'issue-009',
      rank: 9,
      headline: '신인 그룹 팬덤명 관련 검색 증가',
      summary:
        '팬덤명과 멤버명 검색량이 동시에 증가하며 신인 관심도가 올라갔습니다.',
      category: '팬덤',
      relatedArtistIds: ['tws', 'illit'],
      relatedKeywords: ['팬덤명', '신인', '멤버'],
      issueScore: 67.8,
      newsCount: 6,
      searchGrowthRate: 23.5,
      impact: '관심도 증가',
      updatedAt: '14:40',
      sourceNames: ['검색', 'SNS'],
    },
    {
      id: 'issue-010',
      rank: 10,
      headline: '소속사 공식 일정 공개로 단기 관심 상승',
      summary:
        '공식 일정과 프로모션 공지가 공개되며 관련 키워드 검색량이 늘었습니다.',
      category: '이슈',
      relatedArtistIds: ['nmixx', 'boynextdoor'],
      relatedKeywords: ['공식일정', '프로모션', '공지'],
      issueScore: 64.1,
      newsCount: 5,
      searchGrowthRate: 18.6,
      impact: '영향 적음',
      updatedAt: '14:30',
      sourceNames: ['공식공지', '네이버뉴스'],
    },
  ];
  
  export const artistNewsItems: ArtistNewsItem[] = [
    {
      id: 'news-aespa-001',
      artistId: 'aespa',
      title: '컴백 티저 공개 후 팬덤 반응 상승',
      summary: '티저 공개 이후 검색량과 영상 반응이 동시에 증가했습니다.',
      detail:
        '컴백 티저 공개 직후 팬 커뮤니티와 SNS에서 관련 키워드 언급량이 늘었고, 유튜브 조회 흐름도 강해졌습니다. FANDEX 기준으로는 검색량, 유튜브, SNS 요소가 가격 상승에 기여했습니다.',
      sourceName: 'FANDEX 모의 뉴스',
      sourceType: '기타',
      publishedAt: '16:00',
      relatedKeywords: ['컴백', '티저', '검색량'],
      importanceScore: 92,
    },
    {
      id: 'news-aespa-002',
      artistId: 'aespa',
      title: '세계관 해석 콘텐츠 확산',
      summary: '콘셉트 해석 글이 팬덤 사이에서 확산되고 있습니다.',
      detail:
        '세계관과 콘셉트 해석 게시물이 커뮤니티에서 확산되며 팬덤 반응 점수가 상승했습니다. 장기적으로는 팬덤 몰입도를 높이는 요소로 해석할 수 있습니다.',
      sourceName: 'FANDEX 모의 뉴스',
      sourceType: '기타',
      publishedAt: '15:30',
      relatedKeywords: ['세계관', '콘셉트', '팬덤'],
      importanceScore: 86,
    },
    {
      id: 'news-aespa-003',
      artistId: 'aespa',
      title: '뮤직비디오 관련 클립 재확산',
      summary: '기존 뮤직비디오 클립이 숏폼에서 다시 확산됐습니다.',
      detail:
        '팬 편집 영상과 리액션 클립이 숏폼에서 재확산되면서 유튜브와 SNS 반응 점수에 영향을 주었습니다.',
      sourceName: 'FANDEX 모의 뉴스',
      sourceType: '기타',
      publishedAt: '14:50',
      relatedKeywords: ['뮤직비디오', '숏폼', '바이럴'],
      importanceScore: 79,
    },
    {
      id: 'news-aespa-004',
      artistId: 'aespa',
      title: '해외 팬 반응 증가',
      summary: '해외 팬 계정 중심으로 반응이 증가했습니다.',
      detail:
        '글로벌 팬 계정에서 관련 콘텐츠가 공유되며 해외 반응 점수가 상승했습니다.',
      sourceName: 'FANDEX 모의 뉴스',
      sourceType: '기타',
      publishedAt: '14:20',
      relatedKeywords: ['해외반응', '글로벌', '팬계정'],
      importanceScore: 73,
    },
    {
      id: 'news-aespa-005',
      artistId: 'aespa',
      title: '멤버 개인 키워드 검색 증가',
      summary: '멤버 개인 이름 검색량이 함께 증가했습니다.',
      detail:
        '멤버 개인 클립과 사진이 확산되며 그룹 전체 검색량에도 긍정적인 영향을 주었습니다.',
      sourceName: 'FANDEX 모의 뉴스',
      sourceType: '기타',
      publishedAt: '13:40',
      relatedKeywords: ['멤버', '검색량', 'SNS'],
      importanceScore: 70,
    },
    {
      id: 'news-aespa-006',
      artistId: 'aespa',
      title: '공식 SNS 게시물 반응 상승',
      summary: '공식 SNS 게시물의 반응 속도가 빨라졌습니다.',
      detail:
        '좋아요와 댓글 반응이 이전 대비 빠르게 증가하며 SNS 요소 점수에 반영되었습니다.',
      sourceName: 'FANDEX 모의 뉴스',
      sourceType: '기타',
      publishedAt: '13:00',
      relatedKeywords: ['SNS', '좋아요', '댓글'],
      importanceScore: 68,
    },
  ];
  
  export function getNewsByArtistId(artistId: string) {
    const matchedNews = artistNewsItems.filter((item) => item.artistId === artistId);
  
    if (matchedNews.length > 0) {
      return matchedNews;
    }
  
    return artistNewsItems.map((item, index) => ({
      ...item,
      id: `${artistId}-news-${index + 1}`,
      artistId,
    }));
  }
  
  export function getLatestMarketPoint() {
    return marketIndexHistory[marketIndexHistory.length - 1];
  }
  
  export function getIssueById(issueId: string) {
    return trendingIssues.find((issue) => issue.id === issueId);
  }
  
  export function calculateCustomScore(
    scores: Record<FactorKey, number>,
    weights: FactorWeights
  ) {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  
    if (totalWeight === 0) {
      return 0;
    }
  
    return Object.entries(weights).reduce((sum, [key, weight]) => {
      const factorKey = key as FactorKey;
      return sum + scores[factorKey] * (weight / totalWeight);
    }, 0);
  }