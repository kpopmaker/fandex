import type { NaverNewsApiResponseDraft } from './naverNewsIssueSourceAdapter';

export type NaverNewsApiResponseFixture = {
  fixtureName: string;
  response: NaverNewsApiResponseDraft;
};

export const naverNewsFixtureFetchedAt = '2026-06-15T16:00:00.000Z';

export const validNaverNewsApiResponseFixture: NaverNewsApiResponseFixture = {
  fixtureName: 'validNaverNewsApiResponseFixture',
  response: {
    lastBuildDate: naverNewsFixtureFetchedAt,
    total: 2,
    start: 1,
    display: 2,
    items: [
      {
        title: 'MOCK K-pop artist schedule item for adapter shape check',
        originallink: 'https://example.com/naver-news-fixtures/valid-original-001',
        link: 'https://example.com/naver-news-fixtures/valid-proxy-001',
        description:
          'Fixture-only description for a local Naver News shape validation item.',
        pubDate: 'Mon, 15 Jun 2026 08:20:00 +0900',
      },
      {
        title: 'MOCK K-pop group event item with original link only',
        originallink: 'https://example.com/naver-news-fixtures/valid-original-002',
        description: 'Fixture-only item that keeps the Naver link field absent.',
        pubDate: 'Tue, 16 Jun 2026 10:30:00 +0900',
      },
    ],
  },
};

export const htmlHeavyNaverNewsApiResponseFixture: NaverNewsApiResponseFixture = {
  fixtureName: 'htmlHeavyNaverNewsApiResponseFixture',
  response: {
    lastBuildDate: naverNewsFixtureFetchedAt,
    total: 1,
    start: 1,
    display: 1,
    items: [
      {
        title:
          '<b>MOCK</b> K-pop &quot;adapter&quot; &amp; entity &#39;shape&#39; &lt;check&gt;',
        originallink: 'https://example.com/naver-news-fixtures/html-original-001',
        link: 'https://example.com/naver-news-fixtures/html-proxy-001',
        description:
          'Fixture <b>description</b> with &quot;quotes&quot;, &amp; ampersand, &#39;apostrophe&#39;, &lt;angle&gt; entities.',
        pubDate: 'Wed, 17 Jun 2026 09:15:00 +0900',
      },
    ],
  },
};

export const missingOriginalLinkNaverNewsApiResponseFixture: NaverNewsApiResponseFixture = {
  fixtureName: 'missingOriginalLinkNaverNewsApiResponseFixture',
  response: {
    lastBuildDate: naverNewsFixtureFetchedAt,
    total: 1,
    start: 1,
    display: 1,
    items: [
      {
        title: 'MOCK K-pop item with Naver proxy link fallback',
        link: 'https://example.com/naver-news-fixtures/proxy-only-001',
        description: 'Fixture-only item where originallink is absent.',
        pubDate: 'Thu, 18 Jun 2026 11:45:00 +0900',
      },
    ],
  },
};

export const missingBothLinksNaverNewsApiResponseFixture: NaverNewsApiResponseFixture = {
  fixtureName: 'missingBothLinksNaverNewsApiResponseFixture',
  response: {
    lastBuildDate: naverNewsFixtureFetchedAt,
    total: 1,
    start: 1,
    display: 1,
    items: [
      {
        title: 'MOCK K-pop item with example URL fallback',
        originallink: '',
        link: '',
        description: 'Fixture-only item where both URL fields are empty.',
        pubDate: 'Fri, 19 Jun 2026 13:00:00 +0900',
      },
    ],
  },
};

export const invalidPubDateNaverNewsApiResponseFixture: NaverNewsApiResponseFixture = {
  fixtureName: 'invalidPubDateNaverNewsApiResponseFixture',
  response: {
    lastBuildDate: naverNewsFixtureFetchedAt,
    total: 3,
    start: 1,
    display: 3,
    items: [
      {
        title: 'MOCK K-pop item with invalid pubDate text',
        originallink: 'https://example.com/naver-news-fixtures/invalid-date-001',
        link: 'https://example.com/naver-news-fixtures/invalid-date-proxy-001',
        description: 'Fixture-only item with an invalid pubDate string.',
        pubDate: 'not a date',
      },
      {
        title: 'MOCK K-pop item with empty pubDate',
        originallink: 'https://example.com/naver-news-fixtures/invalid-date-002',
        link: 'https://example.com/naver-news-fixtures/invalid-date-proxy-002',
        description: 'Fixture-only item with an empty pubDate string.',
        pubDate: '',
      },
      {
        title: 'MOCK K-pop item with missing pubDate',
        originallink: 'https://example.com/naver-news-fixtures/invalid-date-003',
        link: 'https://example.com/naver-news-fixtures/invalid-date-proxy-003',
        description: 'Fixture-only item with pubDate omitted.',
      },
    ],
  },
};

export const emptyItemsNaverNewsApiResponseFixture: NaverNewsApiResponseFixture = {
  fixtureName: 'emptyItemsNaverNewsApiResponseFixture',
  response: {
    lastBuildDate: naverNewsFixtureFetchedAt,
    total: 0,
    start: 1,
    display: 0,
    items: [],
  },
};

export const malformedNaverNewsApiResponseFixture: NaverNewsApiResponseFixture = {
  fixtureName: 'malformedNaverNewsApiResponseFixture',
  response: {
    lastBuildDate: naverNewsFixtureFetchedAt,
    total: 2,
    start: 1,
    display: 2,
    items: [
      {
        title: '',
        originallink: '',
        link: '',
        description: '',
        pubDate: 'invalid malformed fixture date',
      },
      {
        description:
          'Fixture-only malformed item with missing title and missing URL fields.',
        pubDate: '',
      },
    ],
  },
};

export const naverNewsApiResponseFixtures: NaverNewsApiResponseFixture[] = [
  validNaverNewsApiResponseFixture,
  htmlHeavyNaverNewsApiResponseFixture,
  missingOriginalLinkNaverNewsApiResponseFixture,
  missingBothLinksNaverNewsApiResponseFixture,
  invalidPubDateNaverNewsApiResponseFixture,
  emptyItemsNaverNewsApiResponseFixture,
  malformedNaverNewsApiResponseFixture,
];
