import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
} from '../lib/intelligence/brandFitIdentityBindings';
import {
  buildBrandFitImmutableEvidenceObjectCandidate,
} from '../lib/intelligence/brandFitImmutableEvidenceRecord';
import {
  prepareBrandFitYouTubeEvidenceCandidate,
} from '../lib/intelligence/brandFitProductionCollectionHandoff';
import {
  reviewBrandFitStoredEvidenceCandidate,
} from '../lib/intelligence/brandFitStoredEvidenceReview';
import {
  BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION,
  readBrandFitStoredEvidenceRuntime,
} from '../lib/product/runtime/brandFitStoredEvidenceRuntime';
import type {
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

const compliance = {
  usesYouTubeDataApiOnly: true,
  scrapingDisabled: true,
  audiovisualDownloadDisabled: true,
  nonAuthorizedMetadataRefreshWithin30Days: true,
  latestMetadataRefreshEnabled: true,
  termsAndPrivacyDisclosureReady: true,
  officialBrandChannelBindingRequired: true,
  numericDerivedMetricDisabled: true,
} as const;

function immutableCandidate() {
  const handoff = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      provider: 'youtube-data-api',
      videoId: '39CUlBDuRSo',
      channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
      title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
      description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
      publishedAt: '2025-08-03T00:00:00Z',
      collectedAt: '2026-10-01T08:20:00.000Z',
    },
  });

  return buildBrandFitImmutableEvidenceObjectCandidate(
    reviewBrandFitStoredEvidenceCandidate(handoff),
  );
}

function readStore(input: Readonly<{
  pathnames: readonly string[];
  bodies: Readonly<Record<string, string>>;
}>): Pick<
  ImmutableTextObjectStore,
  'readText' | 'listPathnames'
> {
  return Object.freeze({
    async listPathnames(prefix: string) {
      return Object.freeze(
        input.pathnames.filter((pathname) =>
          pathname.startsWith(prefix),
        ),
      );
    },
    async readText(pathname: string) {
      return input.bodies[pathname] ?? null;
    },
  });
}

test('Brand Fit runtime reader accepts only a valid immutable stored-evidence envelope', async () => {
  const candidate = immutableCandidate();

  const result = await readBrandFitStoredEvidenceRuntime({
    canonicalArtistId: 'iu',
    store: readStore({
      pathnames: [candidate.pathname],
      bodies: {
        [candidate.pathname]: candidate.body,
      },
    }),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.contractVersion,
    BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION,
  );
  assert.deepEqual(result.pathnames, [candidate.pathname]);
  assert.equal(result.evidence.length, 1);
  assert.equal(
    result.evidence[0]?.identity.canonicalArtistId,
    'iu',
  );
  assert.equal(
    result.evidence[0]?.identity.canonicalBrandId,
    'estee-lauder',
  );
  assert.equal(result.evidence[0]?.source.rightsState, 'restricted');
  assert.equal(result.evidence[0]?.interpretation.score, null);
});

test('Brand Fit runtime reader preserves no-object as unavailable rather than zero or empty evidence success', async () => {
  const result = await readBrandFitStoredEvidenceRuntime({
    canonicalArtistId: 'iu',
    store: readStore({
      pathnames: [],
      bodies: {},
    }),
  });

  assert.deepEqual(result, {
    status: 'unavailable',
    contractVersion: BRAND_FIT_STORED_EVIDENCE_RUNTIME_VERSION,
    reason: 'stored-evidence-not-found',
  });
});

test('Brand Fit runtime reader rejects tampered immutable payloads', async () => {
  const candidate = immutableCandidate();
  const parsed = JSON.parse(candidate.body);
  parsed.evidence.identity.canonicalBrandId = 'tampered-brand';

  const result = await readBrandFitStoredEvidenceRuntime({
    canonicalArtistId: 'iu',
    store: readStore({
      pathnames: [candidate.pathname],
      bodies: {
        [candidate.pathname]: JSON.stringify(parsed),
      },
    }),
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'stored-evidence-object-invalid');
});

test('Brand Fit runtime reader rejects path substitution even when the immutable body is valid', async () => {
  const candidate = immutableCandidate();
  const substituted =
    candidate.pathname.replace('/estee-lauder/', '/other-brand/');

  const result = await readBrandFitStoredEvidenceRuntime({
    canonicalArtistId: 'iu',
    store: readStore({
      pathnames: [substituted],
      bodies: {
        [substituted]: candidate.body,
      },
    }),
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'stored-evidence-path-mismatch');
});

test('current IU runtime readiness uses the durable Brand Fit reader and no longer hardcodes reader-not-implemented', () => {
  const source = readFileSync(
    new URL(
      '../lib/server/product/fandexCurrentRuntimeAssemblyReadiness.ts',
      import.meta.url,
    ),
    'utf8',
  );
  const readerSource = readFileSync(
    new URL(
      '../lib/server/product/brandFitStoredEvidenceRuntime.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    source,
    /getBrandFitStoredEvidenceCurrentRuntimeForIU/,
  );
  assert.match(source, /brandFitSettled/);
  assert.doesNotMatch(
    source,
    /durable-stored-evidence-reader-not-implemented/,
  );

  assert.match(
    readerSource,
    /FANDEX_BRAND_FIT_EVIDENCE_BLOB_STORE_ID/,
  );
  assert.match(
    readerSource,
    /createVercelBlobTextReadStore/,
  );
  assert.doesNotMatch(readerSource, /putTextIfAbsent/);
  assert.doesNotMatch(readerSource, /from '@vercel\/blob';[\s\S]*\bput\b/);
});
