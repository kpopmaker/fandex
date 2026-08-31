export const CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION = 'circle-retail-operational-v1' as const;

export type CircleRetailOperationalResultClass =
  | 'published-chart'
  | 'provider-period-error'
  | 'empty-ok-response'
  | 'http-error'
  | 'schema-invalid';

export type CircleRetailPublishedChartCompleteness =
  | 'published-ui-top50-complete'
  | 'unknown';

export type CircleRetailOperationalAssessment = Readonly<{
  contractVersion: typeof CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION;
  resultClass: CircleRetailOperationalResultClass;
  providerStatus: string | null;
  rowCount: number | null;
  causeSpecificity: 'specific' | 'collapsed-provider-error' | 'unknown';
  completeness: CircleRetailPublishedChartCompleteness;
}>;

export const CIRCLE_RETAIL_OPERATIONAL_EVIDENCE = Object.freeze({
  probeRunIds: Object.freeze(['33415501169', '33415588079']),
  knownPublishedPeriod: '20260529',
  publishedUiRowCount: 50,
  publishedUiRankStart: 1,
  publishedUiRankEnd: 50,
  uiRendersEveryReturnedRow: true,
  uiPaginationParametersObserved: false,
  strictCookieRequirementObserved: false,
  strictRefererRequirementObserved: false,
  invalidFutureAndPrelaunchShareProviderErrorShape: true,
  marketUniverseCompletenessClaimed: false,
} as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numericObjectRows(value: unknown): readonly Record<string, unknown>[] | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0) return Object.freeze([]);
  if (!entries.every(([key, child]) => /^\d+$/.test(key) && isRecord(child))) return null;
  return Object.freeze(
    entries
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, child]) => child as Record<string, unknown>),
  );
}

function integerString(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function assessCircleRetailPublishedChartCompleteness(
  rawResponse: unknown,
): CircleRetailPublishedChartCompleteness {
  if (!isRecord(rawResponse) || rawResponse.ResultStatus !== 'OK') return 'unknown';
  const rows = numericObjectRows(rawResponse.List);
  if (!rows || rows.length !== CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.publishedUiRowCount) return 'unknown';

  const ranks = rows.map((row) => integerString(row.RankInt ?? row.RankOrder));
  if (ranks.some((rank) => rank === null)) return 'unknown';
  const expected = Array.from({ length: 50 }, (_, index) => index + 1);
  if (!expected.every((rank, index) => ranks[index] === rank)) return 'unknown';
  if (!CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.uiRendersEveryReturnedRow) return 'unknown';
  if (CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.uiPaginationParametersObserved) return 'unknown';
  return 'published-ui-top50-complete';
}

export function classifyCircleRetailOperationalResponse(input: Readonly<{
  status: number | null;
  rawResponse: unknown;
}>): CircleRetailOperationalAssessment {
  const status = input.status;
  if (status === null || status < 200 || status >= 300) {
    return Object.freeze({
      contractVersion: CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION,
      resultClass: 'http-error',
      providerStatus: null,
      rowCount: null,
      causeSpecificity: 'specific',
      completeness: 'unknown',
    });
  }
  if (!isRecord(input.rawResponse)) {
    return Object.freeze({
      contractVersion: CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION,
      resultClass: 'schema-invalid',
      providerStatus: null,
      rowCount: null,
      causeSpecificity: 'unknown',
      completeness: 'unknown',
    });
  }

  const providerStatus = typeof input.rawResponse.ResultStatus === 'string'
    ? input.rawResponse.ResultStatus
    : null;

  if (providerStatus === 'Error' && !('List' in input.rawResponse)) {
    return Object.freeze({
      contractVersion: CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION,
      resultClass: 'provider-period-error',
      providerStatus,
      rowCount: 0,
      causeSpecificity: 'collapsed-provider-error',
      completeness: 'unknown',
    });
  }

  if (providerStatus === 'OK') {
    const rows = numericObjectRows(input.rawResponse.List);
    if (rows === null) {
      return Object.freeze({
        contractVersion: CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION,
        resultClass: 'schema-invalid',
        providerStatus,
        rowCount: null,
        causeSpecificity: 'unknown',
        completeness: 'unknown',
      });
    }
    if (rows.length === 0) {
      return Object.freeze({
        contractVersion: CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION,
        resultClass: 'empty-ok-response',
        providerStatus,
        rowCount: 0,
        causeSpecificity: 'specific',
        completeness: 'unknown',
      });
    }
    return Object.freeze({
      contractVersion: CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION,
      resultClass: 'published-chart',
      providerStatus,
      rowCount: rows.length,
      causeSpecificity: 'specific',
      completeness: assessCircleRetailPublishedChartCompleteness(input.rawResponse),
    });
  }

  return Object.freeze({
    contractVersion: CIRCLE_RETAIL_OPERATIONAL_CONTRACT_VERSION,
    resultClass: 'schema-invalid',
    providerStatus,
    rowCount: null,
    causeSpecificity: 'unknown',
    completeness: 'unknown',
  });
}
