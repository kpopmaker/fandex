import {
  BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT,
  decodeBrandFitImmutableEvidenceEnvelope,
} from '../../intelligence/brandFitImmutableEvidenceRecord';
import type {
  BrandFitPartnershipEvidence,
} from '../../intelligence/brandFitPointConstruct';
import type {
  ImmutableTextObjectStore,
} from '../../server/storage/immutableTextObjectStore';

export const BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION =
  'brand-fit-stored-evidence-runtime-v1' as const;

type ReadOnlyStore = Pick<
  ImmutableTextObjectStore,
  'readText' | 'listPathnames'
>;

export type BrandFitStoredEvidenceRuntimeReadResult =
  | Readonly<{
      status: 'ok';
      contractVersion: typeof BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION;
      canonicalArtistId: string;
      pathnames: readonly string[];
      evidence: readonly BrandFitPartnershipEvidence[];
    }>
  | Readonly<{
      status: 'unavailable';
      contractVersion: typeof BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION;
      reason: 'stored-evidence-not-found';
    }>
  | Readonly<{
      status: 'data-issue';
      contractVersion: typeof BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION;
      reason:
        | 'artist-id-invalid'
        | 'stored-evidence-list-failed'
        | 'stored-evidence-object-missing'
        | 'stored-evidence-object-invalid'
        | 'stored-evidence-path-mismatch'
        | 'stored-evidence-artist-mismatch';
    }>;

function dataIssue(
  reason: Extract<
    BrandFitStoredEvidenceRuntimeReadResult,
    { status: 'data-issue' }
  >['reason'],
): BrandFitStoredEvidenceRuntimeReadResult {
  return Object.freeze({
    status: 'data-issue' as const,
    contractVersion: BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION,
    reason,
  });
}

function expectedPath(input: Readonly<{
  canonicalArtistId: string;
  canonicalBrandId: string;
  evidenceDigest: string;
}>): string {
  return [
    BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT,
    input.canonicalArtistId,
    input.canonicalBrandId,
    input.evidenceDigest + '.json',
  ].join('/');
}

export async function readBrandFitStoredEvidenceRuntime(input: Readonly<{
  canonicalArtistId: string;
  store: ReadOnlyStore;
}>): Promise<BrandFitStoredEvidenceRuntimeReadResult> {
  const canonicalArtistId = input.canonicalArtistId.trim().toLowerCase();
  if (
    !canonicalArtistId
    || !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(canonicalArtistId)
  ) {
    return dataIssue('artist-id-invalid');
  }

  const prefix =
    `${BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT}/${canonicalArtistId}/`;

  let pathnames: readonly string[];
  try {
    pathnames = await input.store.listPathnames(prefix);
  } catch {
    return dataIssue('stored-evidence-list-failed');
  }

  const orderedPathnames = Object.freeze(
    [...new Set(pathnames)].sort(),
  );

  if (orderedPathnames.length === 0) {
    return Object.freeze({
      status: 'unavailable' as const,
      contractVersion: BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION,
      reason: 'stored-evidence-not-found' as const,
    });
  }

  const evidence: BrandFitPartnershipEvidence[] = [];

  for (const pathname of orderedPathnames) {
    let body: string | null;
    try {
      body = await input.store.readText(pathname);
    } catch {
      return dataIssue('stored-evidence-object-missing');
    }

    if (body === null) {
      return dataIssue('stored-evidence-object-missing');
    }

    let envelope;
    try {
      envelope = decodeBrandFitImmutableEvidenceEnvelope(body);
    } catch {
      return dataIssue('stored-evidence-object-invalid');
    }

    if (envelope.canonicalArtistId !== canonicalArtistId) {
      return dataIssue('stored-evidence-artist-mismatch');
    }

    if (
      pathname !== expectedPath({
        canonicalArtistId,
        canonicalBrandId: envelope.canonicalBrandId,
        evidenceDigest: envelope.evidenceDigest,
      })
    ) {
      return dataIssue('stored-evidence-path-mismatch');
    }

    evidence.push(envelope.evidence);
  }

  return Object.freeze({
    status: 'ok' as const,
    contractVersion: BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION,
    canonicalArtistId,
    pathnames: orderedPathnames,
    evidence: Object.freeze(evidence),
  });
}
