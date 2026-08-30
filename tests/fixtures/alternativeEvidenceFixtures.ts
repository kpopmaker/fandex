import type { NaverNewsNormalizedRecord } from '../../lib/server/ingestion/naverNewsContracts';
import { sha256Canonical } from '../../lib/shared/canonicalDigest';
import type {
  AlbumResearchIdentityCandidate,
  AlbumResearchIdentityResolution,
} from '../../lib/alternative-evidence/contracts';
import type {
  AlbumResearchIdentityResolutionRequest,
  AlbumResearchIdentityResolver,
} from '../../lib/alternative-evidence/identity';
import type { AlbumResearchExtractionContext } from '../../lib/alternative-evidence/naverNewsAlbumClaimExtractor';

export const SYNTHETIC_ALTERNATIVE_EVIDENCE_NOTICE =
  'Synthetic unit-test fixtures only. Never research or Production evidence.';

const publishedAt = '2026-08-30T01:00:00.000Z';
const collectedAt = '2026-08-30T02:00:00.000Z';

export const artistCandidate: AlbumResearchIdentityCandidate = Object.freeze({
  label: 'Artist A',
  providerNativeId: null,
  source: 'provided-hint',
});

export const releaseCandidate: AlbumResearchIdentityCandidate = Object.freeze({
  label: 'Release X',
  providerNativeId: null,
  source: 'provided-hint',
});

export const releaseFamilyCandidate: AlbumResearchIdentityCandidate = Object.freeze({
  label: 'Release X family',
  providerNativeId: null,
  source: 'provided-hint',
});

function resolved(
  request: AlbumResearchIdentityResolutionRequest,
  fandexId: string,
): AlbumResearchIdentityResolution {
  return Object.freeze({
    fandexId,
    candidate: request.candidate,
    state: 'resolved',
    reviewed: true,
    blockers: Object.freeze([]),
  });
}

export const reviewedIdentityResolver: AlbumResearchIdentityResolver = Object.freeze({
  resolveArtist: (request: AlbumResearchIdentityResolutionRequest) =>
    resolved(request, 'artist-a'),
  resolveRelease: (request: AlbumResearchIdentityResolutionRequest) =>
    resolved(request, 'release-x'),
});

export const reviewedIdentityContext: AlbumResearchExtractionContext = Object.freeze({
  identityHints: Object.freeze({
    artist: artistCandidate,
    release: releaseCandidate,
    releaseFamily: releaseFamilyCandidate,
  }),
  identityResolver: reviewedIdentityResolver,
  territory: 'KR',
});

export const unresolvedReleaseContext: AlbumResearchExtractionContext = Object.freeze({
  identityHints: Object.freeze({
    artist: artistCandidate,
    release: null,
    releaseFamily: releaseFamilyCandidate,
  }),
  territory: 'KR',
});

export function syntheticNaverNewsRecord(input: Readonly<{
  key: string;
  title: string;
  summary?: string;
}>): NaverNewsNormalizedRecord {
  const sourceUrl = `https://news.example.test/${input.key}`;
  const summary = input.summary ?? 'Synthetic summary.';
  const normalizedPayload = Object.freeze({
    provider: 'naver-news' as const,
    sourceType: 'news_article' as const,
    sourceUrl,
    naverUrl: `https://n.news.naver.com/${input.key}`,
    sourceHost: 'news.example.test',
    title: input.title,
    summary,
    publishedAt,
  });
  const contentSha256 = sha256Canonical({
    title: input.title,
    summary,
    sourceUrl,
    naverUrl: normalizedPayload.naverUrl,
    publishedAt,
  });
  return Object.freeze({
    recordId: sha256Canonical({ sourceUrl, contentSha256 }),
    rawEvidenceId: sha256Canonical({ key: input.key, kind: 'synthetic-raw' }),
    provider: 'naver-news',
    sourceType: 'news_article',
    sourceUrl,
    naverUrl: normalizedPayload.naverUrl,
    sourceHost: 'news.example.test',
    title: input.title,
    summary,
    publishedAt,
    collectedAt,
    contentSha256,
    recordSha256: sha256Canonical(normalizedPayload),
    normalizedPayload,
  });
}

export const alternativeEvidenceFixtures = Object.freeze({
  hanteoFirstWeekExact: syntheticNaverNewsRecord({
    key: 'hanteo-first-week-exact',
    title: 'Artist A Release X, 한터차트 기준 초동 120만 장',
  }),
  circleCumulativeExact: syntheticNaverNewsRecord({
    key: 'circle-cumulative-exact',
    title: 'Artist A Release X, 써클차트 기준 2026년 8월 누적 판매량 1,500,000장',
  }),
  agencyNumericSales: syntheticNaverNewsRecord({
    key: 'agency-numeric-sales',
    title: '소속사에 따르면 Artist A Release X 판매량 50만 장',
  }),
  millionSellerThreshold: syntheticNaverNewsRecord({
    key: 'million-seller-threshold',
    title: 'Artist A Release X 밀리언셀러 달성',
  }),
  firstDay: syntheticNaverNewsRecord({
    key: 'first-day',
    title: '한터차트 기준 Artist A Release X 첫날 30만 장',
  }),
  rankOnly: syntheticNaverNewsRecord({
    key: 'rank-only',
    title: 'Artist A Release X 음반 차트 2위',
  }),
  shipment: syntheticNaverNewsRecord({
    key: 'shipment',
    title: 'Artist A Release X 글로벌 출하 80만 장',
  }),
  preorder: syntheticNaverNewsRecord({
    key: 'preorder',
    title: 'Artist A Release X 선주문 100만 장',
  }),
  ambiguousSales: syntheticNaverNewsRecord({
    key: 'ambiguous-sales',
    title: 'Artist A Release X 판매량 40만 장 기록',
  }),
  noAlbumClaim: syntheticNaverNewsRecord({
    key: 'no-album-claim',
    title: 'Artist A가 새 공연 일정을 발표했다',
  }),
  syndicatedA: syntheticNaverNewsRecord({
    key: 'syndicated-a',
    title: '한터차트 기준 Artist A Release X 초동 120만 장',
  }),
  syndicatedB: syntheticNaverNewsRecord({
    key: 'syndicated-b',
    title: '한터차트 기준 Artist A Release X 초동 120만 장',
  }),
  conflictingOnePointOne: syntheticNaverNewsRecord({
    key: 'conflict-1-1',
    title: '한터차트 기준 Artist A Release X 초동 1.1 million copies',
  }),
  conflictingOnePointTwo: syntheticNaverNewsRecord({
    key: 'conflict-1-2',
    title: '한터차트 기준 Artist A Release X 초동 1.2 million copies',
  }),
  correctedClaim: syntheticNaverNewsRecord({
    key: 'corrected-claim',
    title: '정정: 한터차트 기준 Artist A Release X 초동 120만 장',
  }),
  unresolvedRelease: syntheticNaverNewsRecord({
    key: 'unresolved-release',
    title: '한터차트 기준 Artist A의 신보 초동 120만 장',
  }),
  multipleClaims: syntheticNaverNewsRecord({
    key: 'multiple-claims',
    title: '한터차트 기준 Artist A Release X 초동 120만 장; 2026년 8월 누적 150만 장',
  }),
});
