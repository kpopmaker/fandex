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
  buildAlbumReviewedIdentityRegistry,
  ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_VERSION,
} from '../../lib/server/ingestion/albumReviewedIdentityMappingPacket';
import {
  normalizeCircleReviewedSubsetDay,
  normalizeHanteoReviewedSubsetCurrentDay,
  summarizeReviewedSubsetObservations,
  type AlbumReviewedSubsetNormalizationResult,
} from '../../lib/server/ingestion/albumReviewedSubsetNormalizer';
import {
  createCircleRetailLiveIdentityResolver,
  createHanteoLiveIdentityResolver,
} from '../../lib/server/ingestion/albumLiveIdentityReconciliation';

const LIVE_VALIDATION_VERSION = 'album-reviewed-identity-live-validation-v1' as const;
const registry = buildAlbumReviewedIdentityRegistry(artistUniverseV4);
const now = Date.now();
const issuedAt = new Date(now - 30_000).toISOString();
const expiresAt = new Date(now + 10 * 60_000).toISOString();

let circleSubset: AlbumReviewedSubsetNormalizationResult | null = null;
let hanteoSubset: AlbumReviewedSubsetNormalizationResult | null = null;
const providerRequestCounts = { 'circle-retail': 0, hanteo: 0 };

const transport: AlbumOneShotNetworkTransport = Object.freeze({
  async send(request: AlbumOneShotTransportRequest): Promise<AlbumOneShotTransportResponse> {
    providerRequestCounts[request.provider] += 1;
    const response = await DEFAULT_ALBUM_ONE_SHOT_NETWORK_TRANSPORT.send(request);
    if (response.status >= 200 && response.status < 300) {
      const instant = new Date().toISOString();
      if (request.provider === 'circle-retail') {
        circleSubset = normalizeCircleReviewedSubsetDay({
          rawResponse: response.rawBody,
          yyyymmdd: '20260831',
          observedAt: instant,
          collectedAt: instant,
          endpointEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:retail-list']),
          quantityEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:rowSum-period-sales']),
          registry,
        });
      } else {
        hanteoSubset = normalizeHanteoReviewedSubsetCurrentDay({
          rawResponse: response.rawBody,
          observedAt: instant,
          collectedAt: instant,
          quantityEvidenceId: 'hanteo-direct-response-v1:current-day-week-month-salesVolume',
          registry,
        });
      }
    }
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
    authorizationEvidenceIds: Object.freeze([
      'album-reviewed-identity-live-validation-v1:explicit-bounded-run',
      'album-reviewed-identity-mapping-packet-v1:three-release-cohort',
    ]),
  });
  return runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: Object.freeze([Object.freeze({
      provider: 'circle-retail' as const,
      timeframe: 'day' as const,
      requestParams: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
      endpointEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:retail-list']),
      quantityEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:rowSum-period-sales']),
      resolveIdentity: createCircleRetailLiveIdentityResolver(registry),
    })]),
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
    authorizationEvidenceIds: Object.freeze([
      'album-reviewed-identity-live-validation-v1:explicit-bounded-run',
      'album-reviewed-identity-mapping-packet-v1:three-release-cohort',
    ]),
  });
  return runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: Object.freeze([Object.freeze({
      provider: 'hanteo' as const,
      timeframe: 'day' as const,
      limit: 20,
      quantityEvidenceId: 'hanteo-direct-response-v1:current-day-week-month-salesVolume',
      resolveIdentity: createHanteoLiveIdentityResolver(registry),
    })]),
    transport,
  });
}

function publicSubset(result: AlbumReviewedSubsetNormalizationResult | null) {
  if (!result) return null;
  return Object.freeze({
    contractVersion: result.contractVersion,
    provider: result.provider,
    status: result.status,
    sourceRowCount: result.sourceRowCount,
    acceptedObservationCount: result.acceptedObservationCount,
    identityPendingRowCount: result.identityPendingRowCount,
    nonIdentityRejectedRowCount: result.nonIdentityRejectedRowCount,
    sourcePayloadDigest: result.sourcePayloadDigest,
    resultDigest: result.resultDigest,
    observations: summarizeReviewedSubsetObservations(result),
  });
}

const circle = await runCircle();
await new Promise(resolve => setTimeout(resolve, 3000));
const hanteo = await runHanteo();

const output = Object.freeze({
  validationVersion: LIVE_VALIDATION_VERSION,
  mappingPacketVersion: ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_VERSION,
  rawBodiesPersisted: false,
  salesValuesPersisted: false,
  databaseReads: 0,
  databaseWrites: 0,
  scheduleMutations: 0,
  environmentMutations: 0,
  publicationAuthorized: false,
  commercialRightsCleared: false,
  providerRequestCounts,
  reviewedSubset: Object.freeze({
    circle: publicSubset(circleSubset),
    hanteo: publicSubset(hanteoSubset),
  }),
  legacyOneShotReports: Object.freeze({
    circle: Object.freeze({
      status: circle.report.status,
      haltReason: circle.report.haltReason,
      externalCalls: circle.report.effects.externalCalls,
    }),
    hanteo: Object.freeze({
      status: hanteo.report.status,
      haltReason: hanteo.report.haltReason,
      externalCalls: hanteo.report.effects.externalCalls,
    }),
  }),
});

console.log(JSON.stringify(output, null, 2));
