import {
  buildHanteoAlbumWeeklySchemaProbePlan,
  executeHanteoAlbumWeeklySchemaProbe,
  type HanteoAlbumResearchTransport,
} from '../../lib/alternative-evidence/hanteoAlbumSalesProviderResearch';

let safeProviderMetadata: Readonly<{
  code: string | number | null;
  message: string | null;
  resultDataType: string;
  resultDataKeys: readonly string[];
}> = Object.freeze({ code: null, message: null, resultDataType: 'unobserved', resultDataKeys: Object.freeze([]) });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const transport: HanteoAlbumResearchTransport = {
  async execute(plan) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(plan.url, {
        method: plan.method,
        headers: plan.headers,
        signal: controller.signal,
        redirect: 'follow',
      });
      let body: unknown = null;
      if (response.status >= 200 && response.status < 300) {
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().includes('application/json')) {
          body = `non-json:${contentType}`;
        } else {
          body = await response.json();
          if (isRecord(body)) {
            const providerCode = typeof body.code === 'string' || typeof body.code === 'number' ? body.code : null;
            const providerMessage = typeof body.message === 'string' ? body.message : null;
            const resultData = body.resultData;
            const resultDataType = Array.isArray(resultData)
              ? 'array'
              : resultData === null
                ? 'null'
                : typeof resultData;
            const resultDataKeys = isRecord(resultData) ? Object.keys(resultData).sort() : [];
            safeProviderMetadata = Object.freeze({
              code: providerCode,
              message: providerMessage,
              resultDataType,
              resultDataKeys: Object.freeze(resultDataKeys),
            });
          }
        }
      }
      return Object.freeze({ status: response.status, body });
    } finally {
      clearTimeout(timeout);
    }
  },
};

const plan = buildHanteoAlbumWeeklySchemaProbePlan();
const result = await executeHanteoAlbumWeeklySchemaProbe(transport);

console.log(JSON.stringify({
  contractVersion: result.contractVersion,
  endpointHost: new URL(plan.url).host,
  state: result.state,
  httpStatus: result.httpStatus,
  attemptedRequests: result.attemptedRequests,
  retryPerformed: result.retryPerformed,
  providerObservationPublished: result.providerObservationPublished,
  productContributionPublished: result.productContributionPublished,
  databaseWrites: result.databaseWrites,
  rawPayloadRetained: result.rawPayloadRetained,
  safeProviderMetadata,
  schema: result.schema,
  errorClass: result.errorClass,
}, null, 2));
