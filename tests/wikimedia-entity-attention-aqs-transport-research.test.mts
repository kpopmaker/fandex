import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateWikimediaEntityAttentionAqsTransportResearch,
  WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION,
} from '../lib/alternative-evidence/wikimediaEntityAttentionAqsTransportResearch';

const day = '2026-09-23';
const target = '2026092300';
const titles = [
  'IU (entertainer)',
  'IU (singer)',
  'IU (actor)',
] as const;

test('loaded project day plus explicit canonical row permits omitted redirect row to resolve as zero', () => {
  const result = evaluateWikimediaEntityAttentionAqsTransportResearch({
    observationDay: day,
    canonicalTitle: 'IU (entertainer)',
    eligibleTitles: titles,
    aggregate: {
      httpStatus: 200,
      items: [{ timestamp: target, views: 208368752 }],
    },
    titleResponses: [
      {
        title: 'IU (entertainer)',
        httpStatus: 200,
        items: [{ timestamp: target, views: 1982 }],
      },
      {
        title: 'IU (singer)',
        httpStatus: 200,
        items: [],
      },
      {
        title: 'IU (actor)',
        httpStatus: 200,
        items: [{ timestamp: target, views: 0 }],
      },
    ],
  });

  assert.equal(
    result.contractVersion,
    WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION,
  );
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;

  assert.equal(result.lifecycle, 'research');
  assert.equal(result.directProductContributionEligible, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.unit, 'pageviews');
  assert.equal(result.value, 1982);
  assert.deepEqual(result.perTitleViews, [
    {
      title: 'IU (entertainer)',
      views: 1982,
      derivation: 'explicit-provider-row',
    },
    {
      title: 'IU (singer)',
      views: 0,
      derivation: 'loaded-day-zero-omission',
    },
    {
      title: 'IU (actor)',
      views: 0,
      derivation: 'explicit-provider-row',
    },
  ]);
  assert.deepEqual(result.loadProof, {
    aggregateTargetDayPresent: true,
    canonicalTargetDayPresent: true,
  });
});

test('redirect 404 becomes zero only after target project and canonical day are proven loaded', () => {
  const result = evaluateWikimediaEntityAttentionAqsTransportResearch({
    observationDay: day,
    canonicalTitle: 'IU (entertainer)',
    eligibleTitles: titles,
    aggregate: {
      httpStatus: 200,
      items: [{ timestamp: target, views: 208368752 }],
    },
    titleResponses: [
      {
        title: 'IU (entertainer)',
        httpStatus: 200,
        items: [{ timestamp: target, views: 1982 }],
      },
      {
        title: 'IU (singer)',
        httpStatus: 404,
        items: [],
      },
      {
        title: 'IU (actor)',
        httpStatus: 404,
        items: [],
      },
    ],
  });

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.value, 1982);
  assert.equal(
    result.perTitleViews.every(
      (row) =>
        row.title === 'IU (entertainer)'
        || row.derivation === 'loaded-day-zero-omission',
    ),
    true,
  );
});

test('aggregate gap blocks zero inference for the entire entity', () => {
  const result = evaluateWikimediaEntityAttentionAqsTransportResearch({
    observationDay: day,
    canonicalTitle: 'IU (entertainer)',
    eligibleTitles: titles,
    aggregate: {
      httpStatus: 200,
      items: [{ timestamp: '2026092200', views: 210204003 }],
    },
    titleResponses: [
      {
        title: 'IU (entertainer)',
        httpStatus: 200,
        items: [{ timestamp: target, views: 1982 }],
      },
      {
        title: 'IU (singer)',
        httpStatus: 404,
        items: [],
      },
      {
        title: 'IU (actor)',
        httpStatus: 404,
        items: [],
      },
    ],
  });

  assert.deepEqual(result, {
    contractVersion:
      WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    status: 'unavailable',
    reason: 'project-day-not-proven-loaded',
    value: null,
    unit: 'pageviews',
  });
});

test('canonical per-article gap blocks loaded-day zero inference even when aggregate is loaded', () => {
  const result = evaluateWikimediaEntityAttentionAqsTransportResearch({
    observationDay: day,
    canonicalTitle: 'IU (entertainer)',
    eligibleTitles: titles,
    aggregate: {
      httpStatus: 200,
      items: [{ timestamp: target, views: 208368752 }],
    },
    titleResponses: [
      {
        title: 'IU (entertainer)',
        httpStatus: 200,
        items: [],
      },
      {
        title: 'IU (singer)',
        httpStatus: 404,
        items: [],
      },
      {
        title: 'IU (actor)',
        httpStatus: 404,
        items: [],
      },
    ],
  });

  assert.equal(result.status, 'unavailable');
  if (result.status !== 'unavailable') return;
  assert.equal(result.reason, 'per-article-day-not-proven-loaded');
});

test('429 and 5xx fail closed rather than becoming zero', () => {
  for (const httpStatus of [429, 500, 503]) {
    const result = evaluateWikimediaEntityAttentionAqsTransportResearch({
      observationDay: day,
      canonicalTitle: 'IU (entertainer)',
      eligibleTitles: titles,
      aggregate: {
        httpStatus: 200,
        items: [{ timestamp: target, views: 208368752 }],
      },
      titleResponses: [
        {
          title: 'IU (entertainer)',
          httpStatus: 200,
          items: [{ timestamp: target, views: 1982 }],
        },
        {
          title: 'IU (singer)',
          httpStatus,
          items: [],
        },
        {
          title: 'IU (actor)',
          httpStatus: 200,
          items: [{ timestamp: target, views: 0 }],
        },
      ],
    });

    assert.equal(result.status, 'unavailable');
    if (result.status === 'unavailable') {
      assert.equal(result.reason, 'transport-error');
    }
  }
});

test('invalid or duplicate response rows fail closed', () => {
  const duplicate = evaluateWikimediaEntityAttentionAqsTransportResearch({
    observationDay: day,
    canonicalTitle: 'IU (entertainer)',
    eligibleTitles: titles,
    aggregate: {
      httpStatus: 200,
      items: [{ timestamp: target, views: 208368752 }],
    },
    titleResponses: [
      {
        title: 'IU (entertainer)',
        httpStatus: 200,
        items: [
          { timestamp: target, views: 1982 },
          { timestamp: target, views: 1982 },
        ],
      },
      {
        title: 'IU (singer)',
        httpStatus: 404,
        items: [],
      },
      {
        title: 'IU (actor)',
        httpStatus: 404,
        items: [],
      },
    ],
  });

  assert.equal(duplicate.status, 'data-issue');
  if (duplicate.status === 'data-issue') {
    assert.equal(duplicate.reason, 'invalid-title-response');
  }
});
