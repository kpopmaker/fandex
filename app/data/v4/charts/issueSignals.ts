import {
  artistIndexChartProfiles,
  type ArtistStockVariableKey,
} from './artistIndexChartData';

export type PreviewIssueSignal = {
  id: string;
  title: string;
  category: string;
  relatedArtistName: string;
  relatedVariableKey: ArtistStockVariableKey;
  impactLabel: string;
  summary: string;
  dateLabel: string;
  sourceType: 'editorial_seed' | 'preview_signal';
};

const marketIssueSignals: PreviewIssueSignal[] = [
  {
    id: 'market-01',
    title: '걸그룹 신보 활동 구간이 겹치며 SNS 반응량 증가',
    category: '컴백/활동',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'snsFandomPoint',
    impactLabel: 'SNS/팬덤',
    summary: '활동 일정이 몰리며 팬덤 반응과 검색 흐름이 함께 움직입니다.',
    dateLabel: '최근 시드',
    sourceType: 'editorial_seed',
  },
  {
    id: 'market-02',
    title: '숏폼 챌린지 반응이 팬덤 지표에 반영',
    category: 'SNS/팬덤',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'snsFandomPoint',
    impactLabel: '반응량',
    summary: '짧은 영상 반응이 팬덤 활동성 지표에 먼저 잡히는 구간입니다.',
    dateLabel: '최근 시드',
    sourceType: 'preview_signal',
  },
  {
    id: 'market-03',
    title: '해외 투어 일정 관련 검색량 증가',
    category: '해외 반응',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'growthMomentumPoint',
    impactLabel: '성장 모멘텀',
    summary: '공연 일정 관심이 검색과 해외 반응 흐름에 반영됩니다.',
    dateLabel: '최근 시드',
    sourceType: 'editorial_seed',
  },
  {
    id: 'market-04',
    title: '브랜드 협업 공개 후 관심 지표 상승',
    category: '브랜드',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'brandFitPoint',
    impactLabel: '브랜드 적합도',
    summary: '협업 소식 이후 대중 접점과 검색 흐름을 함께 확인합니다.',
    dateLabel: '최근 시드',
    sourceType: 'preview_signal',
  },
  {
    id: 'market-05',
    title: '음반 발매 전 프로모션 구간 진입',
    category: '음원/음반',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'musicAlbumPoint',
    impactLabel: '발매 반응',
    summary: '티저와 예약 구간의 관심 흐름을 음원/음반 변수에 반영합니다.',
    dateLabel: '최근 시드',
    sourceType: 'editorial_seed',
  },
  {
    id: 'market-06',
    title: '신인 그룹 데뷔 이슈로 검색 지표 확대',
    category: '신인/데뷔',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'growthMomentumPoint',
    impactLabel: '검색 흐름',
    summary: '데뷔 전후 관심이 신규 아티스트 미리보기 지표에 잡힙니다.',
    dateLabel: '최근 시드',
    sourceType: 'preview_signal',
  },
  {
    id: 'market-07',
    title: '페스티벌 무대 노출 이후 관심도 변화',
    category: '무대 노출',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'comebackActivityPoint',
    impactLabel: '활동 신호',
    summary: '무대 노출 뒤 SNS와 검색 반응이 짧게 움직이는 구간입니다.',
    dateLabel: '최근 시드',
    sourceType: 'editorial_seed',
  },
  {
    id: 'market-08',
    title: '팬 이벤트 일정 공개로 팬덤 활동량 증가',
    category: '팬덤',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'snsFandomPoint',
    impactLabel: '팬덤 활동',
    summary: '팬 이벤트 일정이 공개되며 커뮤니티 반응이 늘어납니다.',
    dateLabel: '최근 시드',
    sourceType: 'preview_signal',
  },
  {
    id: 'market-09',
    title: '콘셉트 티저 공개 이후 반응 지표 변화',
    category: '프로모션',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'comebackActivityPoint',
    impactLabel: '컴백/활동',
    summary: '티저 공개 뒤 반응량과 저장 흐름을 짧게 확인합니다.',
    dateLabel: '최근 시드',
    sourceType: 'editorial_seed',
  },
  {
    id: 'market-10',
    title: '활동 종료 후 지표 안정 구간 진입',
    category: '활동 주기',
    relatedArtistName: 'K-pop 전반',
    relatedVariableKey: 'riskAdjustmentPoint',
    impactLabel: '조정 신호',
    summary: '활동이 끝난 뒤 반응 지표가 안정되는 흐름을 따로 봅니다.',
    dateLabel: '최근 시드',
    sourceType: 'preview_signal',
  },
];

const artistIssueTemplates = [
  {
    title: '신보 활동 구간 반응이 SNS 지표에 반영',
    category: 'SNS/팬덤',
    relatedVariableKey: 'snsFandomPoint' as const,
    impactLabel: '팬덤 반응',
    summary: '활동 콘텐츠 반응이 팬덤 지표에 먼저 잡히는 구간입니다.',
  },
  {
    title: '콘셉트 티저 공개 후 검색 흐름 변화',
    category: '컴백/활동',
    relatedVariableKey: 'comebackActivityPoint' as const,
    impactLabel: '활동 신호',
    summary: '프로모션 콘텐츠 이후 관심 흐름을 짧게 확인합니다.',
  },
  {
    title: '숏폼 챌린지 반응 증가',
    category: 'SNS/팬덤',
    relatedVariableKey: 'snsFandomPoint' as const,
    impactLabel: '반응량',
    summary: '짧은 영상 반응이 팬덤 활동성에 반영됩니다.',
  },
  {
    title: '브랜드 협업 관심 지표 반영',
    category: '브랜드',
    relatedVariableKey: 'brandFitPoint' as const,
    impactLabel: '브랜드 적합도',
    summary: '협업 공개 뒤 대중 접점과 검색 흐름을 함께 봅니다.',
  },
  {
    title: '음원/음반 발매 전 관심 흐름 확인',
    category: '음원/음반',
    relatedVariableKey: 'musicAlbumPoint' as const,
    impactLabel: '발매 반응',
    summary: '발매 전 프로모션 반응을 음원/음반 변수에 반영합니다.',
  },
  {
    title: '해외 일정 관련 검색 흐름 증가',
    category: '해외 반응',
    relatedVariableKey: 'growthMomentumPoint' as const,
    impactLabel: '성장 모멘텀',
    summary: '해외 일정 관심이 검색과 팬덤 흐름에 잡힙니다.',
  },
  {
    title: '무대 노출 이후 관심도 변화',
    category: '무대 노출',
    relatedVariableKey: 'comebackActivityPoint' as const,
    impactLabel: '활동 신호',
    summary: '무대 공개 뒤 반응량 변화가 짧게 나타납니다.',
  },
  {
    title: '팬 이벤트 공개 후 활동량 증가',
    category: '팬덤',
    relatedVariableKey: 'snsFandomPoint' as const,
    impactLabel: '팬덤 활동',
    summary: '팬 이벤트 일정이 팬덤 활동성 지표에 반영됩니다.',
  },
  {
    title: '미디어 노출량 변화 확인',
    category: '뉴스/이슈',
    relatedVariableKey: 'newsIssuePoint' as const,
    impactLabel: '뉴스/이슈',
    summary: '공개 노출량이 늘어난 구간을 이슈 변수로 확인합니다.',
  },
  {
    title: '활동 주기 전환으로 지표 안정',
    category: '활동 주기',
    relatedVariableKey: 'riskAdjustmentPoint' as const,
    impactLabel: '조정 신호',
    summary: '활동 구간이 바뀌며 지표가 안정되는 흐름입니다.',
  },
];

export function getMarketIssueTopTen() {
  return marketIssueSignals;
}

export function getArtistRecentIssueSignals(artistId: string, limit = 10) {
  const profile = artistIndexChartProfiles.find(
    (item) => item.artistId === artistId,
  );

  if (!profile) {
    return marketIssueSignals.slice(0, limit);
  }

  return artistIssueTemplates.slice(0, limit).map((item, index) => ({
    id: `${profile.artistId}-issue-${String(index + 1).padStart(2, '0')}`,
    relatedArtistName: profile.artistName,
    dateLabel: `최근 시드 ${index + 1}`,
    sourceType: index % 2 === 0 ? 'editorial_seed' : 'preview_signal',
    ...item,
  }));
}
