import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateWikimediaEntityAttentionResearch,
  WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION,
  type WikimediaEntityAttentionHour,
  type WikimediaEntityAttentionIdentitySnapshot,
} from '../lib/alternative-evidence/wikimediaEntityAttentionResearch';

const day = '2026-09-23';
const dayStart = '2026-09-23T00:00:00.000Z';
const dayEnd = '2026-09-24T00:00:00.000Z';

function identity(
  capturedAt: string,
  overrides: Partial<WikimediaEntityAttentionIdentitySnapshot> = {},
): WikimediaEntityAttentionIdentitySnapshot {
  return {
    canonicalArtistId: 'iu',
    wikidataQid: 'Q20145',
    project: 'en.wikipedia.org',
    capturedAt,
    canonicalPage: {
      pageId: 24385427,
      title: 'IU_(entertainer)',
    },
    redirects: [
      {
        pageId: 1001,
        title: 'IU_(singer)',
      },
      {
        pageId: 1002,
        title: 'Lee_Ji-eun_(singer)',
      },
    ],
    ...overrides,
  };
}

function hours(
  rowFactory: (hour: number) => WikimediaEntityAttentionHour['rows'] = () => [
    {
      domainCode: 'en',
      pageTitle: 'IU_(entertainer)',
      views: 10,
    },
    {
      domainCode: 'en.m',
      pageTitle: 'IU_(entertainer)',
      views: 5,
    },
    {
      domainCode: 'en',
      pageTitle: 'IU_(singer)',
      views: 2,
    },
  ],
): WikimediaEntityAttentionHour[] {
  const start = Date.parse(dayStart);
  return Array.from({ length: 24 }, (_, hour) => ({
    hourStart: new Date(start + hour * 60 * 60 * 1_000).toISOString(),
    completeness: 'complete' as const,
    rows: rowFactory(hour),
  }));
}

test('complete prospective identity-stable UTC day yields provider-native pageview total', () => {
  const result = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-22T23:55:00.000Z'),
    afterIdentity: identity('2026-09-24T00:05:00.000Z'),
    hours: hours(),
  });

  assert.equal(
    result.contractVersion,
    WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION,
  );
  assert.equal(result.lifecycle, 'research');
  assert.equal(result.directProductContributionEligible, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;

  assert.equal(result.canonicalArtistId, 'iu');
  assert.equal(result.wikidataQid, 'Q20145');
  assert.equal(result.project, 'en.wikipedia.org');
  assert.equal(result.sourceSemantics, 'wikimedia-public-pageviews-entity-daily');
  assert.equal(result.unit, 'pageviews');
  assert.deepEqual(result.observationTime, {
    kind: 'period',
    start: dayStart,
    end: dayEnd,
  });
  assert.equal(result.collectionTime, '2026-09-24T03:00:00.000Z');
  assert.equal(result.hourCount, 24);
  assert.equal(result.value, 24 * 17);
  assert.deepEqual(result.perTitleViews, [
    { title: 'IU_(entertainer)', views: 24 * 15 },
    { title: 'IU_(singer)', views: 24 * 2 },
    { title: 'Lee_Ji-eun_(singer)', views: 0 },
  ]);
});

test('absence from a verified complete dump hour is a valid zero, not missing', () => {
  const result = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-22T23:55:00.000Z'),
    afterIdentity: identity('2026-09-24T00:05:00.000Z'),
    hours: hours(() => []),
  });

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.value, 0);
  assert.deepEqual(
    result.perTitleViews.map((item) => item.views),
    [0, 0, 0],
  );
});

test('missing or invalid source hour never becomes zero or a scaled partial day', () => {
  const sourceHours = hours();
  sourceHours[7] = {
    ...sourceHours[7],
    completeness: 'missing',
    rows: [],
  };

  const result = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-22T23:55:00.000Z'),
    afterIdentity: identity('2026-09-24T00:05:00.000Z'),
    hours: sourceHours,
  });

  assert.deepEqual(result, {
    contractVersion: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    status: 'unavailable',
    reason: 'hour-source-incomplete',
    value: null,
    unit: 'pageviews',
  });
});

test('identity or redirect membership change during the observation fails closed', () => {
  const after = identity('2026-09-24T00:05:00.000Z', {
    redirects: [
      {
        pageId: 1001,
        title: 'IU_(singer)',
      },
    ],
  });

  const result = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-22T23:55:00.000Z'),
    afterIdentity: after,
    hours: hours(),
  });

  assert.equal(result.status, 'unavailable');
  if (result.status !== 'unavailable') return;
  assert.equal(result.reason, 'identity-changed-during-observation');
  assert.equal(result.value, null);
});

test('the exact 24 UTC hour set is mandatory', () => {
  const result = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-22T23:55:00.000Z'),
    afterIdentity: identity('2026-09-24T00:05:00.000Z'),
    hours: hours().slice(0, 23),
  });

  assert.equal(result.status, 'unavailable');
  if (result.status !== 'unavailable') return;
  assert.equal(result.reason, 'hour-set-incomplete');
});

test('snapshot timing must prove prospective membership rather than retrospective aliasing', () => {
  const result = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-23T00:01:00.000Z'),
    afterIdentity: identity('2026-09-24T00:05:00.000Z'),
    hours: hours(),
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'identity-snapshot-timing-invalid');
});

test('duplicate domain/title rows and foreign titles fail closed', () => {
  const duplicate = hours();
  duplicate[0] = {
    ...duplicate[0],
    rows: [
      {
        domainCode: 'en',
        pageTitle: 'IU_(entertainer)',
        views: 1,
      },
      {
        domainCode: 'en',
        pageTitle: 'IU_(entertainer)',
        views: 2,
      },
    ],
  };

  const duplicateResult = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-22T23:55:00.000Z'),
    afterIdentity: identity('2026-09-24T00:05:00.000Z'),
    hours: duplicate,
  });

  assert.equal(duplicateResult.status, 'data-issue');
  if (duplicateResult.status === 'data-issue') {
    assert.equal(duplicateResult.reason, 'dump-row-contract-invalid');
  }

  const foreign = hours();
  foreign[0] = {
    ...foreign[0],
    rows: [
      {
        domainCode: 'en',
        pageTitle: 'Unrelated_page',
        views: 1,
      },
    ],
  };

  const foreignResult = evaluateWikimediaEntityAttentionResearch({
    observationDay: day,
    collectionTime: '2026-09-24T03:00:00.000Z',
    beforeIdentity: identity('2026-09-22T23:55:00.000Z'),
    afterIdentity: identity('2026-09-24T00:05:00.000Z'),
    hours: foreign,
  });

  assert.equal(foreignResult.status, 'data-issue');
  if (foreignResult.status === 'data-issue') {
    assert.equal(foreignResult.reason, 'dump-row-contract-invalid');
  }
});

test('research contract has no Product, database, scheduler, score, or network side effect path', async () => {
  const source = await readFile(
    new URL(
      '../lib/alternative-evidence/wikimediaEntityAttentionResearch.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /productVariable/i);
  assert.doesNotMatch(source, /metricScoringPipeline/i);
  assert.doesNotMatch(source, /getRuntimeDatabasePool/);
  assert.doesNotMatch(source, /scheduler/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i,
  );
});
