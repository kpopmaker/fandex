export const BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_AUTHORIZATION_VERSION =
  'brand-fit-youtube-production-execution-authorization-v1' as const;

export const BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_ISSUE = 367 as const;

export const BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER =
  'BRAND_FIT_YOUTUBE_PROVIDER_EXECUTION_AUTHORIZED' as const;

export type BrandFitYouTubeProductionExecutionAuthorizationRecord =
  Readonly<{
    marker:
      typeof BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER;
    authorizationId: string;
    authorizedMainSha: string;
    maximumExecutions: 1;
    targetVideoId: '39CUlBDuRSo';
    canonicalArtistId: 'iu';
    canonicalBrandId: 'estee-lauder';
    canonicalCampaignId:
      'estee-lauder-korea-new-night-campaign-2025-iu';
  }>;

const SHA = /^[0-9a-f]{40}$/;
const AUTH_ID =
  /^brand-fit-youtube-execution-[0-9]{8}t[0-9]{6}z-v1$/;

export function parseBrandFitYouTubeProductionExecutionAuthorizationComment(
  body: string,
): BrandFitYouTubeProductionExecutionAuthorizationRecord | null {
  const lines = body.split(/\r?\n/).map((line) => line.trim());
  const marker = lines.find(
    (line) => line === BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER,
  );
  if (!marker) return null;

  const values = new Map<string, string>();
  for (const line of lines) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && value) values.set(key, value);
  }

  const authorizationId = values.get('authorizationId') ?? '';
  const authorizedMainSha = values.get('authorizedMainSha') ?? '';

  if (!AUTH_ID.test(authorizationId)) return null;
  if (!SHA.test(authorizedMainSha)) return null;
  if (values.get('maximumExecutions') !== '1') return null;
  if (values.get('targetVideoId') !== '39CUlBDuRSo') return null;
  if (values.get('canonicalArtistId') !== 'iu') return null;
  if (values.get('canonicalBrandId') !== 'estee-lauder') return null;
  if (
    values.get('canonicalCampaignId')
      !== 'estee-lauder-korea-new-night-campaign-2025-iu'
  ) {
    return null;
  }

  return Object.freeze({
    marker: BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER,
    authorizationId,
    authorizedMainSha,
    maximumExecutions: 1 as const,
    targetVideoId: '39CUlBDuRSo' as const,
    canonicalArtistId: 'iu' as const,
    canonicalBrandId: 'estee-lauder' as const,
    canonicalCampaignId:
      'estee-lauder-korea-new-night-campaign-2025-iu' as const,
  });
}

export function isBrandFitYouTubeProductionExecutionAuthorizationMatching(
  record: BrandFitYouTubeProductionExecutionAuthorizationRecord,
  input: Readonly<{
    authorizationId: string;
    expectedMainSha: string;
  }>,
): boolean {
  return (
    record.authorizationId === input.authorizationId
    && record.authorizedMainSha === input.expectedMainSha
    && record.maximumExecutions === 1
  );
}
