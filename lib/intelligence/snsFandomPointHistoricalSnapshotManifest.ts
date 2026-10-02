export const SNS_FANDOM_HISTORICAL_SNAPSHOT_MANIFEST_VERSION =
  'sns-fandom-historical-snapshot-manifest-v1' as const;

export type HistoricalSnapshotState =
  | 'planned'
  | 'captured'
  | 'validated'
  | 'rejected';

export type SnsFandomHistoricalSnapshotManifest = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_HISTORICAL_SNAPSHOT_MANIFEST_VERSION;
  snapshotId: string;
  providerId: string;
  artistIdentityRef: string;
  observationWindow: Readonly<{
    start: string;
    end: string;
  }>;
  collectionTimestamp: string | null;
  observationTimestampSource:
    | 'provider-observation-time'
    | 'unavailable';
  state: HistoricalSnapshotState;
  lineage: Readonly<{
    providerResponseRef: string | null;
    adapterVersion: string;
    evidenceRefs: readonly string[];
  }>;
  revision: Readonly<{
    previousSnapshotId: string | null;
    supersedesSnapshotId: string | null;
    revisionReason: string | null;
  }>;
  eligibility: Readonly<{
    usableForMethodologyValidation: boolean;
    usableForScoring: boolean;
  }>;
}>;

export function createHistoricalSnapshotManifest(
  input: SnsFandomHistoricalSnapshotManifest,
): SnsFandomHistoricalSnapshotManifest {
  return Object.freeze({
    ...input,
    contractVersion:
      SNS_FANDOM_HISTORICAL_SNAPSHOT_MANIFEST_VERSION,
    lineage: Object.freeze({
      ...input.lineage,
      evidenceRefs: Object.freeze([...input.lineage.evidenceRefs]),
    }),
    revision: Object.freeze({ ...input.revision }),
    eligibility: Object.freeze({ ...input.eligibility }),
  });
}

export function isHistoricalSnapshotEligible(
  manifest: SnsFandomHistoricalSnapshotManifest,
): boolean {
  if (manifest.state !== 'validated') return false;
  if (manifest.collectionTimestamp === null) return false;
  if (manifest.lineage.providerResponseRef === null) return false;
  if (manifest.lineage.evidenceRefs.length === 0) return false;
  return manifest.eligibility.usableForMethodologyValidation;
}
