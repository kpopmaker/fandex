import type {
  ProductStoredEvidenceJobDataIssue,
  ProductStoredEvidenceJobReadModelResult,
  ProductStoredEvidenceWindowMembership,
} from '../contracts/productEvidence';
import type {
  ProductVariableReadModelResult,
  ProductVariableStoredEvidenceWindowTrace,
} from '../contracts/productVariable';
import type {
  NaverNewsCanonicalJobEvidenceAssembly,
} from '../../server/ingestion/naverNewsCanonicalJobEvidence';

export type ProductStoredEvidenceJobRuntime = Readonly<{
  readCanonicalJobEvidence: (input: Readonly<{
    canonicalArtistId: string;
    jobId: string;
  }>) => Promise<NaverNewsCanonicalJobEvidenceAssembly>;
}>;

export type ArtistProductStoredEvidenceJobInput = Readonly<{
  variableResult: ProductVariableReadModelResult;
  jobId: string;
}>;

function issue(
  code: ProductStoredEvidenceJobDataIssue['code'],
): ProductStoredEvidenceJobReadModelResult {
  return Object.freeze({
    status: 'data-issue' as const,
    issues: Object.freeze([
      Object.freeze({ code }),
    ]),
  });
}

function inspectWindow(
  window: ProductVariableStoredEvidenceWindowTrace,
  role: ProductStoredEvidenceWindowMembership['role'],
  jobId: string,
): Readonly<{
  slotStart: string;
  membership: ProductStoredEvidenceWindowMembership;
}> | null {
  const slot = window.slotEvidence.find((candidate) => candidate.jobId === jobId);
  if (!slot) return null;
  return Object.freeze({
    slotStart: slot.slotStart,
    membership: Object.freeze({
      role,
      startSlotStart: window.startSlotStart,
      endSlotStart: window.endSlotStart,
    }),
  });
}

export async function getArtistProductStoredEvidenceJob(
  input: ArtistProductStoredEvidenceJobInput,
  runtime: ProductStoredEvidenceJobRuntime,
): Promise<ProductStoredEvidenceJobReadModelResult> {
  if (input.variableResult.status !== 'ok') {
    return issue('variable-read-model-unavailable');
  }

  const variable = input.variableResult.model;
  const trace = variable.evidenceTrace;
  if (
    trace.kind !== 'naver-news-issue-point-stored-evidence'
    || variable.identity.sourceArtistId !== 'iu'
    || variable.identity.variableId !== 'newsIssuePoint'
    || variable.dataOrigin !== 'observed'
    || variable.publication !== 'shadow'
  ) {
    return issue('real-stored-evidence-trace-required');
  }

  const metadata = variable.sourceMetadata;
  if (
    metadata.sourceKind !== 'naver-news-issue-point-frozen-methodology'
    || metadata.sourceArtistId !== variable.identity.sourceArtistId
    || metadata.sourceVariableKey !== variable.identity.variableId
    || metadata.methodologyVersion !== trace.methodologyVersion
    || metadata.officialShadowEpoch !== trace.officialShadowEpoch
    || metadata.throughSlotStart !== trace.throughSlotStart
  ) {
    return issue('stored-evidence-trace-inconsistent');
  }

  const jobId = input.jobId.trim();
  if (!jobId || !trace.storedEvidenceJobIds.includes(jobId)) {
    return issue('job-not-in-variable-evidence-trace');
  }

  const hits: Readonly<{
    slotStart: string;
    membership: ProductStoredEvidenceWindowMembership;
  }>[] = [];

  if (trace.currentWindow !== null) {
    const current = inspectWindow(trace.currentWindow, 'current', jobId);
    if (current) hits.push(current);
  }

  for (const window of trace.eligiblePriorWindows) {
    const prior = inspectWindow(window, 'eligible-prior', jobId);
    if (prior) hits.push(prior);
  }

  if (hits.length === 0 || new Set(hits.map((hit) => hit.slotStart)).size !== 1) {
    return issue('stored-evidence-trace-inconsistent');
  }

  let evidence: NaverNewsCanonicalJobEvidenceAssembly;
  try {
    evidence = await runtime.readCanonicalJobEvidence({
      canonicalArtistId: variable.identity.sourceArtistId,
      jobId,
    });
  } catch {
    return issue('stored-evidence-read-failed');
  }

  if (
    evidence.canonicalArtistId !== variable.identity.sourceArtistId
    || evidence.jobId !== jobId
  ) {
    return issue('stored-evidence-source-mismatch');
  }

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      identity: Object.freeze({
        artistId: variable.identity.sourceArtistId,
        variableId: variable.identity.variableId,
        jobId,
      }),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      lineage: Object.freeze({
        methodologyVersion: trace.methodologyVersion,
        officialShadowEpoch: trace.officialShadowEpoch,
        throughSlotStart: trace.throughSlotStart,
        slotStart: hits[0].slotStart,
        windowMemberships: Object.freeze(
          hits.map((hit) => hit.membership),
        ),
      }),
      storedEvidence: Object.freeze({
        eligibleNormalizedRecordIds: Object.freeze([
          ...evidence.eligibleNormalizedRecordIds,
        ]),
        canonicalObservations: Object.freeze(
          evidence.observations.map((observation) => Object.freeze({
            observationId: observation.observationId,
            canonicalSourceUrl: observation.canonicalSourceUrl,
            observedAt: observation.observedAt,
            collectedAt: observation.collectedAt,
            title: observation.title,
            summary: observation.summary,
            sourceRecordIds: Object.freeze([...observation.sourceRecordIds]),
            rawEvidenceIds: Object.freeze([...observation.rawEvidenceIds]),
          })),
        ),
      }),
    }),
  });
}
