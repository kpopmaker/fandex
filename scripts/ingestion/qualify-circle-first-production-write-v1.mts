import { buildAlbumReviewedIdentityRegistry } from '../../lib/server/ingestion/albumReviewedIdentityMappingPacket';
import { normalizeCircleReviewedSubsetDay } from '../../lib/server/ingestion/albumReviewedSubsetNormalizer';

const EXPECTED_PAYLOAD_DIGEST = 'd21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236';
const EXPECTED_SUBSET_DIGEST = 'f0258a5a4a7990877d4c613d8c1e6301a521eb3f0e0acf706ef0f78fa2ba957b';
const EXPECTED_OBSERVATION_IDS = Object.freeze([
  '3f94e51454edbdff932cb9cbeba2697e141864dc7f99f46ce96e1a60b5de22dd',
  '5e907dc8f731b1d9895cf5f90ffb43acdc2282e0437aa4a8b55c60696eaebb95',
  'f18a8b5d1267b63bb7d4f020e18346d674365fe16f90ceb811448341abb771c9',
].sort());

const artists = Object.freeze([
  Object.freeze({ id: 'enhypen', nameKo: '엔하이픈', nameEn: 'ENHYPEN', profile: Object.freeze({ aliases: Object.freeze([]), koreanAliases: Object.freeze(['엔하이픈']), englishAliases: Object.freeze(['ENHYPEN']) }) }),
  Object.freeze({ id: 'katseye', nameKo: '캣츠아이', nameEn: 'KATSEYE', profile: Object.freeze({ aliases: Object.freeze([]), koreanAliases: Object.freeze(['캣츠아이']), englishAliases: Object.freeze(['KATSEYE']) }) }),
  Object.freeze({ id: 'straykids', nameKo: '스트레이 키즈', nameEn: 'Stray Kids', profile: Object.freeze({ aliases: Object.freeze([]), koreanAliases: Object.freeze(['스트레이 키즈']), englishAliases: Object.freeze(['Stray Kids']) }) }),
]);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
let response: Response;
try {
  response = await fetch('https://circlechart.kr/data/api/chart/retail_list', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({ termGbn: 'day', yyyymmdd: '20260831' }).toString(),
    redirect: 'error',
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeout);
}

if (response.status !== 200) throw new Error(`circle_first_write_http_status_${response.status}`);
const text = await response.text();
let rawResponse: unknown;
try { rawResponse = JSON.parse(text); } catch { throw new Error('circle_first_write_json_invalid'); }

const now = new Date().toISOString();
const result = normalizeCircleReviewedSubsetDay({
  rawResponse,
  yyyymmdd: '20260831',
  observedAt: now,
  collectedAt: now,
  endpointEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:retail-list-endpoint']),
  quantityEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:rowSum-period-sales']),
  registry: buildAlbumReviewedIdentityRegistry(artists),
});

const actualIds = [...result.observationIds].sort();
const exactIds = JSON.stringify(actualIds) === JSON.stringify(EXPECTED_OBSERVATION_IDS);
const exact = result.sourcePayloadDigest === EXPECTED_PAYLOAD_DIGEST
  && result.resultDigest === EXPECTED_SUBSET_DIGEST
  && result.status === 'accepted-reviewed-subset'
  && result.acceptedObservationCount === 3
  && result.identityPendingRowCount === 47
  && result.nonIdentityRejectedRowCount === 0
  && exactIds;

const safeOutput = {
  contractVersion: 'album-first-bounded-production-research-write-reacquisition-v1',
  httpStatus: response.status,
  sourcePayloadDigest: result.sourcePayloadDigest,
  reviewedSubsetResultDigest: result.resultDigest,
  status: result.status,
  sourceRowCount: result.sourceRowCount,
  acceptedObservationCount: result.acceptedObservationCount,
  identityPendingRowCount: result.identityPendingRowCount,
  nonIdentityRejectedRowCount: result.nonIdentityRejectedRowCount,
  observationIds: actualIds,
  exactMatch: exact,
  rawBodyPersisted: false,
  salesValuesEmitted: false,
  providerRequests: 1,
};
console.log(JSON.stringify(safeOutput, null, 2));
if (!exact) throw new Error('circle_first_write_exact_reacquisition_mismatch');
