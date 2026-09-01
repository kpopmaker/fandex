import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAlbumReviewedIdentityRegistry } from '../lib/server/ingestion/albumReviewedIdentityMappingPacket';
import {
  normalizeCircleReviewedSubsetDay,
  normalizeHanteoReviewedSubsetCurrentDay,
  summarizeReviewedSubsetObservations,
} from '../lib/server/ingestion/albumReviewedSubsetNormalizer';
import type { AlbumArtistUniverseSource } from '../lib/server/ingestion/albumLiveIdentityReconciliation';

const universe: readonly AlbumArtistUniverseSource[] = Object.freeze([
  Object.freeze({
    id: 'enhypen',
    nameKo: 'ENHYPEN',
    nameEn: 'ENHYPEN',
    profile: Object.freeze({
      aliases: Object.freeze(['ENHYPEN']),
      koreanAliases: Object.freeze([]),
      englishAliases: Object.freeze(['ENHYPEN']),
    }),
  }),
  Object.freeze({
    id: 'katseye',
    nameKo: 'KATSEYE',
    nameEn: 'KATSEYE',
    profile: Object.freeze({
      aliases: Object.freeze(['KATSEYE']),
      koreanAliases: Object.freeze([]),
      englishAliases: Object.freeze(['KATSEYE']),
    }),
  }),
  Object.freeze({
    id: 'straykids',
    nameKo: 'Stray Kids',
    nameEn: 'Stray Kids',
    profile: Object.freeze({
      aliases: Object.freeze(['Stray Kids', '스트레이 키즈']),
      koreanAliases: Object.freeze(['스트레이 키즈']),
      englishAliases: Object.freeze(['Stray Kids']),
    }),
  }),
]);

const registry = buildAlbumReviewedIdentityRegistry(universe);

function circleRaw(extraRow?: Readonly<Record<string, unknown>>) {
  return Object.freeze({
    FormToMap: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
    ResultStatus: 'OK',
    List: Object.freeze({
      0: Object.freeze({
        Album: 'THE SIN : BLISS',
        Artist: 'ENHYPEN',
        Barcode: '8809704435567',
        rowSum: '12345',
        KSum: '1',
        ESum: '2',
        RankInt: '1',
        RankOrder: '1',
        YYYYMMDD: '20260831',
      }),
      ...(extraRow ? { 1: extraRow } : {}),
    }),
  });
}

function hanteoRaw(extraRow?: Readonly<Record<string, unknown>>) {
  return Object.freeze({
    code: 100,
    message: 'SUCCESS',
    resultData: Object.freeze({
      resultDatetime: '2026.08.31',
      list: Object.freeze([
        Object.freeze({
          rank: 1,
          targetIdx: '900562419',
          targetName: 'THE SIN : BLISS',
          value: 999.5,
          detail: Object.freeze({
            salesVolume: 456,
            artistIdx: 53306,
            artistGlobalName: 'ENHYPEN',
            saleDate: 1788134400000,
          }),
          regDate: '2026-08-31T12:00:00Z',
        }),
        ...(extraRow ? [extraRow] : []),
      ]),
    }),
  });
}

test('Circle accepts reviewed observations while leaving identity-only rows pending', () => {
  const result = normalizeCircleReviewedSubsetDay({
    rawResponse: circleRaw(Object.freeze({
      Album: 'UNKNOWN ALBUM',
      Artist: 'UNKNOWN ARTIST',
      Barcode: '8800000000000',
      rowSum: '77',
      KSum: '0',
      ESum: '0',
      RankInt: '2',
      RankOrder: '2',
      YYYYMMDD: '20260831',
    })),
    yyyymmdd: '20260831',
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    endpointEvidenceIds: Object.freeze(['circle:endpoint:test']),
    quantityEvidenceIds: Object.freeze(['circle:rowSum:test']),
    registry,
  });

  assert.equal(result.status, 'accepted-reviewed-subset');
  assert.equal(result.sourceRowCount, 2);
  assert.equal(result.acceptedObservationCount, 1);
  assert.equal(result.identityPendingRowCount, 1);
  assert.equal(result.nonIdentityRejectedRowCount, 0);
  assert.equal(result.observations[0].fandexArtistId, 'enhypen');
  assert.equal(result.observations[0].fandexReleaseId, 'enhypen-the-sin-bliss');
  assert.equal(result.observations[0].syntheticFixture, false);
  assert.equal(summarizeReviewedSubsetObservations(result)[0].valueIsNonNegativeSafeInteger, true);
});

test('Circle still rejects provider-data defects instead of treating them as identity pending', () => {
  const result = normalizeCircleReviewedSubsetDay({
    rawResponse: circleRaw(Object.freeze({
      Album: 'BROKEN ALBUM',
      Artist: 'UNKNOWN ARTIST',
      Barcode: '8800000000001',
      KSum: '10',
      ESum: '20',
      RankInt: '2',
      YYYYMMDD: '20260831',
    })),
    yyyymmdd: '20260831',
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    endpointEvidenceIds: Object.freeze(['circle:endpoint:test']),
    quantityEvidenceIds: Object.freeze(['circle:rowSum:test']),
    registry,
  });

  assert.equal(result.status, 'rejected-provider-data');
  assert.equal(result.nonIdentityRejectedRowCount, 1);
});

test('Hanteo accepts reviewed observations while leaving identity-only rows pending', () => {
  const result = normalizeHanteoReviewedSubsetCurrentDay({
    rawResponse: hanteoRaw(Object.freeze({
      rank: 2,
      targetIdx: '999999',
      targetName: 'UNKNOWN ALBUM',
      value: 1,
      detail: Object.freeze({
        salesVolume: 12,
        artistIdx: 999,
        artistGlobalName: 'UNKNOWN ARTIST',
      }),
    })),
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    quantityEvidenceId: 'hanteo:salesVolume:test',
    registry,
  });

  assert.equal(result.status, 'accepted-reviewed-subset');
  assert.equal(result.sourceRowCount, 2);
  assert.equal(result.acceptedObservationCount, 1);
  assert.equal(result.identityPendingRowCount, 1);
  assert.equal(result.nonIdentityRejectedRowCount, 0);
  assert.equal(result.observations[0].fandexArtistId, 'enhypen');
  assert.equal(result.observations[0].fandexReleaseId, 'enhypen-the-sin-bliss');
  assert.equal(result.observations[0].syntheticFixture, false);
});

test('Hanteo still rejects missing salesVolume as provider-data failure', () => {
  const result = normalizeHanteoReviewedSubsetCurrentDay({
    rawResponse: hanteoRaw(Object.freeze({
      rank: 2,
      targetIdx: '999999',
      targetName: 'BROKEN ALBUM',
      value: 1206155.8,
      detail: Object.freeze({
        artistIdx: 999,
        artistGlobalName: 'UNKNOWN ARTIST',
      }),
    })),
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    quantityEvidenceId: 'hanteo:salesVolume:test',
    registry,
  });

  assert.equal(result.status, 'rejected-provider-data');
  assert.equal(result.nonIdentityRejectedRowCount, 1);
});
