import {
  evaluateSnsFandomYoutubeProviderClientIdentity,
  type SnsFandomYoutubeProviderClientIdentityResult,
} from './snsFandomPointYoutubeProviderClientIdentity';

export const SNS_FANDOM_YOUTUBE_PROVIDER_CLIENT_OWNER_HANDOFF_VERSION =
  'sns-fandom-youtube-provider-client-owner-handoff-v1' as const;

export type SnsFandomYoutubeProviderClientOwnerHandoffInput = Readonly<{
  providerClientRef: string | null;
  googleCloudProjectNumber: string | null;
  googleCloudProjectId: string | null;
  credentialLocatorRef: string | null;
  cloudProjectEvidenceRef: string | null;
  verifiedAt: string | null;
}>;

export type SnsFandomYoutubeProviderClientOwnerHandoffResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_PROVIDER_CLIENT_OWNER_HANDOFF_VERSION;
  state: 'awaiting-owner-evidence' | 'provider-client-identity-ready';
  providerId: 'youtube-data-api';
  missingOwnerFields: readonly string[];
  providerClientIdentity: SnsFandomYoutubeProviderClientIdentityResult | null;
  secretMaterialStored: false;
  providerApprovalGranted: false;
  productionCollectionAuthorized: false;
  providerSubmissionAuthorized: false;
  blockers: readonly string[];
}>;

const REQUIRED_OWNER_FIELDS = Object.freeze([
  'providerClientRef',
  'googleCloudProjectNumber',
  'credentialLocatorRef',
  'cloudProjectEvidenceRef',
  'verifiedAt',
] as const);

function present(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
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

export function evaluateSnsFandomYoutubeProviderClientOwnerHandoff(
  input: SnsFandomYoutubeProviderClientOwnerHandoffInput,
): SnsFandomYoutubeProviderClientOwnerHandoffResult {
  const blockers: string[] = [];
  const missingOwnerFields: string[] = [];

  for (const field of REQUIRED_OWNER_FIELDS) {
    if (!present(input[field])) missingOwnerFields.push(field);
  }

  for (const [field, value] of Object.entries(input)) {
    if (typeof value === 'string' && secretLike(value)) {
      blockers.push(`youtube-client-owner-handoff-${field}-secret-like`);
    }
  }

  let providerClientIdentity: SnsFandomYoutubeProviderClientIdentityResult | null =
    null;

  if (missingOwnerFields.length === 0 && blockers.length === 0) {
    providerClientIdentity = evaluateSnsFandomYoutubeProviderClientIdentity({
      providerId: 'youtube-data-api',
      providerClientRef: input.providerClientRef!,
      googleCloudProjectNumber: input.googleCloudProjectNumber!,
      googleCloudProjectId: input.googleCloudProjectId,
      credentialLocatorRef: input.credentialLocatorRef!,
      evidenceRef: input.cloudProjectEvidenceRef!,
      verifiedAt: input.verifiedAt!,
    });

    if (providerClientIdentity.state !== 'provider-client-identity-ready') {
      blockers.push(...providerClientIdentity.blockers);
      providerClientIdentity = null;
    }
  }

  const uniqueMissing = Object.freeze(
    Array.from(new Set(missingOwnerFields)).sort(),
  );
  const uniqueBlockers = Object.freeze(Array.from(new Set(blockers)).sort());
  const ready =
    uniqueMissing.length === 0
    && uniqueBlockers.length === 0
    && providerClientIdentity !== null;

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_PROVIDER_CLIENT_OWNER_HANDOFF_VERSION,
    state: ready
      ? 'provider-client-identity-ready' as const
      : 'awaiting-owner-evidence' as const,
    providerId: 'youtube-data-api' as const,
    missingOwnerFields: uniqueMissing,
    providerClientIdentity,
    secretMaterialStored: false as const,
    providerApprovalGranted: false as const,
    productionCollectionAuthorized: false as const,
    providerSubmissionAuthorized: false as const,
    blockers: uniqueBlockers,
  });
}
