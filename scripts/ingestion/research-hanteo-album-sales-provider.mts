import {
  buildHanteoAlbumWeeklySchemaProbePlan,
  executeHanteoAlbumWeeklySchemaProbe,
  type HanteoAlbumResearchTransport,
} from '../../lib/alternative-evidence/hanteoAlbumSalesProviderResearch';

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
  schema: result.schema,
  errorClass: result.errorClass,
}, null, 2));
