import { sha256Canonical } from '../shared/canonicalDigest';
import { createAlbumResearchClaim } from './albumResearch';
import type { AlbumResearchClaim, AlternativeEvidence } from './contracts';
import {
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
  IU_THE_WINNING_REPORTED_WEEKLY_SALES_RESEARCH,
} from './iuTheWinningResearchEvidence';

export const ALBUM_RESEARCH_CLAIM_PERSISTENCE_CONTRACT_VERSION =
  'album-research-claim-persistence-v1' as const;

export const ALBUM_RESEARCH_CLAIM_PERSISTENCE_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_RESEARCH_CLAIM_PERSISTENCE_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  table: 'fandex.album_research_claim_records' as const,
  appendOnly: true as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productionEligible: false as const,
  directProviderObservationRequiredForProduction: true as const,
  semantics: 'append-only-normalized-album-research-claim-store' as const,
});

export type AlbumResearchClaimStoredRow = Readonly<{
  claim_id: string;
  claim_family_id: string;
  claim_scope_id: string;
  source_evidence_id: string;
  origin: string;
  acquisition_provider: string;
  reported_provider: string | null;
  artist_id: string | null;
  release_id: string | null;
  release_family_id: string | null;
  semantic: string;
  semantic_state: string;
  definition_state: string;
  value: number | string | null;
  value_kind: string;
  unit: string | null;
  territory: string | null;
  provider_period: string | null;
  reported_period: string | null;
  research_only: boolean;
  shadow_eligibility: string;
  evidence_digest: string;
  claim_payload: AlbumResearchClaim;
  observed_at: string | Date;
  collected_at: string | Date;
  revision_observed_at: string | Date | null;
}>;

const THE_WINNING_ARTICLE_URL =
  'https://mb.com.ph/2024/2/26/le-sserafim-twice-iu-top-album-chart-for-4th-week-of-february-in-korea';

const THE_WINNING_EXTRACTION_TEXT =
  'IU - The Winning - 206,128';

export function buildIuTheWinningReportedSalesEvidence(
  observedAt = '2026-09-17T08:24:26.000Z',
  collectedAt = '2026-09-17T08:24:26.000Z',
): AlternativeEvidence {
  const basis = Object.freeze({
    origin: 'news-reported-provider-value' as const,
    sourceId: 'manila-bulletin',
    sourceUrl: THE_WINNING_ARTICLE_URL,
    acquisitionProvider: 'manila-bulletin',
    reportedProvider: 'hanteo-chart',
    observedAt,
    collectedAt,
    sourcePublishedAt: null,
    researchOnly: true as const,
    contractVersion: 'alternative-evidence-v1' as const,
  });
  return Object.freeze({
    ...basis,
    evidenceId: 'web:manila-bulletin:iu-the-winning:hanteo-weekly:2024-W08',
    evidenceDigest: sha256Canonical(basis),
  });
}

export function buildIuTheWinningReportedWeeklySalesClaim(
  observedAt = '2026-09-17T08:24:26.000Z',
  collectedAt = '2026-09-17T08:24:26.000Z',
): AlbumResearchClaim {
  const evidence = buildIuTheWinningReportedSalesEvidence(observedAt, collectedAt);
  const textDigest = sha256Canonical({ text: THE_WINNING_EXTRACTION_TEXT });
  return createAlbumResearchClaim({
    evidence,
    origin: 'news-reported-provider-value',
    reportedProvider: 'hanteo-chart',
    artist: Object.freeze({
      fandexId: 'iu',
      candidate: Object.freeze({ label: 'IU', providerNativeId: null, source: 'provided-hint' as const }),
      state: 'resolved' as const,
      reviewed: true,
      blockers: Object.freeze([]),
    }),
    release: Object.freeze({
      fandexId: IU_THE_WINNING_RELEASE_ID,
      candidate: Object.freeze({ label: 'The Winning', providerNativeId: null, source: 'provided-hint' as const }),
      state: 'resolved' as const,
      reviewed: true,
      blockers: Object.freeze([]),
    }),
    releaseFamilyCandidate: Object.freeze({
      label: IU_THE_WINNING_RELEASE_FAMILY_ID,
      providerNativeId: null,
      source: 'provided-hint' as const,
    }),
    semantic: 'period-sale',
    semanticState: 'clear',
    definitionState: 'verified',
    value: IU_THE_WINNING_REPORTED_WEEKLY_SALES_RESEARCH.reportedSalesValue,
    valueKind: 'exact',
    unit: 'physical-units',
    territory: null,
    temporal: Object.freeze({
      providerPeriod: null,
      reportedPeriod: IU_THE_WINNING_REPORTED_WEEKLY_SALES_RESEARCH.chartPeriod,
      sourcePublishedAt: null,
      observedAt,
      collectedAt,
      revisionObservedAt: null,
      knowledgeMode: 'current-research' as const,
    }),
    extraction: Object.freeze({
      ordinal: 0,
      start: 0,
      end: THE_WINNING_EXTRACTION_TEXT.length,
      text: THE_WINNING_EXTRACTION_TEXT,
      textDigest,
    }),
  });
}

export function serializeAlbumResearchClaim(claim: AlbumResearchClaim): AlbumResearchClaimStoredRow {
  return Object.freeze({
    claim_id: claim.claimId,
    claim_family_id: claim.claimFamilyId,
    claim_scope_id: claim.claimScopeId,
    source_evidence_id: claim.sourceEvidenceId,
    origin: claim.origin,
    acquisition_provider: claim.acquisitionProvider,
    reported_provider: claim.reportedProvider,
    artist_id: claim.artistId,
    release_id: claim.releaseId,
    release_family_id: claim.releaseFamilyCandidate?.label ?? null,
    semantic: claim.semantic,
    semantic_state: claim.semanticState,
    definition_state: claim.definitionState,
    value: claim.value,
    value_kind: claim.valueKind,
    unit: claim.unit,
    territory: claim.territory,
    provider_period: claim.providerPeriod,
    reported_period: claim.reportedPeriod,
    research_only: true,
    shadow_eligibility: claim.shadowEligibility,
    evidence_digest: claim.evidenceDigest,
    claim_payload: claim,
    observed_at: claim.observedAt,
    collected_at: claim.collectedAt,
    revision_observed_at: claim.revisionObservedAt,
  });
}

const timestampMs = (value: string | Date): number =>
  value instanceof Date ? value.getTime() : Date.parse(value);

const storedValue = (value: number | string | null): number | null => {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
};

export function validateAlbumResearchClaimStoredRow(row: AlbumResearchClaimStoredRow): readonly string[] {
  const issues: string[] = [];
  const claim = row.claim_payload;
  if (claim.claimId !== row.claim_id) issues.push('claim-id-mismatch');
  if (claim.claimFamilyId !== row.claim_family_id) issues.push('claim-family-id-mismatch');
  if (claim.claimScopeId !== row.claim_scope_id) issues.push('claim-scope-id-mismatch');
  if (claim.sourceEvidenceId !== row.source_evidence_id) issues.push('source-evidence-id-mismatch');
  if (claim.releaseId !== row.release_id) issues.push('release-id-mismatch');
  if (claim.semantic !== row.semantic) issues.push('semantic-mismatch');
  const normalizedValue = storedValue(row.value);
  if (Number.isNaN(normalizedValue) || claim.value !== normalizedValue) issues.push('value-mismatch');
  if (claim.unit !== row.unit) issues.push('unit-mismatch');
  if (!row.research_only || !claim.researchOnly) issues.push('research-only-required');
  if (!/^[0-9a-f]{64}$/.test(row.claim_id)) issues.push('claim-id-invalid');
  if (!/^[0-9a-f]{64}$/.test(row.evidence_digest)) issues.push('evidence-digest-invalid');
  const observed = timestampMs(row.observed_at);
  const collected = timestampMs(row.collected_at);
  if (Number.isNaN(observed)) issues.push('observed-at-invalid');
  if (Number.isNaN(collected)) issues.push('collected-at-invalid');
  if (!Number.isNaN(observed) && !Number.isNaN(collected) && collected < observed) {
    issues.push('collection-before-observation');
  }
  return Object.freeze([...new Set(issues)].sort());
}

export function buildAlbumResearchClaimStoreMigrationSql(): string {
  return `CREATE TABLE fandex.album_research_claim_records (\n  claim_id char(64) PRIMARY KEY CHECK (claim_id ~ '^[0-9a-f]{64}$'),\n  claim_family_id char(64) NOT NULL CHECK (claim_family_id ~ '^[0-9a-f]{64}$'),\n  claim_scope_id char(64) NOT NULL CHECK (claim_scope_id ~ '^[0-9a-f]{64}$'),\n  source_evidence_id text NOT NULL CHECK (length(trim(source_evidence_id)) > 0),\n  origin text NOT NULL,\n  acquisition_provider text NOT NULL,\n  reported_provider text NULL,\n  artist_id text NULL,\n  release_id text NULL,\n  release_family_id text NULL,\n  semantic text NOT NULL,\n  semantic_state text NOT NULL,\n  definition_state text NOT NULL,\n  value bigint NULL CHECK (value IS NULL OR value > 0),\n  value_kind text NOT NULL,\n  unit text NULL,\n  territory text NULL,\n  provider_period text NULL,\n  reported_period text NULL,\n  research_only boolean NOT NULL DEFAULT true CHECK (research_only = true),\n  shadow_eligibility text NOT NULL,\n  evidence_digest char(64) NOT NULL CHECK (evidence_digest ~ '^[0-9a-f]{64}$'),\n  claim_payload jsonb NOT NULL CHECK (octet_length(claim_payload::text) <= 32768),\n  observed_at timestamptz NOT NULL,\n  collected_at timestamptz NOT NULL CHECK (collected_at >= observed_at),\n  revision_observed_at timestamptz NULL,\n  created_at timestamptz NOT NULL DEFAULT now()\n);`;
}
