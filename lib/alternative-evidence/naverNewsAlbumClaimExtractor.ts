import type { NaverNewsNormalizedRecord } from '../server/ingestion/naverNewsContracts';
import { sha256Canonical } from '../shared/canonicalDigest';
import {
  ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
  type AlbumResearchClaim,
  type AlbumResearchClaimExtractionResult,
  type AlbumResearchClaimSemantic,
  type AlbumResearchDefinitionState,
  type AlbumResearchRevisionContract,
  type AlbumResearchSemanticState,
  type AlbumResearchTemporalContract,
  type AlbumResearchValueKind,
  type AlternativeEvidence,
  type AlternativeEvidenceOrigin,
} from './contracts';
import { createAlbumResearchClaim } from './albumResearch';
import {
  resolveAlbumResearchIdentities,
  type AlbumResearchIdentityHints,
  type AlbumResearchIdentityResolver,
} from './identity';

export const NAVER_NEWS_ALBUM_CLAIM_EXTRACTOR_VERSION =
  'naver-news-album-claim-extractor-v1';

export type ParsedAlbumNumericValue = Readonly<{
  value: number;
  unit: 'physical-unit';
  valueKind: 'exact' | 'threshold';
  raw: string;
  start: number;
  end: number;
}>;

export type AlbumResearchExtractionContext = Readonly<{
  identityHints?: Partial<AlbumResearchIdentityHints>;
  identityResolver?: AlbumResearchIdentityResolver;
  territory?: string | null;
  providerPeriod?: string | null;
  reportedPeriod?: string | null;
  revisionObservedAt?: string | null;
  revision?: Partial<AlbumResearchRevisionContract>;
}>;

type TextClause = Readonly<{ text: string; start: number; end: number }>;

type SemanticClassification = Readonly<{
  semantic: AlbumResearchClaimSemantic;
  semanticState: AlbumResearchSemanticState;
  definitionState: AlbumResearchDefinitionState;
  reportedPeriod: string | null;
}>;

const ALBUM_LANGUAGE = /초동|첫날|판매량|판매고|판매\s*돌파|누적|밀리언셀러|million\s+seller|hanteo|한터(?:차트)?|circle|써클(?:차트)?|서클차트|pre[- ]?order|선주문|출하|shipment|음반\s*차트|앨범\s*차트|\d+\s*위|판매\s*인증|sales?|sold/i;
const HANTEO = /hanteo|한터(?:차트)?/i;
const CIRCLE = /circle(?:\s*chart)?|써클(?:차트)?|서클차트/i;
const AGENCY = /소속사(?:에\s*따르면|는|가|의|\s*발표|\s*측)|기획사(?:에\s*따르면|는|가|의|\s*발표|\s*측)|agency(?:\s+said|\s+reported)?/i;

function normalizeText(value: string): string {
  return value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').trim();
}

function splitClauses(text: string): readonly TextClause[] {
  const boundaries = /\n+|(?<!\d)\.(?!\d)|[!?。！？;；]+|,(?=\s)/g;
  const clauses: TextClause[] = [];
  let cursor = 0;
  for (const match of text.matchAll(boundaries)) {
    const boundaryStart = match.index ?? cursor;
    const raw = text.slice(cursor, boundaryStart);
    const leading = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) {
      clauses.push(Object.freeze({
        text: trimmed,
        start: cursor + leading,
        end: cursor + leading + trimmed.length,
      }));
    }
    cursor = boundaryStart + match[0].length;
  }
  const tail = text.slice(cursor);
  const leading = tail.length - tail.trimStart().length;
  const trimmed = tail.trim();
  if (trimmed) {
    clauses.push(Object.freeze({
      text: trimmed,
      start: cursor + leading,
      end: cursor + leading + trimmed.length,
    }));
  }
  return Object.freeze(clauses);
}

function safePhysicalValue(amount: number, multiplier: number): number | null {
  const value = amount * multiplier;
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function numericResult(
  text: string,
  match: RegExpExecArray,
  amount: number,
  multiplier: number,
): ParsedAlbumNumericValue | null {
  const value = safePhysicalValue(amount, multiplier);
  if (value === null || match.index === undefined) return null;
  const threshold = /판매\s*돌파|돌파|이상|at\s+least|\bover\b/i.test(text);
  return Object.freeze({
    value,
    unit: 'physical-unit',
    valueKind: threshold ? 'threshold' : 'exact',
    raw: match[0],
    start: match.index,
    end: match.index + match[0].length,
  });
}

export function parseAlbumNumericValue(text: string): ParsedAlbumNumericValue | null {
  const normalized = normalizeText(text);
  const patterns: readonly Readonly<{
    expression: RegExp;
    multiplier: number;
    parse: (token: string) => number;
  }>[] = [
    {
      expression: /(\d+(?:\.\d+)?)\s*만\s*장/i,
      multiplier: 10_000,
      parse: Number,
    },
    {
      expression: /(\d+(?:\.\d+)?)\s*million(?:\s+(?:copies|albums|units))?/i,
      multiplier: 1_000_000,
      parse: Number,
    },
    {
      expression: /(\d+(?:\.\d+)?)\s*m\b(?:\s*(?:copies|albums|units))?/i,
      multiplier: 1_000_000,
      parse: Number,
    },
    {
      expression: /((?:\d{1,3}(?:,\d{3})+)|\d+)\s*장/i,
      multiplier: 1,
      parse: (token) => Number(token.replaceAll(',', '')),
    },
  ];

  for (const pattern of patterns) {
    const match = pattern.expression.exec(normalized);
    if (!match?.[1]) continue;
    const result = numericResult(
      normalized,
      match,
      pattern.parse(match[1]),
      pattern.multiplier,
    );
    if (result) return result;
  }
  return null;
}

function parseRankValue(text: string): Readonly<{
  value: number;
  valueKind: 'rank';
  unit: 'rank';
}> | null {
  const match = /(\d+)\s*위/.exec(text);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return Object.freeze({ value, valueKind: 'rank', unit: 'rank' });
}

function periodFromText(text: string): string | null {
  const date = /(20\d{2}년\s*\d{1,2}월(?:\s*\d{1,2}일)?)/.exec(text)?.[1];
  if (date) return normalizeText(date);
  const period = /(20\d{2}[-.]\d{1,2}(?:[-.]\d{1,2})?)/.exec(text)?.[1];
  if (period) return period;
  if (/이번\s*주|주간/.test(text)) return 'reported-week';
  if (/이번\s*달|월간/.test(text)) return 'reported-month';
  if (/일간/.test(text)) return 'reported-day';
  return null;
}

export function classifyAlbumClaimSemantic(text: string): SemanticClassification | null {
  const normalized = normalizeText(text);
  if (!ALBUM_LANGUAGE.test(normalized)) return null;
  if (/초동/.test(normalized)) {
    return Object.freeze({
      semantic: 'first-week-sale',
      semanticState: 'definition-unverified',
      definitionState: 'unverified',
      reportedPeriod: 'reported-first-week',
    });
  }
  if (/첫날/.test(normalized)) {
    return Object.freeze({
      semantic: 'first-day-sale',
      semanticState: 'clear',
      definitionState: 'unverified',
      reportedPeriod: 'reported-first-day',
    });
  }
  if (/선주문|pre[- ]?order/i.test(normalized)) {
    return Object.freeze({
      semantic: 'preorder', semanticState: 'clear', definitionState: 'not-applicable',
      reportedPeriod: periodFromText(normalized),
    });
  }
  if (/출하|shipment/i.test(normalized)) {
    return Object.freeze({
      semantic: 'shipment', semanticState: 'clear', definitionState: 'not-applicable',
      reportedPeriod: periodFromText(normalized),
    });
  }
  if (/누적/.test(normalized)) {
    return Object.freeze({
      semantic: 'cumulative-sale', semanticState: 'clear', definitionState: 'not-applicable',
      reportedPeriod: periodFromText(normalized),
    });
  }
  if (/판매\s*인증|certified/i.test(normalized)) {
    return Object.freeze({
      semantic: 'chart-certified-unit', semanticState: 'definition-unverified', definitionState: 'unverified',
      reportedPeriod: periodFromText(normalized),
    });
  }
  if (/\d+\s*위|음반\s*차트|앨범\s*차트|순위/.test(normalized)) {
    return Object.freeze({
      semantic: 'rank', semanticState: 'clear', definitionState: 'not-applicable',
      reportedPeriod: periodFromText(normalized),
    });
  }
  if (/지수|포인트|\bindex\b/i.test(normalized)) {
    return Object.freeze({
      semantic: 'index', semanticState: 'definition-unverified', definitionState: 'unverified',
      reportedPeriod: periodFromText(normalized),
    });
  }
  if (/(이번\s*주|주간|이번\s*달|월간|일간).*(판매량|판매고|sales?)/i.test(normalized)
      || /(판매량|판매고|sales?).*(이번\s*주|주간|이번\s*달|월간|일간)/i.test(normalized)) {
    return Object.freeze({
      semantic: 'period-sale', semanticState: 'definition-unverified', definitionState: 'unverified',
      reportedPeriod: periodFromText(normalized),
    });
  }
  return Object.freeze({
    semantic: 'unknown',
    semanticState: 'ambiguous',
    definitionState: 'unknown',
    reportedPeriod: periodFromText(normalized),
  });
}

function uniqueReportedProviders(text: string): readonly string[] {
  const providers: string[] = [];
  if (HANTEO.test(text)) providers.push('Hanteo Chart');
  if (CIRCLE.test(text)) providers.push('Circle Chart');
  return Object.freeze(providers);
}

function attributedProvider(clause: string, articleProviders: readonly string[]): string | null {
  const local = uniqueReportedProviders(clause);
  if (local.length === 1) return local[0];
  if (local.length > 1) return null;
  return articleProviders.length === 1 ? articleProviders[0] : null;
}

function claimOrigin(
  clause: string,
  reportedProvider: string | null,
  articleHasAgencyAttribution: boolean,
): AlternativeEvidenceOrigin {
  if (reportedProvider) return 'news-reported-provider-value';
  if (AGENCY.test(clause) || articleHasAgencyAttribution) return 'news-reported-agency-value';
  return 'unknown-public-claim';
}

export function buildNaverNewsAlternativeEvidence(
  article: NaverNewsNormalizedRecord,
): AlternativeEvidence {
  const evidenceDigest = sha256Canonical({
    contractVersion: ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
    provider: article.provider,
    recordId: article.recordId,
    recordSha256: article.recordSha256,
    contentSha256: article.contentSha256,
  });
  return Object.freeze({
    evidenceId: sha256Canonical({
      contractVersion: ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
      acquisitionProvider: article.provider,
      sourceId: article.recordId,
      evidenceDigest,
    }),
    origin: 'authorized-public-api',
    sourceId: article.recordId,
    sourceUrl: article.sourceUrl,
    acquisitionProvider: article.provider,
    reportedProvider: null,
    observedAt: article.collectedAt,
    collectedAt: article.collectedAt,
    sourcePublishedAt: article.publishedAt,
    evidenceDigest,
    researchOnly: true,
    contractVersion: ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
  });
}

function revisionFromContext(
  clause: string,
  context: AlbumResearchExtractionContext,
): Partial<AlbumResearchRevisionContract> {
  if (context.revision?.supersedesClaimId) {
    return Object.freeze({
      ...context.revision,
      revisionState: 'explicit-correction',
      conflictReason: context.revision.conflictReason ?? 'correction',
    });
  }
  if (/정정|수정|corrected|revised/i.test(clause)) {
    return Object.freeze({
      ...context.revision,
      revisionState: 'possible-correction',
      possibleCorrectionOf: context.revision?.possibleCorrectionOf ?? [],
      conflictReason: context.revision?.conflictReason ?? 'correction',
    });
  }
  return context.revision ?? {};
}

export function extractAlbumResearchClaimsFromNaverNews(
  article: NaverNewsNormalizedRecord,
  context: AlbumResearchExtractionContext = {},
): AlbumResearchClaimExtractionResult {
  const evidence = buildNaverNewsAlternativeEvidence(article);
  const text = normalizeText(`${article.title}\n${article.summary}`);
  const contextTextDigest = sha256Canonical({
    extractorVersion: NAVER_NEWS_ALBUM_CLAIM_EXTRACTOR_VERSION,
    text,
  });
  const identities = resolveAlbumResearchIdentities({
    evidence,
    contextTextDigest,
    hints: context.identityHints,
    resolver: context.identityResolver,
  });
  const articleProviders = uniqueReportedProviders(text);
  const articleHasAgencyAttribution = AGENCY.test(text);
  const claims: AlbumResearchClaim[] = [];

  for (const clause of splitClauses(text)) {
    const classification = classifyAlbumClaimSemantic(clause.text);
    if (!classification) continue;
    const numeric = parseAlbumNumericValue(clause.text);
    const rank = classification.semantic === 'rank' ? parseRankValue(clause.text) : null;
    const thresholdLabel = /밀리언셀러|million\s+seller/i.test(clause.text);
    const value = rank?.value ?? numeric?.value ?? null;
    const valueKind: AlbumResearchValueKind = rank?.valueKind
      ?? numeric?.valueKind
      ?? (thresholdLabel ? 'threshold-label' : 'none');
    const unit = rank?.unit ?? numeric?.unit ?? (thresholdLabel ? 'physical-unit' : null);
    const reportedProvider = attributedProvider(clause.text, articleProviders);
    const origin = claimOrigin(clause.text, reportedProvider, articleHasAgencyAttribution);
    const extraction = Object.freeze({
      ordinal: claims.length,
      start: clause.start,
      end: clause.end,
      text: clause.text,
      textDigest: sha256Canonical(clause.text),
    });
    const temporal: AlbumResearchTemporalContract = Object.freeze({
      providerPeriod: context.providerPeriod ?? null,
      reportedPeriod: context.reportedPeriod ?? classification.reportedPeriod,
      sourcePublishedAt: article.publishedAt,
      observedAt: article.collectedAt,
      collectedAt: article.collectedAt,
      revisionObservedAt: context.revisionObservedAt ?? null,
      knowledgeMode: 'as-known-at-collection',
    });
    claims.push(createAlbumResearchClaim({
      evidence,
      origin,
      reportedProvider,
      artist: identities.artist,
      release: identities.release,
      releaseFamilyCandidate: identities.releaseFamily,
      semantic: classification.semantic,
      semanticState: classification.semanticState,
      definitionState: classification.definitionState,
      value,
      valueKind,
      unit,
      territory: context.territory ?? null,
      temporal,
      extraction,
      revision: revisionFromContext(clause.text, context),
    }));
  }

  const frozenClaims = Object.freeze(claims);
  const blockers = Object.freeze([...new Set(claims.flatMap((claim) => claim.blockers))].sort());
  return Object.freeze({
    evidence,
    state: claims.length === 0
      ? 'no-album-claim'
      : blockers.length > 0
        ? 'claims-extracted-with-blockers'
        : 'claims-extracted',
    claims: frozenClaims,
    blockers,
  });
}
