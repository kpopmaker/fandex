export const SNS_FANDOM_OBSERVATION_REVISION_CONTRACT_VERSION =
  'sns-fandom-observation-revision-contract-v1' as const;

export type SnsFandomObservationRevisionEvent = Readonly<{
  revisionId: string;
  observationId: string;
  providerId: string;
  previousRevisionId: string | null;
  revisionType:
    | 'initial-capture'
    | 'provider-correction'
    | 'historical-backfill'
    | 'schema-migration'
    | 'evidence-replacement';
  observedAt: string;
  collectedAt: string;
  reason: string;
  evidenceRefs: readonly string[];
}>;

export type SnsFandomObservationRevisionDecision = Readonly<{
  accepted: boolean;
  usableForProduction: boolean;
  usableForMethodologyValidation: boolean;
  blockers: readonly string[];
}>;

function present(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

export function evaluateSnsFandomObservationRevision(
  event: SnsFandomObservationRevisionEvent,
): SnsFandomObservationRevisionDecision {
  const blockers: string[] = [];

  if (!present(event.revisionId)) {
    blockers.push('revision-id-missing');
  }
  if (!present(event.observationId)) {
    blockers.push('observation-id-missing');
  }
  if (!present(event.providerId)) {
    blockers.push('provider-id-missing');
  }
  if (!present(event.reason)) {
    blockers.push('revision-reason-missing');
  }
  if (event.evidenceRefs.length === 0) {
    blockers.push('revision-evidence-missing');
  }
  if (
    event.revisionType !== 'initial-capture'
    && event.previousRevisionId === null
  ) {
    blockers.push('non-initial-revision-parent-missing');
  }

  return Object.freeze({
    accepted: blockers.length === 0,
    usableForProduction: blockers.length === 0,
    usableForMethodologyValidation: blockers.length === 0,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}
