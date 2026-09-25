import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildProductActivityExposureReadModel,
} from '../lib/product/adapters/activityExposureProductReadModel';
import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProviderCoverage,
} from '../lib/product/contracts/productActivityExposure';

const iuMbid = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const collaboratorMbid = '11111111-1111-4111-8111-111111111111';
const youtubeChannelId = 'UC3SyT4_WLHzN7JmHQwKQZww';

const coverage: readonly ProductActivityExposureProviderCoverage[] = [
  {
    provider: 'musicbrainz',
    providerArtistId: iuMbid,
    collectionStatus: 'bounded_partial',
    coverageState: 'partial',
    collectedAt: '2026-09-23T14:32:09.915Z',
  },
  {
    provider: 'youtube',
    providerArtistId: youtubeChannelId,
    collectionStatus: 'credential_blocked',
    coverageState: 'provider_unavailable',
    collectedAt: null,
  },
];

const releaseEvent: ProductActivityExposureEvent = {
  artistId: 'iu',
  eventId: 'activity:musicbrainz:release-group:joint-release',
  eventFamily: 'release',
  eventType: 'confirmed_release',
  lifecycleState: 'observed',
  participationScope: 'collaboration',
  announcedAt: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  occurredAt: '2024-02-20',
  occurredAtPrecision: 'day',
  sourcePublishedAt: null,
  collectedAt: '2026-09-23T14:32:09.915Z',
  sourceProvider: 'musicbrainz',
  sourceEntityType: 'release-group',
  sourceEntityId: 'joint-release',
  canonicalFamilyId: 'joint-release',
  providerArtistId: iuMbid,
  providerArtistCredits: [
    {
      providerArtistId: iuMbid,
      creditedName: 'IU',
      canonicalProviderName: 'IU',
    },
    {
      providerArtistId: collaboratorMbid,
      creditedName: 'Collaborator',
      canonicalProviderName: 'Collaborator',
    },
  ],
  evidenceRef: 'musicbrainz:release-group:joint-release',
  identityState: 'resolved',
  missingState: 'partial',
  evidenceState: 'direct_provider_evidence_with_official_release_support',
  conflictState: 'clear',
  timeZoneState: 'provider_date',
  revisionId: 'r1',
  supersedesRevisionId: null,
};

const videoEvent: ProductActivityExposureEvent = {
  artistId: 'iu',
  eventId: 'activity:youtube:video:kHW-UVXOcLU',
  eventFamily: 'official_content',
  eventType: 'official_video_publication',
  lifecycleState: 'observed',
  participationScope: 'solo',
  announcedAt: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  occurredAt: '2024-02-20T09:00:00Z',
  occurredAtPrecision: 'timestamp',
  sourcePublishedAt: '2024-02-20T09:00:00Z',
  collectedAt: '2026-09-23T14:32:09.915Z',
  sourceProvider: 'youtube',
  sourceEntityType: 'video',
  sourceEntityId: 'kHW-UVXOcLU',
  canonicalFamilyId: null,
  providerArtistId: youtubeChannelId,
  providerArtistCredits: [
    {
      providerArtistId: youtubeChannelId,
      creditedName: '이지금 [IU Official]',
      canonicalProviderName: '이지금 [IU Official]',
    },
  ],
  evidenceRef: 'https://www.youtube.com/watch?v=kHW-UVXOcLU',
  identityState: 'resolved',
  missingState: 'covered',
  evidenceState: 'direct_provider_evidence',
  conflictState: 'clear',
  timeZoneState: 'provider_iso8601_timestamp',
  revisionId: 'r1',
  supersedesRevisionId: null,
};

test('Product Activity Exposure read model is an event stream, not a numeric fact', () => {
  const result = buildProductActivityExposureReadModel({
    artistId: 'iu',
    events: [releaseEvent],
    providerCoverage: coverage,
    publication: 'shadow',
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.construct, 'Activity Exposure Event Stream');
  assert.equal('fact' in result.model, false);
  assert.equal('score' in result.model, false);
  assert.equal('point' in result.model, false);
  assert.equal(result.model.publication, 'shadow');
  assert.equal(result.model.dataOrigin, 'observed');
});

test('same calendar date across release and official content stays as two events', () => {
  const result = buildProductActivityExposureReadModel({
    artistId: 'iu',
    events: [releaseEvent, videoEvent],
    providerCoverage: [
      coverage[0],
      {
        ...coverage[1],
        collectionStatus: 'succeeded',
        coverageState: 'covered',
        collectedAt: '2026-09-23T14:32:09.915Z',
      },
    ],
    publication: 'shadow',
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.model.events.length, 2);
  assert.deepEqual(
    new Set(result.model.events.map((event) => event.eventFamily)),
    new Set(['release', 'official_content']),
  );
});

test('provider coverage cannot be omitted and credential-blocked is not zero or inactive', () => {
  const result = buildProductActivityExposureReadModel({
    artistId: 'iu',
    events: [releaseEvent],
    providerCoverage: [coverage[0]],
    publication: 'shadow',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === 'missing-provider-coverage'
        && issue.provider === 'youtube',
    ),
  );

  assert.equal('value' in coverage[1], false);
  assert.equal('inactive' in coverage[1], false);
});

test('collaboration credits cannot be collapsed to IU-only', () => {
  const invalid = {
    ...releaseEvent,
    providerArtistCredits: [releaseEvent.providerArtistCredits[0]],
  } satisfies ProductActivityExposureEvent;

  const result = buildProductActivityExposureReadModel({
    artistId: 'iu',
    events: [invalid],
    providerCoverage: coverage,
    publication: 'shadow',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some((issue) => issue.code === 'collaboration-credit-loss'),
  );
});

test('missing/provider-unavailable occurrence cannot be relabeled as observed activity', () => {
  const invalid = {
    ...videoEvent,
    missingState: 'provider_unavailable',
  } satisfies ProductActivityExposureEvent;

  const result = buildProductActivityExposureReadModel({
    artistId: 'iu',
    events: [invalid],
    providerCoverage: [
      coverage[0],
      {
        ...coverage[1],
        collectionStatus: 'provider_unavailable',
        coverageState: 'provider_unavailable',
      },
    ],
    publication: 'shadow',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some((issue) => issue.code === 'invalid-missing-semantics'),
  );
});

test('Production Activity Exposure contract contains no numeric methodology surface', () => {
  const files = [
    '../lib/product/contracts/productActivityExposure.ts',
    '../lib/product/adapters/activityExposureProductReadModel.ts',
  ];

  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(
      source,
      /\b(?:comebackActivityPoint|ProductNumericFact|weightedScore|recencyWeight|activeWindowDays)\b/,
    );
  }
});
