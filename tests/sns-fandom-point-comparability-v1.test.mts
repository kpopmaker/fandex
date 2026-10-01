import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SNS_FANDOM_PROVIDER_QUALIFICATIONS,
  type SnsFandomObservation,
  type SnsFandomProviderQualification,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildSnsFandomComparability,
} from '../lib/intelligence/snsFandomPointComparability';

const PRODUCTION_QUALIFICATIONS: readonly SnsFandomProviderQualification[] =
  SNS_FANDOM_PROVIDER_QUALIFICATIONS.map((item) => (
    item.providerId === 'x-api'
      ? {
          ...item,
          state: 'production-ready' as const,
          blockers: [],
        }
      : item
  ));

function artistObservation(
  input: Readonly<{
    artistId: string;
    rawValue: number;
    observationId?: string;
    metricId?: string;
    providerContentId?: string | null;
    providerClientRef?: string;
    providerEndpoints?: readonly string[];
    dimension?:
      | 'public-reaction-diffusion'
      | 'fandom-activity-persistence';
    metricRole?: 'construct-evidence' | 'context-only';
    observedAt?: string;
    providerPeriodStart?: string | null;
    providerPeriodEnd?: string | null;
  }>,
): SnsFandomObservation {
  const observedAt = input.observedAt ?? '2026-10-01T00:00:00.000Z';

  return {
    contractVersion: 'fandex-observation-v1',
    observationId: input.observationId ?? [
      input.artistId,
      input.metricId ?? 'x.artist.reaction-count',
      observedAt,
    ].join(':'),
    providerId: 'x-api',
    entity: {
      entityType: 'artist',
      canonicalArtistId: input.artistId,
      providerArtistId: 'x-' + input.artistId,
      providerContentId: input.providerContentId ?? null,
      identityState: 'bound',
    },
    variable: {
      variableId: 'snsFandomPoint',
      metricFamily: 'sns-fandom',
      dimension: input.dimension ?? 'public-reaction-diffusion',
      metricId: input.metricId ?? 'x.artist.reaction-count',
      metricRole: input.metricRole ?? 'construct-evidence',
    },
    value: {
      rawValue: input.rawValue,
      unit: 'count',
      missingState: 'observed',
    },
    time: {
      providerPeriodStart: input.providerPeriodStart ?? null,
      providerPeriodEnd: input.providerPeriodEnd ?? null,
      observedAt,
      collectedAt: new Date(
        Date.parse(observedAt) + 60_000,
      ).toISOString(),
    },
    evidence: {
      evidenceRef: 'evidence://x/' + input.artistId,
      providerClientRef:
        input.providerClientRef ?? 'x-client:production-v1',
      providerEndpoints:
        input.providerEndpoints ?? ['x.analytics.read'],
      revision: null,
    },
    lifecycle: {
      state: 'research',
      materialClass: 'real',
      blockers: [],
    },
  };
}

test('two distinct artists with the same provider metric and exact point-in-time slice form a comparable cohort without normalization', () => {
  const result = buildSnsFandomComparability({
    observations: [
      artistObservation({ artistId: 'artist-a', rawValue: 10 }),
      artistObservation({ artistId: 'artist-b', rawValue: 20 }),
    ],
    providerQualifications: PRODUCTION_QUALIFICATIONS,
  });

  assert.equal(result.state, 'comparable-cohorts-ready');
  assert.equal(result.comparableCohortCount, 1);
  assert.equal(result.numericNormalizationReady, false);
  assert.equal(result.normalizedValuesProduced, false);
  assert.equal(result.crossPlatformRawAverageAllowed, false);

  const cohort = result.cohorts[0];
  assert.equal(cohort?.state, 'comparable');
  assert.equal(cohort?.temporalBasis, 'observation-time');
  assert.deepEqual(cohort?.canonicalArtistIds, ['artist-a', 'artist-b']);
  assert.equal(cohort?.normalizationMethod, null);
  assert.ok(cohort?.members.every((member) =>
    member.normalizedValue === null
  ));
});

test('content-level counters are excluded until an artist-level aggregation contract exists', () => {
  const result = buildSnsFandomComparability({
    observations: [
      artistObservation({
        artistId: 'artist-a',
        rawValue: 100,
        providerContentId: 'video-a',
      }),
      artistObservation({
        artistId: 'artist-b',
        rawValue: 200,
        providerContentId: 'video-b',
      }),
    ],
    providerQualifications: PRODUCTION_QUALIFICATIONS,
  });

  assert.equal(result.state, 'no-comparable-evidence');
  assert.equal(result.comparableCohortCount, 0);
  assert.equal(result.excludedObservationCount, 2);
  assert.ok(
    result.blockers.includes(
      'artist-level-content-aggregation-methodology-missing',
    ),
  );
});

test('different point-in-time timestamps never enter one comparison cohort', () => {
  const result = buildSnsFandomComparability({
    observations: [
      artistObservation({
        artistId: 'artist-a',
        rawValue: 10,
        observedAt: '2026-10-01T00:00:00.000Z',
      }),
      artistObservation({
        artistId: 'artist-b',
        rawValue: 20,
        observedAt: '2026-10-01T00:01:00.000Z',
      }),
    ],
    providerQualifications: PRODUCTION_QUALIFICATIONS,
  });

  assert.equal(result.state, 'cohort-insufficient');
  assert.equal(result.cohorts.length, 2);
  assert.equal(result.comparableCohortCount, 0);
  assert.ok(result.cohorts.every(
    (cohort) => cohort.state === 'single-artist-only',
  ));
});

test('period-backed evidence is comparable only for the exact same provider period', () => {
  const samePeriod = buildSnsFandomComparability({
    observations: [
      artistObservation({
        artistId: 'artist-a',
        rawValue: 10,
        dimension: 'fandom-activity-persistence',
        metricId: 'x.artist.persistence-count',
        providerPeriodStart: '2026-09-01T00:00:00.000Z',
        providerPeriodEnd: '2026-09-30T23:59:59.999Z',
        observedAt: '2026-10-01T00:00:00.000Z',
      }),
      artistObservation({
        artistId: 'artist-b',
        rawValue: 20,
        dimension: 'fandom-activity-persistence',
        metricId: 'x.artist.persistence-count',
        providerPeriodStart: '2026-09-01T00:00:00.000Z',
        providerPeriodEnd: '2026-09-30T23:59:59.999Z',
        observedAt: '2026-10-01T02:00:00.000Z',
      }),
    ],
    providerQualifications: PRODUCTION_QUALIFICATIONS,
  });

  assert.equal(samePeriod.state, 'comparable-cohorts-ready');
  assert.equal(samePeriod.cohorts[0]?.temporalBasis, 'provider-period');
  assert.equal(
    samePeriod.cohorts[0]?.providerPeriodStart,
    '2026-09-01T00:00:00.000Z',
  );
  assert.equal(
    samePeriod.cohorts[0]?.providerPeriodEnd,
    '2026-09-30T23:59:59.999Z',
  );

  const differentPeriods = buildSnsFandomComparability({
    observations: [
      artistObservation({
        artistId: 'artist-a',
        rawValue: 10,
        dimension: 'fandom-activity-persistence',
        metricId: 'x.artist.persistence-count',
        providerPeriodStart: '2026-09-01T00:00:00.000Z',
        providerPeriodEnd: '2026-09-15T23:59:59.999Z',
        observedAt: '2026-09-16T00:00:00.000Z',
      }),
      artistObservation({
        artistId: 'artist-b',
        rawValue: 20,
        dimension: 'fandom-activity-persistence',
        metricId: 'x.artist.persistence-count',
        providerPeriodStart: '2026-09-16T00:00:00.000Z',
        providerPeriodEnd: '2026-09-30T23:59:59.999Z',
        observedAt: '2026-10-01T00:00:00.000Z',
      }),
    ],
    providerQualifications: PRODUCTION_QUALIFICATIONS,
  });

  assert.equal(differentPeriods.state, 'cohort-insufficient');
  assert.equal(differentPeriods.comparableCohortCount, 0);
});

test('provider client or endpoint differences split cohorts even when metric and time match', () => {
  const result = buildSnsFandomComparability({
    observations: [
      artistObservation({
        artistId: 'artist-a',
        rawValue: 10,
        providerClientRef: 'x-client:a',
        providerEndpoints: ['x.analytics.read'],
      }),
      artistObservation({
        artistId: 'artist-b',
        rawValue: 20,
        providerClientRef: 'x-client:b',
        providerEndpoints: ['x.analytics.read'],
      }),
      artistObservation({
        artistId: 'artist-c',
        rawValue: 30,
        providerClientRef: 'x-client:a',
        providerEndpoints: ['x.other.read'],
      }),
    ],
    providerQualifications: PRODUCTION_QUALIFICATIONS,
  });

  assert.equal(result.state, 'cohort-insufficient');
  assert.equal(result.cohorts.length, 3);
  assert.equal(result.comparableCohortCount, 0);
});

test('context-only metrics never become normalization cohorts', () => {
  const result = buildSnsFandomComparability({
    observations: [
      artistObservation({
        artistId: 'artist-a',
        rawValue: 1000,
        metricRole: 'context-only',
        metricId: 'x.artist.follower-count',
      }),
      artistObservation({
        artistId: 'artist-b',
        rawValue: 2000,
        metricRole: 'context-only',
        metricId: 'x.artist.follower-count',
      }),
    ],
    providerQualifications: PRODUCTION_QUALIFICATIONS,
  });

  assert.equal(result.state, 'no-comparable-evidence');
  assert.equal(result.cohorts.length, 0);
  assert.equal(result.excludedObservationCount, 2);
});
