import { buildAlbumCollectorPlan } from '../../lib/server/ingestion/albumCollectorPlan';
import {
  createAlbumOneShotNetworkGrant,
  DEFAULT_ALBUM_ONE_SHOT_NETWORK_TRANSPORT,
  runAlbumOneShotNetworkResearch,
  type AlbumOneShotNetworkTransport,
  type AlbumOneShotTransportRequest,
  type AlbumOneShotTransportResponse,
} from '../../lib/server/ingestion/albumOneShotNetworkExecutor';
import { sha256Canonical } from '../../lib/shared/canonicalDigest';

const now = Date.now();
const issuedAt = new Date(now - 30_000).toISOString();
const expiresAt = new Date(now + 10 * 60_000).toISOString();

function summarize(provider: 'circle-retail' | 'hanteo', response: AlbumOneShotTransportResponse) {
  const raw = response.rawBody;
  const summary: Record<string, unknown> = {
    provider,
    httpStatus: response.status,
    bodyDigest: sha256Canonical(raw),
    contentType: response.headers['content-type'] ?? null,
  };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    summary.rootKeys = Object.keys(obj).sort();
    if (provider === 'circle-retail') {
      summary.providerStatus = obj.ResultStatus ?? null;
      const list = obj.List;
      const rows = list && typeof list === 'object' && !Array.isArray(list)
        ? Object.values(list as Record<string, unknown>)
        : [];
      summary.rowCount = rows.length;
      summary.quantityRows = rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row)
        && Object.prototype.hasOwnProperty.call(row, 'rowSum')).length;
      summary.sampleKeys = rows[0] && typeof rows[0] === 'object' && !Array.isArray(rows[0])
        ? Object.keys(rows[0] as Record<string, unknown>).sort()
        : [];
    } else {
      summary.providerCode = obj.code ?? null;
      const resultData = obj.resultData;
      const rows = resultData && typeof resultData === 'object' && !Array.isArray(resultData)
        && Array.isArray((resultData as Record<string, unknown>).list)
        ? ((resultData as Record<string, unknown>).list as unknown[])
        : [];
      summary.rowCount = rows.length;
      summary.quantityRows = rows.filter((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
        const detail = (row as Record<string, unknown>).detail;
        return !!detail && typeof detail === 'object' && !Array.isArray(detail)
          && Object.prototype.hasOwnProperty.call(detail, 'salesVolume');
      }).length;
      summary.sampleKeys = rows[0] && typeof rows[0] === 'object' && !Array.isArray(rows[0])
        ? Object.keys(rows[0] as Record<string, unknown>).sort()
        : [];
    }
  }
  return Object.freeze(summary);
}

const transportSummaries: unknown[] = [];
const recordingTransport: AlbumOneShotNetworkTransport = Object.freeze({
  async send(request: AlbumOneShotTransportRequest) {
    const response = await DEFAULT_ALBUM_ONE_SHOT_NETWORK_TRANSPORT.send(request);
    transportSummaries.push(summarize(request.provider, response));
    return response;
  },
});

const unresolvedIdentity = () => null;

async function runCircle() {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'primary',
    timeframe: 'day',
    periodMode: 'historical',
    providerPeriodKey: '20260831',
    at: new Date().toISOString(),
  });
  const grant = createAlbumOneShotNetworkGrant({
    plan,
    issuedAt,
    expiresAt,
    authorizationEvidenceIds: ['album-one-shot-live-qualification-v1:operator-explicit-run'],
  });
  return runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [Object.freeze({
      provider: 'circle-retail' as const,
      timeframe: 'day' as const,
      requestParams: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
      endpointEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:retail-list']),
      quantityEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:rowSum-period-sales']),
      resolveIdentity: unresolvedIdentity,
    })],
    transport: recordingTransport,
  });
}

async function runHanteo() {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'secondary',
    timeframe: 'day',
    periodMode: 'current',
    at: new Date().toISOString(),
  });
  const grant = createAlbumOneShotNetworkGrant({
    plan,
    issuedAt,
    expiresAt,
    authorizationEvidenceIds: ['album-one-shot-live-qualification-v1:operator-explicit-run'],
  });
  return runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [Object.freeze({
      provider: 'hanteo' as const,
      timeframe: 'day' as const,
      limit: 20,
      quantityEvidenceId: 'hanteo-direct-response-v1:current-day-week-month-salesVolume',
      resolveIdentity: unresolvedIdentity,
    })],
    transport: recordingTransport,
  });
}

const circle = await runCircle();
await new Promise((resolve) => setTimeout(resolve, 3000));
const hanteo = await runHanteo();

const output = Object.freeze({
  qualificationVersion: 'album-one-shot-live-qualification-v1',
  rawBodiesPersisted: false,
  databaseReads: 0,
  databaseWrites: 0,
  scheduleMutations: 0,
  publicationAuthorized: false,
  transportSummaries,
  orchestratorReports: [
    {
      provider: 'circle-retail',
      status: circle.report.status,
      haltReason: circle.report.haltReason,
      externalCalls: circle.report.effects.externalCalls,
      attempts: circle.report.attempts,
    },
    {
      provider: 'hanteo',
      status: hanteo.report.status,
      haltReason: hanteo.report.haltReason,
      externalCalls: hanteo.report.effects.externalCalls,
      attempts: hanteo.report.attempts,
    },
  ],
  interpretation: 'HTTP/schema/quantity qualification is evaluated from transportSummaries. Identity remains intentionally unresolved and must not be synthesized.',
});

console.log(JSON.stringify(output, null, 2));
