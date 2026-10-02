export const SNS_FANDOM_YOUTUBE_PROVIDER_CLIENT_IDENTITY_VERSION =
  'sns-fandom-youtube-provider-client-identity-v1' as const;

export type SnsFandomYoutubeProviderClientIdentityInput = Readonly<{
  providerId: 'youtube-data-api';
  providerClientRef: string;
  googleCloudProjectNumber: string;
  googleCloudProjectId: string | null;
  credentialLocatorRef: string;
  evidenceRef: string;
  verifiedAt: string;
}>;

export type SnsFandomYoutubeProviderClientIdentityResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_PROVIDER_CLIENT_IDENTITY_VERSION;
  state: 'blocked' | 'provider-client-identity-ready';
  providerId: 'youtube-data-api';
  providerClientRef: string;
  googleCloudProjectNumber: string | null;
  googleCloudProjectId: string | null;
  credentialLocatorRef: string | null;
  evidenceRef: string | null;
  verifiedAt: string | null;
  secretMaterialStored: false;
  submissionEvidenceEligible: boolean;
  blockers: readonly string[];
}>;

function present(value: string): boolean {
  return value.trim().length > 0;
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function projectNumber(value: string): boolean {
  return /^[0-9]{6,30}$/.test(value);
}

function projectId(value: string): boolean {
  return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value);
}

function secretLike(value: string): boolean {
  if (/AIza[0-9A-Za-z_-]{10,}/.test(value)) return true;
  const normalized = value.toLowerCase();
  return [
    'password=',
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
    'key=aiza',
  ].some((needle) => normalized.includes(needle));
}

function validCredentialLocator(value: string): boolean {
  return (
    /^github-actions-secret:\/\/[A-Z0-9_]+$/.test(value)
    || /^vercel-secret:\/\/[A-Z0-9_]+$/.test(value)
    || /^external-secret-manager:\/\/[A-Za-z0-9._\/-]+$/.test(value)
  );
}

export function evaluateSnsFandomYoutubeProviderClientIdentity(
  input: SnsFandomYoutubeProviderClientIdentityInput,
): SnsFandomYoutubeProviderClientIdentityResult {
  const blockers: string[] = [];

  if (input.providerId !== 'youtube-data-api') {
    blockers.push('youtube-client-provider-id-invalid');
  }

  if (!present(input.providerClientRef)) {
    blockers.push('youtube-client-provider-client-ref-empty');
  }

  if (!projectNumber(input.googleCloudProjectNumber)) {
    blockers.push('youtube-client-cloud-project-number-invalid');
  }

  if (
    input.googleCloudProjectId !== null
    && !projectId(input.googleCloudProjectId)
  ) {
    blockers.push('youtube-client-cloud-project-id-invalid');
  }

  if (!present(input.credentialLocatorRef)) {
    blockers.push('youtube-client-credential-locator-missing');
  } else if (secretLike(input.credentialLocatorRef)) {
    blockers.push('youtube-client-credential-locator-secret-like');
  } else if (!validCredentialLocator(input.credentialLocatorRef)) {
    blockers.push('youtube-client-credential-locator-invalid');
  }

  if (!present(input.evidenceRef)) {
    blockers.push('youtube-client-identity-evidence-missing');
  } else if (secretLike(input.evidenceRef)) {
    blockers.push('youtube-client-identity-evidence-secret-like');
  }

  if (!validIso(input.verifiedAt)) {
    blockers.push('youtube-client-identity-verified-at-invalid');
  }

  const uniqueBlockers = Object.freeze(Array.from(new Set(blockers)));
  const ready = uniqueBlockers.length === 0;

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_PROVIDER_CLIENT_IDENTITY_VERSION,
    state: ready
      ? 'provider-client-identity-ready' as const
      : 'blocked' as const,
    providerId: 'youtube-data-api' as const,
    providerClientRef: input.providerClientRef,
    googleCloudProjectNumber:
      ready ? input.googleCloudProjectNumber : null,
    googleCloudProjectId:
      ready ? input.googleCloudProjectId : null,
    credentialLocatorRef:
      ready ? input.credentialLocatorRef : null,
    evidenceRef:
      ready ? input.evidenceRef : null,
    verifiedAt:
      ready ? input.verifiedAt : null,
    secretMaterialStored: false as const,
    submissionEvidenceEligible: ready,
    blockers: uniqueBlockers,
  });
}
