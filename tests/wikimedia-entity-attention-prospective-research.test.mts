import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureWikimediaEntityAttentionPreDayResearch,
  collectWikimediaEntityAttentionPostDayResearch,
  type WikimediaResearchFetch,
} from '../lib/alternative-evidence/wikimediaEntityAttentionProspectiveResearch';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function buildFetch(options: Readonly<{
  afterRedirects?: readonly Readonly<{ pageid: number; title: string }>[];
  targetDay?: string;
}> = {}): WikimediaResearchFetch {
  let enwikiCall = 0;
  const targetDay = options.targetDay ?? '2026092600';
  const redirects = [
    { pageid: 80155192, title: 'IU (singer)' },
    { pageid: 75634194, title: 'IU (actor)' },
  ];

  return async (input) => {
    const url = new URL(String(input));

    if (url.hostname === 'www.wikidata.org') {
      return jsonResponse({
        entities: {
          Q20145: {
            sitelinks: {
              enwiki: { title: 'IU (entertainer)' },
            },
          },
        },
      });
    }

    if (url.hostname === 'en.wikipedia.org') {
      enwikiCall += 1;
      const currentRedirects =
        enwikiCall === 1 ? redirects : (options.afterRedirects ?? redirects);
      return jsonResponse({
        query: {
          pages: [
            {
              pageid: 24385427,
              title: 'IU (entertainer)',
              pageprops: { wikibase_item: 'Q20145' },
              redirects: currentRedirects,
            },
          ],
        },
      });
    }

    if (
      url.hostname === 'wikimedia.org'
      && url.pathname.includes('/metrics/pageviews/aggregate/')
    ) {
      return jsonResponse({
        items: [{ timestamp: targetDay, views: 200000000 }],
      });
    }

    if (
      url.hostname === 'wikimedia.org'
      && url.pathname.includes('/metrics/pageviews/per-article/')
    ) {
      const decodedPath = decodeURIComponent(url.pathname);
      if (decodedPath.includes('/IU_(entertainer)/')) {
        return jsonResponse({
          items: [{ timestamp: targetDay, views: 2000 }],
        });
      }
      if (decodedPath.includes('/IU_(singer)/')) {
        return jsonResponse({
          items: [{ timestamp: targetDay, views: 40 }],
        });
      }
      if (decodedPath.includes('/IU_(actor)/')) {
        return jsonResponse({ items: [] });
      }
    }

    throw new Error('unexpected_test_url:' + url.toString());
  };
}

test('pre-day phase resolves QID -> enwiki identity and freezes redirect membership before UTC day start', async () => {
  const result = await captureWikimediaEntityAttentionPreDayResearch(
    '2026-09-26',
    {
      fetch: buildFetch(),
      now: () => new Date('2026-09-25T12:00:00.000Z'),
    },
  );

  assert.equal(result.lifecycle, 'research');
  assert.equal(result.directProductContributionEligible, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.phase, 'pre-day-identity-snapshot');
  assert.equal(result.observationDay, '2026-09-26');
  assert.deepEqual(result.observationTime, {
    kind: 'period',
    start: '2026-09-26T00:00:00.000Z',
    end: '2026-09-27T00:00:00.000Z',
  });
  assert.deepEqual(result.identity, {
    canonicalArtistId: 'iu',
    wikidataQid: 'Q20145',
    project: 'en.wikipedia.org',
    capturedAt: '2026-09-25T12:00:00.000Z',
    canonicalPage: {
      pageId: 24385427,
      title: 'IU (entertainer)',
    },
    redirects: [
      {
        pageId: 75634194,
        title: 'IU (actor)',
      },
      {
        pageId: 80155192,
        title: 'IU (singer)',
      },
    ],
  });
});

test('pre-day phase refuses a snapshot captured at or after observation start', async () => {
  await assert.rejects(
    () =>
      captureWikimediaEntityAttentionPreDayResearch('2026-09-26', {
        fetch: buildFetch(),
        now: () => new Date('2026-09-26T00:00:00.000Z'),
      }),
    /wikimedia_research_pre_day_snapshot_late/,
  );
});

test('post-day phase emits one bounded provider-native observation when identity and loaded-day transport both pass', async () => {
  const before = await captureWikimediaEntityAttentionPreDayResearch(
    '2026-09-26',
    {
      fetch: buildFetch(),
      now: () => new Date('2026-09-25T12:00:00.000Z'),
    },
  );

  const result = await collectWikimediaEntityAttentionPostDayResearch(
    {
      observationDay: '2026-09-26',
      beforeIdentity: before.identity,
    },
    {
      fetch: buildFetch(),
      now: () => new Date('2026-09-27T03:00:00.000Z'),
    },
  );

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;

  assert.equal(result.lifecycle, 'research');
  assert.equal(result.directProductContributionEligible, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.phase, 'post-day-observation');
  assert.equal(result.canonicalArtistId, 'iu');
  assert.equal(result.wikidataQid, 'Q20145');
  assert.equal(result.project, 'en.wikipedia.org');
  assert.equal(result.unit, 'pageviews');
  assert.equal(result.sourceSemantics, 'wikimedia-aqs-per-article-loaded-day');
  assert.equal(result.collectionTime, '2026-09-27T03:00:00.000Z');
  assert.equal(result.beforeIdentityCapturedAt, '2026-09-25T12:00:00.000Z');
  assert.equal(result.afterIdentityCapturedAt, '2026-09-27T03:00:00.000Z');
  assert.equal(result.value, 2040);
  assert.deepEqual(result.perTitleViews, [
    {
      title: 'IU (entertainer)',
      views: 2000,
      derivation: 'explicit-provider-row',
    },
    {
      title: 'IU (actor)',
      views: 0,
      derivation: 'loaded-day-zero-omission',
    },
    {
      title: 'IU (singer)',
      views: 40,
      derivation: 'explicit-provider-row',
    },
  ]);
  assert.deepEqual(result.loadProof, {
    aggregateTargetDayPresent: true,
    canonicalTargetDayPresent: true,
  });
});

test('post-day phase fails closed when redirect membership changes during the observed day', async () => {
  const fetch = buildFetch({
    afterRedirects: [{ pageid: 80155192, title: 'IU (singer)' }],
  });
  const before = await captureWikimediaEntityAttentionPreDayResearch(
    '2026-09-26',
    {
      fetch,
      now: () => new Date('2026-09-25T12:00:00.000Z'),
    },
  );

  const result = await collectWikimediaEntityAttentionPostDayResearch(
    {
      observationDay: '2026-09-26',
      beforeIdentity: before.identity,
    },
    {
      fetch,
      now: () => new Date('2026-09-27T03:00:00.000Z'),
    },
  );

  assert.deepEqual(result, {
    contractVersion: 'v1_wikimedia_entity_attention_prospective_research',
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    phase: 'post-day-observation',
    status: 'unavailable',
    reason: 'identity-changed-during-observation',
    value: null,
    unit: 'pageviews',
  });
});

test('post-day phase refuses collection before the UTC observation period ends', async () => {
  const before = await captureWikimediaEntityAttentionPreDayResearch(
    '2026-09-26',
    {
      fetch: buildFetch(),
      now: () => new Date('2026-09-25T12:00:00.000Z'),
    },
  );

  const result = await collectWikimediaEntityAttentionPostDayResearch(
    {
      observationDay: '2026-09-26',
      beforeIdentity: before.identity,
    },
    {
      fetch: buildFetch(),
      now: () => new Date('2026-09-26T23:59:59.999Z'),
    },
  );

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'snapshot-timing-invalid');
  assert.equal(result.value, null);
});
