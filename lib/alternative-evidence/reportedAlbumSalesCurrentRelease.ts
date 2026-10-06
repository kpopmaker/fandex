import type {
  ReportedAlbumSalesImmutableEvidenceEnvelope,
} from './reportedAlbumSalesImmutableEvidenceRecord';

export const REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION =
  'reported-album-sales-current-release-v1' as const;

export type ReportedAlbumSalesCurrentReleaseDiscovery = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION;
  canonicalArtistId: string;
  canonicalReleaseId: string | null;
  releaseTitle: string | null;
  releaseDate: string | null;
  identityState: 'resolved' | 'candidate' | 'unknown' | 'conflicting';
  latestReleaseState:
    | 'verified-latest'
    | 'candidate-latest'
    | 'unknown'
    | 'conflicting';
  firstWeekCompletionState: 'completed' | 'incomplete' | 'unknown';
  providerPeriodStart: string | null;
  providerPeriodEnd: string | null;
  evidenceRefs: readonly string[];
  observedAt: string | null;
  collectedAt: string;
}>;

export type ReportedAlbumSalesCurrentReleaseRead =
  | Readonly<{
      status: 'available';
      contractVersion:
        typeof REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION;
      canonicalArtistId: string;
      canonicalReleaseId: string;
      releaseTitle: string;
      releaseDate: string;
      metricSemantic: 'reported-hanteo-first-week-sales';
      value: number;
      unit: 'physical-copies';
      providerPeriodStart: string;
      providerPeriodEnd: string;
      observationId: string;
      observationScopeId: string;
      sourceCandidateDigest: string;
      evidenceRefs: readonly string[];
      freshnessState: 'verified-current-release';
      conflictState: 'clear';
      revisionState: 'original' | 'explicit-correction';
      lifecycle: 'production-candidate';
      numericScoreDefined: false;
    }>
  | Readonly<{
      status: 'pending';
      contractVersion:
        typeof REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION;
      canonicalArtistId: string;
      canonicalReleaseId: string;
      releaseTitle: string;
      reason:
        | 'first-week-incomplete'
        | 'completed-first-week-evidence-not-yet-stored';
      freshnessState: 'verified-current-release-pending';
      value: null;
      unit: null;
      missingIsZero: false;
      missingIsStable: false;
    }>
  | Readonly<{
      status: 'unavailable';
      contractVersion:
        typeof REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION;
      canonicalArtistId: string;
      reason:
        | 'latest-release-not-verified'
        | 'latest-release-identity-not-resolved'
        | 'first-week-completion-unknown';
      freshnessState: 'unknown';
      value: null;
      unit: null;
      missingIsZero: false;
      missingIsStable: false;
    }>
  | Readonly<{
      status: 'data-issue';
      contractVersion:
        typeof REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION;
      canonicalArtistId: string;
      reason:
        | 'discovery-contract-invalid'
        | 'latest-release-conflicting'
        | 'stored-evidence-artist-mismatch'
        | 'stored-evidence-release-conflict'
        | 'stored-evidence-duplicate-observation'
        | 'supersession-target-missing'
        | 'multiple-active-observations'
        | 'discovery-period-mismatch';
    }>;

function dataIssue(
  canonicalArtistId: string,
  reason: Extract<
    ReportedAlbumSalesCurrentReleaseRead,
    { status: 'data-issue' }
  >['reason'],
): ReportedAlbumSalesCurrentReleaseRead {
  return Object.freeze({
    status: 'data-issue' as const,
    contractVersion: REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
    canonicalArtistId,
    reason,
  });
}

function unavailable(
  canonicalArtistId: string,
  reason: Extract<
    ReportedAlbumSalesCurrentReleaseRead,
    { status: 'unavailable' }
  >['reason'],
): ReportedAlbumSalesCurrentReleaseRead {
  return Object.freeze({
    status: 'unavailable' as const,
    contractVersion: REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
    canonicalArtistId,
    reason,
    freshnessState: 'unknown' as const,
    value: null,
    unit: null,
    missingIsZero: false as const,
    missingIsStable: false as const,
  });
}

function validInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function validDate(value: string | null): boolean {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.filter(value => value.trim() !== ''))].sort(),
  );
}

export function selectReportedAlbumSalesCurrentRelease(
  input: Readonly<{
    discovery: ReportedAlbumSalesCurrentReleaseDiscovery;
    storedEvidence:
      readonly ReportedAlbumSalesImmutableEvidenceEnvelope[];
  }>,
): ReportedAlbumSalesCurrentReleaseRead {
  const discovery = input.discovery;
  const canonicalArtistId =
    discovery.canonicalArtistId.trim().toLowerCase();

  if (
    discovery.contractVersion
      !== REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION
    || canonicalArtistId === ''
    || discovery.canonicalArtistId !== canonicalArtistId
    || !validInstant(discovery.collectedAt)
    || (
      discovery.observedAt !== null
      && !validInstant(discovery.observedAt)
    )
  ) {
    return dataIssue(
      canonicalArtistId || discovery.canonicalArtistId,
      'discovery-contract-invalid',
    );
  }

  if (
    discovery.latestReleaseState === 'conflicting'
    || discovery.identityState === 'conflicting'
  ) {
    return dataIssue(
      canonicalArtistId,
      'latest-release-conflicting',
    );
  }

  if (discovery.latestReleaseState !== 'verified-latest') {
    return unavailable(
      canonicalArtistId,
      'latest-release-not-verified',
    );
  }

  if (
    discovery.identityState !== 'resolved'
    || discovery.canonicalReleaseId === null
    || discovery.canonicalReleaseId.trim() === ''
    || discovery.releaseTitle === null
    || discovery.releaseTitle.trim() === ''
    || !validDate(discovery.releaseDate)
    || discovery.evidenceRefs.length === 0
  ) {
    return unavailable(
      canonicalArtistId,
      'latest-release-identity-not-resolved',
    );
  }

  if (discovery.firstWeekCompletionState === 'unknown') {
    return unavailable(
      canonicalArtistId,
      'first-week-completion-unknown',
    );
  }

  const canonicalReleaseId = discovery.canonicalReleaseId;
  const releaseTitle = discovery.releaseTitle;

  if (discovery.firstWeekCompletionState === 'incomplete') {
    return Object.freeze({
      status: 'pending' as const,
      contractVersion: REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
      canonicalArtistId,
      canonicalReleaseId,
      releaseTitle,
      reason: 'first-week-incomplete' as const,
      freshnessState:
        'verified-current-release-pending' as const,
      value: null,
      unit: null,
      missingIsZero: false as const,
      missingIsStable: false as const,
    });
  }

  if (
    !validDate(discovery.providerPeriodStart)
    || !validDate(discovery.providerPeriodEnd)
  ) {
    return dataIssue(
      canonicalArtistId,
      'discovery-contract-invalid',
    );
  }

  const releaseEvidence = input.storedEvidence.filter(envelope => {
    if (envelope.canonicalArtistId !== canonicalArtistId) {
      return false;
    }
    return envelope.canonicalReleaseId === canonicalReleaseId;
  });

  if (
    input.storedEvidence.some(
      envelope =>
        envelope.canonicalReleaseId === canonicalReleaseId
        && envelope.canonicalArtistId !== canonicalArtistId,
    )
  ) {
    return dataIssue(
      canonicalArtistId,
      'stored-evidence-artist-mismatch',
    );
  }

  if (releaseEvidence.length === 0) {
    return Object.freeze({
      status: 'pending' as const,
      contractVersion: REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
      canonicalArtistId,
      canonicalReleaseId,
      releaseTitle,
      reason:
        'completed-first-week-evidence-not-yet-stored' as const,
      freshnessState:
        'verified-current-release-pending' as const,
      value: null,
      unit: null,
      missingIsZero: false as const,
      missingIsStable: false as const,
    });
  }

  const byObservationId = new Map<
    string,
    ReportedAlbumSalesImmutableEvidenceEnvelope
  >();
  for (const envelope of releaseEvidence) {
    if (byObservationId.has(envelope.observationId)) {
      return dataIssue(
        canonicalArtistId,
        'stored-evidence-duplicate-observation',
      );
    }
    byObservationId.set(envelope.observationId, envelope);
  }

  const superseded = new Set<string>();
  for (const envelope of releaseEvidence) {
    const candidate = envelope.sourceCandidate;
    if (candidate.conflictState !== 'clear') {
      return dataIssue(
        canonicalArtistId,
        'stored-evidence-release-conflict',
      );
    }
    if (candidate.supersedesObservationId !== null) {
      if (!byObservationId.has(candidate.supersedesObservationId)) {
        return dataIssue(
          canonicalArtistId,
          'supersession-target-missing',
        );
      }
      superseded.add(candidate.supersedesObservationId);
    }
  }

  const active = releaseEvidence.filter(
    envelope => !superseded.has(envelope.observationId),
  );
  if (active.length !== 1) {
    return dataIssue(
      canonicalArtistId,
      'multiple-active-observations',
    );
  }

  const selected = active[0];
  if (!selected) {
    return dataIssue(
      canonicalArtistId,
      'multiple-active-observations',
    );
  }
  const candidate = selected.sourceCandidate;

  if (
    candidate.providerPeriodStart
      !== discovery.providerPeriodStart
    || candidate.providerPeriodEnd
      !== discovery.providerPeriodEnd
  ) {
    return dataIssue(
      canonicalArtistId,
      'discovery-period-mismatch',
    );
  }

  if (
    candidate.value === null
    || candidate.unit !== 'physical-copies'
    || candidate.canonicalReleaseId === null
    || candidate.releaseDate === null
  ) {
    return dataIssue(
      canonicalArtistId,
      'stored-evidence-release-conflict',
    );
  }

  return Object.freeze({
    status: 'available' as const,
    contractVersion: REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
    canonicalArtistId,
    canonicalReleaseId: candidate.canonicalReleaseId,
    releaseTitle: candidate.releaseTitle,
    releaseDate: candidate.releaseDate,
    metricSemantic:
      'reported-hanteo-first-week-sales' as const,
    value: candidate.value,
    unit: candidate.unit,
    providerPeriodStart: candidate.providerPeriodStart as string,
    providerPeriodEnd: candidate.providerPeriodEnd as string,
    observationId: candidate.observationId,
    observationScopeId: candidate.observationScopeId,
    sourceCandidateDigest: selected.sourceCandidateDigest,
    evidenceRefs: orderedUnique([
      ...discovery.evidenceRefs,
      ...candidate.qualifyingEvidenceRefs,
    ]),
    freshnessState: 'verified-current-release' as const,
    conflictState: 'clear' as const,
    revisionState:
      candidate.revisionState === 'explicit-correction'
        ? 'explicit-correction' as const
        : 'original' as const,
    lifecycle: 'production-candidate' as const,
    numericScoreDefined: false as const,
  });
}
