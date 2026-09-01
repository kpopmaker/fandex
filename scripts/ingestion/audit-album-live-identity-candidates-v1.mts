import { artistUniverseV4 } from '../../app/data/v4/artistUniverse';
import { buildAlbumCollectorPlan } from '../../lib/server/ingestion/albumCollectorPlan';
import {
  createAlbumOneShotNetworkGrant,
  DEFAULT_ALBUM_ONE_SHOT_NETWORK_TRANSPORT,
  runAlbumOneShotNetworkResearch,
  type AlbumOneShotNetworkTransport,
  type AlbumOneShotTransportRequest,
  type AlbumOneShotTransportResponse,
} from '../../lib/server/ingestion/albumOneShotNetworkExecutor';
import {
  buildAlbumArtistCatalogFromUniverse,
  createCircleRetailLiveIdentityResolver,
  createHanteoLiveIdentityResolver,
  reconcileAlbumLiveIdentity,
  type AlbumLiveIdentityRegistry,
} from '../../lib/server/ingestion/albumLiveIdentityReconciliation';

const now = Date.now();
const issuedAt = new Date(now - 30_000).toISOString();
const expiresAt = new Date(now + 10 * 60_000).toISOString();
const registry: AlbumLiveIdentityRegistry = Object.freeze({
  artists: buildAlbumArtistCatalogFromUniverse(artistUniverseV4),
  reviewedArtistMappings: Object.freeze([]),
  reviewedReleaseMappings: Object.freeze([]),
});

const candidateRows: Array<Record<string, unknown>> = [];
const counts: Record<string, Record<string, number>> = {
  'circle-retail': {},
  hanteo: {},
};

function recordStatus(provider: 'circle-retail' | 'hanteo', status: string) {
  counts[provider][status] = (counts[provider][status] ?? 0) + 1;
}

function auditCircle(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const list = (raw as Record<string, unknown>).List;
  if (!list || typeof list !== 'object' || Array.isArray(list)) return;
  for (const [key, value] of Object.entries(list as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const rawArtistText = typeof row.Artist === 'string' ? row.Artist : null;
    const rawReleaseText = typeof row.Album === 'string' ? row.Album : null;
    const providerSkuId = typeof row.Barcode === 'string' && row.Barcode.trim() ? row.Barcode : null;
    const result = reconcileAlbumLiveIdentity({
      provider: 'circle-retail',
      providerArtistId: null,
      providerReleaseId: null,
      providerSkuId,
      rawArtistText,
      rawReleaseText,
    }, registry);
    recordStatus('circle-retail', result.audit.status);
    candidateRows.push(Object.freeze({
      provider: 'circle-retail',
      row: Number(key),
      providerArtistId: null,
      providerReleaseId: null,
      providerSkuId,
      artist: rawArtistText,
      release: rawReleaseText,
      status: result.audit.status,
      artistCandidateIds: result.audit.artistCandidateIds,
    }));
  }
}

function auditHanteo(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const resultData = (raw as Record<string, unknown>).resultData;
  if (!resultData || typeof resultData !== 'object' || Array.isArray(resultData)) return;
  const list = (resultData as Record<string, unknown>).list;
  if (!Array.isArray(list)) return;
  list.forEach((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const row = value as Record<string, unknown>;
    const detail = row.detail && typeof row.detail === 'object' && !Array.isArray(row.detail)
      ? row.detail as Record<string, unknown>
      : {};
    const providerArtistId = detail.artistIdx === undefined || detail.artistIdx === null
      ? null
      : String(detail.artistIdx);
    const providerReleaseId = row.targetIdx === undefined || row.targetIdx === null
      ? null
      : String(row.targetIdx);
    const rawArtistText = typeof detail.artistGlobalName === 'string'
      ? detail.artistGlobalName
      : typeof detail.artistName === 'string' ? detail.artistName : null;
    const rawReleaseText = typeof row.targetName === 'string' ? row.targetName : null;
    const result = reconcileAlbumLiveIdentity({
      provider: 'hanteo',
      providerArtistId,
      providerReleaseId,
      providerSkuId: null,
      rawArtistText,
      rawReleaseText,
    }, registry);
    recordStatus('hanteo', result.audit.status);
    candidateRows.push(Object.freeze({
      provider: 'hanteo',
      row: index,
      providerArtistId,
      providerReleaseId,
      providerSkuId: null,
      artist: rawArtistText,
      release: rawReleaseText,
      status: result.audit.status,
      artistCandidateIds: result.audit.artistCandidateIds,
    }));
  });
}

const transport: AlbumOneShotNetworkTransport = Object.freeze({
  async send(request: AlbumOneShotTransportRequest): Promise<AlbumOneShotTransportResponse> {
    const response = await DEFAULT_ALBUM_ONE_SHOT_NETWORK_TRANSPORT.send(request);
    if (request.provider === 'circle-retail') auditCircle(response.rawBody);
    else auditHanteo(response.rawBody);
    return response;
  },
});

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
    authorizationEvidenceIds: ['album-live-identity-candidate-audit-v1:explicit-bounded-run'],
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
      resolveIdentity: createCircleRetailLiveIdentityResolver(registry),
    })],
    transport,
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
    authorizationEvidenceIds: ['album-live-identity-candidate-audit-v1:explicit-bounded-run'],
  });
  return runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [Object.freeze({
      provider: 'hanteo' as const,
      timeframe: 'day' as const,
      limit: 20,
      quantityEvidenceId: 'hanteo-direct-response-v1:current-day-week-month-salesVolume',
      resolveIdentity: createHanteoLiveIdentityResolver(registry),
    })],
    transport,
  });
}

const circle = await runCircle();
await new Promise(resolve => setTimeout(resolve, 3000));
const hanteo = await runHanteo();

const matched = candidateRows.filter(row => Array.isArray(row.artistCandidateIds) && row.artistCandidateIds.length > 0);
const output = Object.freeze({
  auditVersion: 'album-live-identity-candidate-audit-v1',
  rawBodiesPersisted: false,
  salesValuesPersisted: false,
  databaseReads: 0,
  databaseWrites: 0,
  scheduleMutations: 0,
  publicationAuthorized: false,
  artistCatalogSize: registry.artists.length,
  counts,
  totalRows: candidateRows.length,
  artistCandidateRows: matched.length,
  unresolvedRows: candidateRows.length - matched.length,
  candidateRows,
  orchestrator: Object.freeze({
    circle: Object.freeze({ status: circle.report.status, haltReason: circle.report.haltReason, externalCalls: circle.report.effects.externalCalls }),
    hanteo: Object.freeze({ status: hanteo.report.status, haltReason: hanteo.report.haltReason, externalCalls: hanteo.report.effects.externalCalls }),
  }),
});

console.log(JSON.stringify(output, null, 2));
