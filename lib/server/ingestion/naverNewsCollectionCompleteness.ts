import type { NaverNewsIngestionWritePlan } from './naverNewsContracts';

export type NaverNewsCollectionCompletenessStatus =
  | 'complete'
  | 'truncated'
  | 'unknown';

export type NaverNewsCollectionCompletenessReason =
  | 'provider_total_covered_by_first_request'
  | 'provider_total_exceeds_received'
  | 'non_first_page_whole_coverage_unproven';

export type NaverNewsCollectionCompleteness = Readonly<{
  status: NaverNewsCollectionCompletenessStatus;
  reason: NaverNewsCollectionCompletenessReason;
}>;

export type NaverNewsCollectionCompletenessEvidence = Pick<
  NaverNewsIngestionWritePlan,
  'providerTotal' | 'counts' | 'identity'
>;

export function evaluateNaverNewsCollectionCompleteness(
  evidence: NaverNewsCollectionCompletenessEvidence,
): NaverNewsCollectionCompleteness {
  const { providerTotal, counts: { received }, identity: { request } } = evidence;

  if (!Number.isSafeInteger(providerTotal) || providerTotal < 0
      || !Number.isSafeInteger(received) || received < 0 || received > providerTotal
      || !Number.isSafeInteger(request.start) || request.start < 1 || request.start > 1_000
      || !Number.isSafeInteger(request.display) || request.display < 1 || request.display > 100
      || received > request.display) {
    throw new Error('naver_news_completeness_evidence_invalid');
  }

  if (request.start > 1) {
    if (providerTotal > received) {
      return Object.freeze({
        status: 'truncated',
        reason: 'provider_total_exceeds_received',
      });
    }

    return Object.freeze({
      status: 'unknown',
      reason: 'non_first_page_whole_coverage_unproven',
    });
  }

  if (providerTotal === received) {
    return Object.freeze({
      status: 'complete',
      reason: 'provider_total_covered_by_first_request',
    });
  }

  return Object.freeze({
    status: 'truncated',
    reason: 'provider_total_exceeds_received',
  });
}
