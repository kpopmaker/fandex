import { describe, expect, it } from 'vitest';

import {
  finalizeNaverNewsOfficialManifest,
} from './naverNewsOfficialManifestFinalize';

describe('finalizeNaverNewsOfficialManifest', () => {
  it('creates an official manifest only for valid staged evidence', () => {
    const result = finalizeNaverNewsOfficialManifest({
      slotStart: '2026-10-02T01:00:00.000Z',
      collectionKey: 'sched-v125-naver-news-20261002t010000z-f1ed381d367d',
      jobId: '38ae26ba9f356dff8a08e71ecd95c6e6f51a1cee2f70d8b350262a4f84de61ea',
      schedulerVersion: 'v125_naver_news_scheduler_v1',
      requestContract: 'naver-news-blob-only-collection-stage-v1',
      evidenceObjectRef: 'blob://naver-news/staged/20261002t010000z',
      evidenceExists: true,
    });

    expect(result.schedulerManifestFinalized).toBe(true);
    expect(result.collectionKey).toContain('sched-v125-naver-news');
  });

  it('rejects missing staged evidence', () => {
    expect(() =>
      finalizeNaverNewsOfficialManifest({
        slotStart: '2026-10-02T01:00:00.000Z',
        collectionKey: 'missing-evidence',
        jobId: 'job-id',
        schedulerVersion: 'v125_naver_news_scheduler_v1',
        requestContract: 'naver-news-blob-only-collection-stage-v1',
        evidenceObjectRef: 'blob://missing',
        evidenceExists: false,
      }),
    ).toThrow();
  });
});
