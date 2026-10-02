export const SNS_FANDOM_COLLECTION_RUN_MANIFEST_VERSION =
  'sns-fandom-collection-run-manifest-v1' as const;

export type SnsFandomCollectionRunManifest = Readonly<{
  manifestVersion: typeof SNS_FANDOM_COLLECTION_RUN_MANIFEST_VERSION;
  runId: string;
  providerId: string;
  adapterVersion: string;
  approvalEvidenceRef: string | null;
  rightsState: 'authorized' | 'blocked' | 'unknown';
  collectionState:
    | 'planned'
    | 'running'
    | 'completed'
    | 'failed-closed';
  startedAt: string | null;
  completedAt: string | null;
  observationCount: number;
  evidenceRefs: readonly string[];
  failureReasons: readonly string[];
}>;

export function validateSnsFandomCollectionRunManifest(
  manifest: SnsFandomCollectionRunManifest,
): Readonly<{
  valid: boolean;
  blockers: readonly string[];
}> {
  const blockers: string[] = [];

  if (manifest.runId.trim().length === 0) {
    blockers.push('collection-run-id-missing');
  }

  if (manifest.providerId.trim().length === 0) {
    blockers.push('collection-provider-id-missing');
  }

  if (manifest.adapterVersion.trim().length === 0) {
    blockers.push('collection-adapter-version-missing');
  }

  if (manifest.rightsState !== 'authorized') {
    blockers.push('collection-rights-not-authorized');
  }

  if (manifest.approvalEvidenceRef === null) {
    blockers.push('collection-approval-evidence-missing');
  }

  if (
    manifest.collectionState === 'completed'
    && manifest.completedAt === null
  ) {
    blockers.push('completed-run-timestamp-missing');
  }

  if (
    manifest.collectionState === 'completed'
    && manifest.observationCount === 0
  ) {
    blockers.push('completed-run-has-no-observations');
  }

  if (manifest.failureReasons.length > 0) {
    blockers.push('collection-run-has-failures');
  }

  return Object.freeze({
    valid: blockers.length === 0,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}
