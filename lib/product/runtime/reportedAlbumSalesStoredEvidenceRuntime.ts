import {
  REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_ROOT,
  decodeReportedAlbumSalesImmutableEvidenceEnvelope,
  expectedReportedAlbumSalesImmutableEvidencePath,
  type ReportedAlbumSalesImmutableEvidenceEnvelope,
} from '../../alternative-evidence/reportedAlbumSalesImmutableEvidenceRecord';
import type {
  ImmutableTextObjectStore,
} from '../../server/storage/immutableTextObjectStore';

export const REPORTED_ALBUM_SALES_STORED_EVIDENCE_RUNTIME_VERSION =
  'reported-album-sales-stored-evidence-runtime-v1' as const;

type ReadOnlyStore = Pick<
  ImmutableTextObjectStore,
  'readText' | 'listPathnames'
>;

export type ReportedAlbumSalesStoredEvidenceRuntimeReadResult =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof REPORTED_ALBUM_SALES_STORED_EVIDENCE_RUNTIME_VERSION;
      canonicalArtistId: string;
      pathnames: readonly string[];
      evidence:
        readonly ReportedAlbumSalesImmutableEvidenceEnvelope[];
    }>
  | Readonly<{
      status: 'unavailable';
      contractVersion:
        typeof REPORTED_ALBUM_SALES_STORED_EVIDENCE_RUNTIME_VERSION;
      reason: 'stored-evidence-not-found';
    }>
  | Readonly<{
      status: 'data-issue';
      contractVersion:
        typeof REPORTED_ALBUM_SALES_STORED_EVIDENCE_RUNTIME_VERSION;
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
    ReportedAlbumSalesStoredEvidenceRuntimeReadResult,
    { status: 'data-issue' }
  >['reason'],
): ReportedAlbumSalesStoredEvidenceRuntimeReadResult {
  return Object.freeze({
    status: 'data-issue' as const,
    contractVersion:
      REPORTED_ALBUM_SALES_STORED_EVIDENCE_RUNTIME_VERSION,
    reason,
  });
}

export async function readReportedAlbumSalesStoredEvidenceRuntime(
  input: Readonly<{
    canonicalArtistId: string;
    store: ReadOnlyStore;
  }>,
): Promise<ReportedAlbumSalesStoredEvidenceRuntimeReadResult> {
  const canonicalArtistId = input.canonicalArtistId.trim().toLowerCase();
  if (
    !canonicalArtistId
    || !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(canonicalArtistId)
  ) {
    return dataIssue('artist-id-invalid');
  }

  const prefix =
    `${REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_ROOT}/${canonicalArtistId}/`;

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
      contractVersion:
        REPORTED_ALBUM_SALES_STORED_EVIDENCE_RUNTIME_VERSION,
      reason: 'stored-evidence-not-found' as const,
    });
  }

  const evidence: ReportedAlbumSalesImmutableEvidenceEnvelope[] = [];
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

    let envelope: ReportedAlbumSalesImmutableEvidenceEnvelope;
    try {
      envelope =
        decodeReportedAlbumSalesImmutableEvidenceEnvelope(body);
    } catch {
      return dataIssue('stored-evidence-object-invalid');
    }

    if (envelope.canonicalArtistId !== canonicalArtistId) {
      return dataIssue('stored-evidence-artist-mismatch');
    }
    if (
      pathname
        !== expectedReportedAlbumSalesImmutableEvidencePath(envelope)
    ) {
      return dataIssue('stored-evidence-path-mismatch');
    }

    evidence.push(envelope);
  }

  return Object.freeze({
    status: 'ok' as const,
    contractVersion:
      REPORTED_ALBUM_SALES_STORED_EVIDENCE_RUNTIME_VERSION,
    canonicalArtistId,
    pathnames: orderedPathnames,
    evidence: Object.freeze(evidence),
  });
}
